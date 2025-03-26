/**
 * Handler for Speaker Identification functionality
 */
package net.siteed.sherpaonnx

import android.util.Log
import com.facebook.react.bridge.*
import com.k2fsa.sherpa.onnx.SpeakerEmbeddingExtractor
import com.k2fsa.sherpa.onnx.SpeakerEmbeddingExtractorConfig
import com.k2fsa.sherpa.onnx.SpeakerEmbeddingManager
import com.k2fsa.sherpa.onnx.OnlineStream
import java.io.File
import java.util.concurrent.Executors

class SpeakerIdHandler(private val reactContext: ReactApplicationContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    private var speakerExtractor: SpeakerEmbeddingExtractor? = null
    private var speakerManager: SpeakerEmbeddingManager? = null
    private var stream: OnlineStream? = null
    
    companion object {
        private const val TAG = "SherpaOnnxSpeakerId"
    }
    
    /**
     * Initialize speaker identification with the provided model configuration
     */
    fun init(modelConfig: ReadableMap, promise: Promise) {
        if (!SherpaOnnxModule.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }
        
        executor.execute {
            try {
                Log.i(TAG, "===== SPEAKER ID INITIALIZATION START =====")
                Log.i(TAG, "Received model config: ${modelConfig.toHashMap()}")
                
                // Extract paths from config
                val modelDir = AssetUtils.cleanFilePath(modelConfig.getString("modelDir") ?: "")
                val modelFile = modelConfig.getString("modelFile") ?: "model.onnx"
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 1
                val debug = if (modelConfig.hasKey("debug")) modelConfig.getBoolean("debug") else false
                val provider = modelConfig.getString("provider") ?: "cpu"
                
                // Build file paths and validate
                val modelPath = File(modelDir, modelFile).absolutePath
                
                // Log file existence
                Log.i(TAG, "Model file: $modelPath (exists: ${File(modelPath).exists()})")
                
                // Create speaker embedding extractor config
                val config = SpeakerEmbeddingExtractorConfig(
                    model = modelPath,
                    numThreads = numThreads,
                    debug = debug,
                    provider = provider
                )
                
                Log.i(TAG, "Initializing with config: model=$modelPath")
                
                // Initialize speaker embedding extractor
                speakerExtractor = SpeakerEmbeddingExtractor(null, config)
                
                // Check initialization
                if (speakerExtractor == null) {
                    throw Exception("Failed to initialize speaker embedding extractor")
                }
                
                // Create initial stream and initialize manager
                stream = speakerExtractor?.createStream()
                
                // Check stream creation
                if (stream == null) {
                    throw Exception("Failed to create speaker ID stream")
                }
                
                // Initialize speaker manager
                val embeddingDim = speakerExtractor?.dim() ?: 0
                speakerManager = SpeakerEmbeddingManager(embeddingDim)
                
                if (speakerManager == null) {
                    throw Exception("Failed to initialize speaker embedding manager")
                }
                
                Log.i(TAG, "Speaker ID initialized successfully with embedding dimension: $embeddingDim")
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("embeddingDim", embeddingDim)
                
                Log.i(TAG, "===== SPEAKER ID INITIALIZATION COMPLETE =====")
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing speaker ID: ${e.message}")
                e.printStackTrace()
                
                // Release resources in case of error
                releaseResources()
                
                Log.i(TAG, "===== SPEAKER ID INITIALIZATION FAILED =====")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_INIT", "Failed to initialize speaker ID: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process audio samples to extract speaker embedding
     */
    fun processAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                if (speakerExtractor == null || stream == null) {
                    throw Exception("Speaker ID is not initialized")
                }
                
                // Convert ReadableArray to FloatArray
                val samples = FloatArray(audioBuffer.size())
                for (i in 0 until audioBuffer.size()) {
                    samples[i] = audioBuffer.getDouble(i).toFloat()
                }
                
                // Accept waveform
                stream?.acceptWaveform(samples, sampleRate)
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("samplesProcessed", samples.size)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing audio samples: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_PROCESS", "Failed to process audio samples: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Compute speaker embedding from processed audio
     */
    fun computeEmbedding(promise: Promise) {
        executor.execute {
            try {
                if (speakerExtractor == null || stream == null) {
                    throw Exception("Speaker ID is not initialized")
                }
                
                // Check if we have enough data to compute embedding
                if (!speakerExtractor!!.isReady(stream!!)) {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", false)
                    resultMap.putString("error", "Not enough audio data to compute embedding")
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                // Compute embedding
                val startTime = System.currentTimeMillis()
                val embedding = speakerExtractor!!.compute(stream!!)
                val endTime = System.currentTimeMillis()
                
                // Convert embedding to JS array
                val embeddingArray = Arguments.createArray()
                for (value in embedding) {
                    embeddingArray.pushDouble(value.toDouble())
                }
                
                // Create new stream for next compute operation
                stream?.release()
                stream = speakerExtractor?.createStream()
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("durationMs", (endTime - startTime).toInt())
                resultMap.putArray("embedding", embeddingArray)
                resultMap.putInt("embeddingDim", embedding.size)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error computing speaker embedding: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_COMPUTE", "Failed to compute speaker embedding: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Register a speaker with the given name and embedding
     */
    fun registerSpeaker(name: String, embedding: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                if (speakerManager == null) {
                    throw Exception("Speaker ID is not initialized")
                }
                
                // Convert ReadableArray to FloatArray
                val embeddingArray = FloatArray(embedding.size())
                for (i in 0 until embedding.size()) {
                    embeddingArray[i] = embedding.getDouble(i).toFloat()
                }
                
                // Add to speaker manager
                val added = speakerManager!!.add(name, embeddingArray)
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", added)
                if (added) {
                    resultMap.putString("message", "Speaker '$name' registered successfully")
                } else {
                    resultMap.putString("error", "Failed to register speaker '$name'")
                }
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error registering speaker: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_REGISTER", "Failed to register speaker: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Remove a speaker from the database
     */
    fun removeSpeaker(name: String, promise: Promise) {
        executor.execute {
            try {
                if (speakerManager == null) {
                    throw Exception("Speaker ID is not initialized")
                }
                
                // Check if speaker exists
                val exists = speakerManager!!.contains(name)
                if (!exists) {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", false)
                    resultMap.putString("error", "Speaker '$name' not found in database")
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                // Remove from speaker manager
                val removed = speakerManager!!.remove(name)
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", removed)
                if (removed) {
                    resultMap.putString("message", "Speaker '$name' removed successfully")
                } else {
                    resultMap.putString("error", "Failed to remove speaker '$name'")
                }
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error removing speaker: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_REMOVE", "Failed to remove speaker: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Get all registered speakers
     */
    fun getSpeakers(promise: Promise) {
        executor.execute {
            try {
                if (speakerManager == null) {
                    throw Exception("Speaker ID is not initialized")
                }
                
                // Get speaker names
                val speakerNames = speakerManager!!.allSpeakerNames()
                val speakerCount = speakerManager!!.numSpeakers()
                
                // Convert to JS array
                val speakersArray = Arguments.createArray()
                for (name in speakerNames) {
                    speakersArray.pushString(name)
                }
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putArray("speakers", speakersArray)
                resultMap.putInt("count", speakerCount)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error getting speakers: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_GET_SPEAKERS", "Failed to get speakers: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Identify a speaker based on embedding
     */
    fun identifySpeaker(embedding: ReadableArray, threshold: Float, promise: Promise) {
        executor.execute {
            try {
                if (speakerManager == null) {
                    throw Exception("Speaker ID is not initialized")
                }
                
                // Convert ReadableArray to FloatArray
                val embeddingArray = FloatArray(embedding.size())
                for (i in 0 until embedding.size()) {
                    embeddingArray[i] = embedding.getDouble(i).toFloat()
                }
                
                // Search for matching speaker
                val speakerName = speakerManager!!.search(embeddingArray, threshold)
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("speakerName", speakerName)
                resultMap.putBoolean("identified", speakerName.isNotEmpty())
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error identifying speaker: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_IDENTIFY", "Failed to identify speaker: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Verify if the embedding matches a specific speaker
     */
    fun verifySpeaker(name: String, embedding: ReadableArray, threshold: Float, promise: Promise) {
        executor.execute {
            try {
                if (speakerManager == null) {
                    throw Exception("Speaker ID is not initialized")
                }
                
                // Check if speaker exists
                val exists = speakerManager!!.contains(name)
                if (!exists) {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", false)
                    resultMap.putString("error", "Speaker '$name' not found in database")
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                // Convert ReadableArray to FloatArray
                val embeddingArray = FloatArray(embedding.size())
                for (i in 0 until embedding.size()) {
                    embeddingArray[i] = embedding.getDouble(i).toFloat()
                }
                
                // Verify speaker
                val verified = speakerManager!!.verify(name, embeddingArray, threshold)
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putBoolean("verified", verified)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error verifying speaker: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_VERIFY", "Failed to verify speaker: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process audio file to create embedding
     */
    fun processAudioFile(filePath: String, promise: Promise) {
        executor.execute {
            try {
                if (speakerExtractor == null) {
                    throw Exception("Speaker ID is not initialized")
                }
                
                // Clean the file path to remove any file:/ or file:// prefixes
                val cleanedFilePath = AssetUtils.cleanFilePath(filePath)
                Log.i(TAG, "Processing audio file for speaker ID: $cleanedFilePath")
                
                // Extract audio from file
                val audioData = AudioExtractor.extractAudioFromFile(File(cleanedFilePath))
                
                if (audioData == null) {
                    throw Exception("Failed to extract audio from file")
                }
                
                // Create a new stream
                val newStream = speakerExtractor?.createStream()
                if (newStream == null) {
                    throw Exception("Failed to create audio stream")
                }
                
                // Process audio
                newStream.acceptWaveform(audioData.samples, audioData.sampleRate)
                
                // Check if we have enough data
                if (!speakerExtractor!!.isReady(newStream)) {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", false)
                    resultMap.putString("error", "Not enough audio data to compute embedding")
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                // Compute embedding
                val startTime = System.currentTimeMillis()
                val embedding = speakerExtractor!!.compute(newStream)
                val endTime = System.currentTimeMillis()
                
                // Release stream
                newStream.release()
                
                // Convert embedding to JS array
                val embeddingArray = Arguments.createArray()
                for (value in embedding) {
                    embeddingArray.pushDouble(value.toDouble())
                }
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("durationMs", (endTime - startTime).toInt())
                resultMap.putArray("embedding", embeddingArray)
                resultMap.putInt("embeddingDim", embedding.size)
                resultMap.putInt("sampleRate", audioData.sampleRate)
                resultMap.putInt("samples", audioData.samples.size)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing audio file for speaker ID: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_PROCESS_FILE", "Failed to process audio file: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Release all resources
     */
    fun release(promise: Promise) {
        executor.execute {
            try {
                Log.i(TAG, "Releasing Speaker ID resources")
                releaseResources()
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("released", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing Speaker ID resources: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_SPEAKER_ID_RELEASE", "Failed to release Speaker ID resources: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Helper method to release resources
     */
    private fun releaseResources() {
        try {
            stream?.release()
            stream = null
            
            speakerManager?.release()
            speakerManager = null
            
            speakerExtractor?.release()
            speakerExtractor = null
            
            Log.i(TAG, "Speaker ID resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error in releaseResources: ${e.message}")
        }
    }
} 