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
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig

class SherpaOnnxModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()
    
    // TTS state
    private var ttsPtr: Long = 0L
    private var isGenerating = false
    private var audioTrack: AudioTrack? = null

    companion object {
        const val NAME = "SherpaOnnx"
        private const val TAG = "SherpaOnnxModule"
        private var isLibraryLoaded = false
        
        init {
            try {
                // Check if the library is loaded by accessing the JNI bridge class
                isLibraryLoaded = OfflineTts::class.java != null
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
                
                // Extract paths directly from the config
                val modelDir = modelConfig.getString("modelDir")?.replace("file://", "") ?: ""
                val modelName = modelConfig.getString("modelName") ?: "model.onnx"
                val voices = modelConfig.getString("voices") ?: "voices.bin"
                val dataDir = modelConfig.getString("dataDir")?.replace("file://", "") ?: ""
                var numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 2
                
                // Try to determine model type from directory name or model name
                val dirName = File(modelDir).name.lowercase()
                val modelType = if (modelConfig.hasKey("modelType")) {
                    modelConfig.getString("modelType")
                } else if (dirName.contains("vits") || dirName.contains("icefall")) {
                    "vits"
                } else if (dirName.contains("kokoro")) {
                    "kokoro"
                } else if (dirName.contains("matcha")) {
                    "matcha"
                } else {
                    "vits" // Default to VITS for backward compatibility
                }
                
                Log.i(TAG, "Using exact paths provided by client:")
                Log.i(TAG, "- modelDir: $modelDir")
                Log.i(TAG, "- modelName: $modelName")
                Log.i(TAG, "- voices: $voices")
                Log.i(TAG, "- dataDir: $dataDir")
                Log.i(TAG, "- modelType: $modelType")
                Log.i(TAG, "- numThreads: $numThreads")
                
                // Build file paths
                val modelFile = File(modelDir, modelName)
                val voicesFile = File(modelDir, voices)
                val tokensFile = File(modelDir, "tokens.txt")
                
                // Log file existence
                Log.i(TAG, "Model file: ${modelFile.absolutePath} (exists: ${modelFile.exists()}, size: ${modelFile.length()})")
                Log.i(TAG, "Voices file: ${voicesFile.absolutePath} (exists: ${voicesFile.exists()}, size: ${voicesFile.length()})")
                Log.i(TAG, "Tokens file: ${tokensFile.absolutePath} (exists: ${tokensFile.exists()}, size: ${tokensFile.length()})")
                Log.i(TAG, "Data dir: $dataDir (exists: ${File(dataDir).exists()})")
                
                // Create JNI configuration based on model type
                var ttsModelConfig = OfflineTtsModelConfig().apply {
                    debug = true
                    provider = "cpu"
                    this.numThreads = numThreads
                }
                
                // Configure based on model type
                if (modelType == "vits") {
                    // Configure VITS model
                    val vitsConfig = com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig().apply {
                        model = modelFile.absolutePath
                        tokens = tokensFile.absolutePath
                        this.dataDir = dataDir
                        // Set VITS-specific parameters
                        noiseScale = 0.667f
                        noiseScaleW = 0.8f
                        lengthScale = 1.0f
                    }
                    ttsModelConfig.vits = vitsConfig
                    Log.i(TAG, "Configured VITS model")
                } else if (modelType == "kokoro") {
                    // Configure Kokoro model
                    val kokoroConfig = com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig().apply {
                        model = modelFile.absolutePath
                        this.voices = voicesFile.absolutePath
                        tokens = tokensFile.absolutePath
                        this.dataDir = dataDir
                        lengthScale = 1.0f
                    }
                    ttsModelConfig.kokoro = kokoroConfig
                    Log.i(TAG, "Configured Kokoro model")
                } else if (modelType == "matcha") {
                    // Configure Matcha model
                    val matchaConfig = com.k2fsa.sherpa.onnx.OfflineTtsMatchaModelConfig().apply {
                        acousticModel = modelFile.absolutePath
                        vocoder = voicesFile.absolutePath
                        tokens = tokensFile.absolutePath
                        this.dataDir = dataDir
                        noiseScale = 1.0f
                        lengthScale = 1.0f
                    }
                    ttsModelConfig.matcha = matchaConfig
                    Log.i(TAG, "Configured Matcha model")
                } else {
                    // Fallback to VITS as default for backward compatibility
                    Log.i(TAG, "Unknown model type, defaulting to VITS model")
                    val vitsConfig = com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig().apply {
                        model = modelFile.absolutePath
                        tokens = tokensFile.absolutePath
                        this.dataDir = dataDir
                        noiseScale = 0.667f
                        noiseScaleW = 0.8f
                        lengthScale = 1.0f
                    }
                    ttsModelConfig.vits = vitsConfig
                }
                
                val config = OfflineTtsConfig().apply {
                    model = ttsModelConfig
                    maxNumSentences = 1
                    silenceScale = 0.2f
                }
                
                // Log the final JNI config
                Log.i(TAG, "Final JNI config:")
                Log.i(TAG, "- model type: $modelType")
                Log.i(TAG, "- model: ${modelFile.absolutePath}")
                Log.i(TAG, "- tokens: ${tokensFile.absolutePath}")
                Log.i(TAG, "- dataDir: $dataDir")
                
                // Initialize TTS engine directly
                val ptr = OfflineTts.newFromFile(config)
                
                if (ptr == 0L) {
                    throw Exception("Failed to initialize TTS engine (returned null pointer)")
                }
                
                // Store the pointer
                ttsPtr = ptr
                
                val sampleRate = OfflineTts.getSampleRate(ptr)
                val numSpeakers = OfflineTts.getNumSpeakers(ptr)
                
                Log.i(TAG, "TTS initialized successfully with sample rate: $sampleRate")
                
                // Initialize audio track
                initAudioTrack(sampleRate)
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", sampleRate)
                resultMap.putInt("numSpeakers", numSpeakers)
                
                Log.i(TAG, "===== TTS INITIALIZATION COMPLETE =====")
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing TTS: ${e.message}")
                e.printStackTrace()
                
                // Release resources in case of error
                releaseTtsResources()
                
                Log.i(TAG, "===== TTS INITIALIZATION FAILED =====")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_INIT", "Failed to initialize TTS: ${e.message}")
                }
            }
        }
    }

    @ReactMethod
    fun generateTts(text: String, speakerId: Int, speed: Float, playAudio: Boolean, promise: Promise) {
        executor.execute {
            try {
                if (ttsPtr == 0L) {
                    throw Exception("TTS is not initialized")
                }

                if (isGenerating) {
                    throw Exception("TTS is already generating speech")
                }

                Log.d(TAG, "Generating TTS for text: '$text' with speakerId: $speakerId, speed: $speed, playAudio: $playAudio")
                isGenerating = true

                // Prepare audio playback if needed
                if (playAudio) {
                    prepareAudioTrack()
                }

                // Generate speech
                val startTime = System.currentTimeMillis()
                val result = if (playAudio) {
                    Log.d(TAG, "Using generateWithCallback method")
                    OfflineTts.generateWithCallbackImpl(ttsPtr, text, speakerId, speed) { samples ->
                        if (!isGenerating) return@generateWithCallbackImpl 0  // Stop generating
                        audioTrack?.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
                        1  // Continue generating
                    }
                } else {
                    Log.d(TAG, "Using generate method without callback")
                    OfflineTts.generateImpl(ttsPtr, text, speakerId, speed)
                }
                val endTime = System.currentTimeMillis()
                
                // Extract results
                val samples = result[0] as FloatArray
                val sampleRate = result[1] as Int
                
                Log.d(TAG, "Speech generation completed in ${endTime - startTime}ms")
                Log.d(TAG, "Generated ${samples.size} samples at ${sampleRate}Hz")

                // Save to file
                val wavFile = File(reactContext.cacheDir, "generated_audio.wav")
                val saved = AudioUtils.saveAsWav(samples, sampleRate, wavFile.absolutePath)
                Log.d(TAG, "Audio saved: $saved, file path: ${wavFile.absolutePath}")

                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", sampleRate)
                resultMap.putInt("samplesLength", samples.size)
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
        executor.execute {
            try {
                if (isGenerating) {
                    isGenerating = false
                    
                    audioTrack?.pause()
                    audioTrack?.flush()
                    
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("stopped", true)
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                } else {
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("stopped", false)
                    resultMap.putString("message", "No TTS generation in progress")
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                }
            } catch (e: Exception) {
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_STOP", "Failed to stop TTS: ${e.message}")
                }
            }
        }
    }

    @ReactMethod
    fun releaseTts(promise: Promise) {
        executor.execute {
            try {
                releaseTtsResources()
                
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

    /**
     * Release TTS resources
     */
    private fun releaseTtsResources() {
        audioTrack?.release()
        audioTrack = null
        
        if (ttsPtr != 0L) {
            OfflineTts.delete(ttsPtr)
            ttsPtr = 0L
        }
    }

    /**
     * Initialize the audio track for playback
     */
    private fun initAudioTrack(sampleRate: Int) {
        try {
            val bufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_FLOAT
            )
            
            Log.d(TAG, "Creating AudioTrack with sample rate: $sampleRate, buffer size: $bufferSize")
            
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setSampleRate(sampleRate)
                        .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(bufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
                
            Log.d(TAG, "AudioTrack created successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error creating AudioTrack: ${e.message}")
            audioTrack = null
        }
    }

    /**
     * Prepare audio track for playback
     */
    private fun prepareAudioTrack() {
        audioTrack?.let { track ->
            if (track.state == AudioTrack.STATE_INITIALIZED) {
                track.play()
                Log.d(TAG, "AudioTrack started")
            } else {
                Log.e(TAG, "AudioTrack not initialized, state: ${track.state}")
            }
        } ?: run {
            Log.e(TAG, "AudioTrack is null, cannot prepare for playback")
        }
    }

}