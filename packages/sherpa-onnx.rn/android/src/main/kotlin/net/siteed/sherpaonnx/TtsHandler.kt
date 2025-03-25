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
import java.io.File
import java.util.concurrent.Executors

class TtsHandler(private val reactContext: ReactApplicationContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    private var tts: OfflineTts? = null
    private var isGenerating = false
    private var audioTrack: AudioTrack? = null
    
    companion object {
        private const val TAG = "SherpaOnnxTTS"
    }
    
    /**
     * Initialize the TTS engine with the provided model configuration
     */
    fun init(modelConfig: ReadableMap, promise: Promise) {
        // Execute initialization in a background thread
        executor.execute {
            try {
                // Initialize the Sherpa ONNX TTS model
                Log.i(TAG, "Initializing TTS with config: ${modelConfig.toHashMap()}")
                
                // Extract model config options
                val modelDir = AssetUtils.cleanFilePath(modelConfig.getString("modelDir") ?: "")
                val modelFileName = modelConfig.getString("modelFile") ?: "model.onnx"
                val tokensFileName = modelConfig.getString("tokensFile") ?: "tokens.txt"
                val voicesFile = modelConfig.getString("voicesFile") ?: null
                val lexiconFile = modelConfig.getString("lexiconFile") ?: null
                val modelType = modelConfig.getString("modelType") ?: "vits"
                
                // Set sample rate if provided
                val sampleRate = if (modelConfig.hasKey("sampleRate")) {
                    modelConfig.getInt("sampleRate")
                } else {
                    16000
                }
                
                // Log files for debugging
                Log.i(TAG, "Model dir: $modelDir")
                Log.i(TAG, "Model file: $modelFileName")
                Log.i(TAG, "Tokens file: $tokensFileName")
                Log.i(TAG, "Voices file: $voicesFile")
                Log.i(TAG, "Lexicon file: $lexiconFile")
                Log.i(TAG, "Model type: $modelType")
                
                // Build file paths
                val modelAbsPath = File(modelDir, modelFileName).absolutePath
                val tokensAbsPath = File(modelDir, tokensFileName).absolutePath
                val voicesAbsPath = voicesFile?.let { File(modelDir, it).absolutePath }
                val lexiconAbsPath = lexiconFile?.let { File(modelDir, it).absolutePath }
                val dataDir = File(modelDir).absolutePath
                
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
                
                // Create TTS config based on model type
                val ttsModelConfig = com.k2fsa.sherpa.onnx.OfflineTtsModelConfig()
                val ttsConfig = com.k2fsa.sherpa.onnx.OfflineTtsConfig()
                
                // Use reflection to set properties since direct property access is giving errors
                try {
                    // Log sample rate and num threads values first
                    Log.i(TAG, "Setting sample rate: $sampleRate")
                    Log.i(TAG, "Setting num threads: ${if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 1}")
                    
                    // Try using reflection for properties that might not be directly accessible
                    val ttsConfigClass = ttsConfig.javaClass
                    
                    // Set sample rate
                    try {
                        val sampleRateField = ttsConfigClass.getDeclaredField("sampleRate")
                        sampleRateField.isAccessible = true
                        sampleRateField.setInt(ttsConfig, sampleRate)
                        Log.i(TAG, "Set sample rate via reflection")
                    } catch (e: Exception) {
                        Log.w(TAG, "Could not set sampleRate via reflection: ${e.message}")
                    }
                    
                    // Set num threads
                    try {
                        val threadsVal = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 1
                        val numThreadsField = ttsConfigClass.getDeclaredField("numThreads")
                        numThreadsField.isAccessible = true
                        numThreadsField.setInt(ttsConfig, threadsVal)
                        Log.i(TAG, "Set num threads via reflection")
                    } catch (e: Exception) {
                        Log.w(TAG, "Could not set numThreads via reflection: ${e.message}")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to set TTS config properties: ${e.message}")
                }
                
                // Configure specific model type
                when (modelType) {
                    "vits" -> {
                        try {
                            // Use constructor parameters for immutable properties
                            val vitsConfig = com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig(
                                model = modelAbsPath,
                                lexicon = lexiconAbsPath ?: "",
                                tokens = tokensAbsPath
                            )
                            
                            vitsConfig.dataDir = dataDir
                            ttsModelConfig.vits = vitsConfig
                            
                            Log.i(TAG, "Initialized vits config using constructor parameters")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to initialize vits config with constructor: ${e.message}")
                            throw Exception("Could not initialize VITS TTS model: ${e.message}")
                        }
                    }
                    "kokoro" -> {
                        // Create the kokoro config using constructor with parameters for immutable properties
                        try {
                            // Try using constructor with parameters for immutable properties
                            val kokoroConfig = com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig(
                                model = modelAbsPath,
                                voices = voicesAbsPath ?: "", 
                                tokens = tokensAbsPath
                            )
                            
                            // Now set mutable properties
                            kokoroConfig.dataDir = dataDir
                            kokoroConfig.lengthScale = 1.0f
                            
                            ttsModelConfig.kokoro = kokoroConfig
                            
                            Log.i(TAG, "Initialized kokoro config using constructor parameters")
                        } catch (e: Exception) {
                            // Fall back - try using reflection or another approach if constructor fails
                            Log.e(TAG, "Failed to initialize kokoro config with constructor: ${e.message}")
                            throw Exception("Could not initialize Kokoro TTS model: ${e.message}")
                        }
                    }
                    "matcha" -> {
                        try {
                            // Create the config without using apply
                            val matchaConfig = com.k2fsa.sherpa.onnx.OfflineTtsMatchaModelConfig()
                            
                            // Set properties directly - using the correct property names
                            matchaConfig.acousticModel = modelAbsPath // instead of model
                            matchaConfig.tokens = tokensAbsPath
                            
                            // Only set vocoder if it exists
                            if (voicesAbsPath != null) {
                                matchaConfig.vocoder = voicesAbsPath // vocoder, not voices
                            }
                            
                            matchaConfig.dataDir = dataDir
                            ttsModelConfig.matcha = matchaConfig
                            
                            Log.i(TAG, "Initialized matcha config using direct property assignment")
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to initialize matcha config: ${e.message}")
                            throw Exception("Could not initialize Matcha TTS model: ${e.message}")
                        }
                    }
                    else -> throw Exception("Unsupported model type: $modelType")
                }
                
                ttsConfig.model = ttsModelConfig
                
                // Create the TTS instance
                Log.i(TAG, "Creating TTS instance")
                
                // Handle different constructor signatures
                try {
                    // Try with AssetManager and config (since error indicates it might be expecting AssetManager)
                    Log.i(TAG, "Trying constructor with AssetManager and config")
                    // Use correct parameter order: AssetManager first, config second
                    tts = com.k2fsa.sherpa.onnx.OfflineTts(reactContext.assets, ttsConfig)
                } catch (e: Exception) {
                    Log.w(TAG, "Failed with first constructor, trying alternatives: ${e.message}")
                    try {
                        // Try creating instance with a different signature
                        Log.i(TAG, "Trying a different constructor with config")
                        val constructor = com.k2fsa.sherpa.onnx.OfflineTts::class.java.getConstructor(com.k2fsa.sherpa.onnx.OfflineTtsConfig::class.java)
                        tts = constructor.newInstance(ttsConfig)
                        Log.i(TAG, "Successfully created OfflineTts instance with reflection")
                    } catch (e2: Exception) {
                        Log.e(TAG, "Failed to create with reflection: ${e2.message}")
                        
                        // Last resort - try with null and config
                        Log.i(TAG, "Trying constructor with null and config")
                        tts = com.k2fsa.sherpa.onnx.OfflineTts(null, ttsConfig)
                    }
                }
                
                // Check if initialization was successful
                if (tts == null) {
                    throw Exception("Failed to initialize TTS engine")
                }
                
                // Return success result
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", sampleRate)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
                
                Log.i(TAG, "TTS initialized successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to initialize TTS: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_INIT", "Failed to initialize TTS: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Generate speech from text
     */
    fun generate(text: String, speakerId: Int, speed: Float, playAudio: Boolean, promise: Promise) {
        executor.execute {
            try {
                if (tts == null) {
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
                val audio = if (playAudio) {
                    Log.d(TAG, "Using generateWithCallback method")
                    tts?.generateWithCallback(text, speakerId, speed) { samples ->
                        if (!isGenerating) return@generateWithCallback 0  // Stop generating
                        audioTrack?.write(samples, 0, samples.size, AudioTrack.WRITE_BLOCKING)
                        1  // Continue generating
                    }
                } else {
                    Log.d(TAG, "Using generate method without callback")
                    tts?.generate(text, speakerId, speed)
                }
                val endTime = System.currentTimeMillis()
                
                // Extract results
                val samples = audio?.samples ?: FloatArray(0)
                val sampleRate = audio?.sampleRate ?: 16000
                
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