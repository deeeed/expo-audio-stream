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

                // Feed samples in exact multiples of chunk_size * frame_shift
                // so the feature buffer always has a multiple of chunk_size frames.
                // chunk_size=32 (from model), frame_shift=160 (10ms at 16kHz) → 5120 samples
                val alignedChunk = 32 * 160  // 5120 samples
                var detectedKeyword = ""
                var offset = 0

                // Feed aligned chunks and decode after each
                while (offset + alignedChunk <= samples.size) {
                    val chunk = samples.copyOfRange(offset, offset + alignedChunk)
                    stream!!.acceptWaveform(chunk, sampleRate)

                    while (spotter!!.isReady(stream!!)) {
                        spotter!!.decode(stream!!)
                    }

                    val result = spotter!!.getResult(stream!!)
                    if (result.keyword.isNotEmpty()) {
                        detectedKeyword = result.keyword
                        spotter!!.reset(stream!!)
                        break
                    }
                    offset += alignedChunk
                }

                // Feed trailing samples without decoding (not enough for a full chunk)
                if (detectedKeyword.isEmpty() && offset < samples.size) {
                    val tail = samples.copyOfRange(offset, samples.size)
                    stream!!.acceptWaveform(tail, sampleRate)
                    // Skip decode — partial frames would crash the Reshape node
                }

                val keyword = detectedKeyword

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)

                if (keyword.isNotEmpty()) {
                    resultMap.putString("keyword", keyword)
                    resultMap.putBoolean("detected", true)
                } else {
                    resultMap.putString("keyword", "")
                    resultMap.putBoolean("detected", false)
                }

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error accepting waveform: ${e.message}")
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
