package net.siteed.sherpaonnx.handlers

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.k2fsa.sherpa.onnx.*
import net.siteed.sherpaonnx.SherpaOnnxImpl
import net.siteed.sherpaonnx.utils.AssetUtils
import java.io.File
import java.util.concurrent.Executors

class PunctuationHandler(private val reactContext: ReactApplicationContext) {

    private val executor = Executors.newSingleThreadExecutor()
    private var punct: OnlinePunctuation? = null

    companion object {
        private const val TAG = "SherpaOnnxPunctuation"
    }

    fun init(config: ReadableMap, promise: Promise) {
        if (!SherpaOnnxImpl.isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "Sherpa ONNX library is not loaded")
            return
        }

        executor.execute {
            try {
                Log.i(TAG, "Initializing Punctuation with config: ${config.toHashMap()}")

                val modelDir = AssetUtils.cleanFilePath(config.getString("modelDir") ?: "")
                val cnnBilstm = config.getString("cnnBilstm") ?: "model.onnx"
                val bpeVocab = config.getString("bpeVocab") ?: "bpe.vocab"
                val numThreads = if (config.hasKey("numThreads")) config.getInt("numThreads") else 1
                val debug = if (config.hasKey("debug")) config.getBoolean("debug") else false
                val provider = config.getString("provider") ?: "cpu"

                // Find model subdirectory (tar.bz2 archives extract to a subfolder)
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

                val cnnBilstmPath = File(actualModelDir, cnnBilstm).absolutePath
                val bpeVocabPath = File(actualModelDir, bpeVocab).absolutePath

                Log.i(TAG, "cnnBilstm: $cnnBilstmPath (exists: ${File(cnnBilstmPath).exists()})")
                Log.i(TAG, "bpeVocab: $bpeVocabPath (exists: ${File(bpeVocabPath).exists()})")

                if (!File(cnnBilstmPath).exists()) {
                    throw Exception("cnnBilstm file not found: $cnnBilstmPath")
                }
                if (!File(bpeVocabPath).exists()) {
                    throw Exception("bpeVocab file not found: $bpeVocabPath")
                }

                // Release previous instance
                punct?.release()
                punct = null

                val punctConfig = OnlinePunctuationConfig(
                    model = OnlinePunctuationModelConfig(
                        cnnBilstm = cnnBilstmPath,
                        bpeVocab = bpeVocabPath,
                        numThreads = numThreads,
                        debug = debug,
                        provider = provider,
                    ),
                )

                punct = OnlinePunctuation(null, punctConfig)

                Log.i(TAG, "Punctuation initialized successfully")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                reactContext.runOnUiQueueThread { promise.resolve(resultMap) }
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing Punctuation: ${e.message}")
                e.printStackTrace()
                punct = null
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_PUNCTUATION_INIT", "Failed to initialize Punctuation: ${e.message}")
                }
            }
        }
    }

    fun addPunctuation(text: String, promise: Promise) {
        executor.execute {
            try {
                val currentPunct = punct
                    ?: throw Exception("Punctuation not initialized")

                Log.d(TAG, "Adding punctuation to: $text")

                val startTime = System.currentTimeMillis()
                val result = currentPunct.addPunctuation(text)
                val durationMs = System.currentTimeMillis() - startTime

                Log.i(TAG, "Punctuated text: $result in ${durationMs}ms")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("text", result)
                resultMap.putDouble("durationMs", durationMs.toDouble())
                reactContext.runOnUiQueueThread { promise.resolve(resultMap) }
            } catch (e: Exception) {
                Log.e(TAG, "Error adding punctuation: ${e.message}")
                e.printStackTrace()
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_PUNCTUATION_ADD", "Failed to add punctuation: ${e.message}")
                }
            }
        }
    }

    fun release(promise: Promise) {
        executor.execute {
            try {
                punct?.release()
                punct = null
                Log.i(TAG, "Punctuation released")

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("released", true)
                reactContext.runOnUiQueueThread { promise.resolve(resultMap) }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing Punctuation: ${e.message}")
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_PUNCTUATION_RELEASE", "Failed to release Punctuation: ${e.message}")
                }
            }
        }
    }
}
