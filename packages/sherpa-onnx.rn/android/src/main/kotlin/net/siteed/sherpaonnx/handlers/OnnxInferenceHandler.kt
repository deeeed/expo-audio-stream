package net.siteed.sherpaonnx.handlers

import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import org.json.JSONArray
import org.json.JSONObject
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

    fun createSession(config: ReadableMap, promise: Promise) {
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

    fun runSession(sessionId: String, inputsJson: String, promise: Promise) {
        if (!isLibraryLoaded) {
            promise.reject("ERR_LIBRARY_NOT_LOADED", "onnx-inference-jni library is not loaded")
            return
        }

        executor.execute {
            try {
                // Parse inputsJson: { "inputName": { "type": "float32", "dims": [1,3], "data": "<base64>" }, ... }
                val json = JSONObject(inputsJson)
                val keys = json.keys().asSequence().toList()
                val numInputs = keys.size

                val inputNames = Array(numInputs) { "" }
                val inputTypes = Array(numInputs) { "" }
                val inputShapes = Array(numInputs) { IntArray(0) }
                val inputData = Array(numInputs) { ByteArray(0) }

                for ((i, key) in keys.withIndex()) {
                    val tensorObj = json.getJSONObject(key)
                    inputNames[i] = key
                    inputTypes[i] = tensorObj.getString("type")

                    val dimsArr = tensorObj.getJSONArray("dims")
                    inputShapes[i] = IntArray(dimsArr.length()) { dimsArr.getInt(it) }

                    val dataBase64 = tensorObj.getString("data")
                    inputData[i] = Base64.decode(dataBase64, Base64.NO_WRAP)
                }

                Log.i(TAG, "Running session $sessionId with $numInputs inputs")
                val result = nativeRunSession(sessionId, inputNames, inputTypes, inputShapes, inputData)

                // Build JSON response as Record<string, OnnxTensorData>
                // Format: { "outputName": { "type": "float32", "dims": [1,5], "data": "<base64>" }, ... }
                val outputsObj = JSONObject()

                for (i in result.outputNames.indices) {
                    val tensorObj = JSONObject()
                    tensorObj.put("type", result.outputTypes[i])

                    val dimsJson = JSONArray()
                    result.outputShapes[i].forEach { dimsJson.put(it) }
                    tensorObj.put("dims", dimsJson)

                    tensorObj.put("data", Base64.encodeToString(result.outputData[i], Base64.NO_WRAP))
                    outputsObj.put(result.outputNames[i], tensorObj)
                }

                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", true)
                resultMap.putString("outputs", outputsObj.toString())

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
