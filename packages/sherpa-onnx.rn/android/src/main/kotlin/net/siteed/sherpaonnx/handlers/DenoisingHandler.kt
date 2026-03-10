/**
 * Handler for Offline Speech Denoising functionality
 */
package net.siteed.sherpaonnx.handlers

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.k2fsa.sherpa.onnx.DenoisedAudio
import com.k2fsa.sherpa.onnx.OfflineSpeechDenoiser
import com.k2fsa.sherpa.onnx.OfflineSpeechDenoiserConfig
import com.k2fsa.sherpa.onnx.OfflineSpeechDenoiserGtcrnModelConfig
import com.k2fsa.sherpa.onnx.OfflineSpeechDenoiserModelConfig
import net.siteed.sherpaonnx.SherpaOnnxImpl
import net.siteed.sherpaonnx.utils.AssetUtils
import net.siteed.sherpaonnx.utils.AudioExtractor
import java.io.File
import java.util.concurrent.Executors

class DenoisingHandler(private val reactContext: ReactApplicationContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private var denoiser: OfflineSpeechDenoiser? = null

    companion object {
        private const val TAG = "SherpaOnnxDenoising"
    }

    fun initDenoiser(config: ReadableMap, promise: Promise) {
        if (!SherpaOnnxImpl.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                Log.i(TAG, "===== DENOISING INITIALIZATION START =====")

                val modelFile = AssetUtils.cleanFilePath(config.getString("modelFile") ?: "")
                val numThreads = if (config.hasKey("numThreads")) config.getInt("numThreads") else 1
                val provider = config.getString("provider") ?: "cpu"
                val debug = if (config.hasKey("debug")) config.getBoolean("debug") else false

                Log.i(TAG, "modelFile=$modelFile (exists: ${File(modelFile).exists()})")

                if (!File(modelFile).exists()) {
                    throw Exception("Model file not found: $modelFile")
                }

                // Release previous instance
                denoiser?.release()
                denoiser = null

                val denoiserConfig = OfflineSpeechDenoiserConfig(
                    model = OfflineSpeechDenoiserModelConfig(
                        gtcrn = OfflineSpeechDenoiserGtcrnModelConfig(model = modelFile),
                        numThreads = numThreads,
                        debug = debug,
                        provider = provider,
                    )
                )

                denoiser = OfflineSpeechDenoiser(config = denoiserConfig)
                val sampleRate = denoiser!!.sampleRate

                Log.i(TAG, "Denoiser initialized, sampleRate=$sampleRate")

                val result = Arguments.createMap()
                result.putBoolean("success", true)
                result.putInt("sampleRate", sampleRate)

                Log.i(TAG, "===== DENOISING INITIALIZATION COMPLETE =====")

                reactContext.runOnUiQueueThread {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing denoiser: ${e.message}")
                e.printStackTrace()
                denoiser?.release()
                denoiser = null
                Log.i(TAG, "===== DENOISING INITIALIZATION FAILED =====")
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_DENOISER_INIT", "Failed to initialize denoiser: ${e.message}")
                }
            }
        }
    }

    fun denoiseFile(filePath: String, promise: Promise) {
        executor.execute {
            try {
                val currentDenoiser = denoiser
                    ?: throw Exception("Denoiser is not initialized")

                val cleanedPath = AssetUtils.cleanFilePath(filePath)
                Log.d(TAG, "Denoising file: $cleanedPath")

                val startTime = System.currentTimeMillis()

                // Extract audio from file
                val audioData = AudioExtractor.extractAudioFromFile(File(cleanedPath))
                    ?: throw Exception("Failed to extract audio from file: $cleanedPath")

                Log.d(TAG, "Extracted ${audioData.samples.size} samples at ${audioData.sampleRate} Hz")

                // Run denoising
                val denoised: DenoisedAudio = currentDenoiser.run(audioData.samples, audioData.sampleRate)

                // Write output WAV to cache dir
                val outputFile = File(reactContext.cacheDir, "denoised_${System.currentTimeMillis()}.wav")
                val saved = denoised.save(outputFile.absolutePath)

                val durationMs = System.currentTimeMillis() - startTime
                Log.d(TAG, "Denoising complete: ${durationMs}ms, output=${outputFile.absolutePath}, saved=$saved")

                val result = Arguments.createMap()
                result.putBoolean("success", true)
                result.putString("outputPath", outputFile.absolutePath)
                result.putDouble("durationMs", durationMs.toDouble())

                reactContext.runOnUiQueueThread {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error denoising file: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_DENOISER_RUN", "Failed to denoise file: ${e.message}")
                }
            }
        }
    }

    fun releaseDenoiser(promise: Promise) {
        executor.execute {
            try {
                denoiser?.release()
                denoiser = null
                Log.d(TAG, "Denoiser released")
                val result = Arguments.createMap()
                result.putBoolean("released", true)
                reactContext.runOnUiQueueThread {
                    promise.resolve(result)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing denoiser: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_DENOISER_RELEASE", "Failed to release denoiser: ${e.message}")
                }
            }
        }
    }
}
