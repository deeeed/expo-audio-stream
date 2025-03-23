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

// Note: We're using the local OfflineTts classes defined in SherpaOnnxTtsSupport.kt
// instead of importing them from com.k2fsa.sherpa.onnx

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
                System.loadLibrary("sherpa-onnx-jni")
                Log.i(TAG, "Loaded sherpa-onnx-jni library successfully")
                isLibraryLoaded = true
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

                // Prepare directories if needed
                var processedDataDir = dataDir
                var processedDictDir = dictDir

                if (dataDir.isNotEmpty()) {
                    val newDir = copyAssetDir(dataDir)
                    processedDataDir = "$newDir/$dataDir"
                }

                if (dictDir.isNotEmpty()) {
                    val newDir = copyAssetDir(dictDir)
                    processedDictDir = "$newDir/$dictDir"
                }

                // Create TTS config
                val config = getOfflineTtsConfig(
                    modelDir = modelDir,
                    modelName = modelName,
                    acousticModelName = acousticModelName,
                    vocoder = vocoder,
                    voices = voices,
                    lexicon = lexicon,
                    dataDir = processedDataDir,
                    dictDir = processedDictDir,
                    ruleFsts = ruleFsts,
                    ruleFars = ruleFars,
                    numThreads = numThreads
                )

                // Create TTS instance
                tts = OfflineTts(
                    assetManager = reactContext.assets,
                    config = config
                )

                // Initialize AudioTrack
                initAudioTrack()

                // Return success
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", tts?.sampleRate() ?: 0)
                resultMap.putInt("numSpeakers", tts?.numSpeakers() ?: 0)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing TTS: ${e.message}")
                e.printStackTrace()
                
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_TTS_INIT", "Failed to initialize TTS: ${e.message}")
                }
            }
        }
    }

    @ReactMethod
    fun generateTts(text: String, speakerId: Int, speed: Float, playAudio: Boolean, promise: Promise) {
        if (tts == null) {
            promise.reject("ERR_TTS_NOT_INITIALIZED", "TTS is not initialized")
            return
        }

        if (isGenerating) {
            promise.reject("ERR_TTS_BUSY", "TTS is already generating speech")
            return
        }

        isGenerating = true

        executor.execute {
            try {
                // Initialize or reset AudioTrack if needed
                if (playAudio && audioTrack == null) {
                    initAudioTrack()
                }

                if (playAudio) {
                    audioTrack?.pause()
                    audioTrack?.flush()
                    audioTrack?.play()
                }

                // Generate speech
                val audio = if (playAudio) {
                    tts!!.generateWithCallback(
                        text = text,
                        sid = speakerId,
                        speed = speed,
                        callback = this::audioCallback
                    )
                } else {
                    tts!!.generate(
                        text = text,
                        sid = speakerId,
                        speed = speed
                    )
                }

                // Save to file
                val wavFile = File(reactContext.cacheDir, "generated_audio.wav")
                val saved = audio.save(wavFile.absolutePath)

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putInt("sampleRate", audio.sampleRate)
                resultMap.putInt("samplesLength", audio.samples.size)
                resultMap.putString("filePath", wavFile.absolutePath)
                resultMap.putBoolean("saved", saved)

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
} 