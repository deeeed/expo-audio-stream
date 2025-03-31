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
    private var currentSampleRate: Int = 22050 // Default to 22050 Hz (common for speech)
    
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
                val voicesFile = modelConfig.getString("voicesFile")
                val lexiconFile = modelConfig.getString("lexiconFile")
                val vocoderFile = modelConfig.getString("vocoderFile")
                val dataDirInput = modelConfig.getString("dataDir")
                val modelType = modelConfig.getString("ttsModelType") ?: "vits"
                val sampleRate = if (modelConfig.hasKey("sampleRate")) modelConfig.getInt("sampleRate") else 16000
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
                
                // --- Start Refined Path Adjustment Logic ---
                var assetBasePath = modelDir // Start with the base directory provided
                var modelFound = false

                // 1. Check directly in modelDir
                val directModelPath = File(assetBasePath, modelFileName).absolutePath
                Log.i(TAG, "Initial check for model at: $directModelPath")
                if (File(directModelPath).exists()) {
                    modelFound = true
                    Log.i(TAG, "Model found directly in modelDir.")
                }

                // 2. If not found directly, search immediate subdirectories
                if (!modelFound) {
                    Log.w(TAG, "Model not found directly in modelDir. Searching immediate subdirectories...")
                    try {
                        val modelDirFile = File(modelDir)
                        // Ensure the base directory exists and is a directory before listing
                        if (modelDirFile.exists() && modelDirFile.isDirectory) {
                            val subdirectories = modelDirFile.listFiles()?.filter { it.isDirectory }

                            if (subdirectories.isNullOrEmpty()) {
                                Log.w(TAG, "No subdirectories found in $modelDir")
                            } else {
                                Log.i(TAG, "Found subdirectories: ${subdirectories.joinToString { it.name }}")
                                for (subDir in subdirectories) {
                                    val subDirModelPath = File(subDir, modelFileName).absolutePath
                                    Log.i(TAG, "Checking for model in subdirectory: $subDirModelPath")
                                    if (File(subDirModelPath).exists()) {
                                        assetBasePath = subDir.absolutePath // IMPORTANT: Update base path to the subdirectory where files were found
                                        modelFound = true
                                        Log.i(TAG, "Model found in subdirectory. Updated assetBasePath to: $assetBasePath")
                                        break // Found it, stop searching subdirectories
                                    }
                                }
                            }
                        } else {
                             Log.w(TAG, "Base model directory does not exist or is not a directory: $modelDir")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error searching subdirectories: ${e.message}")
                        // Continue, the final check below will handle the 'not found' case
                    }
                }

                // 3. Final check: If model still not found, throw an error
                if (!modelFound) {
                    Log.e(TAG, "Model file '$modelFileName' not found directly in '$modelDir' or in any immediate subdirectories.")
                    // Log directory contents for debugging before throwing
                    try {
                        val dirContents = File(modelDir).listFiles()?.joinToString { it.name } ?: "Unable to list contents or directory doesn't exist"
                        Log.e(TAG, "Contents of '$modelDir': $dirContents")
                    } catch (e: Exception) {
                        Log.e(TAG, "Error listing directory contents for '$modelDir': ${e.message}")
                    }
                    throw Exception("Model file '$modelFileName' not found in '$modelDir' or its immediate subdirectories.")
                }
                // --- End Refined Path Adjustment Logic ---
                
                // Build file paths using the determined assetBasePath
                val modelAbsPath = File(assetBasePath, modelFileName).absolutePath
                val tokensAbsPath = File(assetBasePath, tokensFileName).absolutePath
                val voicesAbsPath = voicesFile?.let { File(assetBasePath, it).absolutePath }
                val lexiconAbsPath = lexiconFile?.let { File(assetBasePath, it).absolutePath }
                // Determine absolute data dir path based on input, relative to the final assetBasePath
                val dataDirAbsPath = when {
                    dataDirInput == null || dataDirInput.isEmpty() -> {
                        Log.i(TAG, "No dataDir provided or empty.")
                        "" // Default to empty
                    }
                    dataDirInput.startsWith("/") -> {
                        Log.i(TAG, "Treating dataDir as absolute.")
                        dataDirInput // Use absolute path directly
                    }
                    else -> {
                        Log.i(TAG, "Treating dataDir as relative, joining with final assetBasePath.")
                        File(assetBasePath, dataDirInput).absolutePath // Join relative path with final assetBasePath
                    }
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
                        
                        // Set properties - Important: use modelAbsPath as acousticModel
                        matchaConfig.acousticModel = modelAbsPath
                        matchaConfig.tokens = tokensAbsPath
                        
                        // Set vocoder if provided (from vocoderFile parameter)
                        if (vocoderFile != null) {
                            val vocoderAbsPath = File(assetBasePath, vocoderFile).absolutePath
                            matchaConfig.vocoder = vocoderAbsPath
                        }
                        // Fall back to voicesFile for backward compatibility
                        else if (voicesAbsPath != null) {
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
                
                // Store the sample rate
                currentSampleRate = sampleRate
                Log.i(TAG, "Using sample rate: $currentSampleRate Hz")
                
                // Initialize audio track with the sample rate
                initAudioTrack(currentSampleRate)
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", currentSampleRate)
                
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
        
        // Extract with validation and proper defaults
        val lengthScale = if (config.hasKey("lengthScale")) {
            val value = config.getDouble("lengthScale").toFloat()
            // Validate range - typical range is 0.5 to 2.0
            when {
                value < 0.5f -> 0.5f
                value > 2.0f -> 2.0f
                else -> value
            }
        } else {
            1.0f // Default is 1.0 (normal speed)
        }
        
        val noiseScale = if (config.hasKey("noiseScale")) {
            val value = config.getDouble("noiseScale").toFloat()
            // Validate range - typical range is 0.4 to 1.0
            when {
                value < 0.0f -> 0.667f // Use default if invalid
                value > 1.0f -> 1.0f
                else -> value
            }
        } else {
            0.667f // Default for VITS models
        }
        
        val noiseScaleW = if (config.hasKey("noiseScaleW")) {
            val value = config.getDouble("noiseScaleW").toFloat()
            // Validate range - typical range is 0.5 to 1.0
            when {
                value < 0.0f -> 0.8f // Use default if invalid
                value > 1.0f -> 1.0f
                else -> value
            }
        } else {
            0.8f // Default for VITS models
        }

        // Validate text is not empty
        if (text.isBlank()) {
            promise.reject("ERR_INVALID_TEXT", "Text cannot be empty")
            return
        }

        // Log parameters for debugging - explicitly log playAudio value
        Log.d(TAG, "Generating TTS for text: '$text'")
        Log.d(TAG, "Parameters: speakerId=$speakerId, speakingRate=$speakingRate, playAudio=$playAudio")
        Log.d(TAG, "Style parameters: lengthScale=$lengthScale, noiseScale=$noiseScale, noiseScaleW=$noiseScaleW")
        Log.d(TAG, "Using sample rate: $currentSampleRate Hz")
        
        executor.execute {
            try {
                if (tts == null) {
                    throw Exception("TTS not initialized")
                }

                if (isGenerating) {
                    throw Exception("TTS is already generating speech")
                }

                isGenerating = true

                // Apply parameters to the model config based on model type
                if (ttsModelConfig != null) {
                    when {
                        ttsModelConfig?.vits != null -> {
                            // Apply params to VITS model
                            ttsModelConfig?.vits?.lengthScale = lengthScale
                            ttsModelConfig?.vits?.noiseScale = noiseScale
                            ttsModelConfig?.vits?.noiseScaleW = noiseScaleW
                            Log.d(TAG, "Applied parameters to VITS model")
                        }
                        ttsModelConfig?.matcha != null -> {
                            // Apply params to Matcha model
                            ttsModelConfig?.matcha?.lengthScale = lengthScale
                            ttsModelConfig?.matcha?.noiseScale = noiseScale
                            Log.d(TAG, "Applied parameters to Matcha model")
                        }
                        ttsModelConfig?.kokoro != null -> {
                            // Apply params to Kokoro model (only supports lengthScale)
                            ttsModelConfig?.kokoro?.lengthScale = lengthScale
                            Log.d(TAG, "Applied parameters to Kokoro model")
                        }
                    }
                }

                // Initialize audio track if needed and playAudio is true
                if (playAudio) {
                    // Release any existing audio track first
                    releaseAudioTrack()
                    
                    // Create new audio track with the correct sample rate
                    initAudioTrack(currentSampleRate)
                    
                    if (audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                        Log.e(TAG, "Failed to initialize AudioTrack for playback!")
                        // We'll continue and at least generate the file
                    } else {
                        Log.d(TAG, "AudioTrack initialized successfully for playback")
                    }
                }

                val startTime = System.currentTimeMillis()
                var audio: FloatArray? = null

                if (playAudio) {
                    // Generate and play in real-time
                    Log.d(TAG, "Using generateWithCallback method for real-time playback")
                    
                    var totalSamplesWritten = 0
                    var totalCalls = 0
                    
                    tts?.generateWithCallback(text, speakerId, speakingRate) { samples ->
                        if (!isGenerating) {
                            Log.i(TAG, "TTS generation interrupted by stop request")
                            return@generateWithCallback 0  // Stop generating
                        }
                        
                        totalCalls++
                        
                        // Check if AudioTrack is still valid and re-create if necessary
                        if (audioTrack?.state != AudioTrack.STATE_INITIALIZED || 
                            audioTrack?.playState == AudioTrack.PLAYSTATE_STOPPED) {
                            Log.e(TAG, "AudioTrack invalid or stopped during playback, reinitializing...")
                            try {
                                releaseAudioTrack()
                                initAudioTrack(currentSampleRate)
                                // Add a small delay to let AudioTrack initialize
                                Thread.sleep(50)
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to reinitialize AudioTrack: ${e.message}")
                                return@generateWithCallback 1 // Continue but skip playing this chunk
                            }
                        }
                        
                        try {
                            // Convert float samples to short samples for PCM_16BIT encoding
                            val shortSamples = ShortArray(samples.size)
                            for (i in samples.indices) {
                                // Convert from float [-1.0,1.0] to short [−32,768, 32,767]
                                // IMPORTANT: Optimize conversion using direct multiplication
                                // and clamp values to prevent overflow
                                val sample = samples[i]
                                val clampedSample = if (sample < -1.0f) -1.0f else if (sample > 1.0f) 1.0f else sample
                                shortSamples[i] = (clampedSample * 32767.0f).toInt().toShort()
                            }
                            
                            // Write in chunks to prevent underruns - use a chunk size that's not too small
                            // and not too large (1024 samples is a good compromise)
                            val chunkSize = 2048
                            var offset = 0
                            
                            while (offset < shortSamples.size) {
                                val remainingSize = shortSamples.size - offset
                                val currentChunkSize = kotlin.math.min(chunkSize, remainingSize)
                                
                                // Check if the AudioTrack is still valid before writing
                                if (audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                                    Log.w(TAG, "AudioTrack disabled during chunk write, reinitializing...")
                                    releaseAudioTrack()
                                    initAudioTrack(currentSampleRate)
                                    // If AudioTrack couldn't be reinitialized, continue to next chunk
                                    if (audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                                        offset += currentChunkSize
                                        continue
                                    }
                                }
                                
                                val written = audioTrack?.write(shortSamples, offset, currentChunkSize, AudioTrack.WRITE_BLOCKING) ?: 0
                                if (written > 0) {
                                    totalSamplesWritten += written
                                    offset += written
                                } else {
                                    // If write fails, skip this chunk and try the next one
                                    Log.w(TAG, "Failed to write chunk: error code $written")
                                    offset += currentChunkSize
                                }
                            }
                            
                            if (totalCalls % 10 == 0) {
                                Log.d(TAG, "Playing audio: $totalSamplesWritten samples written so far in $totalCalls calls")
                            }
                            
                            return@generateWithCallback 1  // Continue generating
                        } catch (e: Exception) {
                            Log.e(TAG, "Error during audio playback: ${e.message}")
                            e.printStackTrace() // Add stack trace for better debugging
                            return@generateWithCallback 1  // Continue but skip playing this chunk
                        }
                    }
                    
                    Log.d(TAG, "Completed callback generation. Total samples: $totalSamplesWritten in $totalCalls callback calls")
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
                    
                    // Use the correct sample rate from the model
                    val saved = AudioUtils.saveAsWav(audio, 22050, filePath)
                    Log.d(TAG, "Audio saved: $saved, file path: $filePath")
                    
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", true)
                    resultMap.putString("filePath", filePath)
                    promise.resolve(resultMap)
                } else {
                    // If no audio was generated, try again without callback
                    Log.w(TAG, "No audio generated with callback method, trying again without callback")
                    
                    // Fallback: try again without callback
                    val generatedAudio = tts?.generate(text, speakerId, speakingRate)
                    audio = generatedAudio?.samples
                    
                    if (audio == null) {
                        throw Exception("Failed to generate speech audio")
                    }
                    
                    val fileName = fileNamePrefix?.let { "${it}_${System.currentTimeMillis()}" }
                        ?: "generated_audio_${System.currentTimeMillis()}"
                    val filePath = "${reactContext.cacheDir.absolutePath}/$fileName.wav"
                    
                    // Use the correct sample rate from the model
                    val saved = AudioUtils.saveAsWav(audio, 22050, filePath)
                    Log.d(TAG, "Audio saved: $saved, file path: $filePath")
                    
                    val resultMap = Arguments.createMap()
                    resultMap.putBoolean("success", true)
                    resultMap.putString("filePath", filePath)
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
     * Release AudioTrack resources
     */
    private fun releaseAudioTrack() {
        try {
            if (audioTrack?.state == AudioTrack.STATE_INITIALIZED) {
                if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack?.stop()
                }
                audioTrack?.release()
            }
            audioTrack = null
            Log.d(TAG, "AudioTrack released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing AudioTrack: ${e.message}")
        }
    }
    
    /**
     * Initialize audio track for playback
     */
    private fun initAudioTrack(sampleRate: Int) {
        try {
            // Release any existing AudioTrack first to prevent resource conflicts
            try {
                if (audioTrack?.state == AudioTrack.STATE_INITIALIZED) {
                    if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) {
                        audioTrack?.stop()
                    }
                    audioTrack?.release()
                }
                audioTrack = null
                Log.d(TAG, "AudioTrack released")
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing AudioTrack: ${e.message}")
            }
            
            // IMPORTANT: VITS models use 22050Hz sample rate by default, not 16000Hz
            // Use the model's reported sample rate, the passed sampleRate parameter is only a suggestion
            val sherpaModelSampleRate = 22050 // Always use model's native sample rate for best quality
            currentSampleRate = sherpaModelSampleRate
            Log.d(TAG, "Using VITS model's native sample rate: $currentSampleRate Hz for AudioTrack")
            
            // Calculate buffer size - use a MUCH larger multiplier to prevent underruns
            val minBufferSize = AudioTrack.getMinBufferSize(
                sherpaModelSampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            ) * 16  // Use 16x buffer (double previous value) for extremely reliable playback
            
            Log.d(TAG, "Creating AudioTrack with buffer size: $minBufferSize bytes, sample rate: $sherpaModelSampleRate Hz")

            // Create with explicit stream type for maximum compatibility
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .setLegacyStreamType(android.media.AudioManager.STREAM_MUSIC) // Explicitly use STREAM_MUSIC
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT) // Use 16-bit PCM
                        .setSampleRate(sherpaModelSampleRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(minBufferSize)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()

            // Check if the AudioTrack was created successfully
            if (audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                Log.e(TAG, "Failed to initialize AudioTrack - not in initialized state")
                return
            }

            // Set max volume and start playback
            audioTrack?.apply {
                // Set the playback rate to match the model's sample rate
                playbackRate = sherpaModelSampleRate
                
                // Make sure volume is at maximum
                setVolume(1.0f)
                
                // Check audio focus
                try {
                    val audioManager = reactContext.getSystemService(android.content.Context.AUDIO_SERVICE) as android.media.AudioManager
                    if (audioManager.isMusicActive) {
                        Log.w(TAG, "Music is currently active on device, this may affect TTS playback")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error checking audio focus: ${e.message}")
                }
                
                // Start playback
                play()
                Log.d(TAG, "AudioTrack created and started. State: ${if (state == AudioTrack.STATE_INITIALIZED) "INITIALIZED" else "NOT INITIALIZED"}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize AudioTrack: ${e.message}")
            e.printStackTrace()
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
                    Log.d(TAG, "Paused and flushed AudioTrack")
                }
                
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("stopped", true)
                resultMap.putString("message", "TTS generation stopped successfully")
                
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
                resultMap.putBoolean("released", true)
                
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
        releaseAudioTrack()
        
        // Release TTS engine
        try {
            tts?.release()
            tts = null
            Log.d(TAG, "TTS engine released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing TTS engine: ${e.message}")
        }
    }
} 
