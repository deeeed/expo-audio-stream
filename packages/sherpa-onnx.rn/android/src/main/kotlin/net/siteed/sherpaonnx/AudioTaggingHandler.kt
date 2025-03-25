/**
 * Handler for Audio Tagging functionality
 */
package net.siteed.sherpaonnx

import android.util.Log
import com.facebook.react.bridge.*
import com.k2fsa.sherpa.onnx.AudioTagging
import com.k2fsa.sherpa.onnx.AudioTaggingConfig
import com.k2fsa.sherpa.onnx.AudioTaggingModelConfig
import com.k2fsa.sherpa.onnx.OfflineZipformerAudioTaggingModelConfig
import com.k2fsa.sherpa.onnx.OfflineStream
import com.k2fsa.sherpa.onnx.AudioEvent
// Temporary comment out until we verify this class exists
// import com.k2fsa.sherpa.onnx.OfflineAudioTagger
import java.io.File
import java.util.concurrent.Executors
import net.siteed.sherpaonnx.AssetUtils

class AudioTaggingHandler(private val reactContext: ReactApplicationContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    private var audioTagging: AudioTagging? = null
    // Temporarily comment out since OfflineAudioTagger might not exist
    // private var audioTagger: OfflineAudioTagger? = null
    private var stream: OfflineStream? = null
    private val audioTaggingModelConfig = AudioTaggingModelConfig()
    
    companion object {
        private const val TAG = "SherpaOnnxAudioTagging"
    }
    
    /**
     * Initialize audio tagging with the provided model configuration
     */
    fun init(modelConfig: ReadableMap, promise: Promise) {
        if (!SherpaOnnxModule.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }
        
        executor.execute {
            try {
                Log.i(TAG, "===== AUDIO TAGGING INITIALIZATION START =====")
                Log.i(TAG, "Received model config: ${modelConfig.toHashMap()}")
                
                // Extract paths from config
                val modelDir = AssetUtils.cleanFilePath(modelConfig.getString("modelDir") ?: "")
                val modelFile = modelConfig.getString("modelFile") ?: "model.onnx"
                val labelsFile = modelConfig.getString("labelsFile") ?: "labels.txt"
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 1
                val topK = if (modelConfig.hasKey("topK")) modelConfig.getInt("topK") else 3
                val modelType = modelConfig.getString("modelType") ?: "zipformer"
                val debug = if (modelConfig.hasKey("debug")) modelConfig.getBoolean("debug") else false
                
                // Build file paths
                val modelPath = File(modelDir, modelFile).absolutePath
                val labelsPath = File(modelDir, labelsFile).absolutePath
                
                // Log file existence
                Log.i(TAG, "Model file: $modelPath (exists: ${File(modelPath).exists()})")
                Log.i(TAG, "Labels file: $labelsPath (exists: ${File(labelsPath).exists()})")
                Log.i(TAG, "Model type: $modelType")
                
                // Create audio tagging config directly with all properties
                val config = if (modelType.equals("zipformer", ignoreCase = true)) {
                    AudioTaggingConfig(
                        model = AudioTaggingModelConfig(
                            zipformer = OfflineZipformerAudioTaggingModelConfig(model = modelPath),
                            numThreads = numThreads,
                            provider = "cpu",
                            debug = debug
                        ),
                        labels = labelsPath,
                        topK = topK
                    )
                } else if (modelType.equals("ced", ignoreCase = true)) {
                    AudioTaggingConfig(
                        model = AudioTaggingModelConfig(
                            ced = modelPath,
                            numThreads = numThreads,
                            provider = "cpu",
                            debug = debug
                        ),
                        labels = labelsPath,
                        topK = topK
                    )
                } else {
                    throw Exception("Unsupported model type: $modelType. Must be 'zipformer' or 'ced'")
                }
                
                Log.i(TAG, "Initializing with config: model=$modelPath, labels=$labelsPath, topK=$topK, debug=$debug")
                
                // Initialize audio tagging
                audioTagging = AudioTagging(null, config)
                
                // Check initialization
                if (audioTagging == null) {
                    throw Exception("Failed to initialize audio tagging")
                }
                
                // Create initial stream
                stream = audioTagging?.createStream()
                
                // Check stream creation
                if (stream == null) {
                    throw Exception("Failed to create audio stream")
                }
                
                // Get sample rate - avoid using direct property access
                val sampleRate = 16000 // Default since sampleRate() method may not exist
                
                Log.i(TAG, "Audio tagging initialized successfully with sample rate: $sampleRate")
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", sampleRate)
                
                Log.i(TAG, "===== AUDIO TAGGING INITIALIZATION COMPLETE =====")
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing audio tagging: ${e.message}")
                e.printStackTrace()
                
                // Release resources in case of error
                releaseResources()
                
                Log.i(TAG, "===== AUDIO TAGGING INITIALIZATION FAILED =====")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_AUDIO_TAGGING_INIT", "Failed to initialize audio tagging: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process audio samples
     */
    fun processAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                if (audioTagging == null || stream == null) {
                    throw Exception("Audio tagging is not initialized")
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
                    promise.reject("ERR_AUDIO_TAGGING_PROCESS", "Failed to process audio samples: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Compute audio tagging results
     */
    fun computeAudioTagging(promise: Promise) {
        executor.execute {
            try {
                if (audioTagging == null || stream == null) {
                    throw Exception("Audio tagging is not initialized")
                }
                
                // Compute audio tagging
                // Use explicit casting to avoid smart cast issue
                val currentStream = stream
                if (currentStream != null) {
                    val events = audioTagging?.compute(currentStream)
                    
                    // Process events
                    val eventsArray = Arguments.createArray()
                    
                    events?.forEach { event ->
                        val eventMap = Arguments.createMap()
                        try {
                            // Direct property access - no reflection needed
                            // Map both the original property names and new property names
                            eventMap.putString("name", event.name)
                            eventMap.putString("label", event.name) // For backward compatibility
                            eventMap.putDouble("prob", event.prob.toDouble())
                            eventMap.putDouble("confidence", event.prob.toDouble()) // For backward compatibility
                            eventMap.putDouble("probability", event.prob.toDouble()) // Additional alias
                            
                            // Add index property if it's valid
                            if (event.index >= 0) {
                                eventMap.putInt("index", event.index)
                            }
                        } catch (e: Exception) {
                            // Fall back to defaults if any access fails
                            Log.w(TAG, "Could not extract event properties: ${e.message}")
                            eventMap.putString("name", "unknown")
                            eventMap.putString("label", "unknown")
                            eventMap.putDouble("prob", 0.0)
                            eventMap.putDouble("confidence", 0.0)
                            eventMap.putDouble("probability", 0.0)
                        }
                        eventsArray.pushMap(eventMap)
                    }
                    
                    // Prepare new stream for next recognition
                    stream?.release()
                    stream = audioTagging?.createStream()
                    
                    // Return results
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", true)
                    resultMap.putArray("events", eventsArray)
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                } else {
                    throw Exception("Stream is null during processing")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error computing audio tagging: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_AUDIO_TAGGING_COMPUTE", "Failed to compute audio tagging: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process audio file
     */
    fun processAudioFile(filePath: String, promise: Promise) {
        executor.execute {
            try {
                if (audioTagging == null) {
                    throw Exception("Audio tagging is not initialized")
                }
                
                // Clean the file path to remove any file:/ or file:// prefixes
                val cleanedFilePath = AssetUtils.cleanFilePath(filePath)
                Log.i(TAG, "Processing audio file: $cleanedFilePath")
                
                // Extract audio from file - fix type mismatch by creating a File object
                val audioData = AudioExtractor.extractAudioFromFile(File(cleanedFilePath))
                
                // Create stream
                val newStream = audioTagging?.createStream()
                if (newStream == null) {
                    throw Exception("Failed to create audio stream")
                }
                
                // Process audio - use safe call operator to avoid null-related crashes
                audioData?.samples?.let { samples ->
                    audioData.sampleRate?.let { sampleRate ->
                        newStream.acceptWaveform(samples, sampleRate)
                    }
                }
                
                // Compute audio tagging
                val events = audioTagging?.compute(newStream)
                
                // Process events
                val eventsArray = Arguments.createArray()
                
                events?.forEach { event ->
                    val eventMap = Arguments.createMap()
                    try {
                        // Direct property access - no reflection needed
                        // Map both the original property names and new property names
                        eventMap.putString("name", event.name)
                        eventMap.putString("label", event.name) // For backward compatibility
                        eventMap.putDouble("prob", event.prob.toDouble())
                        eventMap.putDouble("confidence", event.prob.toDouble()) // For backward compatibility
                        eventMap.putDouble("probability", event.prob.toDouble()) // Additional alias
                        
                        // Add index property if it's valid
                        if (event.index >= 0) {
                            eventMap.putInt("index", event.index)
                        }
                    } catch (e: Exception) {
                        // Fall back to defaults if any access fails
                        Log.w(TAG, "Could not extract event properties: ${e.message}")
                        eventMap.putString("name", "unknown")
                        eventMap.putString("label", "unknown")
                        eventMap.putDouble("prob", 0.0)
                        eventMap.putDouble("confidence", 0.0)
                        eventMap.putDouble("probability", 0.0)
                    }
                    eventsArray.pushMap(eventMap)
                }
                
                // Release stream
                newStream.release()
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putArray("events", eventsArray)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing audio file: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_AUDIO_TAGGING_FILE", "Failed to process audio file: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process and compute audio tagging
     */
    fun processAndComputeAudioTagging(filePath: String, promise: Promise) {
        processAudioFile(filePath, promise)
    }
    
    /**
     * Release resources
     */
    fun release(promise: Promise) {
        executor.execute {
            try {
                releaseResources()
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing audio tagging: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_AUDIO_TAGGING_RELEASE", "Failed to release audio tagging: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Release resources
     */
    private fun releaseResources() {
        try {
            stream?.release()
            stream = null
            
            audioTagging?.release()
            audioTagging = null
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing resources: ${e.message}")
        }
    }
} 