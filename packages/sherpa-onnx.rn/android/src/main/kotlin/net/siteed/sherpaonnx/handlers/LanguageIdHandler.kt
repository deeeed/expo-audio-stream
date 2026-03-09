package net.siteed.sherpaonnx.handlers

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.k2fsa.sherpa.onnx.*
import net.siteed.sherpaonnx.SherpaOnnxImpl
import net.siteed.sherpaonnx.utils.AssetUtils
import net.siteed.sherpaonnx.utils.AudioExtractor
import java.io.File
import java.util.concurrent.Executors

class LanguageIdHandler(private val reactContext: ReactApplicationContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private var slid: SpokenLanguageIdentification? = null

    companion object {
        private const val TAG = "SherpaOnnxLanguageId"
    }

    fun init(config: ReadableMap, promise: Promise) {
        if (!SherpaOnnxImpl.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                Log.i(TAG, "Initializing Language ID with config: ${config.toHashMap()}")

                val modelDir = AssetUtils.cleanFilePath(config.getString("modelDir") ?: "")
                val encoderFile = config.getString("encoderFile") ?: "tiny-encoder.int8.onnx"
                val decoderFile = config.getString("decoderFile") ?: "tiny-decoder.int8.onnx"
                val numThreads = if (config.hasKey("numThreads")) config.getInt("numThreads") else 1
                val debug = if (config.hasKey("debug")) config.getBoolean("debug") else false
                val provider = config.getString("provider") ?: "cpu"

                // Find the model subdirectory (tar.bz2 archives extract to a subfolder)
                val modelDirFile = File(modelDir)
                val actualModelDir = if (modelDirFile.isDirectory) {
                    val subdirs = modelDirFile.listFiles { f -> f.isDirectory }
                    if (subdirs != null && subdirs.size == 1) {
                        subdirs[0].absolutePath
                    } else {
                        modelDir
                    }
                } else {
                    modelDir
                }

                val encoderPath = File(actualModelDir, encoderFile).absolutePath
                val decoderPath = File(actualModelDir, decoderFile).absolutePath

                Log.i(TAG, "Encoder: $encoderPath (exists: ${File(encoderPath).exists()})")
                Log.i(TAG, "Decoder: $decoderPath (exists: ${File(decoderPath).exists()})")

                if (!File(encoderPath).exists()) {
                    throw Exception("Encoder file not found: $encoderPath")
                }
                if (!File(decoderPath).exists()) {
                    throw Exception("Decoder file not found: $decoderPath")
                }

                // Release previous instance
                slid?.release()
                slid = null

                val slidConfig = SpokenLanguageIdentificationConfig(
                    whisper = SpokenLanguageIdentificationWhisperConfig(
                        encoder = encoderPath,
                        decoder = decoderPath,
                        tailPaddings = -1,
                    ),
                    numThreads = numThreads,
                    debug = debug,
                    provider = provider,
                )

                slid = SpokenLanguageIdentification(null, slidConfig)

                Log.i(TAG, "Language ID initialized successfully")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                reactContext.runOnUiQueueThread { promise.resolve(resultMap) }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing Language ID: ${e.message}")
                e.printStackTrace()
                slid = null
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_LANGUAGE_ID_INIT", "Failed to initialize Language ID: ${e.message}")
                }
            }
        }
    }

    fun detectLanguage(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                val currentSlid = slid
                    ?: throw Exception("Language ID not initialized")

                val samples = FloatArray(audioBuffer.size())
                for (i in 0 until audioBuffer.size()) {
                    samples[i] = audioBuffer.getDouble(i).toFloat()
                }

                Log.d(TAG, "Detecting language from ${samples.size} samples at ${sampleRate}Hz")

                val startTime = System.currentTimeMillis()

                val stream = currentSlid.createStream()
                stream.acceptWaveform(samples, sampleRate)

                val lang = currentSlid.compute(stream)
                stream.release()

                val durationMs = System.currentTimeMillis() - startTime

                Log.i(TAG, "Detected language: $lang in ${durationMs}ms")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("language", lang)
                resultMap.putDouble("durationMs", durationMs.toDouble())
                reactContext.runOnUiQueueThread { promise.resolve(resultMap) }
            } catch (e: Exception) {
                Log.e(TAG, "Error detecting language: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_LANGUAGE_ID_DETECT", "Failed to detect language: ${e.message}")
                }
            }
        }
    }

    fun detectLanguageFromFile(filePath: String, promise: Promise) {
        executor.execute {
            try {
                val currentSlid = slid
                    ?: throw Exception("Language ID not initialized")

                val cleanedPath = AssetUtils.cleanFilePath(filePath)
                Log.d(TAG, "Detecting language from file: $cleanedPath")

                val startTime = System.currentTimeMillis()

                val audioData = AudioExtractor.extractAudioFromFile(File(cleanedPath))
                    ?: throw Exception("Failed to extract audio from file: $cleanedPath")
                val stream = currentSlid.createStream()
                stream.acceptWaveform(audioData.samples, audioData.sampleRate)

                val lang = currentSlid.compute(stream)
                stream.release()

                val durationMs = System.currentTimeMillis() - startTime

                Log.i(TAG, "Detected language from file: $lang in ${durationMs}ms")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("language", lang)
                resultMap.putDouble("durationMs", durationMs.toDouble())
                reactContext.runOnUiQueueThread { promise.resolve(resultMap) }
            } catch (e: Exception) {
                Log.e(TAG, "Error detecting language from file: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_LANGUAGE_ID_FILE", "Failed to detect language from file: ${e.message}")
                }
            }
        }
    }

    fun release(promise: Promise) {
        executor.execute {
            try {
                slid?.release()
                slid = null
                Log.i(TAG, "Language ID released")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("released", true)
                reactContext.runOnUiQueueThread { promise.resolve(resultMap) }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing Language ID: ${e.message}")
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_LANGUAGE_ID_RELEASE", "Failed to release Language ID: ${e.message}")
                }
            }
        }
    }
}
