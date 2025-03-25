/**
 * Handler for Automatic Speech Recognition (ASR) functionality
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
     * Initialize ASR with the provided model configuration
     */
    fun init(modelConfig: ReadableMap, promise: Promise) {
        if (!SherpaOnnxModule.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }
        
        executor.execute {
            try {
                Log.i(TAG, "===== ASR INITIALIZATION START =====")
                Log.i(TAG, "Received model config: ${modelConfig.toHashMap()}")
                
                // Extract paths from config
                val modelDir = AssetUtils.cleanFilePath(modelConfig.getString("modelDir") ?: "")
                val modelFile = modelConfig.getString("modelFile") ?: "encoder.onnx"
                val decoderFile = modelConfig.getString("decoderFile") ?: "decoder.onnx"
                val joinerFile = modelConfig.getString("joinerFile") ?: "joiner.onnx"
                val tokensFile = modelConfig.getString("tokensFile") ?: "tokens.txt"
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 1
                val sampleRate = if (modelConfig.hasKey("sampleRate")) modelConfig.getInt("sampleRate") else 16000
                val featureDim = if (modelConfig.hasKey("featureDim")) modelConfig.getInt("featureDim") else 80
                val decodingMethod = modelConfig.getString("decodingMethod") ?: "greedy_search"
                val enableEndpoint = !modelConfig.hasKey("enableEndpoint") || modelConfig.getBoolean("enableEndpoint")
                
                Log.i(TAG, "Using configuration:")
                Log.i(TAG, "- modelDir: $modelDir")
                Log.i(TAG, "- modelFile: $modelFile")
                Log.i(TAG, "- decoderFile: $decoderFile")
                Log.i(TAG, "- joinerFile: $joinerFile")
                Log.i(TAG, "- tokensFile: $tokensFile")
                Log.i(TAG, "- numThreads: $numThreads")
                Log.i(TAG, "- sampleRate: $sampleRate")
                Log.i(TAG, "- decodingMethod: $decodingMethod")
                Log.i(TAG, "- enableEndpoint: $enableEndpoint")
                
                // Verify files exist
                val modelPath = File(modelDir, modelFile)
                val decoderPath = File(modelDir, decoderFile)
                val joinerPath = File(modelDir, joinerFile)
                val tokensPath = File(modelDir, tokensFile)
                
                if (!modelPath.exists() || !decoderPath.exists() || 
                    !joinerPath.exists() || !tokensPath.exists()) {
                    throw Exception("One or more model files not found")
                }
                
                // Create feature configuration
                val featConfig = FeatureConfig()
                featConfig.sampleRate = sampleRate
                featConfig.featureDim = featureDim
                
                // Create transducer model configuration
                val transducerConfig = OfflineTransducerModelConfig()
                transducerConfig.encoder = modelPath.absolutePath
                transducerConfig.decoder = decoderPath.absolutePath
                transducerConfig.joiner = joinerPath.absolutePath
                
                // Create model configuration
                val modelConfig = OfflineModelConfig()
                modelConfig.transducer = transducerConfig
                modelConfig.tokens = tokensPath.absolutePath
                
                // Set debug level using reflection since direct property access is giving errors
                try {
                    val debugField = modelConfig.javaClass.getDeclaredField("debugLevel")
                    debugField.isAccessible = true
                    debugField.setInt(modelConfig, 0)
                    Log.i(TAG, "Debug level set via reflection")
                } catch (e: Exception) {
                    Log.w(TAG, "Could not set debugLevel via reflection: ${e.message}")
                }
                
                modelConfig.provider = "cpu"
                modelConfig.numThreads = numThreads
                
                // Create recognizer configuration
                val config = OfflineRecognizerConfig()
                
                // Set feature config using reflection
                try {
                    val featureConfigField = config.javaClass.getDeclaredField("featureConfig")
                    featureConfigField.isAccessible = true
                    featureConfigField.set(config, featConfig)
                    Log.i(TAG, "Feature config set via reflection")
                } catch (e: Exception) {
                    Log.w(TAG, "Could not set featureConfig via reflection: ${e.message}")
                }
                
                // Set model using reflection
                try {
                    val modelField = config.javaClass.getDeclaredField("model")
                    modelField.isAccessible = true
                    modelField.set(config, modelConfig)
                    Log.i(TAG, "Model config set via reflection")
                } catch (e: Exception) {
                    Log.w(TAG, "Could not set model via reflection: ${e.message}")
                }
                
                config.decodingMethod = decodingMethod
                
                // Set enableEndpoint using reflection
                try {
                    val endpointField = config.javaClass.getDeclaredField("enableEndpoint")
                    endpointField.isAccessible = true
                    endpointField.setBoolean(config, enableEndpoint)
                    Log.i(TAG, "Enable endpoint set via reflection")
                } catch (e: Exception) {
                    Log.w(TAG, "Could not set enableEndpoint via reflection: ${e.message}")
                }
                
                // Use default values for beam search if applicable
                if (decodingMethod == "beam_search") {
                    config.maxActivePaths = DEFAULT_MAX_ACTIVE_PATHS
                }
                
                // Initialize the recognizer
                offlineRecognizer = OfflineRecognizer(null, config)
                
                // Check if initialization was successful
                if (offlineRecognizer == null) {
                    throw Exception("Failed to initialize ASR engine")
                }
                
                // Get sample rate using reflection
                val actualSampleRate = try {
                    val srMethod = offlineRecognizer?.javaClass?.getMethod("sampleRate")
                    srMethod?.invoke(offlineRecognizer) as? Int ?: sampleRate
                } catch (e: Exception) {
                    Log.w(TAG, "Could not get sampleRate via reflection: ${e.message}")
                    sampleRate
                }
                
                Log.i(TAG, "ASR initialized successfully with sample rate: $actualSampleRate")
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", actualSampleRate)
                
                Log.i(TAG, "===== ASR INITIALIZATION COMPLETE =====")
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing ASR: ${e.message}")
                e.printStackTrace()
                
                // Release resources in case of error
                releaseResources()
                
                Log.i(TAG, "===== ASR INITIALIZATION FAILED =====")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_INIT", "Failed to initialize ASR: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Recognize speech from audio samples
     */
    fun recognizeFromSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                if (offlineRecognizer == null) {
                    throw Exception("ASR is not initialized")
                }
                
                // Convert ReadableArray to FloatArray
                val samples = FloatArray(audioBuffer.size())
                for (i in 0 until audioBuffer.size()) {
                    samples[i] = audioBuffer.getDouble(i).toFloat()
                }
                
                // Create stream
                val stream = offlineRecognizer?.createStream()
                if (stream == null) {
                    throw Exception("Failed to create stream")
                }
                
                // Accept waveform
                stream.acceptWaveform(samples, sampleRate)
                
                // Decode
                val text = offlineRecognizer?.decode(stream) ?: ""
                
                // Release stream
                stream.release()
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("text", text.toString())
                resultMap.putInt("samplesProcessed", samples.size)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error recognizing from samples: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RECOGNIZE", "Failed to recognize speech: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Recognize speech from an audio file
     */
    fun recognizeFromFile(filePath: String, promise: Promise) {
        executor.execute {
            try {
                if (offlineRecognizer == null) {
                    throw Exception("ASR is not initialized")
                }
                
                // Create File object from path
                val fileObj = File(AssetUtils.cleanFilePath(filePath))
                
                // Extract audio from file
                val audioData = AudioExtractor.extractAudioFromFile(fileObj)
                
                // Create stream
                val stream = offlineRecognizer?.createStream()
                if (stream == null) {
                    throw Exception("Failed to create stream")
                }
                
                // Accept waveform - handle potential null audio data safely
                if (audioData == null) {
                    throw Exception("Failed to extract audio from file")
                }
                
                // Use safe calls to get samples and sample rate
                val samples = audioData.samples ?: FloatArray(0)
                val sampleRate = audioData.sampleRate ?: 16000
                
                stream.acceptWaveform(samples, sampleRate)
                
                // Decode
                val text = offlineRecognizer?.decode(stream) ?: ""
                
                // Release stream
                stream.release()
                
                // Return results
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("text", text.toString())
                resultMap.putInt("samplesProcessed", samples.size)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error recognizing from file: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RECOGNIZE", "Failed to recognize speech: ${e.message}")
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
                releaseResources()
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing ASR resources: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RELEASE", "Failed to release ASR resources: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Release resources used by the ASR engine
     */
    private fun releaseResources() {
        try {
            offlineStream?.release()
            offlineStream = null
            
            offlineRecognizer?.release()
            offlineRecognizer = null
            
            onlineStream?.release()
            onlineStream = null
            
            onlineRecognizer?.release()
            onlineRecognizer = null
            
            Log.i(TAG, "ASR resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error in releaseResources: ${e.message}")
        }
    }

    /**
     * Initialize model-specific configuration based on a type
     * This is used internally by the init() method
     */
    private fun createModelConfig(type: String, modelPath: String, tokensPath: String, 
                                  decoderPath: String? = null, joinerPath: String? = null): OfflineModelConfig {
        try {
            Log.i(TAG, "Creating ASR model config for type: $type")
            
            val modelConfig = OfflineModelConfig()
            
            when (type) {
                "paraformer" -> {
                    // Create configuration for Paraformer model
                    try {
                        // Try to use reflection to create the Paraformer config
                        val paraformerConfigClass = Class.forName("com.k2fsa.sherpa.onnx.OfflineParaformerModelConfig")
                        val constructor = paraformerConfigClass.getConstructor()
                        val paraformerConfig = constructor.newInstance()
                        
                        // Set properties using reflection
                        val modelField = paraformerConfigClass.getDeclaredField("model")
                        modelField.isAccessible = true
                        modelField.set(paraformerConfig, modelPath)
                        
                        val tokensField = paraformerConfigClass.getDeclaredField("tokens")
                        tokensField.isAccessible = true
                        tokensField.set(paraformerConfig, tokensPath)
                        
                        // Set model config's paraformer property
                        val paraformerField = modelConfig.javaClass.getDeclaredField("paraformer")
                        paraformerField.isAccessible = true
                        paraformerField.set(modelConfig, paraformerConfig)
                        
                        Log.i(TAG, "Successfully configured paraformer model")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to configure paraformer model: ${e.message}")
                        throw Exception("Failed to configure paraformer model: ${e.message}")
                    }
                }
                "whisper" -> {
                    // Create configuration for Whisper model
                    if (decoderPath == null) {
                        throw Exception("Decoder path is required for whisper model")
                    }
                    
                    try {
                        // Try to use reflection to create the Whisper config
                        val whisperConfigClass = Class.forName("com.k2fsa.sherpa.onnx.OfflineWhisperModelConfig")
                        val constructor = whisperConfigClass.getConstructor()
                        val whisperConfig = constructor.newInstance()
                        
                        // Set properties using reflection
                        val encoderField = whisperConfigClass.getDeclaredField("encoder")
                        encoderField.isAccessible = true
                        encoderField.set(whisperConfig, modelPath)
                        
                        val decoderField = whisperConfigClass.getDeclaredField("decoder")
                        decoderField.isAccessible = true
                        decoderField.set(whisperConfig, decoderPath)
                        
                        val tokensField = whisperConfigClass.getDeclaredField("tokens")
                        tokensField.isAccessible = true
                        tokensField.set(whisperConfig, tokensPath)
                        
                        // Set model config's whisper property
                        val whisperField = modelConfig.javaClass.getDeclaredField("whisper")
                        whisperField.isAccessible = true
                        whisperField.set(modelConfig, whisperConfig)
                        
                        Log.i(TAG, "Successfully configured whisper model")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to configure whisper model: ${e.message}")
                        throw Exception("Failed to configure whisper model: ${e.message}")
                    }
                }
                "transducer", "tdnn" -> {
                    // Create configuration for Transducer/TDNN model
                    if (decoderPath == null || joinerPath == null) {
                        throw Exception("Decoder and joiner paths are required for transducer/tdnn model")
                    }
                    
                    try {
                        val transducerConfig = OfflineTransducerModelConfig()
                        transducerConfig.encoder = modelPath
                        transducerConfig.decoder = decoderPath
                        transducerConfig.joiner = joinerPath
                        
                        modelConfig.transducer = transducerConfig
                        modelConfig.tokens = tokensPath
                        
                        Log.i(TAG, "Successfully configured transducer/tdnn model")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to configure transducer/tdnn model: ${e.message}")
                        throw Exception("Failed to configure transducer/tdnn model: ${e.message}")
                    }
                }
                else -> {
                    throw Exception("Unsupported model type: $type")
                }
            }
            
            return modelConfig
        } catch (e: Exception) {
            Log.e(TAG, "Error creating model config: ${e.message}")
            throw e
        }
    }
} 