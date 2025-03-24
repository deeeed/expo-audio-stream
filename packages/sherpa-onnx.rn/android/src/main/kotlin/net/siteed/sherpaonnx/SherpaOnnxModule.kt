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

    /**
     * Extract a tar.bz2 file to a target directory
     * 
     * @param sourcePath Path to the tar.bz2 file
     * @param targetDir Directory to extract to
     * @param promise Promise to resolve or reject
     */
    @ReactMethod
    fun extractTarBz2(sourcePath: String, targetDir: String, promise: Promise) {
        executor.execute {
            try {
                // Clean up the paths
                val cleanSourcePath = sourcePath.replace("file://", "")
                val cleanTargetDir = targetDir.replace("file://", "")
                
                Log.i(TAG, "Extracting tar.bz2 from $cleanSourcePath to $cleanTargetDir")
                
                // Use our ArchiveUtils to extract the file
                val result = ArchiveUtils.extractTarBz2(reactContext, cleanSourcePath, cleanTargetDir)
                
                // Create a result map to return to JavaScript
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", result.success)
                resultMap.putString("message", result.message)
                
                // Add extracted files list
                val filesArray = Arguments.createArray()
                for (file in result.extractedFiles) {
                    filesArray.pushString(file)
                }
                resultMap.putArray("extractedFiles", filesArray)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in extractTarBz2: ${e.message}", e)
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_EXTRACT_TAR_BZ2", "Failed to extract tar.bz2: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Create mock model files when extraction fails
     * 
     * @param targetDir Directory to create mock files in
     * @param modelId Model ID for logging purposes
     * @param promise Promise to resolve or reject
     */
    @ReactMethod
    fun createMockModelFiles(targetDir: String, modelId: String, promise: Promise) {
        executor.execute {
            try {
                // Clean up the path
                val cleanTargetDir = targetDir.replace("file://", "")
                
                Log.i(TAG, "Creating mock model files in $cleanTargetDir for model $modelId")
                
                // Use our ArchiveUtils to create mock files
                val result = ArchiveUtils.createMockModelFiles(cleanTargetDir, modelId)
                
                // Create a result map to return to JavaScript
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", result.success)
                resultMap.putString("message", result.message)
                
                // Add created files list
                val filesArray = Arguments.createArray()
                for (file in result.extractedFiles) {
                    filesArray.pushString(file)
                }
                resultMap.putArray("createdFiles", filesArray)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in createMockModelFiles: ${e.message}", e)
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_CREATE_MOCK_FILES", "Failed to create mock files: ${e.message}")
                }
            }
        }
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
            val items = reactContext.assets.list(path) ?: return assets
            for (item in items) {
                val fullPath = if (path.isEmpty()) item else "$path/$item"
                try {
                    reactContext.assets.open(fullPath).use {
                        assets.add(fullPath)
                    }
                } catch (e: IOException) {
                    val subItems = reactContext.assets.list(fullPath)
                    if (subItems?.isNotEmpty() == true) {
                        assets.addAll(getAllAssetsRecursively(fullPath))
                    }
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error listing assets in $path: ${e.message}")
        }
        return assets
    }

    private fun validateModelFiles(modelDir: String, modelName: String, voices: String): Triple<Boolean, String, List<String>> {
        val requiredFiles = listOf(
            File(modelDir, modelName),
            File(modelDir, voices),
            File(modelDir, "tokens.txt")
        )
        
        val missingFiles = mutableListOf<String>()
        var isValid = true
        var errorMessage = ""

        for (file in requiredFiles) {
            if (!file.exists() || !file.canRead()) {
                isValid = false
                missingFiles.add(file.absolutePath)
                Log.e(TAG, "Cannot access file: ${file.absolutePath}")
            } else {
                Log.i(TAG, "Found file: ${file.absolutePath} (${file.length()} bytes)")
            }
        }

        if (!isValid) {
            errorMessage = "Missing or unreadable files: ${missingFiles.joinToString(", ")}"
        }

        return Triple(isValid, errorMessage, missingFiles)
    }

    @ReactMethod
    fun initTts(modelConfig: ReadableMap, promise: Promise) {
        if (!isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                Log.i(TAG, "===== TTS INITIALIZATION START =====")
                Log.i(TAG, "Received model config: ${modelConfig.toHashMap()}")
                
                // Extract config values from the provided map
                val modelDir = modelConfig.getString("modelDir")?.replace("file://", "") ?: ""
                val modelName = modelConfig.getString("modelName") ?: "model.onnx"
                val voices = modelConfig.getString("voices") ?: "voices.bin"
                val acousticModelName = modelConfig.getString("acousticModelName") ?: ""
                val lexicon = modelConfig.getString("lexicon") ?: ""
                val dataDir = modelConfig.getString("dataDir") ?: ""
                val dictDir = modelConfig.getString("dictDir") ?: ""
                val ruleFsts = modelConfig.getString("ruleFsts") ?: ""
                val ruleFars = modelConfig.getString("ruleFars") ?: ""
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else null
                
                // Log extracted configuration
                Log.i(TAG, "Extracted configuration:")
                Log.i(TAG, "- modelDir: $modelDir")
                Log.i(TAG, "- modelName: $modelName")
                Log.i(TAG, "- voices: $voices")
                Log.i(TAG, "- acousticModelName: $acousticModelName")
                Log.i(TAG, "- lexicon: $lexicon")
                Log.i(TAG, "- dataDir: $dataDir")
                Log.i(TAG, "- dictDir: $dictDir")
                Log.i(TAG, "- ruleFsts: $ruleFsts")
                Log.i(TAG, "- ruleFars: $ruleFars")
                Log.i(TAG, "- numThreads: $numThreads")
                
                // Inspect directory structure
                val modelDirFile = File(modelDir)
                Log.i(TAG, "Model directory exists: ${modelDirFile.exists()}, isDirectory: ${modelDirFile.isDirectory()}")
                
                if (modelDirFile.exists() && modelDirFile.isDirectory) {
                    Log.i(TAG, "Files in model directory:")
                    modelDirFile.listFiles()?.forEach { file ->
                        Log.i(TAG, "- ${file.name} (${if (file.isDirectory) "directory" else "file"}, ${file.length()} bytes)")
                    }
                }
                
                // Check for espeak-ng-data
                val espeakDataDir = if (dataDir.isNotEmpty()) {
                    File(dataDir)
                } else {
                    // Try to find in model dir
                    File(modelDir, "espeak-ng-data")
                }
                
                Log.i(TAG, "espeak-ng-data path: ${espeakDataDir.absolutePath}")
                Log.i(TAG, "espeak-ng-data exists: ${espeakDataDir.exists()}, isDirectory: ${espeakDataDir.isDirectory}")
                
                if (espeakDataDir.exists() && espeakDataDir.isDirectory) {
                    Log.i(TAG, "espeak-ng-data contents:")
                    espeakDataDir.listFiles()?.take(10)?.forEach { file ->
                        Log.i(TAG, "- ${file.name} (${if (file.isDirectory) "directory" else "file"}, ${file.length()} bytes)")
                    }
                }
                
                // Validate files first
                val (isValid, errorMessage, missingFiles) = validateModelFiles(modelDir, modelName, voices)
                if (!isValid) {
                    Log.e(TAG, "Model file validation failed: $errorMessage")
                    reactContext.runOnUiQueueThread {
                        promise.reject("ERR_TTS_INIT", "Model file validation failed: $errorMessage")
                    }
                    return@execute
                }

                // Try to auto-detect espeak-ng-data if not provided
                var resolvedDataDir = dataDir
                
                if (resolvedDataDir.isEmpty()) {
                    // Look in model dir first
                    val espeakInModelDir = File(modelDir, "espeak-ng-data")
                    if (espeakInModelDir.exists() && espeakInModelDir.isDirectory) {
                        resolvedDataDir = espeakInModelDir.absolutePath
                        Log.i(TAG, "Auto-detected espeak-ng-data in model directory: $resolvedDataDir")
                    } else {
                        // Look in subdirectories
                        val subDirs = modelDirFile.listFiles { file -> file.isDirectory }
                        var found = false
                        
                        subDirs?.forEach { subDir ->
                            val espeakInSubDir = File(subDir, "espeak-ng-data")
                            if (espeakInSubDir.exists() && espeakInSubDir.isDirectory) {
                                resolvedDataDir = espeakInSubDir.absolutePath
                                Log.i(TAG, "Auto-detected espeak-ng-data in subdirectory: $resolvedDataDir")
                                found = true
                                return@forEach
                            }
                        }
                        
                        if (!found) {
                            Log.w(TAG, "Could not find espeak-ng-data directory")
                        }
                    }
                }

                // Create TTS config with validated paths
                val config = OfflineTtsConfig(
                    modelDir = modelDir,
                    modelName = modelName,
                    acousticModelName = acousticModelName,
                    vocoder = "",
                    voices = voices,
                    lexicon = lexicon,
                    dataDir = resolvedDataDir,
                    dictDir = dictDir,
                    ruleFsts = ruleFsts,
                    ruleFars = ruleFars,
                    numThreads = numThreads
                )

                // Initialize TTS
                var initSuccess = false
                var initError = ""
                
                try {
                    Log.i(TAG, "Creating TTS engine with config")
                    Log.i(TAG, "Using dataDir: $resolvedDataDir")
                    
                    // Keep using the AssetManager constructor but with validated paths
                    tts = OfflineTts(reactContext.assets, config)
                    
                    val sampleRate = tts?.sampleRate() ?: 0
                    if (tts != null && sampleRate > 0) {
                        initSuccess = true
                        initAudioTrack()
                        Log.i(TAG, "TTS engine initialized successfully")
                        Log.i(TAG, "Sample Rate: $sampleRate")
                        Log.i(TAG, "Number of Speakers: ${tts?.numSpeakers() ?: 0}")
                    } else {
                        initError = "TTS engine did not initialize properly (sampleRate: $sampleRate)"
                        Log.e(TAG, initError)
                        tts?.free()
                        tts = null
                    }
                } catch (e: Throwable) {
                    initError = "TTS initialization failed: ${e.message}"
                    Log.e(TAG, initError, e)
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
                    resultMap.putString("error", initError)
                }
                
                Log.i(TAG, "===== TTS INITIALIZATION COMPLETE =====")
                Log.i(TAG, "Result: ${if (initSuccess) "SUCCESS" else "FAILED: $initError"}")

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in initTts: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_INIT", "Error initializing TTS: ${e.message}")
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

    @ReactMethod
    fun debugModelDirectory(dirPath: String, promise: Promise) {
        executor.execute {
            try {
                val cleanPath = dirPath.replace("file://", "")
                val dir = File(cleanPath)
                
                val resultMap = Arguments.createMap()
                resultMap.putString("path", cleanPath)
                resultMap.putBoolean("exists", dir.exists())
                resultMap.putBoolean("isDirectory", dir.isDirectory)
                
                if (dir.exists() && dir.isDirectory) {
                    val files = Arguments.createArray()
                    
                    // First level files
                    dir.listFiles()?.forEach { file ->
                        val fileInfo = Arguments.createMap()
                        fileInfo.putString("name", file.name)
                        fileInfo.putBoolean("isDirectory", file.isDirectory)
                        fileInfo.putInt("size", file.length().toInt())
                        fileInfo.putString("path", file.absolutePath)
                        
                        // For directories, add first level content information
                        if (file.isDirectory) {
                            val subFiles = Arguments.createArray()
                            file.listFiles()?.take(20)?.forEach { subFile ->
                                val subFileInfo = Arguments.createMap()
                                subFileInfo.putString("name", subFile.name)
                                subFileInfo.putBoolean("isDirectory", subFile.isDirectory)
                                subFileInfo.putInt("size", subFile.length().toInt())
                                subFiles.pushMap(subFileInfo)
                            }
                            fileInfo.putArray("contents", subFiles)
                        }
                        
                        files.pushMap(fileInfo)
                    }
                    
                    resultMap.putArray("files", files)
                    
                    // Look for espeak-ng-data
                    val espeakPaths = Arguments.createArray()
                    
                    // Check in current directory
                    val espeakInDir = File(dir, "espeak-ng-data")
                    if (espeakInDir.exists() && espeakInDir.isDirectory) {
                        val info = Arguments.createMap()
                        info.putString("path", espeakInDir.absolutePath)
                        info.putBoolean("exists", true)
                        
                        // List some key files
                        val keyFiles = listOf("phontab", "phonindex", "phondata")
                        val espeakFiles = Arguments.createMap()
                        
                        keyFiles.forEach { fileName ->
                            val file = File(espeakInDir, fileName)
                            espeakFiles.putBoolean(fileName, file.exists())
                        }
                        
                        info.putMap("keyFiles", espeakFiles)
                        espeakPaths.pushMap(info)
                    }
                    
                    // Check in subdirectories
                    dir.listFiles { file -> file.isDirectory }?.forEach { subDir ->
                        val espeakInSubDir = File(subDir, "espeak-ng-data")
                        if (espeakInSubDir.exists() && espeakInSubDir.isDirectory) {
                            val info = Arguments.createMap()
                            info.putString("path", espeakInSubDir.absolutePath)
                            info.putBoolean("exists", true)
                            info.putString("containingDir", subDir.name)
                            
                            // List some key files
                            val keyFiles = listOf("phontab", "phonindex", "phondata")
                            val espeakFiles = Arguments.createMap()
                            
                            keyFiles.forEach { fileName ->
                                val file = File(espeakInSubDir, fileName)
                                espeakFiles.putBoolean(fileName, file.exists())
                            }
                            
                            info.putMap("keyFiles", espeakFiles)
                            espeakPaths.pushMap(info)
                        }
                    }
                    
                    resultMap.putArray("espeakPaths", espeakPaths)
                }
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error debugging model directory: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_DEBUG_MODEL_DIR", "Error debugging model directory: ${e.message}")
                }
            }
        }
    }
} 