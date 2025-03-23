/**
 * SherpaOnnxModule - React Native module for sherpa-onnx
 * Supports both old architecture and New Architecture
 */
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Log
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.Executors

// Import the JNI bridge
import com.k2fsa.sherpa.onnx.OfflineTts as JniBridge

// Note: We're using the local OfflineTts classes defined in SherpaOnnxTtsSupport.kt
// which interface with the JNI bridge in com.k2fsa.sherpa.onnx package

class SherpaOnnxModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private var tts: OfflineTts? = null
    private var audioTrack: AudioTrack? = null
    private var isGenerating = false

    companion object {
        const val NAME = "SherpaOnnx"
        private const val TAG = "SherpaOnnxModule"
        private var isLibraryLoaded = false
        
        init {
            try {
                // Check if the library is loaded by accessing the JNI bridge class
                isLibraryLoaded = JniBridge::class.java != null
                Log.i(TAG, "Sherpa ONNX JNI library is available")
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load sherpa-onnx-jni: ${e.message}")
                isLibraryLoaded = false
            }
        }
    }

    override fun getName(): String = NAME
    
    @ReactMethod
    fun validateLibraryLoaded(promise: Promise) {
        val resultMap = Arguments.createMap()
        resultMap.putBoolean("loaded", isLibraryLoaded)
        
        if (isLibraryLoaded) {
            resultMap.putString("status", "Sherpa ONNX JNI library loaded successfully")
        } else {
            resultMap.putString("status", "Failed to load Sherpa ONNX JNI library")
        }
        
        promise.resolve(resultMap)
    }

    @ReactMethod
    fun initTts(modelConfig: ReadableMap, promise: Promise) {
        if (!isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                // Extract config values from the provided map
                val modelDir = modelConfig.getString("modelDir") ?: ""
                val modelName = modelConfig.getString("modelName") ?: ""
                val acousticModelName = modelConfig.getString("acousticModelName") ?: ""
                val vocoder = modelConfig.getString("vocoder") ?: ""
                val voices = modelConfig.getString("voices") ?: ""
                val lexicon = modelConfig.getString("lexicon") ?: ""
                val dataDir = modelConfig.getString("dataDir") ?: ""
                val dictDir = modelConfig.getString("dictDir") ?: ""
                val ruleFsts = modelConfig.getString("ruleFsts") ?: ""
                val ruleFars = modelConfig.getString("ruleFars") ?: ""
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else null
                
                // Check if model exists in assets
                val possiblePaths = listOf(
                    modelDir, // Direct path
                    "tts/$modelDir", // With tts/ prefix
                    "$modelDir/$modelName", // Full model path
                    "tts/$modelDir/$modelName", // Full path with tts/ prefix
                    "$modelDir/model.onnx", // Default model name
                    "tts/$modelDir/model.onnx" // Default with tts/ prefix
                )
                
                var foundModelPath = ""
                
                val modelExists = possiblePaths.any { path ->
                    val exists = if (path.endsWith(".onnx") || path.endsWith(".bin")) {
                        assetExists(reactContext.assets, path)
                    } else {
                        val files = reactContext.assets.list(path)
                        !files.isNullOrEmpty() && (
                            files.contains("model.onnx") || 
                            files.contains("voices.bin") ||
                            files.contains(modelName) ||
                            files.contains(acousticModelName)
                        )
                    }
                    if (exists) {
                        Log.d(TAG, "Found model files at: $path")
                        foundModelPath = path
                    }
                    exists
                }
                
                if (!modelExists) {
                    Log.e(TAG, "Model files not found in assets for: $modelDir")
                    
                    reactContext.runOnUiQueueThread {
                        val errorMap = Arguments.createMap()
                        errorMap.putBoolean("success", false)
                        errorMap.putString("error", "TTS model not found in the specified path")
                        promise.resolve(errorMap)
                    }
                    return@execute
                }

                // Use the found path for the model directory
                val actualModelDir = if (foundModelPath.isNotEmpty()) {
                    // Strip trailing filename if present
                    if (foundModelPath.endsWith(".onnx") || foundModelPath.endsWith(".bin")) {
                        foundModelPath.substringBeforeLast("/")
                    } else {
                        foundModelPath
                    }
                } else {
                    modelDir
                }
                
                Log.d(TAG, "Using model directory: $actualModelDir")
                
                // Prepare directories if needed
                var processedDataDir = dataDir
                var processedDictDir = dictDir

                if (dataDir.isNotEmpty()) {
                    val newDir = copyAssetDir(dataDir)
                    processedDataDir = "$newDir/$dataDir"
                } else if (assetExists(reactContext.assets, "$actualModelDir/espeak-ng-data")) {
                    // If dataDir not specified but espeak-ng-data exists in model dir
                    val newDir = copyAssetDir("$actualModelDir/espeak-ng-data")
                    processedDataDir = "$newDir/$actualModelDir/espeak-ng-data"
                    Log.d(TAG, "Using espeak-ng-data from model directory: $processedDataDir")
                }

                if (dictDir.isNotEmpty()) {
                    val newDir = copyAssetDir(dictDir)
                    processedDictDir = "$newDir/$dictDir"
                } else if (assetExists(reactContext.assets, "$actualModelDir/dict")) {
                    // If dictDir not specified but dict exists in model dir
                    val newDir = copyAssetDir("$actualModelDir/dict")
                    processedDictDir = "$newDir/$actualModelDir/dict"
                    Log.d(TAG, "Using dict from model directory: $processedDictDir")
                }
                
                // If modelName is not specified, try to use model.onnx
                var usedModelName = modelName
                if (usedModelName.isEmpty() && assetExists(reactContext.assets, "$actualModelDir/model.onnx")) {
                    usedModelName = "model.onnx"
                    Log.d(TAG, "Using default model.onnx from $actualModelDir")
                }
                
                // If voices is not specified, try to use voices.bin
                var usedVoices = voices
                if (usedVoices.isEmpty() && assetExists(reactContext.assets, "$actualModelDir/voices.bin")) {
                    usedVoices = "voices.bin"
                    Log.d(TAG, "Using default voices.bin from $actualModelDir")
                }

                // Create TTS config
                val config = OfflineTtsConfig(
                    modelDir = actualModelDir,  // Use found path
                    modelName = usedModelName,
                    acousticModelName = acousticModelName,
                    vocoder = vocoder,
                    voices = usedVoices,
                    lexicon = lexicon,
                    dataDir = processedDataDir,
                    dictDir = processedDictDir,
                    ruleFsts = ruleFsts,
                    ruleFars = ruleFars,
                    numThreads = numThreads
                )

                // Create TTS instance with try/catch to handle JNI crashes
                var initSuccess = false
                var errorMessage = ""
                
                try {
                    Log.d(TAG, "Creating OfflineTts instance with config: $config")
                    
                    tts = OfflineTts(
                        assetManager = reactContext.assets,
                        config = config
                    )
                    
                    // Check if TTS was initialized correctly
                    val sampleRate = try {
                        tts?.sampleRate() ?: 0
                    } catch (e: Throwable) {
                        Log.e(TAG, "Error getting sample rate: ${e.message}")
                        0
                    }
                    
                    // Only proceed if we have a valid instance with proper sample rate
                    if (tts != null && sampleRate > 0) {
                        initSuccess = true
                        
                        // Initialize AudioTrack
                        try {
                            initAudioTrack()
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to initialize AudioTrack: ${e.message}")
                            // Continue anyway - this isn't fatal
                        }
                    } else {
                        errorMessage = "TTS engine did not initialize properly"
                        Log.e(TAG, errorMessage)
                        
                        // Clean up the failed instance
                        tts?.free()
                        tts = null
                    }
                } catch (e: Throwable) {
                    // Handle any exception including JNI crashes
                    errorMessage = "TTS initialization failed: ${e.message}"
                    Log.e(TAG, errorMessage, e)
                    
                    // Clean up
                    tts?.free()
                    tts = null
                }
                
                // Return result to React Native
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", initSuccess)
                
                if (initSuccess) {
                    resultMap.putInt("sampleRate", tts?.sampleRate() ?: 0)
                    resultMap.putInt("numSpeakers", tts?.numSpeakers() ?: 0)
                } else {
                    resultMap.putString("error", errorMessage)
                }
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in initTts: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    // Make sure we return a proper response rather than rejecting the promise
                    val errorMap = Arguments.createMap()
                    errorMap.putBoolean("success", false)
                    errorMap.putString("error", "Error initializing TTS: ${e.message}")
                    promise.resolve(errorMap)
                }
            }
        }
    }

    @ReactMethod
    fun generateTts(text: String, speakerId: Int, speed: Float, playAudio: Boolean, promise: Promise) {
        if (tts == null) {
            Log.e(TAG, "TTS is not initialized before generateTts call")
            promise.reject("ERR_TTS_NOT_INITIALIZED", "TTS is not initialized")
            return
        }

        if (isGenerating) {
            Log.e(TAG, "TTS is already generating speech")
            promise.reject("ERR_TTS_BUSY", "TTS is already generating speech")
            return
        }

        Log.d(TAG, "Generating TTS for text: '$text' with speakerId: $speakerId, speed: $speed, playAudio: $playAudio")
        isGenerating = true

        executor.execute {
            try {
                // Initialize or reset AudioTrack if needed
                if (playAudio && audioTrack == null) {
                    Log.d(TAG, "Initializing AudioTrack")
                    initAudioTrack()
                }

                if (playAudio) {
                    Log.d(TAG, "Preparing AudioTrack for playback")
                    audioTrack?.pause()
                    audioTrack?.flush()
                    audioTrack?.play()
                }

                // Generate speech
                Log.d(TAG, "Starting speech generation")
                val startTime = System.currentTimeMillis()
                val audio = if (playAudio) {
                    Log.d(TAG, "Using generateWithCallback method")
                    tts!!.generateWithCallback(
                        text = text,
                        sid = speakerId,
                        speed = speed,
                        callback = this::audioCallback
                    )
                } else {
                    Log.d(TAG, "Using generate method without callback")
                    tts!!.generate(
                        text = text,
                        sid = speakerId,
                        speed = speed
                    )
                }
                val endTime = System.currentTimeMillis()
                Log.d(TAG, "Speech generation completed in ${endTime - startTime}ms")
                Log.d(TAG, "Generated ${audio.samples.size} samples at ${audio.sampleRate}Hz")

                // Save to file using AudioUtils
                Log.d(TAG, "Saving audio to file")
                val wavFile = File(reactContext.cacheDir, "generated_audio.wav")
                val saved = AudioUtils.saveAsWav(audio.samples, audio.sampleRate, wavFile.absolutePath)
                Log.d(TAG, "Audio saved: $saved, file path: ${wavFile.absolutePath}")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", audio.sampleRate)
                resultMap.putInt("samplesLength", audio.samples.size)
                resultMap.putString("filePath", wavFile.absolutePath)
                resultMap.putBoolean("saved", saved)
                resultMap.putInt("durationMs", (endTime - startTime).toInt())

                isGenerating = false
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                isGenerating = false
                Log.e(TAG, "Error generating speech: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_GENERATE", "Failed to generate speech: ${e.message}")
                }
            }
        }
    }

    @ReactMethod
    fun stopTts(promise: Promise) {
        if (isGenerating) {
            isGenerating = false
            
            if (audioTrack != null) {
                audioTrack?.pause()
                audioTrack?.flush()
            }
            
            val resultMap = Arguments.createMap()
            resultMap.putBoolean("stopped", true)
            promise.resolve(resultMap)
        } else {
            promise.resolve(Arguments.createMap().apply {
                putBoolean("stopped", false)
                putString("message", "No TTS generation in progress")
            })
        }
    }

    @ReactMethod
    fun releaseTts(promise: Promise) {
        executor.execute {
            try {
                audioTrack?.release()
                audioTrack = null
                
                tts?.free()
                tts = null
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("released", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing TTS: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_RELEASE", "Failed to release TTS resources: ${e.message}")
                }
            }
        }
    }

    private fun audioCallback(samples: FloatArray): Int {
        if (!isGenerating) {
            return 0  // Stop generating
        }
        
        audioTrack?.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
        return 1  // Continue generating
    }

    private fun initAudioTrack() {
        val sampleRate = tts?.sampleRate() ?: 22050
        
        // Release existing AudioTrack if any
        audioTrack?.release()
        
        val bufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_FLOAT
        )

        val audioAttributes = AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .build()

        val audioFormat = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .setSampleRate(sampleRate)
            .build()

        audioTrack = AudioTrack(
            audioAttributes,
            audioFormat,
            bufferSize,
            AudioTrack.MODE_STREAM,
            AudioManager.AUDIO_SESSION_ID_GENERATE
        )
    }

    private fun copyAssetDir(dirPath: String): String {
        try {
            copyAssets(dirPath)
            val externalDir = reactContext.getExternalFilesDir(null)?.absolutePath
                ?: reactContext.cacheDir.absolutePath
            return externalDir
        } catch (e: Exception) {
            Log.e(TAG, "Error copying asset directory: ${e.message}")
            throw e
        }
    }

    private fun copyAssets(path: String) {
        try {
            val assets = reactContext.assets.list(path)
            
            if (assets.isNullOrEmpty()) {
                // It's a file, copy it
                copyAssetFile(path)
            } else {
                // It's a directory, create it and copy contents
                val fullPath = "${reactContext.getExternalFilesDir(null)}/$path"
                val dir = File(fullPath)
                if (!dir.exists()) {
                    dir.mkdirs()
                }
                
                for (asset in assets) {
                    val subPath = if (path.isEmpty()) asset else "$path/$asset"
                    copyAssets(subPath)
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Failed to copy asset $path: ${e.message}")
            throw e
        }
    }

    private fun copyAssetFile(filename: String) {
        try {
            val inputStream = reactContext.assets.open(filename)
            val outFile = File("${reactContext.getExternalFilesDir(null)}/$filename")
            
            // Create parent directories if needed
            outFile.parentFile?.mkdirs()
            
            val outputStream = FileOutputStream(outFile)
            val buffer = ByteArray(1024)
            var read: Int
            
            while (inputStream.read(buffer).also { read = it } != -1) {
                outputStream.write(buffer, 0, read)
            }
            
            inputStream.close()
            outputStream.flush()
            outputStream.close()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to copy file $filename: ${e.message}")
            throw e
        }
    }

    /**
     * Check if an asset exists
     */
    private fun assetExists(assetManager: AssetManager, path: String): Boolean {
        try {
            val fullPath = path.trim()
            val directory = if (fullPath.contains("/")) {
                fullPath.substringBeforeLast("/")
            } else {
                "" // Root directory
            }
            
            val fileName = if (fullPath.contains("/")) {
                fullPath.substringAfterLast("/")
            } else {
                fullPath
            }
            
            // Try to list the directory to see if it contains our file
            val files = assetManager.list(directory)
            return files?.contains(fileName) == true
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if asset exists at $path: ${e.message}")
            return false
        }
    }
} 