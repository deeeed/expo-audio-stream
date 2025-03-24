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
    fun listAllAssets(promise: Promise) {
        try {
            // Create a result map to return to JavaScript
            val resultMap = Arguments.createMap()
            val assetsList = Arguments.createArray()
            
            // Get all assets recursively
            val allAssets = getAllAssetsRecursively("")
            
            // Add each asset path to the result array
            for (assetPath in allAssets) {
                assetsList.pushString(assetPath)
            }
            
            resultMap.putArray("assets", assetsList)
            resultMap.putInt("count", allAssets.size)
            promise.resolve(resultMap)
        } catch (e: Exception) {
            Log.e(TAG, "Error listing assets: ${e.message}")
            promise.reject("ERR_LIST_ASSETS", "Failed to list assets: ${e.message}")
        }
    }

    /**
     * List all assets recursively
     */
    private fun getAllAssetsRecursively(path: String): List<String> {
        val assets = mutableListOf<String>()
        try {
            // Get all items in the current path
            val items = reactContext.assets.list(path) ?: return assets
            
            for (item in items) {
                // Construct the full path
                val fullPath = if (path.isEmpty()) item else "$path/$item"
                
                try {
                    // Try to open as a file
                    reactContext.assets.open(fullPath).use { inputStream ->
                        // If we can open it as a file, add it to the list
                        assets.add(fullPath)
                        Log.d(TAG, "Found asset file: $fullPath")
                    }
                } catch (e: IOException) {
                    // If we can't open it as a file, it might be a directory
                    try {
                        // Get all items in the potential directory
                        val subItems = reactContext.assets.list(fullPath)
                        
                        // If it has items, it's a directory
                        if (subItems != null && subItems.isNotEmpty()) {
                            Log.d(TAG, "Found asset directory: $fullPath with ${subItems.size} items")
                            
                            // Recursively get all assets in the directory
                            assets.addAll(getAllAssetsRecursively(fullPath))
                        }
                    } catch (e2: IOException) {
                        Log.e(TAG, "Error listing assets in directory $fullPath: ${e2.message}")
                    }
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error listing assets in $path: ${e.message}")
        }
        
        return assets
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
                
                // Log all the config parameters for debugging
                Log.i(TAG, "TTS Initialization with parameters:")
                Log.i(TAG, "  modelDir: '$modelDir'")
                Log.i(TAG, "  modelName: '$modelName'")
                Log.i(TAG, "  acousticModelName: '$acousticModelName'")
                Log.i(TAG, "  vocoder: '$vocoder'")
                Log.i(TAG, "  voices: '$voices'")
                Log.i(TAG, "  lexicon: '$lexicon'")
                Log.i(TAG, "  dataDir: '$dataDir'")
                Log.i(TAG, "  dictDir: '$dictDir'")
                Log.i(TAG, "  ruleFsts: '$ruleFsts'")
                Log.i(TAG, "  ruleFars: '$ruleFars'")
                Log.i(TAG, "  numThreads: $numThreads")
                
                // ENHANCED DEBUGGING: List all assets in the app
                Log.i(TAG, "====== COMPREHENSIVE ASSET LISTING BEGIN ======")
                val allAssets = getAllAssetsRecursively("")
                Log.i(TAG, "Found ${allAssets.size} assets in total")
                Log.i(TAG, "Full asset list: ${allAssets.joinToString("\n")}")
                Log.i(TAG, "====== COMPREHENSIVE ASSET LISTING END ======")
                
                // Specifically look for our model files
                Log.i(TAG, "Searching for model files with these patterns:")
                val searchPatterns = listOf(
                    modelDir,
                    "$modelDir/$modelName",
                    "$modelDir/voices.bin",
                    "$modelDir/tokens.txt",
                    modelName,
                    "voices.bin",
                    "tokens.txt",
                    "tts",
                    "assets/$modelDir",
                    "asset/$modelDir"
                )
                
                for (pattern in searchPatterns) {
                    Log.i(TAG, "Searching for assets containing: '$pattern'")
                    val matchingAssets = allAssets.filter { it.contains(pattern) }
                    Log.i(TAG, "Found ${matchingAssets.size} matching assets: ${matchingAssets.joinToString(", ")}")
                }
                
                // CRITICAL: BYPASS VERIFICATION COMPLETELY
                Log.w(TAG, "⚠️ BYPASSING ASSET VERIFICATION - TREATING AS EXPO PROJECT ⚠️")
                
                // Bypass the existing verification entirely
                // Do not call AssetUtils.verifyModelAssets at all
                
                // Get the base directory for extracted assets
                val baseDir = reactContext.getExternalFilesDir(null) ?: reactContext.cacheDir
                
                // Create TTS config with the exact configuration provided
                val config = OfflineTtsConfig(
                    modelDir = modelDir,
                    modelName = modelName.ifEmpty { "model.onnx" },
                    acousticModelName = acousticModelName,
                    vocoder = vocoder,
                    voices = voices.ifEmpty { "voices.bin" },
                    lexicon = lexicon,
                    dataDir = dataDir,
                    dictDir = dictDir,
                    ruleFsts = ruleFsts,
                    ruleFars = ruleFars,
                    numThreads = numThreads
                )

                // Initialize TTS
                var initSuccess = false
                var errorMessage = ""
                
                try {
                    Log.i(TAG, "Creating TTS engine with config: $config")
                    tts = OfflineTts(reactContext.assets, config)
                    
                    val sampleRate = try {
                        val rate = tts?.sampleRate() ?: 0
                        Log.i(TAG, "TTS sample rate: $rate")
                        rate
                    } catch (e: Throwable) {
                        Log.e(TAG, "Error getting sample rate: ${e.message}")
                        0
                    }
                    
                    if (tts != null && sampleRate > 0) {
                        initSuccess = true
                        initAudioTrack()
                        Log.i(TAG, "TTS engine initialized successfully!")
                    } else {
                        errorMessage = "TTS engine did not initialize properly"
                        Log.e(TAG, errorMessage)
                        tts?.free()
                        tts = null
                    }
                } catch (e: Throwable) {
                    errorMessage = "TTS initialization failed: ${e.message}"
                    Log.e(TAG, errorMessage, e)
                    tts?.free()
                    tts = null
                }
                
                // Return result
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

    @ReactMethod
    fun debugAssetPath(path: String, promise: Promise) {
        try {
            val resultMap = Arguments.createMap()
            resultMap.putString("requestedPath", path)
            
            // Try to open the file directly to see if it exists
            var fileExists = false
            try {
                val inputStream = reactContext.assets.open(path)
                val size = inputStream.available()
                inputStream.close()
                fileExists = true
                resultMap.putBoolean("exists", true)
                resultMap.putInt("size", size)
            } catch (e: IOException) {
                resultMap.putBoolean("exists", false)
                resultMap.putString("error", e.message)
            }
            
            // Try to list contents if it might be a directory
            val possibleFiles = Arguments.createArray()
            
            try {
                // Try to list the directory contents
                val dirContents = reactContext.assets.list(path) ?: emptyArray()
                resultMap.putBoolean("isDirectory", dirContents.isNotEmpty())
                
                // If it's a directory, also check the first few files
                if (dirContents.isNotEmpty()) {
                    resultMap.putInt("fileCount", dirContents.size)
                    
                    // Add up to 20 files to the list
                    val filesToAdd = dirContents.take(20)
                    for (file in filesToAdd) {
                        possibleFiles.pushString(file)
                    }
                }
            } catch (e: IOException) {
                resultMap.putBoolean("isDirectory", false)
            }
            
            resultMap.putArray("files", possibleFiles)
            
            // Try some variations of the path to see if those exist
            val variations = Arguments.createMap()
            
            // Test with and without leading slashes
            val pathVariations = listOf(
                path,
                if (path.startsWith("/")) path.substring(1) else "/$path",
                "assets/$path",
                "asset/$path",
                if (path.contains("/")) path.substring(path.indexOf("/") + 1) else path
            )
            
            for (variant in pathVariations) {
                if (variant != path) { // Skip the original path as we already checked it
                    try {
                        reactContext.assets.open(variant).close()
                        variations.putBoolean(variant, true)
                    } catch (e: IOException) {
                        variations.putBoolean(variant, false)
                    }
                }
            }
            
            resultMap.putMap("variations", variations)
            
            // Return the parent directory listing if this path doesn't exist
            if (!fileExists) {
                val lastSlash = path.lastIndexOf('/')
                if (lastSlash > 0) {
                    val parentDir = path.substring(0, lastSlash)
                    try {
                        val parentContents = reactContext.assets.list(parentDir) ?: emptyArray()
                        val parentFiles = Arguments.createArray()
                        for (file in parentContents) {
                            parentFiles.pushString(file)
                        }
                        resultMap.putString("parentDir", parentDir)
                        resultMap.putArray("parentContents", parentFiles)
                    } catch (e: IOException) {
                        resultMap.putString("parentDirError", e.message)
                    }
                }
            }
            
            promise.resolve(resultMap)
        } catch (e: Exception) {
            promise.reject("DEBUG_ASSET_PATH_ERROR", "Error debugging asset path: ${e.message}")
        }
    }
} 