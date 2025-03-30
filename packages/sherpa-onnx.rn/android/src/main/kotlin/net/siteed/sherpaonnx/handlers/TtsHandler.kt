/**
 * Handler for Text-to-Speech functionality
 */
package net.siteed.sherpaonnx.handlers

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Log
import com.facebook.react.bridge.*
import com.k2fsa.sherpa.onnx.*
import net.siteed.sherpaonnx.SherpaOnnxImpl
import net.siteed.sherpaonnx.utils.AssetUtils
import net.siteed.sherpaonnx.utils.AudioUtils
import java.io.File
import java.util.concurrent.Executors

class TtsHandler(private val reactContext: ReactApplicationContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    private var tts: OfflineTts? = null
    private var isGenerating = false
    private var audioTrack: AudioTrack? = null
    private var ttsModelConfig: OfflineTtsModelConfig? = null
    
    companion object {
        private const val TAG = "SherpaOnnxTTS"
    }
    
    /**
     * Initialize the TTS engine with the provided model configuration
     */
    fun init(modelConfig: ReadableMap, promise: Promise) {
        if (!SherpaOnnxImpl.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        // Execute initialization in a background thread
        executor.execute {
            try {
                // Initialize the Sherpa ONNX TTS model
                Log.i(TAG, "===== TTS INITIALIZATION START =====")
                Log.i(TAG, "Initializing TTS with config: ${modelConfig.toHashMap()}")
                
                // Extract model config options
                val modelDir = AssetUtils.cleanFilePath(modelConfig.getString("modelDir").orEmpty())
                val modelFileName = modelConfig.getString("modelFile") ?: "model.onnx"
                val tokensFileName = modelConfig.getString("tokensFile") ?: "tokens.txt"
                val voicesFile = modelConfig.getString("voices")
                val lexiconFile = modelConfig.getString("lexicon")
                val dataDirInput = modelConfig.getString("dataDir")
                val modelType = modelConfig.getString("modelType") ?: "vits"
                val sampleRate = if (modelConfig.hasKey("sampleRate")) modelConfig.getInt("sampleRate") else 22050
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 1
                val debug = if (modelConfig.hasKey("debug")) modelConfig.getBoolean("debug") else false
                
                // Log configuration for debugging
                Log.i(TAG, "Model dir: $modelDir")
                Log.i(TAG, "Model file: $modelFileName")
                Log.i(TAG, "Tokens file: $tokensFileName")
                Log.i(TAG, "Voices file (from 'voices' param): $voicesFile")
                Log.i(TAG, "Lexicon file: $lexiconFile")
                Log.i(TAG, "Data dir (input): $dataDirInput")
                Log.i(TAG, "Model type: $modelType")
                Log.i(TAG, "Sample rate: $sampleRate")
                Log.i(TAG, "Num threads: $numThreads")
                Log.i(TAG, "Debug: $debug")
                
                // --- Path Adjustment Logic --- 
                var assetBasePath = modelDir // Start assuming files are directly in modelDir
                val initialModelCheckPath = File(assetBasePath, modelFileName).absolutePath
                Log.i(TAG, "Initial check for model at: $initialModelCheckPath")
                
                if (!File(initialModelCheckPath).exists()) {
                    Log.w(TAG, "Model not found directly in modelDir. Checking for single subdirectory...")
                    try {
                        val modelDirFile = File(modelDir)
                        val contents = modelDirFile.listFiles()
                        if (contents != null && contents.size == 1 && contents[0].isDirectory) {
                            assetBasePath = contents[0].absolutePath // Update base path to the subdirectory
                            Log.i(TAG, "Found single subdirectory, updated assetBasePath to: $assetBasePath")
                        } else {
                            Log.w(TAG, "Did not find a single subdirectory. Contents: ${contents?.map { it.name }?.joinToString()}")
                            // Stick with the original modelDir, the error will be thrown later if files truly missing
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error checking subdirectory: ${e.message}")
                        // Proceed with original modelDir, let the later checks fail if needed
                    }
                }
                // --- End Path Adjustment Logic ---
                
                // Build file paths using the determined assetBasePath
                val modelAbsPath = File(assetBasePath, modelFileName).absolutePath
                val tokensAbsPath = File(assetBasePath, tokensFileName).absolutePath
                val voicesAbsPath = voicesFile?.let { File(assetBasePath, it).absolutePath }
                val lexiconAbsPath = lexiconFile?.let { File(assetBasePath, it).absolutePath }
                // Determine absolute data dir path based on input, relative to the final assetBasePath
                val dataDirAbsPath = if (dataDirInput?.startsWith("/") == true) {
                    Log.i(TAG, "Treating dataDir as absolute.")
                    dataDirInput // Use absolute path directly
                } else if (!dataDirInput.isNullOrEmpty()) {
                    Log.i(TAG, "Treating dataDir as relative, joining with assetBasePath.")
                    File(assetBasePath, dataDirInput).absolutePath // Join relative path with assetBasePath
                } else {
                    Log.i(TAG, "No dataDir provided or empty.")
                    "" // Default to empty if null or empty
                }
                
                // Log final paths being used
                Log.i(TAG, "Using Model path: $modelAbsPath")
                Log.i(TAG, "Using Tokens path: $tokensAbsPath")
                Log.i(TAG, "Using Voices path: $voicesAbsPath")
                Log.i(TAG, "Using Lexicon path: $lexiconAbsPath")
                Log.i(TAG, "Using Data path: $dataDirAbsPath")
                
                // Check if files exist (using the potentially adjusted paths)
                val modelFileObj = File(modelAbsPath)
                val tokensFileObj = File(tokensAbsPath)
                
                if (!modelFileObj.exists()) {
                    throw Exception("Model file not found: $modelAbsPath")
                }
                
                if (!tokensFileObj.exists()) {
                    throw Exception("Tokens file not found: $tokensAbsPath")
                }
                
                voicesAbsPath?.let {
                    val file = File(it)
                    if (!file.exists()) {
                        Log.w(TAG, "Voices file not found: $it")
                    }
                }
                
                lexiconAbsPath?.let {
                    val file = File(it)
                    if (!file.exists()) {
                        Log.w(TAG, "Lexicon file not found: $it")
                    }
                }
                
                // Create TTS model config and main config objects
                val ttsModelConfig = OfflineTtsModelConfig()
                
                // Configure specific model type
                when (modelType) {
                    "vits" -> {
                        Log.i(TAG, "Configuring VITS model")
                        // Create VITS config
                        val vitsConfig = OfflineTtsVitsModelConfig(
                            model = modelAbsPath,
                            lexicon = lexiconAbsPath ?: "",
                            tokens = tokensAbsPath
                        )
                        
                        // Set data directory and noise scale settings
                        vitsConfig.dataDir = dataDirAbsPath
                        vitsConfig.noiseScale = 0.667f
                        vitsConfig.noiseScaleW = 0.8f
                        vitsConfig.lengthScale = 1.0f
                        
                        // Set in the model config
                        ttsModelConfig.vits = vitsConfig
                    }
                    "kokoro" -> {
                        Log.i(TAG, "Configuring Kokoro model")
                        // Create Kokoro config
                        val kokoroConfig = OfflineTtsKokoroModelConfig(
                            model = modelAbsPath,
                            voices = voicesAbsPath ?: "",
                            tokens = tokensAbsPath
                        )
                        
                        // Set data directory and other properties
                        kokoroConfig.dataDir = dataDirAbsPath
                        kokoroConfig.lengthScale = 1.0f
                        
                        // Set in the model config
                        ttsModelConfig.kokoro = kokoroConfig
                    }
                    "matcha" -> {
                        Log.i(TAG, "Configuring Matcha model")
                        // Create Matcha config
                        val matchaConfig = OfflineTtsMatchaModelConfig()
                        
                        // Set properties
                        matchaConfig.acousticModel = modelAbsPath
                        matchaConfig.tokens = tokensAbsPath
                        
                        // Set vocoder if provided
                        if (voicesAbsPath != null) {
                            matchaConfig.vocoder = voicesAbsPath
                        }
                        
                        // Set lexicon if provided
                        if (lexiconAbsPath != null) {
                            matchaConfig.lexicon = lexiconAbsPath
                        }
                        
                        // Set data directory
                        matchaConfig.dataDir = dataDirAbsPath
                        
                        // Set in the model config
                        ttsModelConfig.matcha = matchaConfig
                    }
                    else -> throw Exception("Unsupported model type: $modelType")
                }
                
                // Set common model config properties
                ttsModelConfig.numThreads = numThreads
                ttsModelConfig.debug = debug
                ttsModelConfig.provider = "cpu"
                
                // Create main TTS config
                val ttsConfig = OfflineTtsConfig()
                ttsConfig.model = ttsModelConfig
                
                // Save reference to model config for parameter overrides
                this.ttsModelConfig = ttsModelConfig
                
                // Initialize the TTS instance
                Log.i(TAG, "Creating TTS instance")
                
                // Log the configuration for debugging
                Log.i(TAG, "TTS Config: $ttsConfig")
                
                // Try creating TTS with file access first (absolute paths)
                try {
                    tts = OfflineTts(config = ttsConfig)
                    Log.i(TAG, "Successfully created TTS instance using file paths")
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to initialize TTS with file paths: ${e.message}. Trying with assets.")
                    // Fall back to using assets if file access fails
                    tts = OfflineTts(reactContext.assets, ttsConfig)
                }
                
                // Check if initialization was successful
                if (tts == null) {
                    throw Exception("Failed to initialize TTS engine")
                }
                
                // Initialize audio track with the sample rate
                initAudioTrack(sampleRate)
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", sampleRate)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
                
                Log.i(TAG, "===== TTS INITIALIZATION COMPLETE =====")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize TTS: ${e.message}")
                e.printStackTrace()
                
                // Release any partially initialized resources
                releaseTtsResources()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_INIT", "Failed to initialize TTS: ${e.message}")
                }
                
                Log.i(TAG, "===== TTS INITIALIZATION FAILED =====")
            }
        }
    }
    
    /**
     * Generate speech from text using a config map
     */
    fun generate(config: ReadableMap, promise: Promise) {
        if (!SherpaOnnxImpl.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        // Extract parameters from config with proper defaults
        val text = config.getString("text") ?: ""
        val speakerId = config.getInt("speakerId")
        val speakingRate = config.getDouble("speakingRate").toFloat()
        val playAudio = config.getBoolean("playAudio")
        val fileNamePrefix = config.getString("fileNamePrefix")
        val lengthScale = if (config.hasKey("lengthScale")) config.getDouble("lengthScale").toFloat() else null
        val noiseScale = if (config.hasKey("noiseScale")) config.getDouble("noiseScale").toFloat() else null
        val noiseScaleW = if (config.hasKey("noiseScaleW")) config.getDouble("noiseScaleW").toFloat() else null

        // Validate text is not empty
        if (text.isBlank()) {
            promise.reject("ERR_INVALID_TEXT", "Text cannot be empty")
            return
        }

        Log.d(TAG, "Generating TTS for text: '$text' with speakerId: $speakerId, speed: $speakingRate, playAudio: $playAudio")
        
        executor.execute {
            try {
                if (tts == null) {
                    throw Exception("TTS not initialized")
                }

                if (isGenerating) {
                    throw Exception("TTS is already generating speech")
                }

                isGenerating = true

                // Initialize audio track if needed and playAudio is true
                if (playAudio) {
                    initAudioTrack(22050)  // Sherpa ONNX TTS uses 22050Hz
                }

                val startTime = System.currentTimeMillis()
                var audio: FloatArray? = null

                if (playAudio) {
                    // Generate and play in real-time
                    Log.d(TAG, "Using generateWithCallback method")
                    tts?.generateWithCallback(text, speakerId, speakingRate) { samples ->
                        if (!isGenerating) return@generateWithCallback 0  // Stop generating
                        // Ensure we're writing at the correct sample rate
                        val written = audioTrack?.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING) ?: 0
                        if (written != samples.size) {
                            Log.w(TAG, "Failed to write all samples: $written/${samples.size}")
                        }
                        1  // Continue generating
                    }
                } else {
                    // Generate without playback
                    Log.d(TAG, "Using generate method without callback")
                    val generatedAudio = tts?.generate(text, speakerId, speakingRate)
                    audio = generatedAudio?.samples
                }

                val endTime = System.currentTimeMillis()
                val duration = endTime - startTime
                Log.d(TAG, "Speech generation completed in ${duration}ms")

                // Save audio to file if needed
                if (audio != null) {
                    val fileName = fileNamePrefix?.let { "${it}_${System.currentTimeMillis()}" }
                        ?: "generated_audio_${System.currentTimeMillis()}"
                    val filePath = "${reactContext.cacheDir.absolutePath}/$fileName.wav"
                    
                    val saved = AudioUtils.saveAsWav(audio, 22050, filePath)
                    Log.d(TAG, "Audio saved: $saved, file path: $filePath")
                    
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", true)
                    if (filePath != null) {
                        resultMap.putString("filePath", filePath)
                    }
                    promise.resolve(resultMap)
                } else {
                    // If no audio was generated, try again without callback
                    Log.w(TAG, "No audio generated, trying again without callback")
                    // Fallback: try again without callback
                    val generatedAudio = tts?.generate(text, speakerId, speakingRate)
                    audio = generatedAudio?.samples
                    if (audio == null) {
                        throw Exception("Failed to generate speech audio")
                    }
                    
                    val fileName = fileNamePrefix?.let { "${it}_${System.currentTimeMillis()}" }
                        ?: "generated_audio_${System.currentTimeMillis()}"
                    val filePath = "${reactContext.cacheDir.absolutePath}/$fileName.wav"
                    
                    val saved = AudioUtils.saveAsWav(audio, 22050, filePath)
                    Log.d(TAG, "Audio saved: $saved, file path: $filePath")
                    
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", true)
                    if (filePath != null) {
                        resultMap.putString("filePath", filePath)
                    }
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error generating speech: ${e.message}")
                promise.reject("ERR_GENERATION_FAILED", e.message)
            } finally {
                isGenerating = false
                // Don't stop the AudioTrack here as it might still be playing
            }
        }
    }
    
    /**
     * Initialize audio track for playback
     */
    private fun initAudioTrack(sampleRate: Int) {
        try {
            val minBufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_FLOAT
            ) * 2  // Double the minimum buffer size for smoother playback

            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                        .setSampleRate(sampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(minBufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            audioTrack?.apply {
                // Set the playback rate to match the model's sample rate
                playbackRate = sampleRate
                play()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize AudioTrack: ${e.message}")
            throw e
        }
    }
    
    /**
     * Stop TTS generation
     */
    fun stop(promise: Promise) {
        executor.execute {
            try {
                Log.i(TAG, "Stopping TTS generation")
                
                // Set flag to stop callback-based generation
                isGenerating = false
                
                // Stop audio playback
                if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack?.pause()
                    audioTrack?.flush()
                }
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping TTS: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_STOP", "Failed to stop TTS: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Release TTS resources
     */
    fun release(promise: Promise) {
        executor.execute {
            try {
                Log.i(TAG, "Releasing TTS resources")
                
                // Set flag to stop any ongoing generation
                isGenerating = false
                
                // Release TTS resources
                releaseTtsResources()
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing TTS: ${e.message}")
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_RELEASE", "Failed to release TTS: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Clean up resources
     */
    private fun releaseTtsResources() {
        // Clean up AudioTrack
        try {
            if (audioTrack?.state == AudioTrack.STATE_INITIALIZED) {
                if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack?.stop()
                }
                audioTrack?.release()
            }
            audioTrack = null
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing AudioTrack: ${e.message}")
        }
        
        // Release TTS engine
        try {
            tts?.release()
            tts = null
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing TTS engine: ${e.message}")
        }
    }
} 