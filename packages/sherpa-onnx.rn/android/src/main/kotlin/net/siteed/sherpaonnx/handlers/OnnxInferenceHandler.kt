package net.siteed.sherpaonnx.handlers

import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import java.util.concurrent.Executors

data class OnnxRunResult(
    val outputNames: Array<String>,
    val outputTypes: Array<String>,
    val outputShapes: Array<IntArray>,
    val outputData: Array<ByteArray>
)

class OnnxInferenceHandler(private val reactContext: ReactApplicationContext) {

    private val executor = Executors.newSingleThreadExecutor()

    companion object {
        private const val TAG = "OnnxInference"
        private var isLibraryLoaded = false

        init {
            try {
                System.loadLibrary("onnx-inference-jni")
                isLibraryLoaded = true
                Log.i(TAG, "onnx-inference-jni library loaded successfully")
            } catch (e: UnsatisfiedLinkError) {
                isLibraryLoaded = false
                Log.e(TAG, "Failed to load onnx-inference-jni library", e)
            }
        }
    }

    // Native methods
    private external fun nativeCreateSession(modelPath: String, numThreads: Int): String
    private external fun nativeGetInputNames(sessionId: String): Array<String>
    private external fun nativeGetOutputNames(sessionId: String): Array<String>
    private external fun nativeGetInputTypes(sessionId: String): Array<String>
    private external fun nativeGetOutputTypes(sessionId: String): Array<String>
    private external fun nativeRunSession(
        sessionId: String,
        inputNames: Array<String>,
        inputTypes: Array<String>,
        inputShapes: Array<IntArray>,
        inputData: Array<ByteArray>
    ): OnnxRunResult
    private external fun nativeReleaseSession(sessionId: String)

    fun createSession(config: com.facebook.react.bridge.ReadableMap, promise: Promise) {
        if (!isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "onnx-inference-jni library is not loaded")
            return
        }

        executor.execute {
            try {
                val modelPath = config.getString("modelPath")
                    ?: throw IllegalArgumentException("modelPath is required")
                val numThreads = if (config.hasKey("numThreads")) config.getInt("numThreads") else 1

                Log.i(TAG, "Creating session: modelPath=$modelPath, numThreads=$numThreads")

                val sessionId = nativeCreateSession(modelPath, numThreads)
                val inputNames = nativeGetInputNames(sessionId)
                val outputNames = nativeGetOutputNames(sessionId)
                val inputTypes = nativeGetInputTypes(sessionId)
                val outputTypes = nativeGetOutputTypes(sessionId)

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("sessionId", sessionId)

                val inputNamesArray = Arguments.createArray()
                inputNames.forEach { inputNamesArray.pushString(it) }
                resultMap.putArray("inputNames", inputNamesArray)

                val outputNamesArray = Arguments.createArray()
                outputNames.forEach { outputNamesArray.pushString(it) }
                resultMap.putArray("outputNames", outputNamesArray)

                val inputTypesArray = Arguments.createArray()
                inputTypes.forEach { inputTypesArray.pushString(it) }
                resultMap.putArray("inputTypes", inputTypesArray)

                val outputTypesArray = Arguments.createArray()
                outputTypes.forEach { outputTypesArray.pushString(it) }
                resultMap.putArray("outputTypes", outputTypesArray)

                Log.i(TAG, "Session created: $sessionId")

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error creating session: ${e.message}", e)
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ONNX_CREATE", "Failed to create ONNX session: ${e.message}")
                }
            }
        }
    }

    fun runSession(
        sessionId: String,
        inputNamesArr: ReadableArray,
        inputTypesArr: ReadableArray,
        inputDimsArr: ReadableArray,
        inputDataArr: ReadableArray,
        promise: Promise
    ) {
        if (!isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "onnx-inference-jni library is not loaded")
            return
        }

        executor.execute {
            try {
                val numInputs = inputNamesArr.size()

                val inputNames = Array(numInputs) { inputNamesArr.getString(it)!! }
                val inputTypes = Array(numInputs) { inputTypesArr.getString(it)!! }
                val inputShapes = Array(numInputs) { i ->
                    val dimsStr = inputDimsArr.getString(i)!!
                    dimsStr.split(",").map { it.trim().toInt() }.toIntArray()
                }
                val inputData = Array(numInputs) { i ->
                    Base64.decode(inputDataArr.getString(i)!!, Base64.NO_WRAP)
                }

                Log.i(TAG, "Running session $sessionId with $numInputs inputs")
                val result = nativeRunSession(sessionId, inputNames, inputTypes, inputShapes, inputData)

                // Build structured response with parallel arrays
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)

                val outNames = Arguments.createArray()
                val outTypes = Arguments.createArray()
                val outDims = Arguments.createArray()
                val outData = Arguments.createArray()

                for (i in result.outputNames.indices) {
                    outNames.pushString(result.outputNames[i])
                    outTypes.pushString(result.outputTypes[i])
                    outDims.pushString(result.outputShapes[i].joinToString(","))
                    outData.pushString(Base64.encodeToString(result.outputData[i], Base64.NO_WRAP))
                }

                resultMap.putArray("outputNames", outNames)
                resultMap.putArray("outputTypes", outTypes)
                resultMap.putArray("outputDims", outDims)
                resultMap.putArray("outputData", outData)

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error running session: ${e.message}", e)
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ONNX_RUN", "Failed to run ONNX session: ${e.message}")
                }
            }
        }
    }

    fun releaseSession(sessionId: String, promise: Promise) {
        if (!isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "onnx-inference-jni library is not loaded")
            return
        }

        executor.execute {
            try {
                nativeReleaseSession(sessionId)

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("released", true)

                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing session: ${e.message}", e)
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_ONNX_RELEASE", "Failed to release ONNX session: ${e.message}")
                }
            }
        }
    }
}
