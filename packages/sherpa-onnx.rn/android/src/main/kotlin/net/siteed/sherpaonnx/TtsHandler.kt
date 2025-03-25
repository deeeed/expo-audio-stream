/**
 * Handler for Text-to-Speech functionality
 */
package net.siteed.sherpaonnx

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Log
import com.facebook.react.bridge.*
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsMatchaModelConfig
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
        if (!SherpaOnnxModule.isLibraryLoaded) {
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
                val modelDir = AssetUtils.cleanFilePath(modelConfig.getString("modelDir") ?: "")
                val modelFileName = modelConfig.getString("modelFile") ?: "model.onnx"
                val tokensFileName = modelConfig.getString("tokensFile") ?: "tokens.txt"
                val voicesFile = modelConfig.getString("voicesFile") ?: null
                val lexiconFile = modelConfig.getString("lexiconFile") ?: null
                val dataDir = modelConfig.getString("dataDir") ?: modelDir
                val modelType = modelConfig.getString("modelType") ?: "vits"
                val sampleRate = if (modelConfig.hasKey("sampleRate")) modelConfig.getInt("sampleRate") else 16000
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 1
                val debug = if (modelConfig.hasKey("debug")) modelConfig.getBoolean("debug") else false
                
                // Log configuration for debugging
                Log.i(TAG, "Model dir: $modelDir")
                Log.i(TAG, "Model file: $modelFileName")
                Log.i(TAG, "Tokens file: $tokensFileName")
                Log.i(TAG, "Voices file: $voicesFile")
                Log.i(TAG, "Lexicon file: $lexiconFile")
                Log.i(TAG, "Data dir: $dataDir")
                Log.i(TAG, "Model type: $modelType")
                Log.i(TAG, "Sample rate: $sampleRate")
                Log.i(TAG, "Num threads: $numThreads")
                Log.i(TAG, "Debug: $debug")
                
                // Build file paths
                val modelAbsPath = File(modelDir, modelFileName).absolutePath
                val tokensAbsPath = File(modelDir, tokensFileName).absolutePath
                val voicesAbsPath = voicesFile?.let { File(modelDir, it).absolutePath }
                val lexiconAbsPath = lexiconFile?.let { File(modelDir, it).absolutePath }
                
                // Check if files exist
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
                        vitsConfig.dataDir = dataDir
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
                        kokoroConfig.dataDir = dataDir
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
                        
                        // Set data directory
                        matchaConfig.dataDir = dataDir
                        
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
                Log.i(TAG, "TTS Config: ${ttsConfig}")
                
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
     * Generate speech from text
     * 
     * @param text The text to convert to speech
     * @param speakerId The speaker ID to use (0 is default)
     * @param speed The speaking rate (1.0 is normal speed)
     * @param playAudio Whether to play the generated audio immediately
     * @param fileNamePrefix Custom prefix for the output file name
     * @param lengthScale Override for length scale
     * @param noiseScale Override for noise scale
     * @param noiseScaleW Override for noise scale W
     * @param promise The promise to resolve with the result
     * 
     * @return A Promise that resolves with:
     *   - success: Whether generation was successful
     *   - sampleRate: The sample rate of the generated audio
     *   - numSamples: Number of audio samples generated
     *   - filePath: Path to the generated WAV file on the device
     */
    fun generate(
        text: String, 
        speakerId: Int, 
        speed: Float, 
        playAudio: Boolean,
        fileNamePrefix: String?,
        lengthScale: Float?,
        noiseScale: Float?,
        noiseScaleW: Float?,
        promise: Promise
    ) {
        executor.execute {
            try {
                if (tts == null) {
                    throw Exception("TTS is not initialized")
                }

                if (isGenerating) {
                    throw Exception("TTS is already generating speech")
                }

                Log.d(TAG, "Generating TTS for text: '$text' with speakerId: $speakerId, speed: $speed, playAudio: $playAudio")
                
                // Log advanced parameters if provided
                if (lengthScale != null || noiseScale != null || noiseScaleW != null) {
                    Log.d(TAG, "Using advanced parameters - lengthScale: $lengthScale, noiseScale: $noiseScale, noiseScaleW: $noiseScaleW")
                }
                
                isGenerating = true

                // Apply custom parameters to the TTS model if provided
                if (lengthScale != null || noiseScale != null || noiseScaleW != null) {
                    // Store original values to restore later
                    var originalLengthScale: Float? = null
                    var originalNoiseScale: Float? = null
                    var originalNoiseScaleW: Float? = null
                    
                    // Apply model-specific parameters
                    when {
                        ttsModelConfig?.vits != null -> {
                            val vitsConfig = ttsModelConfig?.vits
                            // Save original values
                            originalLengthScale = vitsConfig?.lengthScale
                            originalNoiseScale = vitsConfig?.noiseScale
                            originalNoiseScaleW = vitsConfig?.noiseScaleW
                            
                            // Apply overrides
                            if (lengthScale != null) vitsConfig?.lengthScale = lengthScale
                            if (noiseScale != null) vitsConfig?.noiseScale = noiseScale
                            if (noiseScaleW != null) vitsConfig?.noiseScaleW = noiseScaleW
                        }
                        ttsModelConfig?.kokoro != null -> {
                            val kokoroConfig = ttsModelConfig?.kokoro
                            // Save original values
                            originalLengthScale = kokoroConfig?.lengthScale
                            
                            // Apply overrides
                            if (lengthScale != null) kokoroConfig?.lengthScale = lengthScale
                        }
                        ttsModelConfig?.matcha != null -> {
                            val matchaConfig = ttsModelConfig?.matcha
                            // Save original values
                            originalLengthScale = matchaConfig?.lengthScale
                            originalNoiseScale = matchaConfig?.noiseScale
                            
                            // Apply overrides
                            if (lengthScale != null) matchaConfig?.lengthScale = lengthScale
                            if (noiseScale != null) matchaConfig?.noiseScale = noiseScale
                        }
                    }
                }

                // Generate speech
                val startTime = System.currentTimeMillis()
                var audio = if (playAudio) {
                    // Prepare audio playback
                    prepareAudioTrack()
                    
                    // Generate and play in real-time
                    Log.d(TAG, "Using generateWithCallback method")
                    tts?.generateWithCallback(text, speakerId, speed) { samples ->
                        if (!isGenerating) return@generateWithCallback 0  // Stop generating
                        audioTrack?.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
                        1  // Continue generating
                    }
                } else {
                    // Generate without playback
                    Log.d(TAG, "Using generate method without callback")
                    tts?.generate(text, speakerId, speed)
                }
                val endTime = System.currentTimeMillis()
                
                // If no audio was generated (unlikely but possible)
                if (audio == null) {
                    Log.w(TAG, "No audio generated, trying again without callback")
                    // Fallback: try again without callback
                    audio = tts?.generate(text, speakerId, speed)
                    if (audio == null) {
                        throw Exception("Failed to generate speech audio")
                    }
                }
                
                // Extract results
                val samples = audio.samples ?: FloatArray(0)
                val sampleRate = audio.sampleRate ?: 16000
                
                Log.d(TAG, "Speech generation completed in ${endTime - startTime}ms")
                Log.d(TAG, "Generated ${samples.size} samples at ${sampleRate}Hz")

                // Save to file - always do this regardless of playAudio setting
                val prefix = fileNamePrefix ?: "generated_audio_"
                val wavFile = File(reactContext.cacheDir, "${prefix}${System.currentTimeMillis()}.wav")
                val saved = AudioUtils.saveAsWav(samples, sampleRate, wavFile.absolutePath)
                Log.d(TAG, "Audio saved: $saved, file path: ${wavFile.absolutePath}")

                // Prepare result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", sampleRate)
                resultMap.putInt("numSamples", samples.size)
                resultMap.putString("filePath", "file://${wavFile.absolutePath}")
                
                // Set generating flag back to false
                isGenerating = false
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error generating speech: ${e.message}")
                e.printStackTrace()
                
                // Set generating flag back to false
                isGenerating = false
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_GENERATE", "Failed to generate speech: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Initialize audio track for playback
     */
    private fun initAudioTrack(sampleRate: Int) {
        val bufferSize = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_FLOAT
        )
        
        try {
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
                .build()
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing AudioTrack: ${e.message}")
            e.printStackTrace()
        }
    }
    
    /**
     * Prepare audio track for playback
     */
    private fun prepareAudioTrack() {
        try {
            if (audioTrack?.state == AudioTrack.STATE_INITIALIZED) {
                if (audioTrack?.playState == AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack?.pause()
                    audioTrack?.flush()
                }
                audioTrack?.play()
            } else {
                Log.w(TAG, "AudioTrack is not initialized")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error preparing AudioTrack: ${e.message}")
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