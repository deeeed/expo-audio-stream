package net.siteed.essentia

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

class EssentiaModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private var threadCount: Int = 4 // Default thread count
  private var executor: ExecutorService = Executors.newFixedThreadPool(threadCount)
  private var nativeHandle: Long = 0
  private val lock = Object()

  // Add caches for algorithm information
  private val algorithmInfoCache = mutableMapOf<String, WritableMap>()
  private var allAlgorithmsCache: WritableMap? = null
  private var isCacheEnabled: Boolean = true

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
  private external fun nativeComputeMelSpectrogram(
    handle: Long,
    frameSize: Int,
    hopSize: Int,
    nMels: Int,
    fMin: Float,
    fMax: Float,
    windowType: String,
    normalize: Boolean,
    logScale: Boolean
  ): String
  private external fun nativeExecutePipeline(handle: Long, pipelineJson: String): String
  private external fun nativeComputeSpectrum(handle: Long, frameSize: Int, hopSize: Int): Boolean
  private external fun nativeComputeTonnetz(handle: Long, hpcpJson: String): String

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
    Log.d("EssentiaModule", "Entering initialize method")
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
    Log.d("EssentiaModule", "Entering setAudioData with pcmArray size: ${pcmArray.size()}, sampleRate: $sampleRate")
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
  private fun convertJsonToWritableMap(jsonString: String?): WritableMap {
    val map = Arguments.createMap()
    if (jsonString.isNullOrEmpty()) {
      map.putBoolean("success", false)
      map.putString("error", "Native layer returned null or empty result")
      return map
    }

    try {
      val jsonObject = JSONObject(jsonString)
      return convertJsonObjectToWritableMap(jsonObject)
    } catch (e: JSONException) {
      Log.e("EssentiaModule", "Error parsing JSON: ${e.message}", e)
      map.putBoolean("success", false)
      val errorMap = Arguments.createMap()
      errorMap.putString("code", "JSON_PARSING_ERROR")
      errorMap.putString("message", "Failed to parse JSON result: ${e.message}")
      map.putMap("error", errorMap)
      return map
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
   * Update this helper method to handle the new error structure with details
   */
  private fun handleErrorInResultMap(resultMap: WritableMap, promise: Promise): Boolean {
    if (resultMap.hasKey("success") && !resultMap.getBoolean("success")) {
      if (resultMap.hasKey("error")) {
        when (resultMap.getType("error")) {
          ReadableType.Map -> {
            val errorMap = resultMap.getMap("error")
            if (errorMap != null) {
              val code = errorMap.getString("code") ?: "UNKNOWN_ERROR"
              val message = errorMap.getString("message") ?: "Unknown error occurred"
              val details = if (errorMap.hasKey("details")) errorMap.getString("details") else null

              if (details != null) {
                promise.reject(code, message, Exception(details))
              } else {
                promise.reject(code, message)
              }
            } else {
              promise.reject("UNKNOWN_ERROR", "Error map was null")
            }
          }
          ReadableType.String -> {
            val errorMessage = resultMap.getString("error") ?: "Unknown error"
            promise.reject("NATIVE_ERROR", errorMessage)
          }
          else -> {
            promise.reject("UNKNOWN_ERROR", "Unknown error type")
          }
        }
        return true // Indicates an error was found and handled
      } else {
        promise.reject("UNKNOWN_ERROR", "Native execution failed without error details")
        return true
      }
    }
    return false // No error found
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
    Log.d("EssentiaModule", "Entering executeAlgorithm with algorithm: $algorithm")
    ensureInitialized(promise) {
      // Validate inputs
      if (algorithm.isEmpty()) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm name cannot be empty")
        return@ensureInitialized
      }

      // Convert params to JSON string
      val paramsJson = convertReadableMapToJsonObject(params).toString()

      // Execute the algorithm and get the JSON result
      val resultJsonString: String?
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

      // Check if there was an error using our new helper
      if (handleErrorInResultMap(resultMap, promise)) {
        return@ensureInitialized
      }

      // Check success flag from native response
      if (!resultMap.hasKey("success") || !resultMap.getBoolean("success")) {
        val errorMessage = resultMap.getString("error") ?: "Unknown error in native execution"
        promise.reject("ESSENTIA_ALGORITHM_ERROR", "Failed to execute $algorithm: $errorMessage")
        return@ensureInitialized
      }

      // Check for data field for consistent resolution
      if (resultMap.hasKey("data")) {
        promise.resolve(resultMap)
      } else {
        // Still resolve with resultMap for backward compatibility, but log a warning
        Log.w("EssentiaModule", "Algorithm $algorithm returned success but no data field")
        promise.resolve(resultMap)
      }
    }
  }

  /**
   * Simple test method to verify JNI connection is working
   * @param promise Promise that resolves to a string message
   */
  @Suppress("unused")
  @ReactMethod
  fun testConnection(promise: Promise) {
    Log.d("EssentiaModule", "Entering testConnection method")
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
   * Uses a cache to avoid redundant native calls for improved performance.
   * @param algorithm Name of the Essentia algorithm to get information about
   * @param promise Promise that resolves to an object containing algorithm information
   */
  @Suppress("unused")
  @ReactMethod
  fun getAlgorithmInfo(algorithm: String, promise: Promise) {
    Log.d("EssentiaModule", "Entering getAlgorithmInfo for algorithm: $algorithm")
    ensureInitialized(promise) {
      // Validate inputs
      if (algorithm.isEmpty()) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm name cannot be empty")
        return@ensureInitialized
      }

      // Check if we have this algorithm in cache
      if (isCacheEnabled) {
        synchronized(algorithmInfoCache) {
          algorithmInfoCache[algorithm]?.let {
            Log.d("EssentiaModule", "Returning cached algorithm info for $algorithm")
            promise.resolve(it)
            return@ensureInitialized
          }
        }
      }

      // Cache miss, get the algorithm info from native code
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

      // Check if there was an error using our new helper
      if (handleErrorInResultMap(resultMap, promise)) {
        return@ensureInitialized
      }

      // Cache the result if caching is enabled
      if (isCacheEnabled) {
        synchronized(algorithmInfoCache) {
          algorithmInfoCache[algorithm] = resultMap
        }
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  /**
   * Gets a list of all available Essentia algorithms.
   * Uses a cache to avoid redundant native calls for improved performance.
   * @param promise Promise that resolves to an array of algorithm names
   */
  @Suppress("unused")
  @ReactMethod
  fun getAllAlgorithms(promise: Promise) {
    Log.d("EssentiaModule", "Entering getAllAlgorithms method")
    ensureInitialized(promise) {
      // Check if we have the algorithms list in cache
      if (isCacheEnabled) {
        allAlgorithmsCache?.let {
          synchronized(it) {
            allAlgorithmsCache?.let {
                Log.d("EssentiaModule", "Returning cached algorithm list")
                promise.resolve(it)
                return@ensureInitialized
            }
          }
        }
      }

      // Cache miss, get all algorithms from native code
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

      // Check if there was an error using our new helper
      if (handleErrorInResultMap(resultMap, promise)) {
        return@ensureInitialized
      }

      // Cache the result if caching is enabled
      if (isCacheEnabled) {
        allAlgorithmsCache?.let {
          synchronized(it) {
            allAlgorithmsCache = resultMap
          }
        }
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  /**
   * @deprecated Use executeBatch instead. This method is kept for backward compatibility.
   */
  @Suppress("unused")
  @ReactMethod
  fun extractFeatures(featureList: ReadableArray, promise: Promise) {
    Log.d("EssentiaModule", "extractFeatures is deprecated. Using executeBatch instead.")
    executeBatch(featureList, promise)
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
    Log.d("EssentiaModule", "Entering getVersion method")
    try {
      val version = getVersion()
      promise.resolve(version)
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error getting version: ${e.message}", e)
      promise.reject("ESSENTIA_VERSION_ERROR", "Failed to get Essentia version: ${e.message}")
    }
  }

  /**
   * Execute a batch of algorithms that can share intermediate results
   * @param algorithms Array of algorithm configurations
   * @param promise Promise that resolves to an object containing all algorithm outputs
   */
  @ReactMethod
  fun executeBatch(algorithms: ReadableArray, promise: Promise) {
    Log.d("EssentiaModule", "Entering executeBatch with algorithms size: ${algorithms.size()}")
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

      // Check if there was an error using our new helper
      if (handleErrorInResultMap(resultMap, promise)) {
        return@ensureInitialized
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  /**
   * Sets the number of threads in the executor thread pool
   * @param count The number of threads to use
   * @param promise Promise that resolves to a boolean indicating success
   */
  @Suppress("unused")
  @ReactMethod
  fun setThreadCount(count: Int, promise: Promise) {
    Log.d("EssentiaModule", "Entering setThreadCount with count: $count")
    try {
      if (count <= 0) {
        promise.reject("INVALID_THREAD_COUNT", "Thread count must be greater than 0")
        return
      }

      synchronized(lock) {
        // Only rebuild the thread pool if the count has changed
        if (count != threadCount) {
          Log.d("EssentiaModule", "Changing thread pool size from $threadCount to $count")

          // Shutdown existing executor (but don't interrupt running tasks)
          val oldExecutor = executor

          // Create new executor with the new thread count
          threadCount = count
          executor = Executors.newFixedThreadPool(threadCount)

          // Shutdown old executor after creating the new one
          oldExecutor.shutdown()
        }
      }

      promise.resolve(true)
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Failed to set thread count: ${e.message}", e)
      promise.reject("THREAD_COUNT_ERROR", "Failed to set thread count: ${e.message}")
    }
  }

  /**
   * Gets the current thread count
   * @param promise Promise that resolves to the current thread count
   */
  @Suppress("unused")
  @ReactMethod
  fun getThreadCount(promise: Promise) {
    Log.d("EssentiaModule", "Entering getThreadCount method")
    try {
      promise.resolve(threadCount)
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Failed to get thread count: ${e.message}", e)
      promise.reject("THREAD_COUNT_ERROR", "Failed to get thread count: ${e.message}")
    }
  }

  /**
   * Enables or disables the algorithm information cache
   * @param enabled True to enable caching, false to disable
   * @param promise Promise that resolves to a boolean indicating success
   */
  @Suppress("unused")
  @ReactMethod
  fun setCacheEnabled(enabled: Boolean, promise: Promise) {
    Log.d("EssentiaModule", "Entering setCacheEnabled with enabled: $enabled")
    try {
      synchronized(algorithmInfoCache) {
        isCacheEnabled = enabled
        if (!enabled) {
          // Clear caches if disabling
          clearCache()
        }
      }
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Failed to set cache enabled: ${e.message}", e)
      promise.reject("CACHE_ERROR", "Failed to set cache enabled: ${e.message}")
    }
  }

  /**
   * Checks if algorithm information caching is enabled
   * @param promise Promise that resolves to a boolean indicating if caching is enabled
   */
  @Suppress("unused")
  @ReactMethod
  fun isCacheEnabled(promise: Promise) {
    Log.d("EssentiaModule", "Entering isCacheEnabled method")
    try {
      promise.resolve(isCacheEnabled)
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Failed to get cache status: ${e.message}", e)
      promise.reject("CACHE_ERROR", "Failed to get cache status: ${e.message}")
    }
  }

  /**
   * Clears the algorithm information cache
   * @param promise Promise that resolves to a boolean indicating success
   */
  @Suppress("unused")
  @ReactMethod
  fun clearCache(promise: Promise) {
    Log.d("EssentiaModule", "Entering clearCache method")
    try {
      clearCache()
      promise.resolve(true)
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Failed to clear cache: ${e.message}", e)
      promise.reject("CACHE_ERROR", "Failed to clear cache: ${e.message}")
    }
  }

  /**
   * Internal method to clear the cache
   */
  private fun clearCache() {
    synchronized(algorithmInfoCache) {
      algorithmInfoCache.clear()
      allAlgorithmsCache = null
      Log.d("EssentiaModule", "Algorithm information cache cleared")
    }
  }

  /**
   * Computes a mel spectrogram directly from the loaded audio data
   * @param frameSize Size of each frame in samples
   * @param hopSize Hop size between frames in samples
   * @param nMels Number of mel bands
   * @param fMin Minimum frequency for mel bands
   * @param fMax Maximum frequency for mel bands
   * @param windowType Type of window to apply ("hann", "hamming", etc.)
   * @param normalize Whether to normalize the mel bands
   * @param logScale Whether to use log scale for the mel bands
   * @param promise Promise that resolves to the mel spectrogram result
   */
  @Suppress("unused")
  @ReactMethod
  fun computeMelSpectrogram(
    frameSize: Int,
    hopSize: Int,
    nMels: Int,
    fMin: Float,
    fMax: Float,
    windowType: String,
    normalize: Boolean,
    logScale: Boolean,
    promise: Promise
  ) {
    Log.d("EssentiaModule", "Entering computeMelSpectrogram with frameSize: $frameSize, hopSize: $hopSize, nMels: $nMels")
    ensureInitialized(promise) {
      // Validate inputs
      if (frameSize <= 0 || hopSize <= 0 || nMels <= 0) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Frame size, hop size, and nMels must be positive")
        return@ensureInitialized
      }

      if (fMin < 0 || fMax <= fMin) {
        promise.reject("ESSENTIA_INVALID_INPUT", "fMin must be non-negative and fMax must be greater than fMin")
        return@ensureInitialized
      }

      Log.d("EssentiaModule", "Computing mel spectrogram with frame size: $frameSize, hop size: $hopSize, nMels: $nMels")

      // Call the native method
      val resultJsonString: String
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        resultJsonString = nativeComputeMelSpectrogram(
          nativeHandle, frameSize, hopSize, nMels, fMin, fMax, windowType, normalize, logScale
        )
      }

      Log.d("EssentiaModule", "Mel spectrogram computation result: ${resultJsonString.take(100)}...")

      // Convert the JSON string to a WritableMap
      val resultMap = convertJsonToWritableMap(resultJsonString)

      // Check if there was an error using our helper
      if (handleErrorInResultMap(resultMap, promise)) {
        return@ensureInitialized
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  /**
   * Executes an audio processing pipeline with configurable preprocessing, feature extraction,
   * and post-processing steps.
   *
   * @param pipelineJson JSON string containing pipeline configuration with preprocessing steps,
   *                     feature extraction algorithms, and post-processing options
   * @param promise Promise that resolves to an object containing all extracted features
   */
  @Suppress("unused")
  @ReactMethod
  fun executePipeline(pipelineJson: String, promise: Promise) {
    Log.d("EssentiaModule", "Entering executePipeline with pipelineJson length: ${pipelineJson.length}")
    ensureInitialized(promise) {
      // Validate the pipeline JSON is not empty
      if (pipelineJson.isEmpty()) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Pipeline configuration cannot be empty")
        return@ensureInitialized
      }

      Log.d("EssentiaModule", "Executing pipeline with configuration: ${pipelineJson.take(200)}...")

      // Call the native method
      val resultJsonString: String
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        resultJsonString = nativeExecutePipeline(nativeHandle, pipelineJson)
      }

      Log.d("EssentiaModule", "Pipeline execution result: ${resultJsonString.take(100)}...")

      // Convert the JSON string to a WritableMap
      val resultMap = convertJsonToWritableMap(resultJsonString)

      // Check if there was an error using our helper
      if (handleErrorInResultMap(resultMap, promise)) {
        return@ensureInitialized
      }

      // Resolve the promise with the properly structured map
      promise.resolve(resultMap)
    }
  }

  /**
   * Computes the spectrum with specified frame size and hop size.
   * This ensures spectrum has appropriate size for subsequent algorithms.
   * @param frameSize Size of each frame in samples (should be power of 2 for efficient FFT)
   * @param hopSize Hop size between frames in samples
   * @param promise Promise that resolves to a boolean indicating success
   */
  @Suppress("unused")
  @ReactMethod
  fun computeSpectrum(frameSize: Int, hopSize: Int, promise: Promise) {
    Log.d("EssentiaModule", "Entering computeSpectrum with frameSize: $frameSize, hopSize: $hopSize")
    ensureInitialized(promise) {
      // Validate inputs
      if (frameSize <= 0 || hopSize <= 0) {
        promise.reject("ESSENTIA_INVALID_INPUT", "Frame size and hop size must be positive")
        return@ensureInitialized
      }

      Log.d("EssentiaModule", "Computing spectrum with frame size: $frameSize, hop size: $hopSize")

      // Call the native method
      val result: Boolean
      synchronized(lock) {
        if (nativeHandle == 0L) {
          promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
          return@ensureInitialized
        }
        result = nativeComputeSpectrum(nativeHandle, frameSize, hopSize)
      }

      Log.d("EssentiaModule", "Spectrum computation result: $result")
      promise.resolve(result)
    }
  }

  /**
   * Computes the Tonnetz transformation from HPCP data without requiring audio data
   * @param hpcp An array of HPCP values (must be a 12-element array representing the chromagram)
   * @param promise Promise that resolves to the Tonnetz result
   */
  @Suppress("unused")
  @ReactMethod
  fun computeTonnetz(hpcp: ReadableArray, promise: Promise) {
    Log.d("EssentiaModule", "Entering computeTonnetz with HPCP vector of length: ${hpcp.size()}")
    ensureInitialized(promise) {
      try {
        // Validate HPCP array
        if (hpcp.size() != 12) {
          promise.reject("INVALID_INPUT", "HPCP vector must contain exactly 12 values (one per semitone)")
          return@ensureInitialized
        }

        // Convert HPCP to JSON array string
        val hpcpJsonArray = JSONArray()
        for (i in 0 until hpcp.size()) {
          hpcpJsonArray.put(hpcp.getDouble(i))
        }

        // Call the native method
        val resultJsonString: String
        synchronized(lock) {
          if (nativeHandle == 0L) {
            promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
            return@ensureInitialized
          }
          resultJsonString = nativeComputeTonnetz(nativeHandle, hpcpJsonArray.toString())
        }

        Log.d("EssentiaModule", "Tonnetz computation result: $resultJsonString")

        // Convert the JSON string to a WritableMap
        val resultMap = convertJsonToWritableMap(resultJsonString)

        // Check if there was an error using our helper
        if (handleErrorInResultMap(resultMap, promise)) {
          return@ensureInitialized
        }

        // Resolve the promise with the properly structured map
        promise.resolve(resultMap)
      } catch (e: Exception) {
        Log.e("EssentiaModule", "Error computing Tonnetz: ${e.message}", e)
        promise.reject("TONNETZ_ERROR", "Failed to compute Tonnetz transformation: ${e.message}")
      }
    }
  }

  override fun invalidate() {
    // Clear caches when module is invalidated
    clearCache()

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
