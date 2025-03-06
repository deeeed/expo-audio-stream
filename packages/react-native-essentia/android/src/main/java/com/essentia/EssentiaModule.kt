package com.essentia

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import java.util.concurrent.Executors
import java.util.concurrent.ExecutorService
import android.util.Log
import org.json.JSONObject
import org.json.JSONArray
import org.json.JSONException
import com.facebook.react.bridge.ReadableType
import com.facebook.react.modules.core.DeviceEventManagerModule

class EssentiaModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor: ExecutorService = Executors.newSingleThreadExecutor()
  private var nativeHandle: Long = 0
  private val lock = Object()

  // Add a new interface for the progress callback
  interface ProgressCallback {
    fun onProgress(progress: Float)
  }

  // Add the native method for setting progress callback
  private external fun nativeSetProgressCallback(handle: Long, callback: ProgressCallback)

  // Create the progress callback object
  private val progressCallback = object : ProgressCallback {
    override fun onProgress(progress: Float) {
      try {
        // Send the progress to JavaScript via DeviceEventEmitter
        val params = Arguments.createMap()
        params.putDouble("progress", progress.toDouble())
        reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("EssentiaProgress", params)
      } catch (e: Exception) {
        Log.e("EssentiaModule", "Error sending progress event: ${e.message}", e)
      }
    }
  }

  override fun getName(): String {
    return NAME
  }

  // Load the native library
  companion object {
    const val NAME = "Essentia"

    init {
      try {
        System.loadLibrary("react-native-essentia")
        Log.d("EssentiaModule", "Successfully loaded native library")
      } catch (e: Exception) {
        Log.e("EssentiaModule", "Failed to load native library: ${e.message}", e)
      }
    }
  }

  // Native methods that will be implemented in C++
  private external fun nativeCreateEssentiaWrapper(): Long
  private external fun nativeDestroyEssentiaWrapper(handle: Long)
  private external fun nativeInitializeEssentia(handle: Long): Boolean
  private external fun nativeSetAudioData(handle: Long, pcmData: FloatArray, sampleRate: Double): Boolean
  private external fun nativeExecuteAlgorithm(handle: Long, algorithm: String, paramsJson: String): String
  private external fun testJniConnection(): String
  private external fun nativeGetAlgorithmInfo(handle: Long, algorithm: String): String
  private external fun nativeGetAllAlgorithms(handle: Long): String
  private external fun nativeExtractFeatures(handle: Long, featuresJson: String): String
  private external fun getVersion(): String

  /**
   * Helper method to ensure Essentia is initialized
   * This implements lazy initialization so users don't need to explicitly call initialize()
   */
  private fun ensureInitialized(promise: Promise, callback: () -> Unit) {
    try {
      executor.execute {
        try {
          synchronized(lock) {
            if (nativeHandle == 0L) {
              Log.d("EssentiaModule", "Lazy initialization: Creating native wrapper")
              nativeHandle = nativeCreateEssentiaWrapper()
              if (nativeHandle == 0L) {
                Log.e("EssentiaModule", "Failed to create native wrapper")
                promise.reject("ESSENTIA_INIT_ERROR", "Failed to create Essentia wrapper")
                return@execute
              }

              Log.d("EssentiaModule", "Lazy initialization: Initializing Essentia with handle: $nativeHandle")
              val result = nativeInitializeEssentia(nativeHandle)

              if (!result) {
                nativeDestroyEssentiaWrapper(nativeHandle)
                nativeHandle = 0L
                promise.reject("ESSENTIA_INIT_ERROR", "Failed to initialize Essentia")
                return@execute
              }

              // Set the progress callback after initialization
              try {
                nativeSetProgressCallback(nativeHandle, progressCallback)
                Log.d("EssentiaModule", "Progress callback registered")
              } catch (e: Exception) {
                Log.e("EssentiaModule", "Failed to set progress callback: ${e.message}", e)
                // Continue anyway - this is not critical
              }

              Log.d("EssentiaModule", "Lazy initialization successful")
            }

            // Now that we're initialized, execute the callback
            callback()
          }
        } catch (e: Exception) {
          Log.e("EssentiaModule", "Exception during lazy initialization: ${e.message}", e)
          synchronized(lock) {
            if (nativeHandle != 0L) {
              nativeDestroyEssentiaWrapper(nativeHandle)
              nativeHandle = 0L
            }
          }
          promise.reject("ESSENTIA_INIT_ERROR", "Exception during initialization: ${e.message}")
        }
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Failed to initialize Essentia: ${e.message}", e)
      promise.reject("ESSENTIA_INIT_ERROR", "Failed to initialize Essentia: ${e.message}")
    }
  }

  /**
   * Initializes the Essentia library, preparing it for use.
   * @param promise Promise that resolves to a boolean indicating success or failure
   */
  @Suppress("unused")
  @ReactMethod
  fun initialize(promise: Promise) {
    try {
      Log.d("EssentiaModule", "Starting initialization")
      executor.execute {
        try {
          synchronized(lock) {
            if (nativeHandle == 0L) {
              Log.d("EssentiaModule", "Creating native wrapper")
              nativeHandle = nativeCreateEssentiaWrapper()
              if (nativeHandle == 0L) {
                Log.e("EssentiaModule", "Failed to create native wrapper")
                promise.reject("ESSENTIA_INIT_ERROR", "Failed to create Essentia wrapper")
                return@execute
              }
              Log.d("EssentiaModule", "Native wrapper created: $nativeHandle")
            }

            Log.d("EssentiaModule", "Initializing Essentia with handle: $nativeHandle")
            val result = nativeInitializeEssentia(nativeHandle)
            Log.d("EssentiaModule", "Initialization result: $result")

            if (!result) {
              nativeDestroyEssentiaWrapper(nativeHandle)
              nativeHandle = 0L
              promise.reject("ESSENTIA_INIT_ERROR", "Failed to initialize Essentia")
              return@execute
            }

            // Set the progress callback after initialization
            try {
              nativeSetProgressCallback(nativeHandle, progressCallback)
              Log.d("EssentiaModule", "Progress callback registered")
            } catch (e: Exception) {
              Log.e("EssentiaModule", "Failed to set progress callback: ${e.message}", e)
              // Continue anyway - this is not critical
            }

            promise.resolve(result)
          }
        } catch (e: Exception) {
          Log.e("EssentiaModule", "Exception during initialization: ${e.message}", e)
          synchronized(lock) {
            if (nativeHandle != 0L) {
              nativeDestroyEssentiaWrapper(nativeHandle)
              nativeHandle = 0L
            }
          }
          promise.reject("ESSENTIA_INIT_ERROR", "Exception during initialization: ${e.message}")
        }
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Failed to initialize Essentia: ${e.message}", e)
      promise.reject("ESSENTIA_INIT_ERROR", "Failed to initialize Essentia: ${e.message}")
    }
  }

  /**
   * Sets the raw audio data (PCM samples) and sample rate for subsequent algorithm processing.
   * @param pcmArray Array of audio samples
   * @param sampleRate Sampling rate in Hz (e.g., 44100)
   * @param promise Promise that resolves to a boolean indicating success or failure
   */
  @Suppress("unused")
  @ReactMethod
  fun setAudioData(pcmArray: ReadableArray, sampleRate: Double, promise: Promise) {
    ensureInitialized(promise) {
      // Validate inputs
      if (pcmArray.size() == 0) {
        promise.reject("ESSENTIA_INVALID_INPUT", "PCM data array is empty")
        return@ensureInitialized
      }

      if (sampleRate <= 0) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Sample rate must be positive")
        return@ensureInitialized
      }

      // Convert ReadableArray to FloatArray in chunks
      val arraySize = pcmArray.size()
      val pcmFloatArray = FloatArray(arraySize)

      // Use a reasonable chunk size to avoid stack issues
      val chunkSize = 1000
      var i = 0

      Log.d("EssentiaModule", "Converting PCM data in chunks of $chunkSize (total: $arraySize samples)")

      try {
        while (i < arraySize) {
          val end = kotlin.math.min(i + chunkSize, arraySize)
          Log.d("EssentiaModule", "Processing chunk $i to $end (size: ${end - i})")

          for (j in i until end) {
            // Type safety check
            if (pcmArray.getType(j) != ReadableType.Number) {
              promise.reject("ESSENTIA_TYPE_ERROR",
                "Invalid data type at index $j. Expected number, got ${pcmArray.getType(j)}")
              return@ensureInitialized
            }
            pcmFloatArray[j] = pcmArray.getDouble(j).toFloat()
          }
          i = end
        }
      } catch (e: Exception) {
        Log.e("EssentiaModule", "Error converting PCM data: ${e.message}", e)
        promise.reject("ESSENTIA_CONVERSION_ERROR", "Failed to convert PCM data: ${e.message}")
        return@ensureInitialized
      }

      Log.d("EssentiaModule", "Successfully converted all PCM data, now sending to native code")

      val result: Boolean
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        result = nativeSetAudioData(nativeHandle, pcmFloatArray, sampleRate)
      }

      when (result) {
        true -> {
          Log.d("EssentiaModule", "Successfully set PCM audio data in native layer")
        }
        false -> {
          Log.e("EssentiaModule", "Failed to set PCM audio data in native layer")
        }
      }
      promise.resolve(result)
    }
  }

  /**
   * Converts a JSON string to a WritableMap that can be sent to JavaScript
   */
  private fun convertJsonToWritableMap(jsonString: String): WritableMap {
    try {
      val jsonObject = JSONObject(jsonString)
      return convertJsonObjectToWritableMap(jsonObject)
    } catch (e: JSONException) {
      Log.e("EssentiaModule", "Error parsing JSON: ${e.message}", e)
      val errorMap = Arguments.createMap()
      errorMap.putBoolean("success", false)
      errorMap.putString("error", "Failed to parse JSON result: ${e.message}")
      return errorMap
    }
  }

  /**
   * Recursively converts a JSONObject to a WritableMap
   */
  private fun convertJsonObjectToWritableMap(jsonObject: JSONObject): WritableMap {
    val map = Arguments.createMap()
    val keys = jsonObject.keys()

    while (keys.hasNext()) {
      val key = keys.next()

      when (val value = jsonObject.get(key)) {
        is JSONObject -> map.putMap(key, convertJsonObjectToWritableMap(value))
        is JSONArray -> map.putArray(key, convertJsonArrayToWritableArray(value))
        is Boolean -> map.putBoolean(key, value)
        is Int -> map.putInt(key, value)
        is Double -> map.putDouble(key, value)
        is Long -> map.putDouble(key, value.toDouble())
        is String -> map.putString(key, value)
        else -> map.putString(key, value.toString())
      }
    }

    return map
  }

  /**
   * Recursively converts a JSONArray to a WritableArray
   */
  private fun convertJsonArrayToWritableArray(jsonArray: JSONArray): WritableArray {
    val array = Arguments.createArray()

    for (i in 0 until jsonArray.length()) {
      when (val value = jsonArray.get(i)) {
        is JSONObject -> array.pushMap(convertJsonObjectToWritableMap(value))
        is JSONArray -> array.pushArray(convertJsonArrayToWritableArray(value))
        is Boolean -> array.pushBoolean(value)
        is Int -> array.pushInt(value)
        is Double -> array.pushDouble(value)
        is Long -> array.pushDouble(value.toDouble())
        is String -> array.pushString(value)
        else -> array.pushString(value.toString())
      }
    }

    return array
  }

  /**
   * Executes a specified Essentia algorithm on the set audio data, using provided parameters.
   * @param algorithm Name of the Essentia algorithm (e.g., "MFCC", "Spectrum", "Key")
   * @param params An object containing key-value pairs for algorithm configuration
   * @param promise Promise that resolves to an object containing the algorithm's output
   */
  @Suppress("unused")
  @ReactMethod
  fun executeAlgorithm(algorithm: String, params: ReadableMap, promise: Promise) {
    ensureInitialized(promise) {
      // Validate inputs
      if (algorithm.isEmpty()) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm name cannot be empty")
        return@ensureInitialized
      }

      // Convert params to JSON string
      val paramsJson = params.toString()

      // Execute the algorithm and get the JSON result
      val resultJsonString: String
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        resultJsonString = nativeExecuteAlgorithm(nativeHandle, algorithm, paramsJson)
      }

      Log.d("EssentiaModule", "Raw result from C++: $resultJsonString")

      // Convert the JSON string to a WritableMap
      val resultMap = convertJsonToWritableMap(resultJsonString)

      // Check if there was an error
      if (resultMap.hasKey("error")) {
        val errorMap = resultMap.getMap("error")
        if (errorMap != null && errorMap.hasKey("code") && errorMap.hasKey("message")) {
          promise.reject(
            errorMap.getString("code") ?: "UNKNOWN_ERROR",
            errorMap.getString("message") ?: "Unknown error occurred"
          )
          return@ensureInitialized
        }
      }

      // Always resolves with a non-null value, so no need to check result
      promise.resolve(resultMap)
    }
  }

  /**
   * Simple test method to verify JNI connection is working
   * @param promise Promise that resolves to a string message
   */
  @Suppress("unused")
  @ReactMethod
  fun testConnection(promise: Promise) {
    try {
      Log.d("EssentiaModule", "Testing JNI connection")
      executor.execute {
        try {
          val result = testJniConnection()
          Log.d("EssentiaModule", "Test connection result: $result")
          promise.resolve(result)
        } catch (e: Exception) {
          Log.e("EssentiaModule", "Test connection failed: ${e.message}", e)
          promise.reject("TEST_FAILED", "Test connection failed: ${e.message}")
        }
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Test connection error: ${e.message}", e)
      promise.reject("TEST_ERROR", "Test connection error: ${e.message}")
    }
  }

  /**
   * Gets information about an Essentia algorithm, including its inputs, outputs, and parameters.
   * @param algorithm Name of the Essentia algorithm to get information about
   * @param promise Promise that resolves to an object containing algorithm information
   */
  @Suppress("unused")
  @ReactMethod
  fun getAlgorithmInfo(algorithm: String, promise: Promise) {
    ensureInitialized(promise) {
      // Validate inputs
      if (algorithm.isEmpty()) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm name cannot be empty")
        return@ensureInitialized
      }

      // Get the algorithm info
      val resultJsonString: String
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        resultJsonString = nativeGetAlgorithmInfo(nativeHandle, algorithm)
      }

      Log.d("EssentiaModule", "Algorithm info from C++ for $algorithm: $resultJsonString")

      // Convert the JSON string to a WritableMap
      val resultMap = convertJsonToWritableMap(resultJsonString)

      // Check if there was an error
      if (resultMap.hasKey("error")) {
        val errorMap = resultMap.getMap("error")
        if (errorMap != null && errorMap.hasKey("code") && errorMap.hasKey("message")) {
          promise.reject(
            errorMap.getString("code") ?: "UNKNOWN_ERROR",
            errorMap.getString("message") ?: "Unknown error occurred"
          )
          return@ensureInitialized
        }
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  /**
   * Gets a list of all available Essentia algorithms.
   * @param promise Promise that resolves to an array of algorithm names
   */
  @Suppress("unused")
  @ReactMethod
  fun getAllAlgorithms(promise: Promise) {
    ensureInitialized(promise) {
      // Get all algorithms
      val resultJsonString: String
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        resultJsonString = nativeGetAllAlgorithms(nativeHandle)
      }

      Log.d("EssentiaModule", "Algorithm list from C++: $resultJsonString")

      // Convert the JSON string to a WritableMap
      val resultMap = convertJsonToWritableMap(resultJsonString)

      // Check if there was an error
      if (resultMap.hasKey("error")) {
        val errorMap = resultMap.getMap("error")
        if (errorMap != null && errorMap.hasKey("code") && errorMap.hasKey("message")) {
          promise.reject(
            errorMap.getString("code") ?: "UNKNOWN_ERROR",
            errorMap.getString("message") ?: "Unknown error occurred"
          )
          return@ensureInitialized
        }
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  /**
   * Extracts multiple audio features in a single call, based on a configurable feature list.
   * @param featureList Array of feature configurations, each with a name and optional parameters
   * @param promise Promise that resolves to an object containing all extracted features
   */
  @Suppress("unused")
  @ReactMethod
  fun extractFeatures(featureList: ReadableArray, promise: Promise) {
    ensureInitialized(promise) {
      // Validate input
      if (featureList.size() == 0) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Feature list cannot be empty")
        return@ensureInitialized
      }

      // Validate each feature has required parameters
      for (i in 0 until featureList.size()) {
        val feature = featureList.getMap(i) ?: run {
          promise.reject("ESSENTIA_INVALID_INPUT", "Feature at index $i is missing")
          return@ensureInitialized
        }

        if (!feature.hasKey("name") || feature.getString("name").isNullOrEmpty()) {
          promise.reject("ESSENTIA_INVALID_INPUT", "Feature at index $i is missing a valid name")
          return@ensureInitialized
        }

        if (feature.hasKey("params") && feature.getType("params") != ReadableType.Map) {
          promise.reject("ESSENTIA_INVALID_INPUT", "Feature at index $i has invalid params (must be an object)")
          return@ensureInitialized
        }
      }

      // Convert ReadableArray to JSON string for passing to native code
      val featuresJson = convertReadableArrayToJson(featureList)
      Log.d("EssentiaModule", "Extracting features with config: $featuresJson")

      // Call the native method
      val resultJsonString: String
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        resultJsonString = nativeExtractFeatures(nativeHandle, featuresJson)
      }

      Log.d("EssentiaModule", "Feature extraction result: $resultJsonString")

      // Convert the JSON string to a WritableMap
      val resultMap = convertJsonToWritableMap(resultJsonString)

      // Check if there was an error
      if (resultMap.hasKey("error")) {
        val errorMap = resultMap.getMap("error")
        if (errorMap != null && errorMap.hasKey("code") && errorMap.hasKey("message")) {
          promise.reject(
            errorMap.getString("code") ?: "UNKNOWN_ERROR",
            errorMap.getString("message") ?: "Unknown error occurred"
          )
          return@ensureInitialized
        }
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  /**
   * Converts a ReadableArray to a JSON string
   */
  private fun convertReadableArrayToJson(array: ReadableArray): String {
    val jsonArray = JSONArray()

    for (i in 0 until array.size()) {
      if (array.getType(i) == ReadableType.Map) {
        array.getMap(i)?.let { map ->
          jsonArray.put(convertReadableMapToJsonObject(map))
        }
      }
    }

    return jsonArray.toString()
  }

  /**
   * Converts a ReadableMap to a JSONObject
   */
  private fun convertReadableMapToJsonObject(map: ReadableMap): JSONObject {
    val jsonObject = JSONObject()
    val iterator = map.keySetIterator()

    while (iterator.hasNextKey()) {
      val key = iterator.nextKey()
      when (map.getType(key)) {
        ReadableType.Null -> jsonObject.put(key, JSONObject.NULL)
        ReadableType.Boolean -> jsonObject.put(key, map.getBoolean(key))
        ReadableType.Number -> jsonObject.put(key, map.getDouble(key))
        ReadableType.String -> jsonObject.put(key, map.getString(key))
        ReadableType.Map -> {
          map.getMap(key)?.let { mapValue ->
            jsonObject.put(key, convertReadableMapToJsonObject(mapValue))
          }
        }
        ReadableType.Array -> {
          map.getArray(key)?.let { arrayValue ->
            jsonObject.put(key, convertReadableArrayToJsonArray(arrayValue))
          }
        }
      }
    }

    return jsonObject
  }

  /**
   * Converts a ReadableArray to a JSONArray
   */
  private fun convertReadableArrayToJsonArray(array: ReadableArray): JSONArray {
    val jsonArray = JSONArray()

    for (i in 0 until array.size()) {
      when (array.getType(i)) {
        ReadableType.Null -> jsonArray.put(JSONObject.NULL)
        ReadableType.Boolean -> jsonArray.put(array.getBoolean(i))
        ReadableType.Number -> jsonArray.put(array.getDouble(i))
        ReadableType.String -> jsonArray.put(array.getString(i))
        ReadableType.Map -> {
          array.getMap(i)?.let { mapValue ->
            jsonArray.put(convertReadableMapToJsonObject(mapValue))
          }
        }
        ReadableType.Array -> {
          array.getArray(i)?.let { arrayValue ->
            jsonArray.put(convertReadableArrayToJsonArray(arrayValue))
          }
        }
      }
    }

    return jsonArray
  }

  /**
   * Gets the version of the Essentia library
   * @param promise Promise that resolves to the version string
   */
  @Suppress("unused")
  @ReactMethod
  fun getVersion(promise: Promise) {
    try {
      val version = getVersion()
      promise.resolve(version)
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error getting version: ${e.message}", e)
      promise.reject("ESSENTIA_VERSION_ERROR", "Failed to get Essentia version: ${e.message}")
    }
  }

  /**
   * Register an event listener for progress updates
   * @param promise Promise that resolves when the listener is registered
   */
  @ReactMethod
  fun addProgressListener(promise: Promise) {
    try {
      // Just verify that we can send events by sending a test event
      val params = Arguments.createMap()
      params.putDouble("progress", 0.0)
      reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("EssentiaProgress", params)

      promise.resolve(true)
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Failed to add progress listener: ${e.message}", e)
      promise.reject("PROGRESS_LISTENER_ERROR", "Failed to add progress listener: ${e.message}")
    }
  }

  /**
   * Execute a batch of algorithms that can share intermediate results
   * @param algorithms Array of algorithm configurations
   * @param promise Promise that resolves to an object containing all algorithm outputs
   */
  @ReactMethod
  fun executeBatch(algorithms: ReadableArray, promise: Promise) {
    ensureInitialized(promise) {
      // Validate input
      if (algorithms.size() == 0) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm list cannot be empty")
        return@ensureInitialized
      }

      // Convert ReadableArray to a list of algorithm configs
      val algorithmConfigs = mutableListOf<Pair<String, ReadableMap>>()
      for (i in 0 until algorithms.size()) {
        val config = algorithms.getMap(i) ?: run {
          promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm config at index $i is invalid")
          return@ensureInitialized
        }

        val name = config.getString("name") ?: run {
          promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm at index $i is missing name")
          return@ensureInitialized
        }

        val params = if (config.hasKey("params")) config.getMap("params") ?: Arguments.createMap() else Arguments.createMap()

        algorithmConfigs.add(Pair(name, params))
      }

      // Create feature extraction config using the algorithm list
      val featuresJson = JSONArray()
      for ((name, params) in algorithmConfigs) {
        val configJson = JSONObject()
        configJson.put("name", name)
        configJson.put("params", convertReadableMapToJsonObject(params))
        featuresJson.put(configJson)
      }

      Log.d("EssentiaModule", "Executing batch algorithms: ${featuresJson.toString()}")

      // Use extractFeatures as it already handles caching and shared computation
      val resultJsonString: String
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        resultJsonString = nativeExtractFeatures(nativeHandle, featuresJson.toString())
      }

      Log.d("EssentiaModule", "Batch execution result: $resultJsonString")

      // Convert the JSON string to a WritableMap
      val resultMap = convertJsonToWritableMap(resultJsonString)

      // Check if there was an error
      if (resultMap.hasKey("error")) {
        val errorMap = resultMap.getMap("error")
        if (errorMap != null && errorMap.hasKey("code") && errorMap.hasKey("message")) {
          promise.reject(
            errorMap.getString("code") ?: "UNKNOWN_ERROR",
            errorMap.getString("message") ?: "Unknown error occurred"
          )
          return@ensureInitialized
        }
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  override fun invalidate() {
    synchronized(lock) {
      if (nativeHandle != 0L) {
        try {
          nativeDestroyEssentiaWrapper(nativeHandle)
        } catch (e: Exception) {
          Log.e("EssentiaModule", "Error destroying native wrapper: ${e.message}", e)
        } finally {
          nativeHandle = 0
        }
      }
    }

    try {
      executor.shutdown()
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error shutting down executor: ${e.message}", e)
    }

    super.invalidate()
  }
}
