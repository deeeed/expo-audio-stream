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
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
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

// Import the AudioTagging class
import com.k2fsa.sherpa.onnx.AudioTagging
import com.k2fsa.sherpa.onnx.AudioTaggingConfig
import com.k2fsa.sherpa.onnx.AudioEvent
import com.k2fsa.sherpa.onnx.OfflineStream
import com.k2fsa.sherpa.onnx.AudioTaggingModelConfig
import com.k2fsa.sherpa.onnx.OfflineZipformerAudioTaggingModelConfig

class SherpaOnnxModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newSingleThreadExecutor()
    
    // TTS state
    private var ttsPtr: Long = 0L
    private var isGenerating = false
    private var audioTrack: AudioTrack? = null
    
    // Audio tagging state
    private var audioTagging: AudioTagging? = null
    private var stream: OfflineStream? = null

    companion object {
        const val NAME = "SherpaOnnx"
        private const val TAG = "SherpaOnnxModule"
        private var isLibraryLoaded = false
        
        // Move the TIMEOUT_US constant here
        private const val TIMEOUT_US = 10000L
        
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
    
    /**
     * Initialize the AudioTagging module with the provided configuration
     */
    @ReactMethod
    fun initAudioTagging(modelConfig: ReadableMap, promise: Promise) {
        if (!isLibraryLoaded) {
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
    @ReactMethod
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
    @ReactMethod
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
    @ReactMethod
    fun releaseAudioTagging(promise: Promise) {
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
     * Process audio file and compute results in one call
     * This method is safer as it handles all stream management internally
     */
    @ReactMethod
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
                                audioData = extractAudioFromFile(file)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error reading WAV with AudioUtils: ${e.message}")
                            // Fall back to MediaExtractor
                            audioData = extractAudioFromFile(file)
                        }
                    } else {
                        // For other formats, use MediaExtractor
                        audioData = extractAudioFromFile(file)
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
     * Process an audio file directly on the native side
     */
    @ReactMethod
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
                                audioData = extractAudioFromFile(file)
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error reading WAV with AudioUtils: ${e.message}")
                            // Fall back to MediaExtractor
                            audioData = extractAudioFromFile(file)
                        }
                    } else {
                        // For other formats, use MediaExtractor
                        audioData = extractAudioFromFile(file)
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
     * Data class to hold extracted audio data
     */
    data class AudioData(val samples: FloatArray, val sampleRate: Int)
    
    /**
     * Extract audio data from any supported audio file using MediaExtractor
     * This handles MP3, WAV, AAC, and other formats supported by Android
     */
    private fun extractAudioFromFile(file: File): AudioData? {
        val extractor = MediaExtractor()
        val decoder = MediaCodec.createDecoderByType(MediaFormat.MIMETYPE_AUDIO_MPEG)
        
        try {
            // Set the data source to our audio file
            extractor.setDataSource(file.absolutePath)
            
            // Find the first audio track
            val audioTrackIndex = selectAudioTrack(extractor)
            if (audioTrackIndex < 0) {
                Log.e(TAG, "No audio track found in the file")
                return null
            }
            
            // Select this track for extraction
            extractor.selectTrack(audioTrackIndex)
            
            // Get the format for this track
            val format = extractor.getTrackFormat(audioTrackIndex)
            
            // Get sample rate from format
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            Log.i(TAG, "Audio sample rate: $sampleRate")
            
            // Get channel count
            val channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            Log.i(TAG, "Audio channels: $channelCount")
            
            // Configure and start the decoder
            decoder.configure(format, null, null, 0)
            decoder.start()
            
            // Decode the audio to PCM
            val pcmData = decodeAudioToPCM(extractor, format, decoder)
            
            // If this is stereo or multi-channel, convert to mono by averaging the channels
            val monoSamples = if (channelCount > 1) {
                convertToMono(pcmData, channelCount)
            } else {
                pcmData
            }
            
            // Convert byte array to float array
            val floatSamples = byteArrayToFloatArray(monoSamples)
            
            return AudioData(floatSamples, sampleRate)
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting audio: ${e.message}")
            e.printStackTrace()
            return null
        } finally {
            try {
                extractor.release()
                decoder.stop()
                decoder.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error cleaning up MediaExtractor: ${e.message}")
            }
        }
    }
    
    /**
     * Find and select the first audio track in the media file
     */
    private fun selectAudioTrack(extractor: MediaExtractor): Int {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime?.startsWith("audio/") == true) {
                return i
            }
        }
        return -1
    }
    
    /**
     * Decode audio data to raw PCM using MediaCodec
     */
    private fun decodeAudioToPCM(extractor: MediaExtractor, format: MediaFormat, decoder: MediaCodec): ByteArray {
        val outputBuffers = mutableListOf<ByteArray>()
        val bufferInfo = MediaCodec.BufferInfo()
        var inputEOS = false
        var outputEOS = false
        
        // Start decoding
        while (!outputEOS) {
            if (!inputEOS) {
                val inputBufferId = decoder.dequeueInputBuffer(TIMEOUT_US)
                if (inputBufferId >= 0) {
                    val inputBuffer = decoder.getInputBuffer(inputBufferId)
                    inputBuffer?.clear()
                    
                    val sampleSize = if (inputBuffer != null) {
                        extractor.readSampleData(inputBuffer, 0)
                    } else -1
                    
                    if (sampleSize < 0) {
                        decoder.queueInputBuffer(
                            inputBufferId, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM
                        )
                        inputEOS = true
                        Log.d(TAG, "End of audio stream reached")
                    } else {
                        decoder.queueInputBuffer(
                            inputBufferId, 0, sampleSize, extractor.sampleTime, 0
                        )
                        extractor.advance()
                    }
                }
            }
            
            // Get decoded data
            val outputBufferId = decoder.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)
            if (outputBufferId >= 0) {
                if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                    outputEOS = true
                }
                
                // If we have valid output, copy it
                if (bufferInfo.size > 0) {
                    val outputBuffer = decoder.getOutputBuffer(outputBufferId)
                    if (outputBuffer != null) {
                        val data = ByteArray(bufferInfo.size)
                        outputBuffer.position(bufferInfo.offset)
                        outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
                        outputBuffer.get(data)
                        outputBuffers.add(data)
                    }
                }
                
                decoder.releaseOutputBuffer(outputBufferId, false)
            }
        }
        
        // Combine all output chunks into a single byte array
        val totalSize = outputBuffers.sumOf { it.size }
        val result = ByteArray(totalSize)
        var offset = 0
        
        for (buffer in outputBuffers) {
            System.arraycopy(buffer, 0, result, offset, buffer.size)
            offset += buffer.size
        }
        
        Log.i(TAG, "Decoded ${result.size} bytes of PCM audio data")
        return result
    }
    
    /**
     * Convert multi-channel audio to mono by averaging all channels
     */
    private fun convertToMono(input: ByteArray, channels: Int): ByteArray {
        // Assuming 16-bit PCM, 2 bytes per sample
        val bytesPerSample = 2
        val samplesPerFrame = channels
        val bytesPerFrame = bytesPerSample * samplesPerFrame
        val frameCount = input.size / bytesPerFrame
        
        val output = ByteArray(frameCount * bytesPerSample)
        
        for (i in 0 until frameCount) {
            var sum = 0L
            
            // Average all channels
            for (c in 0 until channels) {
                val offset = i * bytesPerFrame + c * bytesPerSample
                // Read 16-bit sample (little endian)
                val sample = (input[offset].toInt() and 0xFF) or
                             ((input[offset + 1].toInt() and 0xFF) shl 8)
                sum += sample
            }
            
            // Calculate the average
            val average = (sum / channels).toInt()
            
            // Write back the mono sample (little endian)
            val outOffset = i * bytesPerSample
            output[outOffset] = (average and 0xFF).toByte()
            output[outOffset + 1] = ((average shr 8) and 0xFF).toByte()
        }
        
        return output
    }
    
    /**
     * Convert a PCM byte array to float array with values in range [-1.0, 1.0]
     */
    private fun byteArrayToFloatArray(input: ByteArray): FloatArray {
        // Assuming 16-bit PCM, 2 bytes per sample
        val bytesPerSample = 2
        val sampleCount = input.size / bytesPerSample
        val output = FloatArray(sampleCount)
        
        for (i in 0 until sampleCount) {
            val offset = i * bytesPerSample
            // Read 16-bit sample (little endian)
            val sample = (input[offset].toInt() and 0xFF) or
                         ((input[offset + 1].toInt() and 0xFF) shl 8)
            
            // Convert to signed value
            val signedSample = if (sample >= 32768) sample - 65536 else sample
            
            // Normalize to [-1.0, 1.0]
            output[i] = signedSample / 32768f
        }
        
        return output
    }

    /**
     * Process and compute audio samples in one call - safer implementation
     * This creates a dedicated stream for each operation and cleans up properly
     */
    @ReactMethod
    fun processAndComputeAudioSamples(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        if (audioTagging == null) {
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
                    resultMap.putString("error", "Empty audio buffer provided")
                    
                    reactContext.runOnUiQueueThread {
                        promise.resolve(resultMap)
                    }
                    return@execute
                }
                
                Log.i(TAG, "Processing ${size} audio samples at ${sampleRate}Hz in combined operation")
                
                // Create a local temporary stream for this operation ONLY
                var tempStream: OfflineStream? = null
                
                try {
                    // Convert buffer to FloatArray
                    val samples = FloatArray(size)
                    for (i in 0 until size) {
                        samples[i] = audioBuffer.getDouble(i).toFloat()
                    }
                    
                    // Create a new local stream for this operation
                    tempStream = audioTagging?.createStream()
                    
                    if (tempStream == null) {
                        throw Exception("Failed to create audio stream")
                    }
                    
                    // Feed the samples to the local stream
                    tempStream.acceptWaveform(samples, sampleRate)
                    
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
                Log.e(TAG, "Error in processAndComputeAudioSamples: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_PROCESS_AND_COMPUTE", "Failed to process and compute audio tagging for samples: ${e.message}")
                }
            }
        }
    }

}