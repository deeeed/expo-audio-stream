/**
 * Handler for Automatic Speech Recognition functionality
 */
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import java.io.File
import java.io.IOException
import java.util.concurrent.Executors

// Import Sherpa ONNX classes
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OfflineModelConfig
import com.k2fsa.sherpa.onnx.OfflineParaformerModelConfig
import com.k2fsa.sherpa.onnx.OfflineRecognizer
import com.k2fsa.sherpa.onnx.OfflineRecognizerConfig
import com.k2fsa.sherpa.onnx.OfflineStream
import com.k2fsa.sherpa.onnx.OfflineTransducerModelConfig
import com.k2fsa.sherpa.onnx.OfflineWhisperModelConfig

/**
 * Handler for Automatic Speech Recognition functionality in Sherpa-ONNX
 * Provides methods to initialize the ASR engine, recognize audio from
 * samples or files, and clean up resources.
 */
class ASRHandler(private val reactContext: ReactApplicationContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    private var recognizer: OfflineRecognizer? = null
    private var stream: OfflineStream? = null
    private var isRecognizing = false
    
    companion object {
        private const val TAG = "SherpaOnnxASR"
        private const val DEFAULT_SAMPLE_RATE = 16000
        private const val DEFAULT_FEATURE_DIM = 80
        private const val DEFAULT_DEBUG = false
        private const val DEFAULT_PROVIDER = "cpu"
        private const val DEFAULT_NUM_THREADS = 2
        private const val DEFAULT_DECODING_METHOD = "greedy_search"
        private const val DEFAULT_MAX_ACTIVE_PATHS = 4
    }
    
    /**
     * Initialize the ASR engine with the provided model configuration
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
                val modelDir = modelConfig.getString("modelDir")?.replace("file://", "") ?: ""
                val modelType = modelConfig.getString("modelType") ?: "transducer"
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else DEFAULT_NUM_THREADS
                
                Log.i(TAG, "Using paths provided by client:")
                Log.i(TAG, "- modelDir: $modelDir")
                Log.i(TAG, "- modelType: $modelType")
                Log.i(TAG, "- numThreads: $numThreads")
                
                // Prepare base configuration
                val featureConfig = FeatureConfig()
                featureConfig.sampleRate = DEFAULT_SAMPLE_RATE
                featureConfig.featureDim = DEFAULT_FEATURE_DIM
                
                val offlineModelConfig = OfflineModelConfig()
                offlineModelConfig.debug = DEFAULT_DEBUG
                offlineModelConfig.provider = DEFAULT_PROVIDER
                offlineModelConfig.numThreads = numThreads
                
                // Configure based on model type
                if (modelType == "transducer") {
                    val encoderFile = File(modelDir, "encoder.onnx")
                    val decoderFile = File(modelDir, "decoder.onnx")
                    val joinerFile = File(modelDir, "joiner.onnx")
                    val tokensFile = File(modelDir, "tokens.txt")
                    
                    Log.i(TAG, "Encoder file: ${encoderFile.absolutePath} (exists: ${encoderFile.exists()}, size: ${encoderFile.length()})")
                    Log.i(TAG, "Decoder file: ${decoderFile.absolutePath} (exists: ${decoderFile.exists()}, size: ${decoderFile.length()})")
                    Log.i(TAG, "Joiner file: ${joinerFile.absolutePath} (exists: ${joinerFile.exists()}, size: ${joinerFile.length()})")
                    Log.i(TAG, "Tokens file: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})")
                    
                    val transducerConfig = OfflineTransducerModelConfig()
                    transducerConfig.encoder = encoderFile.absolutePath
                    transducerConfig.decoder = decoderFile.absolutePath
                    transducerConfig.joiner = joinerFile.absolutePath
                    
                    offlineModelConfig.transducer = transducerConfig
                    offlineModelConfig.tokens = tokensFile.absolutePath
                    
                    Log.i(TAG, "Configured Transducer model")
                } else if (modelType == "paraformer") {
                    val encoderFile = File(modelDir, "encoder.onnx")
                    val decoderFile = File(modelDir, "decoder.onnx")
                    val tokensFile = File(modelDir, "tokens.txt")
                    
                    Log.i(TAG, "Encoder file: ${encoderFile.absolutePath} (exists: ${encoderFile.exists()}, size: ${encoderFile.length()})")
                    Log.i(TAG, "Decoder file: ${decoderFile.absolutePath} (exists: ${decoderFile.exists()}, size: ${decoderFile.length()})")
                    Log.i(TAG, "Tokens file: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})")
                    
                    val paraformerConfig = OfflineParaformerModelConfig()
                    paraformerConfig.encoder = encoderFile.absolutePath
                    paraformerConfig.decoder = decoderFile.absolutePath
                    
                    offlineModelConfig.paraformer = paraformerConfig
                    offlineModelConfig.tokens = tokensFile.absolutePath
                    
                    Log.i(TAG, "Configured Paraformer model")
                } else if (modelType == "whisper") {
                    val modelFile = File(modelDir, "model.onnx")
                    val tokensFile = File(modelDir, "tokens.txt")
                    
                    Log.i(TAG, "Model file: ${modelFile.absolutePath} (exists: ${modelFile.exists()}, size: ${modelFile.length()})")
                    Log.i(TAG, "Tokens file: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})")
                    
                    val whisperConfig = OfflineWhisperModelConfig()
                    whisperConfig.model = modelFile.absolutePath
                    
                    offlineModelConfig.whisper = whisperConfig
                    offlineModelConfig.tokens = tokensFile.absolutePath
                    
                    Log.i(TAG, "Configured Whisper model")
                } else {
                    // Try to autodetect model type
                    Log.i(TAG, "Attempting to auto-detect model type from files in directory")
                    val files = File(modelDir).listFiles() ?: emptyArray()
                    val fileNames = files.map { it.name.lowercase() }
                    
                    if (fileNames.contains("model.onnx") && fileNames.contains("tokens.txt")) {
                        val modelFile = File(modelDir, "model.onnx")
                        val tokensFile = File(modelDir, "tokens.txt")
                        
                        Log.i(TAG, "Detected Whisper or similar single-file model")
                        Log.i(TAG, "Model file: ${modelFile.absolutePath} (exists: ${modelFile.exists()}, size: ${modelFile.length()})")
                        Log.i(TAG, "Tokens file: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})")
                        
                        val whisperConfig = OfflineWhisperModelConfig()
                        whisperConfig.model = modelFile.absolutePath
                        
                        offlineModelConfig.whisper = whisperConfig
                        offlineModelConfig.tokens = tokensFile.absolutePath
                        
                        Log.i(TAG, "Configured as Whisper model")
                    } else if (fileNames.contains("encoder.onnx") && fileNames.contains("decoder.onnx") && 
                               fileNames.contains("joiner.onnx") && fileNames.contains("tokens.txt")) {
                        val encoderFile = File(modelDir, "encoder.onnx")
                        val decoderFile = File(modelDir, "decoder.onnx")
                        val joinerFile = File(modelDir, "joiner.onnx")
                        val tokensFile = File(modelDir, "tokens.txt")
                        
                        Log.i(TAG, "Detected Transducer model")
                        Log.i(TAG, "Encoder file: ${encoderFile.absolutePath} (exists: ${encoderFile.exists()}, size: ${encoderFile.length()})")
                        Log.i(TAG, "Decoder file: ${decoderFile.absolutePath} (exists: ${decoderFile.exists()}, size: ${decoderFile.length()})")
                        Log.i(TAG, "Joiner file: ${joinerFile.absolutePath} (exists: ${joinerFile.exists()}, size: ${joinerFile.length()})")
                        Log.i(TAG, "Tokens file: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})")
                        
                        val transducerConfig = OfflineTransducerModelConfig()
                        transducerConfig.encoder = encoderFile.absolutePath
                        transducerConfig.decoder = decoderFile.absolutePath
                        transducerConfig.joiner = joinerFile.absolutePath
                        
                        offlineModelConfig.transducer = transducerConfig
                        offlineModelConfig.tokens = tokensFile.absolutePath
                        
                        Log.i(TAG, "Configured as Transducer model")
                    } else {
                        throw Exception("Could not determine model type from files. Please specify model type explicitly.")
                    }
                }
                
                // Create the final config
                val config = OfflineRecognizerConfig()
                config.featConfig = featureConfig
                config.modelConfig = offlineModelConfig
                config.decodingMethod = if (modelConfig.hasKey("decodingMethod")) {
                    modelConfig.getString("decodingMethod") ?: DEFAULT_DECODING_METHOD
                } else {
                    DEFAULT_DECODING_METHOD
                }
                config.maxActivePaths = if (modelConfig.hasKey("maxActivePaths")) {
                    modelConfig.getInt("maxActivePaths")
                } else {
                    DEFAULT_MAX_ACTIVE_PATHS
                }
                
                // Initialize recognizer
                Log.i(TAG, "Creating offline recognizer with config")
                recognizer = OfflineRecognizer(config)
                
                Log.i(TAG, "ASR initialized successfully")
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("modelType", modelType)
                resultMap.putDouble("sampleRate", featureConfig.sampleRate.toDouble())
                
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
                if (recognizer == null) {
                    throw Exception("ASR is not initialized")
                }
                
                if (isRecognizing) {
                    throw Exception("ASR is already processing audio")
                }
                
                Log.d(TAG, "Recognizing audio from ${audioBuffer.size()} samples at ${sampleRate}Hz")
                isRecognizing = true
                
                // Convert JS array to float array
                val samples = FloatArray(audioBuffer.size())
                for (i in 0 until audioBuffer.size()) {
                    samples[i] = audioBuffer.getDouble(i).toFloat()
                }
                
                // Create a new stream
                stream = recognizer!!.createStream()
                
                // Add the samples to the stream
                stream?.acceptWaveform(samples, sampleRate)
                
                // Perform recognition
                val startTime = System.currentTimeMillis()
                val result = recognizer!!.decode(stream!!)
                val endTime = System.currentTimeMillis()
                
                Log.d(TAG, "Recognition completed in ${endTime - startTime}ms")
                Log.d(TAG, "Recognized text: ${result.text}")
                
                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("text", result.text)
                resultMap.putInt("durationMs", (endTime - startTime).toInt())
                
                isRecognizing = false
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                isRecognizing = false
                Log.e(TAG, "Error recognizing speech: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RECOGNIZE", "Failed to recognize speech: ${e.message}")
                }
            } finally {
                // Clean up stream
                stream?.release()
                stream = null
            }
        }
    }
    
    /**
     * Recognize speech from an audio file
     */
    fun recognizeFromFile(filePath: String, promise: Promise) {
        executor.execute {
            try {
                if (recognizer == null) {
                    throw Exception("ASR is not initialized")
                }
                
                if (isRecognizing) {
                    throw Exception("ASR is already processing audio")
                }
                
                // Clean file path for native use
                val cleanFilePath = filePath.replace("file://", "")
                
                Log.d(TAG, "Recognizing audio from file: $cleanFilePath")
                isRecognizing = true
                
                // Load the audio file
                val audioData = AudioExtractor.extractAudioFromFile(File(cleanFilePath))
                if (audioData == null) {
                    throw Exception("Failed to load audio file")
                }
                
                Log.d(TAG, "Loaded audio file with ${audioData.samples.size} samples at ${audioData.sampleRate}Hz")
                
                // Create a new stream
                stream = recognizer!!.createStream()
                
                // Add the samples to the stream
                stream?.acceptWaveform(audioData.samples, audioData.sampleRate)
                
                // Perform recognition
                val startTime = System.currentTimeMillis()
                val result = recognizer!!.decode(stream!!)
                val endTime = System.currentTimeMillis()
                
                Log.d(TAG, "Recognition completed in ${endTime - startTime}ms")
                Log.d(TAG, "Recognized text: ${result.text}")
                
                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("text", result.text)
                resultMap.putInt("durationMs", (endTime - startTime).toInt())
                resultMap.putInt("sampleRate", audioData.sampleRate)
                resultMap.putInt("samplesLength", audioData.samples.size)
                
                isRecognizing = false
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                isRecognizing = false
                Log.e(TAG, "Error recognizing speech from file: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ASR_RECOGNIZE_FILE", "Failed to recognize speech from file: ${e.message}")
                }
            } finally {
                // Clean up stream
                stream?.release()
                stream = null
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
        stream?.release()
        stream = null
        
        recognizer?.release()
        recognizer = null
        
        isRecognizing = false
    }
} 