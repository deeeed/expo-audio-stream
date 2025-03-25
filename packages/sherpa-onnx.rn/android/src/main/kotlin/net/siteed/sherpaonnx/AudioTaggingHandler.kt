/**
 * Handler for Audio Tagging functionality
 */
package net.siteed.sherpaonnx

import android.util.Log
import com.facebook.react.bridge.*
import com.k2fsa.sherpa.onnx.AudioTagging
import com.k2fsa.sherpa.onnx.AudioTaggingConfig
import com.k2fsa.sherpa.onnx.OfflineStream
import java.io.File
import java.util.concurrent.Executors

class AudioTaggingHandler(private val reactContext: ReactApplicationContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    private var audioTagging: AudioTagging? = null
    private var stream: OfflineStream? = null
    
    companion object {
        private const val TAG = "SherpaOnnxAudioTag"
        private const val TIMEOUT_US = 10000L
    }
    
    /**
     * Initialize the Audio Tagging engine with the provided model configuration
     */
    fun init(modelConfig: ReadableMap, promise: Promise) {
        if (!SherpaOnnxModule.isLibraryLoaded) {
            Log.e(TAG, "Sherpa ONNX library is not loaded - rejecting initAudioTagging call")
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                Log.i(TAG, "===== AUDIO TAGGING INITIALIZATION START =====")
                Log.i(TAG, "Received model config: ${modelConfig.toHashMap()}")
                
                // Clean up any existing instances
                releaseAudioTaggingResources()
                
                // Extract paths from the config (assuming clean paths from JavaScript)
                val modelDir = modelConfig.getString("modelDir") ?: ""
                if (modelDir.isEmpty()) {
                    throw IllegalArgumentException("Model directory path is empty")
                }
                
                val modelType = modelConfig.getString("modelType") ?: "zipformer"
                val modelName = modelConfig.getString("modelName") ?: "model.int8.onnx"
                val labelsPath = modelConfig.getString("labelsPath") ?: ""
                if (labelsPath.isEmpty()) {
                    throw IllegalArgumentException("Labels file path is empty") 
                }
                
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 2
                val topK = if (modelConfig.hasKey("topK")) modelConfig.getInt("topK") else 3
                
                // Log the extracted configuration
                Log.i(TAG, "Using paths:")
                Log.i(TAG, "- modelDir: $modelDir")
                Log.i(TAG, "- modelType: $modelType")
                Log.i(TAG, "- modelName: $modelName")
                Log.i(TAG, "- labelsPath: $labelsPath")
                Log.i(TAG, "- numThreads: $numThreads")
                Log.i(TAG, "- topK: $topK")
                
                // Create AudioTagging configuration
                val config = if (modelType == "zipformer") {
                    AudioTaggingConfig(
                        model = com.k2fsa.sherpa.onnx.AudioTaggingModelConfig(
                            zipformer = com.k2fsa.sherpa.onnx.OfflineZipformerAudioTaggingModelConfig(
                                model = "$modelDir/$modelName"
                            ),
                            numThreads = numThreads,
                            debug = true
                        ),
                        labels = labelsPath,
                        topK = topK
                    )
                } else {
                    AudioTaggingConfig(
                        model = com.k2fsa.sherpa.onnx.AudioTaggingModelConfig(
                            ced = "$modelDir/$modelName",
                            numThreads = numThreads,
                            debug = true
                        ),
                        labels = labelsPath,
                        topK = topK
                    )
                }
                
                // Validate model files
                val modelFile = File("$modelDir/$modelName")
                val labelsFile = File(labelsPath)
                
                if (!modelFile.exists() || !modelFile.canRead()) {
                    throw Exception("Model file not found or not readable: ${modelFile.absolutePath}")
                }
                
                if (!labelsFile.exists() || !labelsFile.canRead()) {
                    throw Exception("Labels file not found or not readable: ${labelsFile.absolutePath}")
                }
                
                Log.i(TAG, "Model file: ${modelFile.absolutePath} (exists: ${modelFile.exists()}, size: ${modelFile.length()})")
                Log.i(TAG, "Labels file: ${labelsFile.absolutePath} (exists: ${labelsFile.exists()}, size: ${labelsFile.length()})")
                
                // Initialize the AudioTagging engine with proper error handling
                try {
                    Log.i(TAG, "Creating AudioTagging instance...")
                    audioTagging = AudioTagging(config = config)
                    
                    if (audioTagging == null) {
                        throw Exception("Failed to initialize AudioTagging engine (constructor returned null)")
                    }
                    
                    Log.i(TAG, "AudioTagging instance created successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Error creating AudioTagging instance: ${e.message}")
                    e.printStackTrace()
                    throw Exception("Failed to initialize AudioTagging engine: ${e.message}")
                }
                
                // Create a stream for audio processing with proper error handling
                try {
                    Log.i(TAG, "Creating OfflineStream...")
                    stream = audioTagging?.createStream()
                    
                    if (stream == null) {
                        throw Exception("Failed to create AudioTagging stream (returned null)")
                    }
                    
                    Log.i(TAG, "OfflineStream created successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Error creating OfflineStream: ${e.message}")
                    e.printStackTrace()
                    
                    // Clean up the AudioTagging instance since stream creation failed
                    audioTagging?.release()
                    audioTagging = null
                    
                    throw Exception("Failed to create audio stream: ${e.message}")
                }
                
                Log.i(TAG, "AudioTagging initialized successfully")
                Log.i(TAG, "===== AUDIO TAGGING INITIALIZATION COMPLETE =====")
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing AudioTagging: ${e.message}")
                e.printStackTrace()
                
                // Release resources in case of error
                releaseAudioTaggingResources()
                
                Log.i(TAG, "===== AUDIO TAGGING INITIALIZATION FAILED =====")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_AUDIO_TAGGING_INIT", "Failed to initialize AudioTagging: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process audio samples through the AudioTagging engine
     */
    fun processAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        if (audioTagging == null || stream == null) {
            promise.reject("ERR_NOT_INITIALIZED", "AudioTagging is not initialized")
            return
        }
        
        executor.execute {
            try {
                // Convert ReadableArray to FloatArray with safety checks
                val size = audioBuffer.size()
                if (size <= 0) {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", false)
                    resultMap.putInt("processedSamples", 0)
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                val samples = FloatArray(size)
                for (i in 0 until size) {
                    samples[i] = audioBuffer.getDouble(i).toFloat()
                }
                
                Log.i(TAG, "Processing ${samples.size} audio samples at ${sampleRate}Hz")
                
                // Feed the samples to the stream
                stream?.acceptWaveform(samples, sampleRate)
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("processedSamples", samples.size)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing audio samples: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_PROCESS_AUDIO", "Failed to process audio samples: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Finalize audio processing and compute the audio tagging results
     */
    fun computeAudioTagging(promise: Promise) {
        if (audioTagging == null || stream == null) {
            promise.reject("ERR_NOT_INITIALIZED", "AudioTagging is not initialized")
            return
        }
        
        executor.execute {
            try {
                // Use default topK value of -1 (use the configured value)
                val topK = -1
                
                Log.i(TAG, "Computing audio tagging results")
                
                // Compute the results with safety checks
                val startTime = System.currentTimeMillis()
                val events = try {
                    audioTagging?.compute(stream!!, topK) ?: ArrayList()
                } catch (e: Exception) {
                    Log.e(TAG, "Error in native compute call: ${e.message}")
                    e.printStackTrace()
                    ArrayList() // Return empty list on error
                }
                val endTime = System.currentTimeMillis()
                
                Log.i(TAG, "Computed audio tagging in ${endTime - startTime}ms, found ${events.size} events")
                
                // Convert results to JS
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("durationMs", (endTime - startTime).toInt())
                
                val eventsArray = Arguments.createArray()
                for (event in events) {
                    val eventMap = Arguments.createMap()
                    eventMap.putString("name", event.name ?: "unknown")
                    eventMap.putInt("index", event.index)
                    eventMap.putDouble("probability", event.prob.toDouble())
                    eventsArray.pushMap(eventMap)
                }
                resultMap.putArray("events", eventsArray)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error computing audio tagging: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_COMPUTE_AUDIO_TAGGING", "Failed to compute audio tagging: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Release the AudioTagging resources
     */
    fun release(promise: Promise) {
        executor.execute {
            try {
                releaseAudioTaggingResources()
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing audio tagging resources: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_RELEASE_AUDIO_TAGGING", "Failed to release audio tagging resources: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process and compute audio file in one call
     */
    fun processAndComputeAudioTagging(filePath: String, promise: Promise) {
        if (audioTagging == null) {
            promise.reject("ERR_NOT_INITIALIZED", "AudioTagging is not initialized")
            return
        }
        
        executor.execute {
            try {
                // Clean the path (remove file:// prefix if present)
                val cleanFilePath = filePath.replace("file://", "")
                val file = File(cleanFilePath)
                
                if (!file.exists() || !file.canRead()) {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", false)
                    resultMap.putString("error", "Audio file not found or not readable: $cleanFilePath")
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                Log.i(TAG, "Processing audio file: $cleanFilePath")
                
                // Create a local temporary stream for this operation ONLY
                // This avoids race conditions with the shared stream
                var tempStream: OfflineStream? = null
                
                try {
                    // Check if this is a WAV file
                    var audioData: AudioData? = null
                    
                    if (cleanFilePath.lowercase().endsWith(".wav")) {
                        // For WAV files, use AudioUtils for direct parsing
                        try {
                            Log.i(TAG, "Using direct WAV file parsing with AudioUtils")
                            val wavResult = AudioUtils.readWavFile(file.absolutePath)
                            
                            if (wavResult != null) {
                                audioData = AudioData(wavResult.first, wavResult.second)
                                Log.i(TAG, "Successfully read WAV file using AudioUtils: ${wavResult.first.size} samples at ${wavResult.second}Hz")
                            } else {
                                Log.e(TAG, "Failed to read WAV file with AudioUtils, falling back to MediaExtractor")
                                audioData = AudioExtractor.extractAudioFromFile(file)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error reading WAV with AudioUtils: ${e.message}")
                            // Fall back to MediaExtractor
                            audioData = AudioExtractor.extractAudioFromFile(file)
                        }
                    } else {
                        // For other formats, use MediaExtractor
                        audioData = AudioExtractor.extractAudioFromFile(file)
                    }
                    
                    if (audioData == null) {
                        val resultMap = Arguments.createMap()
                        resultMap.putBoolean("success", false)
                        resultMap.putString("error", "Failed to extract audio data from file")
                        
                        reactContext.runOnUiQueueThread {
                            promise.resolve(resultMap)
                        }
                        return@execute
                    }
                    
                    // Create a new local stream for this operation
                    tempStream = audioTagging?.createStream()
                    
                    if (tempStream == null) {
                        throw Exception("Failed to create audio stream")
                    }
                    
                    // Feed the samples to the local stream
                    tempStream.acceptWaveform(audioData.samples, audioData.sampleRate)
                    
                    // Compute the results with safety checks
                    val startTime = System.currentTimeMillis()
                    val events = try {
                        audioTagging?.compute(tempStream, -1) ?: ArrayList()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in native compute call: ${e.message}")
                        e.printStackTrace()
                        ArrayList() // Return empty list on error
                    }
                    val endTime = System.currentTimeMillis()
                    
                    Log.i(TAG, "Computed audio tagging in ${endTime - startTime}ms, found ${events.size} events")
                    
                    // Convert results to JS
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", true)
                    resultMap.putInt("durationMs", (endTime - startTime).toInt())
                    
                    val eventsArray = Arguments.createArray()
                    for (event in events) {
                        val eventMap = Arguments.createMap()
                        eventMap.putString("name", event.name ?: "unknown")
                        eventMap.putInt("index", event.index)
                        eventMap.putDouble("probability", event.prob.toDouble())
                        eventsArray.pushMap(eventMap)
                    }
                    resultMap.putArray("events", eventsArray)
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing audio data: ${e.message}")
                    throw e
                } finally {
                    // Always release the temporary stream, even on error
                    try {
                        // Make sure to null the reference first
                        val streamRef = tempStream
                        tempStream = null
                        
                        // Then release it safely
                        streamRef?.release()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error releasing temporary stream: ${e.message}")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in processAndCompute: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_PROCESS_AND_COMPUTE", "Failed to process and compute audio tagging: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process an audio file directly
     */
    fun processAudioFile(filePath: String, promise: Promise) {
        if (audioTagging == null) {
            promise.reject("ERR_NOT_INITIALIZED", "AudioTagging is not initialized")
            return
        }
        
        executor.execute {
            try {
                // Clean the path (remove file:// prefix if present)
                val cleanFilePath = filePath.replace("file://", "")
                val file = File(cleanFilePath)
                
                if (!file.exists() || !file.canRead()) {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", false)
                    resultMap.putString("error", "Audio file not found or not readable: $cleanFilePath")
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                Log.i(TAG, "Processing audio file: $cleanFilePath")
                
                // Check if this is a WAV file
                var audioData: AudioData? = null
                
                try {
                    if (cleanFilePath.lowercase().endsWith(".wav")) {
                        // For WAV files, use AudioUtils for direct parsing
                        try {
                            Log.i(TAG, "Using direct WAV file parsing with AudioUtils")
                            val wavResult = AudioUtils.readWavFile(file.absolutePath)
                            
                            if (wavResult != null) {
                                audioData = AudioData(wavResult.first, wavResult.second)
                                Log.i(TAG, "Successfully read WAV file using AudioUtils: ${wavResult.first.size} samples at ${wavResult.second}Hz")
                            } else {
                                Log.e(TAG, "Failed to read WAV file with AudioUtils, falling back to MediaExtractor")
                                audioData = AudioExtractor.extractAudioFromFile(file)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error reading WAV with AudioUtils: ${e.message}")
                            // Fall back to MediaExtractor
                            audioData = AudioExtractor.extractAudioFromFile(file)
                        }
                    } else {
                        // For other formats, use MediaExtractor
                        audioData = AudioExtractor.extractAudioFromFile(file)
                    }
                    
                    if (audioData == null) {
                        val resultMap = Arguments.createMap()
                        resultMap.putBoolean("success", false)
                        resultMap.putString("error", "Failed to extract audio data from file")
                        
                        reactContext.runOnUiQueueThread {
                            promise.resolve(resultMap)
                        }
                        return@execute
                    }
                    
                    // Safely clean up the existing stream before creating a new one
                    var oldStream: OfflineStream? = null
                    try {
                        // Store reference to old stream and clear shared variable
                        oldStream = stream
                        stream = null
                        
                        // Create new stream first
                        val newStream = audioTagging?.createStream()
                        if (newStream == null) {
                            throw Exception("Failed to create new audio stream")
                        }
                        
                        // Only after new stream is successfully created, release the old one
                        try {
                            oldStream?.release()
                        } catch (e: Exception) {
                            Log.e(TAG, "Non-fatal error releasing old stream: ${e.message}")
                            // Continue even if there's an error releasing the old stream
                        }
                        
                        // Set the new stream
                        stream = newStream
                        
                        // Feed the samples to the stream
                        stream?.acceptWaveform(audioData.samples, audioData.sampleRate)
                        
                        val resultMap = Arguments.createMap()
                        resultMap.putBoolean("success", true)
                        resultMap.putString("message", "Audio file processed successfully")
                        resultMap.putInt("sampleRate", audioData.sampleRate)
                        resultMap.putInt("samplesLength", audioData.samples.size)
                        resultMap.putString("inputType", "file")
                        resultMap.putInt("samplesProcessed", audioData.samples.size)
                        
                        reactContext.runOnUiQueueThread {
                            promise.resolve(resultMap)
                        }
                    } catch (e: Exception) {
                        // Restore the old stream if something went wrong
                        if (stream == null && oldStream != null) {
                            stream = oldStream
                            oldStream = null // Prevent release
                        }
                        Log.e(TAG, "Error processing audio stream: ${e.message}")
                        throw e
                    } finally {
                        // Ensure old stream is released if not restored
                        try {
                            oldStream?.release()
                        } catch (e: Exception) {
                            Log.e(TAG, "Error releasing old stream in finally block: ${e.message}")
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing audio data: ${e.message}")
                    throw e
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error processing audio file: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_PROCESS_AUDIO_FILE", "Failed to process audio file: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Release AudioTagging resources
     */
    private fun releaseAudioTaggingResources() {
        try {
            // Use non-null assertion only when we're sure stream is not null
            // First nullify the reference before releasing to avoid racing conditions with GC
            val streamToRelease = stream
            stream = null
            
            // Then safely release the stream reference
            try {
                streamToRelease?.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing stream: ${e.message}")
            }
            
            // Then release the main AudioTagging object
            val taggerToRelease = audioTagging
            audioTagging = null
            
            if (taggerToRelease != null) {
                try {
                    taggerToRelease.release()
                    Log.i(TAG, "Released AudioTagging resources")
                } catch (e: Exception) {
                    Log.e(TAG, "Error releasing AudioTagging: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in releaseAudioTaggingResources: ${e.message}")
        }
    }
} 