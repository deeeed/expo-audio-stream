/**
 * Handler for Automatic Speech Recognition functionality
 */
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import java.io.File
import java.io.IOException
import java.util.concurrent.Executors
import java.nio.ByteBuffer
import java.nio.ByteOrder

// Import Sherpa ONNX classes for offline recognition
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineParaformerModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineStream
import com.k2fsa.sherpa.onnx.OfflineTransducerModelConfig
import com.k2fsa.sherpa.onnx.OfflineWhisperModelConfig

// Import Sherpa ONNX classes for online recognition
import com.k2fsa.sherpa.onnx.OnlineRecognizer
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineStream
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig
import com.k2fsa.sherpa.onnx.OnlineLMConfig
import com.k2fsa.sherpa.onnx.OnlineCtcFstDecoderConfig

/**
 * Handler for Automatic Speech Recognition functionality in Sherpa-ONNX
 * Provides methods to initialize the ASR engine, recognize audio from
 * samples or files, and clean up resources.
 * 
 * Supports both offline and streaming (online) recognition.
 */
@RequiresApi(Build.VERSION_CODES.CUPCAKE)
class ASRHandler(private val reactContext: ReactApplicationContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    
    // Offline recognition components
    private var offlineRecognizer: OfflineRecognizer? = null
    private var offlineStream: OfflineStream? = null
    
    // Online (streaming) recognition components
    private var onlineRecognizer: OnlineRecognizer? = null
    private var onlineStream: OnlineStream? = null
    
    private var isRecognizing = false
    private var isStreaming = false
    
    companion object {
        private const val TAG = "SherpaOnnxASR"
        private const val DEFAULT_SAMPLE_RATE = 16000
        private const val DEFAULT_FEATURE_DIM = 80
        private const val DEFAULT_DEBUG = false
        private const val DEFAULT_PROVIDER = "cpu"
        private const val DEFAULT_NUM_THREADS = 2
        private const val DEFAULT_DECODING_METHOD = "greedy_search"
        private const val DEFAULT_MAX_ACTIVE_PATHS = 4
        private const val DEFAULT_STREAMING = false
    }
    
    /**
     * Initialize the ASR engine with the provided model configuration
     */
    fun init(modelConfig: ReadableMap, promise: Promise) {
        if (!SherpaOnnxModule.isLibraryLoaded) {
            Log.e(TAG, "❌ Sherpa ONNX library is not loaded")
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                Log.i(TAG, "🚀 ===== ASR INITIALIZATION START =====")
                Log.d(TAG, "📦 Received model config: ${modelConfig.toHashMap()}")
                
                // Extract paths from config
                val modelDir = modelConfig.getString("modelDir")?.replace("file://", "") ?: ""
                val modelType = modelConfig.getString("modelType") ?: "transducer"
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else DEFAULT_NUM_THREADS
                val modelFiles = modelConfig.getMap("modelFiles") ?: throw Exception("modelFiles is required")
                
                // Check if model name contains 'streaming' to automatically set streaming mode
                val isStreamingModel = modelDir.contains("streaming", ignoreCase = true)
                val isStreaming = if (modelConfig.hasKey("streaming")) 
                    modelConfig.getBoolean("streaming") 
                else 
                    isStreamingModel || DEFAULT_STREAMING
                
                Log.i(TAG, """
                    📂 Model Configuration:
                    - Directory: $modelDir
                    - Type: $modelType
                    - Threads: $numThreads
                    - Streaming: $isStreaming
                    - Files Config: ${modelFiles.toHashMap()}
                """.trimIndent())
                
                // Clean up any existing resources first
                releaseResources()
                
                // Validate files exist
                val modelPaths = mutableMapOf<String, String>()
                
                // Check required files based on model type
                when (modelType) {
                    "whisper" -> {
                        // Check if we're using encoder/decoder format vs single file
                        val hasEncoder = modelFiles.hasKey("encoder") && !modelFiles.getString("encoder").isNullOrEmpty()
                        val hasDecoder = modelFiles.hasKey("decoder") && !modelFiles.getString("decoder").isNullOrEmpty()
                        
                        if (hasEncoder && hasDecoder) {
                            // This is the encoder/decoder model format
                            Log.w(TAG, "⚠️ Detected encoder/decoder Whisper format, but native library only supports single model file")
                            
                            // Check for the files
                            val encoderPath = "${modelDir}/${modelFiles.getString("encoder")}"
                            val decoderPath = "${modelDir}/${modelFiles.getString("decoder")}"
                            val tokensPath = "${modelDir}/${modelFiles.getString("tokens")}"
                            
                            // Verify files exist
                            val encoderFile = File(encoderPath)
                            val decoderFile = File(decoderPath)
                            val tokensFile = File(tokensPath)
                            
                            Log.d(TAG, """
                                🔍 Checking Whisper encoder-decoder model files:
                                - Encoder: ${encoderFile.absolutePath} (exists: ${encoderFile.exists()}, size: ${encoderFile.length()})
                                - Decoder: ${decoderFile.absolutePath} (exists: ${decoderFile.exists()}, size: ${decoderFile.length()})
                                - Tokens: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})
                            """.trimIndent())
                            
                            if (!encoderFile.exists()) throw Exception("Encoder file not found: ${encoderFile.absolutePath}")
                            if (!decoderFile.exists()) throw Exception("Decoder file not found: ${decoderFile.absolutePath}")
                            if (!tokensFile.exists()) throw Exception("Tokens file not found: ${tokensFile.absolutePath}")
                            
                            // For now, use the encoder as the main model file
                            // This won't work correctly but allows us to pass validation
                            modelPaths["model"] = encoderFile.absolutePath
                            modelPaths["tokens"] = tokensFile.absolutePath
                            
                            throw Exception("This Whisper model uses encoder-decoder format which is not supported by the native library. Please use a single-file Whisper model.")
                        } else {
                            // Traditional single-file Whisper model
                            val modelFile = File(modelDir, modelFiles.getString("model") ?: "model.onnx")
                            val tokensFile = File(modelDir, modelFiles.getString("tokens") ?: "tokens.txt")
                            
                            Log.d(TAG, """
                                🔍 Checking Whisper single-file model files:
                                - Model: ${modelFile.absolutePath} (exists: ${modelFile.exists()}, size: ${modelFile.length()})
                                - Tokens: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})
                            """.trimIndent())
                            
                            if (!modelFile.exists()) throw Exception("Model file not found: ${modelFile.absolutePath}")
                            if (!tokensFile.exists()) throw Exception("Tokens file not found: ${tokensFile.absolutePath}")
                            
                            modelPaths["model"] = modelFile.absolutePath
                            modelPaths["tokens"] = tokensFile.absolutePath
                        }
                    }
                    "paraformer" -> {
                        val encoderFile = File(modelDir, modelFiles.getString("encoder") ?: "encoder.onnx")
                        val decoderFile = File(modelDir, modelFiles.getString("decoder") ?: "decoder.onnx")
                        val tokensFile = File(modelDir, modelFiles.getString("tokens") ?: "tokens.txt")
                        
                        Log.d(TAG, """
                            🔍 Checking Paraformer model files:
                            - Encoder: ${encoderFile.absolutePath} (exists: ${encoderFile.exists()}, size: ${encoderFile.length()})
                            - Decoder: ${decoderFile.absolutePath} (exists: ${decoderFile.exists()}, size: ${decoderFile.length()})
                            - Tokens: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})
                        """.trimIndent())
                        
                        if (!encoderFile.exists()) throw Exception("Encoder file not found: ${encoderFile.absolutePath}")
                        if (!decoderFile.exists()) throw Exception("Decoder file not found: ${decoderFile.absolutePath}")
                        if (!tokensFile.exists()) throw Exception("Tokens file not found: ${tokensFile.absolutePath}")
                        
                        modelPaths["encoder"] = encoderFile.absolutePath
                        modelPaths["decoder"] = decoderFile.absolutePath
                        modelPaths["tokens"] = tokensFile.absolutePath
                    }
                    else -> {
                        val encoderFile = File(modelDir, modelFiles.getString("encoder") ?: "encoder.onnx")
                        val decoderFile = File(modelDir, modelFiles.getString("decoder") ?: "decoder.onnx")
                        val joinerFile = File(modelDir, modelFiles.getString("joiner") ?: "joiner.onnx")
                        val tokensFile = File(modelDir, modelFiles.getString("tokens") ?: "tokens.txt")
                        
                        Log.d(TAG, """
                            🔍 Checking Transducer model files:
                            - Encoder: ${encoderFile.absolutePath} (exists: ${encoderFile.exists()}, size: ${encoderFile.length()})
                            - Decoder: ${decoderFile.absolutePath} (exists: ${decoderFile.exists()}, size: ${decoderFile.length()})
                            - Joiner: ${joinerFile.absolutePath} (exists: ${joinerFile.exists()}, size: ${joinerFile.length()})
                            - Tokens: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})
                        """.trimIndent())
                        
                        if (!encoderFile.exists()) throw Exception("Encoder file not found: ${encoderFile.absolutePath}")
                        if (!decoderFile.exists()) throw Exception("Decoder file not found: ${decoderFile.absolutePath}")
                        if (!joinerFile.exists()) throw Exception("Joiner file not found: ${joinerFile.absolutePath}")
                        if (!tokensFile.exists()) throw Exception("Tokens file not found: ${tokensFile.absolutePath}")
                        
                        modelPaths["encoder"] = encoderFile.absolutePath
                        modelPaths["decoder"] = decoderFile.absolutePath
                        modelPaths["joiner"] = joinerFile.absolutePath
                        modelPaths["tokens"] = tokensFile.absolutePath
                    }
                }
                
                Log.i(TAG, "✅ All required model files found and validated")
                
                // Create and set up feature configuration
                val featureConfig = FeatureConfig()
                featureConfig.sampleRate = DEFAULT_SAMPLE_RATE
                featureConfig.featureDim = DEFAULT_FEATURE_DIM
                
                Log.d(TAG, """
                    🎯 Feature Configuration:
                    - Sample Rate: $DEFAULT_SAMPLE_RATE
                    - Feature Dimension: $DEFAULT_FEATURE_DIM
                """.trimIndent())
                
                if (isStreaming) {
                    // Initialize online recognizer
                    initializeOnlineRecognizer(modelType, modelPaths, numThreads, featureConfig, modelConfig)
                    this.isStreaming = true
                } else {
                    // Initialize offline recognizer
                    initializeOfflineRecognizer(modelType, modelPaths, numThreads, featureConfig, modelConfig)
                    this.isStreaming = false
                }
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("modelType", modelType)
                resultMap.putBoolean("streaming", isStreaming)
                resultMap.putDouble("sampleRate", DEFAULT_SAMPLE_RATE.toDouble())
                
                Log.i(TAG, "✨ ===== ASR INITIALIZATION COMPLETE =====")
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error initializing ASR: ${e.message}")
                e.printStackTrace()
                
                // Release resources in case of error
                releaseResources()
                
                Log.i(TAG, "💥 ===== ASR INITIALIZATION FAILED =====")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_INIT", "Failed to initialize ASR: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Initialize offline recognition engine
     */
    private fun initializeOfflineRecognizer(
        modelType: String,
        modelPaths: Map<String, String>,
        numThreads: Int,
        featureConfig: FeatureConfig,
        modelConfig: com.facebook.react.bridge.ReadableMap
    ) {
        // Initialize model with validated paths
        val config = OfflineRecognizerConfig()
        
        // Set feature configuration
        config.featConfig = featureConfig
        
        // Set model configuration
        val offlineModelConfig = OfflineModelConfig()
        offlineModelConfig.debug = DEFAULT_DEBUG
        offlineModelConfig.provider = DEFAULT_PROVIDER
        offlineModelConfig.numThreads = numThreads
        offlineModelConfig.tokens = modelPaths["tokens"] ?: ""
        offlineModelConfig.modelType = modelType
        
        // Configure model type specific settings
        when (modelType) {
            "whisper" -> {
                val whisperConfig = OfflineWhisperModelConfig()
                whisperConfig.model = modelPaths["model"] ?: ""
                offlineModelConfig.whisper = whisperConfig
                Log.d(TAG, "🎯 Configured Whisper model: ${modelPaths["model"]}")
            }
            "paraformer" -> {
                val paraformerConfig = OfflineParaformerModelConfig()
                paraformerConfig.encoder = modelPaths["encoder"] ?: ""
                paraformerConfig.decoder = modelPaths["decoder"] ?: ""
                offlineModelConfig.paraformer = paraformerConfig
                Log.d(TAG, """
                    🎯 Configured Paraformer model:
                    - Encoder: ${modelPaths["encoder"]}
                    - Decoder: ${modelPaths["decoder"]}
                """.trimIndent())
            }
            else -> {
                val transducerConfig = OfflineTransducerModelConfig()
                transducerConfig.encoder = modelPaths["encoder"] ?: ""
                transducerConfig.decoder = modelPaths["decoder"] ?: ""
                transducerConfig.joiner = modelPaths["joiner"] ?: ""
                offlineModelConfig.transducer = transducerConfig
                Log.d(TAG, """
                    🎯 Configured Transducer model:
                    - Encoder: ${modelPaths["encoder"]}
                    - Decoder: ${modelPaths["decoder"]}
                    - Joiner: ${modelPaths["joiner"]}
                """.trimIndent())
            }
        }
        
        // Set model config
        config.modelConfig = offlineModelConfig
        
        // Set decoding options
        config.decodingMethod = modelConfig.getString("decodingMethod") ?: DEFAULT_DECODING_METHOD
        config.maxActivePaths = if (modelConfig.hasKey("maxActivePaths")) {
            modelConfig.getInt("maxActivePaths")
        } else {
            DEFAULT_MAX_ACTIVE_PATHS
        }
        
        Log.d(TAG, """
            🎯 Decoding Configuration:
            - Method: ${config.decodingMethod}
            - Max Active Paths: ${config.maxActivePaths}
        """.trimIndent())
        
        // Log final configuration
        Log.d(TAG, """
            📋 Final Offline Configuration:
            - Feature Config: ${config.featConfig.sampleRate}Hz, ${config.featConfig.featureDim}dim
            - Model Config: ${config.modelConfig.modelType}, ${config.modelConfig.numThreads} threads
            - Decoding: ${config.decodingMethod}, ${config.maxActivePaths} paths
        """.trimIndent())
        
        // Validate configuration before creating recognizer
        if (config.modelConfig == null) throw Exception("Model configuration is null")
        if (config.featConfig == null) throw Exception("Feature configuration is null")
        if (config.decodingMethod == null || config.decodingMethod.isEmpty()) throw Exception("Decoding method is not set")
        
        // Initialize recognizer
        Log.i(TAG, "🔄 Creating offline recognizer with validated configuration")
        try {
            // Create recognizer with config
            offlineRecognizer = OfflineRecognizer(null, config)
            Log.i(TAG, "✅ Offline recognizer created successfully")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to create offline recognizer: ${e.message}")
            Log.e(TAG, "❌ Stack trace: ${e.stackTraceToString()}")
            throw e
        }
    }
    
    /**
     * Initialize online (streaming) recognition engine
     */
    private fun initializeOnlineRecognizer(
        modelType: String,
        modelPaths: Map<String, String>,
        numThreads: Int,
        featureConfig: FeatureConfig,
        modelConfig: com.facebook.react.bridge.ReadableMap
    ) {
        // Initialize model with validated paths
        val config = OnlineRecognizerConfig()
        
        // Set feature configuration
        config.featConfig = featureConfig
        
        // Set model configuration
        val onlineModelConfig = OnlineModelConfig()
        onlineModelConfig.debug = DEFAULT_DEBUG
        onlineModelConfig.provider = DEFAULT_PROVIDER
        onlineModelConfig.numThreads = numThreads
        onlineModelConfig.tokens = modelPaths["tokens"] ?: ""
        onlineModelConfig.modelType = modelType
        
        // Configure model type specific settings
        // Currently only Transducer model is supported for streaming (online) recognition
        if (modelType != "transducer" && modelType != "zipformer" && modelType != "zipformer2") {
            throw Exception("Only Transducer/Zipformer models are supported for streaming recognition")
        }
        
        val transducerConfig = OnlineTransducerModelConfig()
        transducerConfig.encoder = modelPaths["encoder"] ?: ""
        transducerConfig.decoder = modelPaths["decoder"] ?: ""
        transducerConfig.joiner = modelPaths["joiner"] ?: ""
        onlineModelConfig.transducer = transducerConfig
        
        Log.d(TAG, """
            🎯 Configured Online Transducer model:
            - Encoder: ${modelPaths["encoder"]}
            - Decoder: ${modelPaths["decoder"]}
            - Joiner: ${modelPaths["joiner"]}
        """.trimIndent())
        
        // Set model config
        config.modelConfig = onlineModelConfig
        
        // Set decoding options
        config.decodingMethod = modelConfig.getString("decodingMethod") ?: DEFAULT_DECODING_METHOD
        config.maxActivePaths = if (modelConfig.hasKey("maxActivePaths")) {
            modelConfig.getInt("maxActivePaths")
        } else {
            DEFAULT_MAX_ACTIVE_PATHS
        }
        
        // Log final configuration
        Log.d(TAG, """
            📋 Final Online Configuration:
            - Feature Config: ${config.featConfig.sampleRate}Hz, ${config.featConfig.featureDim}dim
            - Model Config: ${onlineModelConfig.numThreads} threads
            - Decoding: ${config.decodingMethod}, ${config.maxActivePaths} paths
        """.trimIndent())
        
        // Initialize recognizer
        Log.i(TAG, "🔄 Creating online recognizer with validated configuration")
        try {
            // Create recognizer with config
            onlineRecognizer = OnlineRecognizer(null, config)
            Log.i(TAG, "✅ Online recognizer created successfully")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to create online recognizer: ${e.message}")
            Log.e(TAG, "❌ Stack trace: ${e.stackTraceToString()}")
            throw e
        }
    }
    
    /**
     * Recognize speech from audio samples (offline mode)
     */
    fun recognizeFromSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                if (isStreaming) {
                    Log.e(TAG, "❌ Cannot use recognizeFromSamples with streaming mode, use streamAudio instead")
                    throw Exception("Wrong recognition mode: use streamAudio for streaming recognition")
                }
                
                if (offlineRecognizer == null) {
                    Log.e(TAG, "❌ Offline ASR is not initialized")
                    throw Exception("Offline ASR is not initialized")
                }
                
                if (isRecognizing) {
                    Log.e(TAG, "❌ ASR is already processing audio")
                    throw Exception("ASR is already processing audio")
                }
                
                Log.i(TAG, "🎤 Starting recognition of ${audioBuffer.size()} samples at ${sampleRate}Hz")
                isRecognizing = true
                
                // Convert JS array to float array
                val samples = FloatArray(audioBuffer.size())
                for (i in 0 until audioBuffer.size()) {
                    samples[i] = audioBuffer.getDouble(i).toFloat()
                }
                
                Log.d(TAG, "📊 Converted audio buffer to float array")
                
                // Create a new stream
                offlineStream = offlineRecognizer!!.createStream()
                Log.d(TAG, "🌊 Created new recognition stream")
                
                // Add the samples to the stream
                offlineStream?.acceptWaveform(samples, sampleRate)
                Log.d(TAG, "➡️ Added samples to recognition stream")
                
                // Perform recognition
                val startTime = System.currentTimeMillis()
                Log.i(TAG, "🔄 Starting recognition process")
                val result = offlineRecognizer!!.decode(offlineStream!!)
                val endTime = System.currentTimeMillis()
                val duration = endTime - startTime
                
                Log.i(TAG, """
                    ✨ Recognition completed:
                    - Duration: ${duration}ms
                    - Text: "${result.text}"
                """.trimIndent())
                
                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("text", result.text)
                resultMap.putInt("durationMs", duration.toInt())
                
                isRecognizing = false
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                isRecognizing = false
                Log.e(TAG, "❌ Error recognizing speech: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RECOGNIZE", "Failed to recognize speech: ${e.message}")
                }
            } finally {
                // Clean up stream
                offlineStream?.release()
                offlineStream = null
                Log.d(TAG, "🧹 Cleaned up recognition stream")
            }
        }
    }
    
    /**
     * Initialize streaming recognition
     */
    fun startStreaming(promise: Promise) {
        executor.execute {
            try {
                if (!isStreaming) {
                    Log.e(TAG, "❌ ASR is not in streaming mode")
                    throw Exception("ASR is not in streaming mode")
                }
                
                if (onlineRecognizer == null) {
                    Log.e(TAG, "❌ Online ASR is not initialized")
                    throw Exception("Online ASR is not initialized")
                }
                
                if (isRecognizing) {
                    Log.e(TAG, "❌ ASR is already processing audio")
                    throw Exception("ASR is already processing audio")
                }
                
                // Create a new stream
                onlineStream = onlineRecognizer!!.createStream()
                isRecognizing = true
                
                Log.i(TAG, "🎧 Started streaming recognition")
                
                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                isRecognizing = false
                Log.e(TAG, "❌ Error starting streaming: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_STREAM_START", "Failed to start streaming: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Process audio chunks for streaming recognition
     */
    fun streamAudio(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                if (!isStreaming) {
                    Log.e(TAG, "❌ ASR is not in streaming mode")
                    throw Exception("ASR is not in streaming mode")
                }
                
                if (onlineRecognizer == null || onlineStream == null) {
                    Log.e(TAG, "❌ Streaming not started or initialized")
                    throw Exception("Streaming not started or initialized")
                }
                
                if (!isRecognizing) {
                    Log.e(TAG, "❌ Streaming not active, call startStreaming first")
                    throw Exception("Streaming not active, call startStreaming first")
                }
                
                // Convert JS array to float array
                val samples = FloatArray(audioBuffer.size())
                for (i in 0 until audioBuffer.size()) {
                    samples[i] = audioBuffer.getDouble(i).toFloat()
                }
                
                // Add the samples to the stream
                onlineStream?.acceptWaveform(sampleRate, samples)
                
                // Process the audio (decode)
                onlineRecognizer!!.decode(onlineStream!!)
                
                // Check if we have results and if the recognizer is ready
                val isReady = onlineRecognizer!!.isReady(onlineStream!!)
                val result = if (isReady) onlineRecognizer!!.getResult(onlineStream!!) else null
                
                // Check if we've reached an endpoint (silence or end of utterance)
                val isEndpoint = onlineRecognizer!!.isEndpoint(onlineStream!!)
                
                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putBoolean("isReady", isReady)
                resultMap.putBoolean("isEndpoint", isEndpoint)
                
                if (result != null) {
                    resultMap.putString("text", result.text)
                    
                    // If we reached an endpoint, we can reset the stream
                    if (isEndpoint) {
                        onlineRecognizer!!.reset(onlineStream!!)
                        resultMap.putBoolean("utteranceComplete", true)
                    }
                }
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error streaming audio: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_STREAM", "Failed to process streaming audio: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Stop streaming recognition
     */
    fun stopStreaming(promise: Promise) {
        executor.execute {
            try {
                if (!isStreaming) {
                    Log.e(TAG, "❌ ASR is not in streaming mode")
                    throw Exception("ASR is not in streaming mode")
                }
                
                if (!isRecognizing) {
                    Log.i(TAG, "ℹ️ Streaming is not active, nothing to stop")
                    
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", true)
                    resultMap.putString("text", "")
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                // Get final result before stopping
                var finalText = ""
                if (onlineRecognizer != null && onlineStream != null) {
                    try {
                        // Try to get final result
                        val result = onlineRecognizer!!.getResult(onlineStream!!)
                        finalText = result.text
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Error getting final result: ${e.message}")
                    }
                }
                
                // Clean up stream
                onlineStream?.release()
                onlineStream = null
                
                isRecognizing = false
                
                Log.i(TAG, "🛑 Stopped streaming recognition with final text: \"$finalText\"")
                
                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("text", finalText)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                isRecognizing = false
                Log.e(TAG, "❌ Error stopping streaming: ${e.message}")
                e.printStackTrace()
                
                // Still clean up resources
                onlineStream?.release()
                onlineStream = null
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_STREAM_STOP", "Failed to stop streaming: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Recognize speech from an audio file (offline mode only)
     */
    fun recognizeFromFile(filePath: String, promise: Promise) {
        executor.execute {
            try {
                if (isStreaming) {
                    Log.e(TAG, "❌ Cannot use recognizeFromFile with streaming mode")
                    throw Exception("Wrong recognition mode: streaming mode doesn't support file recognition")
                }
                
                if (offlineRecognizer == null) {
                    Log.e(TAG, "❌ Offline ASR is not initialized")
                    throw Exception("Offline ASR is not initialized")
                }
                
                if (isRecognizing) {
                    Log.e(TAG, "❌ ASR is already processing audio")
                    throw Exception("ASR is already processing audio")
                }
                
                // Clean file path for native use
                val cleanFilePath = filePath.replace("file://", "")
                
                Log.i(TAG, "🎵 Processing audio file: $cleanFilePath")
                isRecognizing = true
                
                // Load the audio file
                val audioData = AudioExtractor.extractAudioFromFile(File(cleanFilePath))
                if (audioData == null) {
                    throw Exception("Failed to load audio file")
                }
                
                Log.d(TAG, """
                    📊 Audio file loaded:
                    - Samples: ${audioData.samples.size}
                    - Sample Rate: ${audioData.sampleRate}Hz
                    - Duration: ${audioData.samples.size / audioData.sampleRate.toFloat()}s
                """.trimIndent())
                
                // Create a new stream
                offlineStream = offlineRecognizer!!.createStream()
                Log.d(TAG, "🌊 Created new recognition stream")
                
                // Add the samples to the stream
                offlineStream?.acceptWaveform(audioData.samples, audioData.sampleRate)
                Log.d(TAG, "➡️ Added samples to recognition stream")
                
                // Perform recognition
                val startTime = System.currentTimeMillis()
                Log.i(TAG, "🔄 Starting recognition process")
                val result = offlineRecognizer!!.decode(offlineStream!!)
                val endTime = System.currentTimeMillis()
                val duration = endTime - startTime
                
                Log.i(TAG, """
                    ✨ Recognition completed:
                    - Duration: ${duration}ms
                    - Text: "${result.text}"
                """.trimIndent())
                
                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("text", result.text)
                resultMap.putInt("durationMs", duration.toInt())
                resultMap.putInt("sampleRate", audioData.sampleRate)
                resultMap.putInt("samplesLength", audioData.samples.size)
                
                isRecognizing = false
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                isRecognizing = false
                Log.e(TAG, "❌ Error recognizing speech from file: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RECOGNIZE_FILE", "Failed to recognize speech from file: ${e.message}")
                }
            } finally {
                // Clean up stream
                offlineStream?.release()
                offlineStream = null
                Log.d(TAG, "🧹 Cleaned up recognition stream")
            }
        }
    }
    
    /**
     * Release ASR resources
     */
    fun release(promise: Promise) {
        executor.execute {
            try {
                releaseResources()
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("released", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing ASR: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RELEASE", "Failed to release ASR resources: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Release ASR resources
     */
    private fun releaseResources() {
        // Release offline resources
        offlineStream?.release()
        offlineStream = null
        
        offlineRecognizer?.release()
        offlineRecognizer = null
        
        // Release online resources
        onlineStream?.release()
        onlineStream = null
        
        onlineRecognizer?.release()
        onlineRecognizer = null
        
        isRecognizing = false
        isStreaming = false
    }
} 