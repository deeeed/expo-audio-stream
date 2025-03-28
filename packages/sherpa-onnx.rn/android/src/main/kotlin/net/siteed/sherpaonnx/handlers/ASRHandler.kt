/**
 * Handler for Automatic Speech Recognition (ASR) functionality
 */
package net.siteed.sherpaonnx.handlers

import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import net.siteed.sherpaonnx.SherpaOnnxImpl
import net.siteed.sherpaonnx.utils.AssetUtils
import net.siteed.sherpaonnx.utils.AudioExtractor
import java.io.File
import java.util.concurrent.Executors

// Import Sherpa ONNX classes for offline recognition
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineParaformerModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineStream
import com.k2fsa.sherpa.onnx.OfflineTransducerModelConfig
import com.k2fsa.sherpa.onnx.OfflineWhisperModelConfig
import com.k2fsa.sherpa.onnx.OfflineNemoEncDecCtcModelConfig
import com.k2fsa.sherpa.onnx.OfflineMoonshineModelConfig
import com.k2fsa.sherpa.onnx.OfflineSenseVoiceModelConfig
import com.k2fsa.sherpa.onnx.OfflineFireRedAsrModelConfig

// Import Sherpa ONNX classes for online recognition
import com.k2fsa.sherpa.onnx.OnlineRecognizer
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineStream
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig

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
    
    // Keep track of ASR configuration
    private var asrModelConfig: ReadableMap? = null
    
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
        if (!SherpaOnnxImpl.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }
        
        // Store the configuration for later reference
        this.asrModelConfig = modelConfig
        
        executor.execute {
            try {
                Log.i(TAG, "===== ASR INITIALIZATION START =====")
                Log.i(TAG, "Received model config: ${modelConfig.toHashMap()}")
                
                // Extract common parameters from config
                val modelDir = AssetUtils.cleanFilePath(modelConfig.getString("modelDir") ?: "")
                val modelType = modelConfig.getString("modelType") ?: "transducer"
                val streaming = if (modelConfig.hasKey("streaming")) modelConfig.getBoolean("streaming") else false
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else DEFAULT_NUM_THREADS
                val sampleRate = if (modelConfig.hasKey("sampleRate")) modelConfig.getInt("sampleRate") else DEFAULT_SAMPLE_RATE
                val featureDim = if (modelConfig.hasKey("featureDim")) modelConfig.getInt("featureDim") else DEFAULT_FEATURE_DIM
                val decodingMethod = modelConfig.getString("decodingMethod") ?: DEFAULT_DECODING_METHOD
                val maxActivePaths = if (modelConfig.hasKey("maxActivePaths")) modelConfig.getInt("maxActivePaths") else DEFAULT_MAX_ACTIVE_PATHS
                val debug = if (modelConfig.hasKey("debug")) modelConfig.getBoolean("debug") else DEFAULT_DEBUG
                val provider = modelConfig.getString("provider") ?: DEFAULT_PROVIDER
                
                Log.i(TAG, "Using configuration:")
                Log.i(TAG, "- modelDir: $modelDir")
                Log.i(TAG, "- modelType: $modelType")
                Log.i(TAG, "- streaming: $streaming")
                Log.i(TAG, "- numThreads: $numThreads")
                Log.i(TAG, "- sampleRate: $sampleRate")
                Log.i(TAG, "- decodingMethod: $decodingMethod")
                Log.i(TAG, "- maxActivePaths: $maxActivePaths")
                Log.i(TAG, "- debug: $debug")
                
                // Extract model file paths
                var modelFiles: Map<String, String> = emptyMap()
                if (modelConfig.hasKey("modelFiles")) {
                    val modelFilesMap = modelConfig.getMap("modelFiles")
                    if (modelFilesMap != null) {
                        val iterator = modelFilesMap.keySetIterator()
                        val mutableModelFiles = mutableMapOf<String, String>()
                        while (iterator.hasNextKey()) {
                            val key = iterator.nextKey()
                            val value = modelFilesMap.getString(key)
                            if (value != null) {
                                mutableModelFiles[key] = value
                            }
                        }
                        modelFiles = mutableModelFiles
                    }
                }

                Log.i(TAG, "Model files: $modelFiles")
                
                // Create feature configuration
                val featConfig = FeatureConfig()
                featConfig.sampleRate = sampleRate
                featConfig.featureDim = featureDim
                
                if (streaming) {
                    // Initialize online (streaming) ASR
                    initOnlineAsr(
                        modelDir, 
                        modelType, 
                        modelFiles, 
                        numThreads, 
                        decodingMethod, 
                        maxActivePaths, 
                        debug, 
                        provider, 
                        featConfig,
                        promise
                    )
                } else {
                    // Initialize offline ASR
                    initOfflineAsr(
                        modelDir, 
                        modelType, 
                        modelFiles, 
                        numThreads, 
                        decodingMethod, 
                        maxActivePaths, 
                        debug, 
                        provider, 
                        featConfig,
                        promise
                    )
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
     * Initialize offline ASR
     */
    private fun initOfflineAsr(
        modelDir: String,
        modelType: String,
        modelFiles: Map<String, String>,
        numThreads: Int,
        decodingMethod: String,
        maxActivePaths: Int,
        debug: Boolean,
        provider: String,
        featConfig: FeatureConfig,
        promise: Promise
    ) {
        try {
            Log.i(TAG, "Initializing OFFLINE ASR with model type: $modelType")
            
            // Create model configuration based on type
            val modelConfig = createOfflineModelConfig(modelDir, modelType, modelFiles)
            
            // Set common parameters
            modelConfig.numThreads = numThreads
            modelConfig.debug = debug
            modelConfig.provider = provider
            modelConfig.modelType = modelType
            
            // Create recognizer configuration
            val config = OfflineRecognizerConfig()
            config.featConfig = featConfig
            config.modelConfig = modelConfig
            config.decodingMethod = decodingMethod
            
            // Use default values for beam search if applicable
            if (decodingMethod == "beam_search") {
                config.maxActivePaths = maxActivePaths
            }
            
            Log.i(TAG, "Creating offline recognizer with config: " +
                    "modelType=$modelType, numThreads=$numThreads, decodingMethod=$decodingMethod")
            
            // Initialize the recognizer
            offlineRecognizer = OfflineRecognizer(null, config)
            
            // Check if initialization was successful
            if (offlineRecognizer == null) {
                throw Exception("Failed to initialize ASR engine")
            }
            
            // Get sample rate from feature config
            val actualSampleRate = featConfig.sampleRate
            
            Log.i(TAG, "ASR initialized successfully with sample rate: $actualSampleRate")
            
            // Return success result
            val resultMap = Arguments.createMap()
            resultMap.putBoolean("success", true)
            resultMap.putInt("sampleRate", actualSampleRate)
            resultMap.putString("modelType", modelType)
            
            Log.i(TAG, "===== ASR INITIALIZATION COMPLETE =====")
            
            reactContext.runOnUiQueueThread {
                promise.resolve(resultMap)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing offline ASR: ${e.message}")
            e.printStackTrace()
            
            // Release resources in case of error
            releaseResources()
            
            reactContext.runOnUiQueueThread {
                promise.reject("ERR_ASR_INIT", "Failed to initialize offline ASR: ${e.message}")
            }
        }
    }
    
    /**
     * Initialize online (streaming) ASR
     */
    private fun initOnlineAsr(
        modelDir: String,
        modelType: String,
        modelFiles: Map<String, String>,
        numThreads: Int,
        decodingMethod: String,
        maxActivePaths: Int,
        debug: Boolean,
        provider: String,
        featConfig: FeatureConfig,
        promise: Promise
    ) {
        try {
            Log.i(TAG, "Initializing ONLINE (streaming) ASR with model type: $modelType")
            
            // Create model configuration based on type
            val modelConfig = createOnlineModelConfig(modelDir, modelType, modelFiles)
            
            // Set common parameters
            modelConfig.numThreads = numThreads
            modelConfig.debug = debug
            modelConfig.provider = provider
            modelConfig.modelType = modelType
            
            // Create recognizer configuration
            val config = OnlineRecognizerConfig()
            config.featConfig = featConfig
            config.modelConfig = modelConfig
            config.decodingMethod = decodingMethod
            
            // Use default values for beam search if applicable
            if (decodingMethod == "beam_search") {
                config.maxActivePaths = maxActivePaths
            }
            
            Log.i(TAG, "Creating online recognizer with config: " +
                    "modelType=$modelType, numThreads=$numThreads, decodingMethod=$decodingMethod")
            
            // Initialize the recognizer
            onlineRecognizer = OnlineRecognizer(null, config)
            
            // Check if initialization was successful
            if (onlineRecognizer == null) {
                throw Exception("Failed to initialize streaming ASR engine")
            }
            
            // Set streaming flag
            isStreaming = true
            
            // Return success result
            val resultMap = Arguments.createMap()
            resultMap.putBoolean("success", true)
            resultMap.putInt("sampleRate", featConfig.sampleRate)
            resultMap.putString("modelType", modelType)
            resultMap.putBoolean("streaming", true)
            
            Log.i(TAG, "===== STREAMING ASR INITIALIZATION COMPLETE =====")
            
            reactContext.runOnUiQueueThread {
                promise.resolve(resultMap)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing streaming ASR: ${e.message}")
            e.printStackTrace()
            
            // Release resources in case of error
            releaseResources()
            
            reactContext.runOnUiQueueThread {
                promise.reject("ERR_ASR_INIT", "Failed to initialize streaming ASR: ${e.message}")
            }
        }
    }
    
    /**
     * Create offline model configuration for the specific model type
     */
    private fun createOfflineModelConfig(
        modelDir: String,
        modelType: String,
        modelFiles: Map<String, String>
    ): OfflineModelConfig {
        val modelConfig = OfflineModelConfig()
        
        // Get tokens file path
        val tokensFile = modelFiles["tokens"] ?: "tokens.txt"
        val tokensPath = File(modelDir, tokensFile).absolutePath
        modelConfig.tokens = tokensPath
        
        when (modelType) {
            "transducer", "zipformer", "zipformer2" -> {
                Log.i(TAG, "Setting up transducer/zipformer model")
                val encoderFile = modelFiles["encoder"] ?: "encoder.onnx"
                val decoderFile = modelFiles["decoder"] ?: "decoder.onnx"
                val joinerFile = modelFiles["joiner"] ?: "joiner.onnx"
                
                val encoderPath = File(modelDir, encoderFile).absolutePath
                val decoderPath = File(modelDir, decoderFile).absolutePath
                val joinerPath = File(modelDir, joinerFile).absolutePath
                
                Log.i(TAG, "Using encoder: $encoderPath")
                Log.i(TAG, "Using decoder: $decoderPath")
                Log.i(TAG, "Using joiner: $joinerPath")
                
                val transducerConfig = OfflineTransducerModelConfig()
                transducerConfig.encoder = encoderPath
                transducerConfig.decoder = decoderPath
                transducerConfig.joiner = joinerPath
                
                modelConfig.transducer = transducerConfig
            }
            "paraformer" -> {
                Log.i(TAG, "Setting up paraformer model")
                val modelFile = modelFiles["model"] ?: "model.onnx"
                val modelPath = File(modelDir, modelFile).absolutePath
                
                Log.i(TAG, "Using model: $modelPath")
                
                val paraformerConfig = OfflineParaformerModelConfig()
                paraformerConfig.model = modelPath
                
                modelConfig.paraformer = paraformerConfig
            }
            "whisper" -> {
                Log.i(TAG, "Setting up whisper model")
                val encoderFile = modelFiles["encoder"] ?: "encoder.onnx"
                val decoderFile = modelFiles["decoder"] ?: "decoder.onnx"
                
                val encoderPath = File(modelDir, encoderFile).absolutePath
                val decoderPath = File(modelDir, decoderFile).absolutePath
                
                Log.i(TAG, "Using encoder: $encoderPath")
                Log.i(TAG, "Using decoder: $decoderPath")
                
                val whisperConfig = OfflineWhisperModelConfig()
                whisperConfig.encoder = encoderPath
                whisperConfig.decoder = decoderPath
                whisperConfig.language = "en"
                whisperConfig.task = "transcribe"
                
                modelConfig.whisper = whisperConfig
            }
            "nemo_ctc", "nemo_transducer" -> {
                Log.i(TAG, "Setting up Nemo CTC/Transducer model")
                val modelFile = modelFiles["model"] ?: "model.onnx"
                val modelPath = File(modelDir, modelFile).absolutePath
                
                Log.i(TAG, "Using model: $modelPath")
                
                val nemoConfig = OfflineNemoEncDecCtcModelConfig()
                nemoConfig.model = modelPath
                
                modelConfig.nemo = nemoConfig
            }
            "moonshine" -> {
                Log.i(TAG, "Setting up Moonshine model")
                val preprocessorFile = modelFiles["preprocessor"] ?: "preprocess.onnx"
                val encoderFile = modelFiles["encoder"] ?: "encode.onnx"
                val uncachedDecoderFile = modelFiles["uncachedDecoder"] ?: "uncached_decode.onnx"
                val cachedDecoderFile = modelFiles["cachedDecoder"] ?: "cached_decode.onnx"
                
                val preprocessorPath = File(modelDir, preprocessorFile).absolutePath
                val encoderPath = File(modelDir, encoderFile).absolutePath
                val uncachedDecoderPath = File(modelDir, uncachedDecoderFile).absolutePath
                val cachedDecoderPath = File(modelDir, cachedDecoderFile).absolutePath
                
                Log.i(TAG, "Using preprocessor: $preprocessorPath")
                Log.i(TAG, "Using encoder: $encoderPath")
                Log.i(TAG, "Using uncachedDecoder: $uncachedDecoderPath")
                Log.i(TAG, "Using cachedDecoder: $cachedDecoderPath")
                
                val moonshineConfig = OfflineMoonshineModelConfig()
                moonshineConfig.preprocessor = preprocessorPath
                moonshineConfig.encoder = encoderPath
                moonshineConfig.uncachedDecoder = uncachedDecoderPath
                moonshineConfig.cachedDecoder = cachedDecoderPath
                
                modelConfig.moonshine = moonshineConfig
            }
            "sense_voice" -> {
                Log.i(TAG, "Setting up SenseVoice model")
                val modelFile = modelFiles["model"] ?: "model.onnx"
                val modelPath = File(modelDir, modelFile).absolutePath
                
                Log.i(TAG, "Using model: $modelPath")
                
                val senseVoiceConfig = OfflineSenseVoiceModelConfig()
                senseVoiceConfig.model = modelPath
                senseVoiceConfig.language = "" // Default to auto-detect
                senseVoiceConfig.useInverseTextNormalization = true
                
                modelConfig.senseVoice = senseVoiceConfig
            }
            "fire_red_asr" -> {
                Log.i(TAG, "Setting up FireRedASR model")
                val encoderFile = modelFiles["encoder"] ?: "encoder.onnx"
                val decoderFile = modelFiles["decoder"] ?: "decoder.onnx"
                
                val encoderPath = File(modelDir, encoderFile).absolutePath
                val decoderPath = File(modelDir, decoderFile).absolutePath
                
                Log.i(TAG, "Using encoder: $encoderPath")
                Log.i(TAG, "Using decoder: $decoderPath")
                
                val fireRedConfig = OfflineFireRedAsrModelConfig()
                fireRedConfig.encoder = encoderPath
                fireRedConfig.decoder = decoderPath
                
                modelConfig.fireRedAsr = fireRedConfig
            }
            "telespeech_ctc" -> {
                Log.i(TAG, "Setting up TeleSpeech CTC model")
                val modelFile = modelFiles["model"] ?: "model.onnx"
                val modelPath = File(modelDir, modelFile).absolutePath
                
                Log.i(TAG, "Using model: $modelPath")
                
                modelConfig.teleSpeech = modelPath
            }
            else -> {
                throw Exception("Unsupported model type: $modelType")
            }
        }
        
        // Check for required files
        val files = mutableListOf<String>()
        when (modelType) {
            "transducer", "zipformer", "zipformer2" -> {
                files.add(modelConfig.transducer.encoder)
                files.add(modelConfig.transducer.decoder)
                files.add(modelConfig.transducer.joiner)
            }
            "paraformer" -> {
                files.add(modelConfig.paraformer.model)
            }
            "whisper" -> {
                files.add(modelConfig.whisper.encoder)
                files.add(modelConfig.whisper.decoder)
            }
            "nemo_ctc", "nemo_transducer" -> {
                files.add(modelConfig.nemo.model)
            }
            "moonshine" -> {
                files.add(modelConfig.moonshine.preprocessor)
                files.add(modelConfig.moonshine.encoder)
                files.add(modelConfig.moonshine.uncachedDecoder)
                files.add(modelConfig.moonshine.cachedDecoder)
            }
            "sense_voice" -> {
                files.add(modelConfig.senseVoice.model)
            }
            "fire_red_asr" -> {
                files.add(modelConfig.fireRedAsr.encoder)
                files.add(modelConfig.fireRedAsr.decoder)
            }
            "telespeech_ctc" -> {
                files.add(modelConfig.teleSpeech)
            }
        }
        
        // Add tokens file
        files.add(modelConfig.tokens)
        
        // Check if files exist
        for (filePath in files) {
            val file = File(filePath)
            if (!file.exists()) {
                Log.e(TAG, "File not found: $filePath")
                throw Exception("File not found: $filePath")
            } else {
                Log.i(TAG, "File verified: $filePath")
            }
        }
        
        return modelConfig
    }
    
    /**
     * Create online model configuration for the specific model type
     */
    private fun createOnlineModelConfig(
        modelDir: String,
        modelType: String,
        modelFiles: Map<String, String>
    ): OnlineModelConfig {
        val modelConfig = OnlineModelConfig()
        
        // Get tokens file path
        val tokensFile = modelFiles["tokens"] ?: "tokens.txt"
        val tokensPath = File(modelDir, tokensFile).absolutePath
        modelConfig.tokens = tokensPath
        
        when (modelType) {
            "transducer", "zipformer", "zipformer2" -> {
                Log.i(TAG, "Setting up streaming transducer/zipformer model")
                val encoderFile = modelFiles["encoder"] ?: "encoder.onnx"
                val decoderFile = modelFiles["decoder"] ?: "decoder.onnx"
                val joinerFile = modelFiles["joiner"] ?: "joiner.onnx"
                
                val encoderPath = File(modelDir, encoderFile).absolutePath
                val decoderPath = File(modelDir, decoderFile).absolutePath
                val joinerPath = File(modelDir, joinerFile).absolutePath
                
                Log.i(TAG, "Using encoder: $encoderPath")
                Log.i(TAG, "Using decoder: $decoderPath")
                Log.i(TAG, "Using joiner: $joinerPath")
                
                val transducerConfig = OnlineTransducerModelConfig()
                transducerConfig.encoder = encoderPath
                transducerConfig.decoder = decoderPath
                transducerConfig.joiner = joinerPath
                
                modelConfig.transducer = transducerConfig
            }
            "paraformer" -> {
                Log.i(TAG, "Setting up streaming paraformer model")
                val encoderFile = modelFiles["encoder"] ?: "encoder.onnx"
                val decoderFile = modelFiles["decoder"] ?: "decoder.onnx"
                
                val encoderPath = File(modelDir, encoderFile).absolutePath
                val decoderPath = File(modelDir, decoderFile).absolutePath
                
                Log.i(TAG, "Using encoder: $encoderPath")
                Log.i(TAG, "Using decoder: $decoderPath")
                
                // Use reflection to create and configure the paraformer model
                try {
                    // Try to get the class using reflection
                    val paraformerConfigClass = Class.forName("com.k2fsa.sherpa.onnx.OnlineParaformerModelConfig")
                    val paraformerConfig = paraformerConfigClass.newInstance()
                    
                    // Set encoder and decoder using reflection
                    val encoderSetter = paraformerConfigClass.getDeclaredMethod("setEncoder", String::class.java)
                    encoderSetter.invoke(paraformerConfig, encoderPath)
                    
                    val decoderSetter = paraformerConfigClass.getDeclaredMethod("setDecoder", String::class.java)
                    decoderSetter.invoke(paraformerConfig, decoderPath)
                    
                    // Set the paraformer config on the model config
                    val paraformerSetter = modelConfig.javaClass.getDeclaredMethod("setParaformer", paraformerConfigClass)
                    paraformerSetter.invoke(modelConfig, paraformerConfig)
                    
                    Log.i(TAG, "Successfully configured paraformer model using reflection")
                } catch (e: Exception) {
                    Log.e(TAG, "Error configuring paraformer model: ${e.message}")
                    e.printStackTrace()
                    throw Exception("Failed to configure paraformer model: ${e.message}")
                }
            }
            "zipformer2_ctc" -> {
                Log.i(TAG, "Setting up streaming zipformer2 CTC model")
                val modelFile = modelFiles["model"] ?: "model.onnx"
                val modelPath = File(modelDir, modelFile).absolutePath
                
                Log.i(TAG, "Using model: $modelPath")
                
                // Use reflection to create and configure the zipformer2Ctc model
                try {
                    // Try to get the class using reflection
                    val zipformerCtcClass = Class.forName("com.k2fsa.sherpa.onnx.OnlineZipformer2CtcModelConfig")
                    val zipformerCtcConfig = zipformerCtcClass.newInstance()
                    
                    // Set model using reflection
                    val modelSetter = zipformerCtcClass.getDeclaredMethod("setModel", String::class.java)
                    modelSetter.invoke(zipformerCtcConfig, modelPath)
                    
                    // Set the zipformer2Ctc config on the model config
                    val zipformerCtcSetter = modelConfig.javaClass.getDeclaredMethod("setZipformer2Ctc", zipformerCtcClass)
                    zipformerCtcSetter.invoke(modelConfig, zipformerCtcConfig)
                    
                    Log.i(TAG, "Successfully configured zipformer2Ctc model using reflection")
                } catch (e: Exception) {
                    Log.e(TAG, "Error configuring zipformer2Ctc model: ${e.message}")
                    e.printStackTrace()
                    throw Exception("Failed to configure zipformer2Ctc model: ${e.message}")
                }
            }
            "nemo_ctc" -> {
                Log.i(TAG, "Setting up streaming Nemo CTC model")
                val modelFile = modelFiles["model"] ?: "model.onnx"
                val modelPath = File(modelDir, modelFile).absolutePath
                
                Log.i(TAG, "Using model: $modelPath")
                
                // Use reflection to create and configure the neMoCtc model
                try {
                    // Try to get the class using reflection
                    val nemoCtcClass = Class.forName("com.k2fsa.sherpa.onnx.OnlineNeMoCtcModelConfig")
                    val nemoCtcConfig = nemoCtcClass.newInstance()
                    
                    // Set model using reflection
                    val modelSetter = nemoCtcClass.getDeclaredMethod("setModel", String::class.java)
                    modelSetter.invoke(nemoCtcConfig, modelPath)
                    
                    // Set the neMoCtc config on the model config
                    val nemoCtcSetter = modelConfig.javaClass.getDeclaredMethod("setNeMoCtc", nemoCtcClass)
                    nemoCtcSetter.invoke(modelConfig, nemoCtcConfig)
                    
                    Log.i(TAG, "Successfully configured neMoCtc model using reflection")
                } catch (e: Exception) {
                    Log.e(TAG, "Error configuring neMoCtc model: ${e.message}")
                    e.printStackTrace()
                    throw Exception("Failed to configure neMoCtc model: ${e.message}")
                }
            }
            else -> {
                throw Exception("Unsupported online model type: $modelType")
            }
        }
        
        // Check for required files
        val files = mutableListOf<String>()
        when (modelType) {
            "transducer", "zipformer", "zipformer2" -> {
                files.add(modelConfig.transducer.encoder)
                files.add(modelConfig.transducer.decoder)
                files.add(modelConfig.transducer.joiner)
            }
            "paraformer" -> {
                // Use reflection to get the paraformer encoder and decoder
                try {
                    val paraformerField = modelConfig.javaClass.getDeclaredField("paraformer")
                    paraformerField.isAccessible = true
                    val paraformerConfig = paraformerField.get(modelConfig)
                    
                    if (paraformerConfig != null) {
                        val encoderField = paraformerConfig.javaClass.getDeclaredField("encoder")
                        encoderField.isAccessible = true
                        files.add(encoderField.get(paraformerConfig) as String)
                        
                        val decoderField = paraformerConfig.javaClass.getDeclaredField("decoder")
                        decoderField.isAccessible = true
                        files.add(decoderField.get(paraformerConfig) as String)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to access paraformer config fields: ${e.message}")
                }
            }
            "zipformer2_ctc" -> {
                // Use reflection to get the zipformer2Ctc model
                try {
                    val zipformerCtcField = modelConfig.javaClass.getDeclaredField("zipformer2Ctc")
                    zipformerCtcField.isAccessible = true
                    val zipformerCtcConfig = zipformerCtcField.get(modelConfig)
                    
                    if (zipformerCtcConfig != null) {
                        val modelField = zipformerCtcConfig.javaClass.getDeclaredField("model")
                        modelField.isAccessible = true
                        files.add(modelField.get(zipformerCtcConfig) as String)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to access zipformer2Ctc config fields: ${e.message}")
                }
            }
            "nemo_ctc" -> {
                // Use reflection to get the neMoCtc model
                try {
                    val nemoCtcField = modelConfig.javaClass.getDeclaredField("neMoCtc")
                    nemoCtcField.isAccessible = true
                    val nemoCtcConfig = nemoCtcField.get(modelConfig)
                    
                    if (nemoCtcConfig != null) {
                        val modelField = nemoCtcConfig.javaClass.getDeclaredField("model")
                        modelField.isAccessible = true
                        files.add(modelField.get(nemoCtcConfig) as String)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to access neMoCtc config fields: ${e.message}")
                }
            }
        }
        
        // Add tokens file
        files.add(modelConfig.tokens)
        
        // Check if files exist
        for (filePath in files) {
            val file = File(filePath)
            if (!file.exists()) {
                Log.e(TAG, "File not found: $filePath")
                throw Exception("File not found: $filePath")
            } else {
                Log.i(TAG, "File verified: $filePath")
            }
        }
        
        return modelConfig
    }
    
    /**
     * Recognize speech from audio samples
     */
    fun recognizeFromSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                if (isStreaming) {
                    recognizeFromSamplesStreaming(sampleRate, audioBuffer, promise)
                } else {
                    recognizeFromSamplesOffline(sampleRate, audioBuffer, promise)
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
     * Recognize speech from audio samples using offline recognition
     */
    private fun recognizeFromSamplesOffline(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        try {
            if (offlineRecognizer == null) {
                throw Exception("Offline ASR is not initialized")
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
            
            // Start recognition
            isRecognizing = true
            
            // Decode
            offlineRecognizer?.decode(stream)
            
            // Get result
            val result = offlineRecognizer?.getResult(stream)
            
            // Release stream
            stream.release()
            
            // End recognition
            isRecognizing = false
            
            // Return results
            val resultMap = Arguments.createMap()
            resultMap.putBoolean("success", true)
            resultMap.putString("text", result?.text ?: "")
            resultMap.putInt("samplesLength", samples.size)
            resultMap.putInt("sampleRate", sampleRate)
            
            reactContext.runOnUiQueueThread {
                promise.resolve(resultMap)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error recognizing from samples (offline): ${e.message}")
            e.printStackTrace()
            
            reactContext.runOnUiQueueThread {
                promise.reject("ERR_ASR_RECOGNIZE", "Failed to recognize speech (offline): ${e.message}")
            }
        }
    }
    
    /**
     * Recognize speech from audio samples using streaming recognition
     */
    private fun recognizeFromSamplesStreaming(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        try {
            if (onlineRecognizer == null) {
                throw Exception("Streaming ASR is not initialized")
            }
            
            // Create stream if not exists
            if (onlineStream == null) {
                onlineStream = onlineRecognizer?.createStream()
                if (onlineStream == null) {
                    throw Exception("Failed to create stream")
                }
            }
            
            // Convert ReadableArray to FloatArray
            val samples = FloatArray(audioBuffer.size())
            for (i in 0 until audioBuffer.size()) {
                samples[i] = audioBuffer.getDouble(i).toFloat()
            }
            
            // Accept waveform
            onlineStream?.acceptWaveform(samples, sampleRate)
            
            // Start recognition
            isRecognizing = true
            
            // Decode
            onlineRecognizer?.decode(onlineStream!!)
            
            // Check if endpoint is reached
            val isEndpoint = onlineRecognizer?.isEndpoint(onlineStream!!) ?: false
            
            // Get result
            val result = onlineRecognizer?.getResult(onlineStream!!)
            
            // Reset stream if endpoint is reached
            if (isEndpoint) {
                onlineRecognizer?.reset(onlineStream!!)
            }
            
            // Return results
            val resultMap = Arguments.createMap()
            resultMap.putBoolean("success", true)
            resultMap.putString("text", result?.text ?: "")
            resultMap.putInt("samplesLength", samples.size)
            resultMap.putInt("sampleRate", sampleRate)
            resultMap.putBoolean("isEndpoint", isEndpoint)
            
            reactContext.runOnUiQueueThread {
                promise.resolve(resultMap)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error recognizing from samples (streaming): ${e.message}")
            e.printStackTrace()
            
            reactContext.runOnUiQueueThread {
                promise.reject("ERR_ASR_RECOGNIZE", "Failed to recognize speech (streaming): ${e.message}")
            }
        }
    }
    
    /**
     * Recognize speech from an audio file
     */
    fun recognizeFromFile(filePath: String, promise: Promise) {
        executor.execute {
            try {
                // Create File object from path
                val fileObj = File(AssetUtils.cleanFilePath(filePath))
                
                // Extract audio from file
                val audioData = AudioExtractor.extractAudioFromFile(fileObj)
                
                // Handle potential null audio data safely
                if (audioData == null) {
                    throw Exception("Failed to extract audio from file")
                }
                
                // Use safe calls to get samples and sample rate
                val samples = audioData.samples ?: FloatArray(0)
                val sampleRate = audioData.sampleRate ?: DEFAULT_SAMPLE_RATE
                
                // Create ReadableArray from samples for compatibility with recognizeFromSamples
                val buffer = Arguments.createArray()
                for (sample in samples) {
                    buffer.pushDouble(sample.toDouble())
                }
                
                // Recognize using the existing method
                recognizeFromSamples(sampleRate, buffer, promise)
            } catch (e: Exception) {
                Log.e(TAG, "Error recognizing from file: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RECOGNIZE", "Failed to recognize speech from file: ${e.message}")
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
                resultMap.putBoolean("released", true)
                
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
            
            isRecognizing = false
            isStreaming = false
            
            Log.i(TAG, "ASR resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error in releaseResources: ${e.message}")
        }
    }
} 