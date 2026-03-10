/**
 * Handler for Keyword Spotting (KWS) functionality
 */
package net.siteed.sherpaonnx.handlers

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.k2fsa.sherpa.onnx.KeywordSpotter
import com.k2fsa.sherpa.onnx.KeywordSpotterConfig
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OnlineStream
import net.siteed.sherpaonnx.SherpaOnnxImpl
import net.siteed.sherpaonnx.utils.AssetUtils
import java.io.File
import java.util.concurrent.Executors

class KWSHandler(private val reactContext: ReactApplicationContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private var spotter: KeywordSpotter? = null
    private var stream: OnlineStream? = null
    private var totalSamplesAccepted: Long = 0

    companion object {
        private const val TAG = "SherpaOnnxKWS"
    }

    /**
     * Initialize keyword spotter with the provided model configuration
     */
    fun init(modelConfig: ReadableMap, promise: Promise) {
        if (!SherpaOnnxImpl.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                Log.i(TAG, "===== KWS INITIALIZATION START =====")

                val modelDir = AssetUtils.cleanFilePath(modelConfig.getString("modelDir") ?: "")
                val numThreads = if (modelConfig.hasKey("numThreads")) modelConfig.getInt("numThreads") else 2
                val debug = if (modelConfig.hasKey("debug")) modelConfig.getBoolean("debug") else false
                val provider = modelConfig.getString("provider") ?: "cpu"
                val maxActivePaths = if (modelConfig.hasKey("maxActivePaths")) modelConfig.getInt("maxActivePaths") else 4
                val keywordsScore = if (modelConfig.hasKey("keywordsScore")) modelConfig.getDouble("keywordsScore").toFloat() else 1.5f
                val keywordsThreshold = if (modelConfig.hasKey("keywordsThreshold")) modelConfig.getDouble("keywordsThreshold").toFloat() else 0.25f
                val numTrailingBlanks = if (modelConfig.hasKey("numTrailingBlanks")) modelConfig.getInt("numTrailingBlanks") else 2

                // Read model files - same pattern as ASR (flattened fields from TurboModule)
                val encoder = modelConfig.getString("modelFileEncoder") ?: ""
                val decoder = modelConfig.getString("modelFileDecoder") ?: ""
                val joiner = modelConfig.getString("modelFileJoiner") ?: ""
                val tokens = modelConfig.getString("modelFileTokens") ?: "tokens.txt"

                // Build absolute paths
                val encoderPath = if (encoder.isNotEmpty()) File(modelDir, encoder).absolutePath else ""
                val decoderPath = if (decoder.isNotEmpty()) File(modelDir, decoder).absolutePath else ""
                val joinerPath = if (joiner.isNotEmpty()) File(modelDir, joiner).absolutePath else ""
                val tokensPath = File(modelDir, tokens).absolutePath

                // Validate files exist
                if (encoder.isNotEmpty() && !File(encoderPath).exists()) {
                    throw Exception("Encoder file not found: $encoderPath")
                }
                if (decoder.isNotEmpty() && !File(decoderPath).exists()) {
                    throw Exception("Decoder file not found: $decoderPath")
                }
                if (joiner.isNotEmpty() && !File(joinerPath).exists()) {
                    throw Exception("Joiner file not found: $joinerPath")
                }
                if (!File(tokensPath).exists()) {
                    throw Exception("Tokens file not found: $tokensPath")
                }

                // Keywords file
                val keywordsFile = modelConfig.getString("keywordsFile") ?: "keywords.txt"
                val keywordsFilePath = File(modelDir, keywordsFile).absolutePath

                if (!File(keywordsFilePath).exists()) {
                    throw Exception("Keywords file not found: $keywordsFilePath")
                }

                Log.i(TAG, "Model dir: $modelDir")
                Log.i(TAG, "Encoder: $encoderPath (exists: ${File(encoderPath).exists()})")
                Log.i(TAG, "Decoder: $decoderPath (exists: ${File(decoderPath).exists()})")
                Log.i(TAG, "Joiner: $joinerPath (exists: ${File(joinerPath).exists()})")
                Log.i(TAG, "Tokens: $tokensPath (exists: ${File(tokensPath).exists()})")
                Log.i(TAG, "Keywords: $keywordsFilePath (exists: ${File(keywordsFilePath).exists()})")

                val modelType = modelConfig.getString("modelType") ?: "zipformer2"

                // Release previous resources
                releaseResources()

                val transducerConfig = OnlineTransducerModelConfig(
                    encoder = encoderPath,
                    decoder = decoderPath,
                    joiner = joinerPath,
                )

                val onlineModelConfig = OnlineModelConfig(
                    transducer = transducerConfig,
                    tokens = tokensPath,
                    numThreads = numThreads,
                    debug = debug,
                    provider = provider,
                    modelType = modelType,
                )

                val featConfig = FeatureConfig(
                    sampleRate = 16000,
                    featureDim = 80,
                )

                val kwsConfig = KeywordSpotterConfig(
                    featConfig = featConfig,
                    modelConfig = onlineModelConfig,
                    maxActivePaths = maxActivePaths,
                    keywordsFile = keywordsFilePath,
                    keywordsScore = keywordsScore,
                    keywordsThreshold = keywordsThreshold,
                    numTrailingBlanks = numTrailingBlanks,
                )

                spotter = KeywordSpotter(null, kwsConfig)

                if (spotter == null) {
                    throw Exception("Failed to create keyword spotter")
                }

                // Create initial stream
                stream = spotter!!.createStream()
                totalSamplesAccepted = 0

                Log.i(TAG, "===== KWS INITIALIZATION COMPLETE =====")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing KWS: ${e.message}")
                e.printStackTrace()
                releaseResources()

                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_KWS_INIT", "Failed to initialize KWS: ${e.message}")
                }
            }
        }
    }

    /**
     * Accept waveform samples and decode. Returns detected keyword if any.
     */
    fun acceptWaveform(sampleRate: Int, audioBuffer: ReadableArray, promise: Promise) {
        executor.execute {
            try {
                if (spotter == null || stream == null) {
                    throw Exception("KWS is not initialized")
                }

                // Convert ReadableArray to FloatArray
                val samples = FloatArray(audioBuffer.size())
                for (i in 0 until audioBuffer.size()) {
                    samples[i] = audioBuffer.getDouble(i).toFloat()
                }

                totalSamplesAccepted += samples.size
                Log.d(TAG, "acceptWaveform: ${samples.size} samples (total: $totalSamplesAccepted)")

                // Feed all samples to the stream — the internal feature extractor
                // accumulates frames, and isReady() gates decode calls.
                stream!!.acceptWaveform(samples, sampleRate)

                // Decode while the spotter has enough frames ready.
                // NOTE: The v1.12.28 KWS model has a confirmed Reshape bug that
                // crashes (SIGABRT) when decode is called. We wrap in try-catch
                // but C++ Ort::Exception causes process abort — this catch only
                // helps if the JNI layer converts it to a Java exception.
                var decodeCount = 0
                var detectedKeyword = ""
                try {
                    while (spotter!!.isReady(stream!!)) {
                        spotter!!.decode(stream!!)
                        decodeCount++
                    }

                    val result = spotter!!.getResult(stream!!)
                    if (result.keyword.isNotEmpty()) {
                        detectedKeyword = result.keyword
                        Log.i(TAG, "KEYWORD DETECTED: \"$detectedKeyword\" (after ${totalSamplesAccepted} samples)")
                        spotter!!.reset(stream!!)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Decode error (likely upstream model bug): ${e.message}")
                    // Reset stream to recover if possible
                    try { spotter!!.reset(stream!!) } catch (_: Exception) {}
                }

                if (decodeCount > 0) {
                    Log.d(TAG, "Decoded $decodeCount times, keyword: \"$detectedKeyword\"")
                }

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("keyword", detectedKeyword)
                resultMap.putBoolean("detected", detectedKeyword.isNotEmpty())

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error accepting waveform: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_KWS_ACCEPT", "Failed to accept waveform: ${e.message}")
                }
            }
        }
    }

    /**
     * Reset the KWS stream (e.g., after keyword detection)
     */
    fun resetStream(promise: Promise) {
        executor.execute {
            try {
                if (spotter == null || stream == null) {
                    throw Exception("KWS is not initialized")
                }

                spotter!!.reset(stream!!)

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error resetting KWS stream: ${e.message}")
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_KWS_RESET", "Failed to reset KWS stream: ${e.message}")
                }
            }
        }
    }

    /**
     * Release all KWS resources
     */
    fun release(promise: Promise) {
        executor.execute {
            try {
                releaseResources()

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("released", true)

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing KWS: ${e.message}")
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_KWS_RELEASE", "Failed to release KWS: ${e.message}")
                }
            }
        }
    }

    private fun releaseResources() {
        try {
            stream?.release()
            stream = null

            spotter?.release()
            spotter = null

            Log.i(TAG, "KWS resources released")
        } catch (e: Exception) {
            Log.e(TAG, "Error in releaseResources: ${e.message}")
        }
    }
}
