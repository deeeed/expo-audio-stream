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

class EssentiaModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor: ExecutorService = Executors.newSingleThreadExecutor()
  private var nativeHandle: Long = 0
  private val lock = Object()

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

  /**
   * Initializes the Essentia library, preparing it for use.
   * @param promise Promise that resolves to a boolean indicating success or failure
   */
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
  @ReactMethod
  fun setAudioData(pcmArray: ReadableArray, sampleRate: Double, promise: Promise) {
    synchronized(lock) {
      if (nativeHandle == 0L) {
        promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
        return
      }
    }

    try {
      executor.execute {
        // Log start of processing
        Log.d("EssentiaModule", "Starting to process PCM data: ${pcmArray.size()} samples at ${sampleRate}Hz")

        // Validate inputs
        if (pcmArray.size() == 0) {
          promise.reject("ESSENTIA_INVALID_INPUT", "PCM data array is empty")
          return@execute
        }

        if (sampleRate <= 0) {
          promise.reject("ESSENTIA_INVALID_INPUT", "Sample rate must be positive")
          return@execute
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
            val end = Math.min(i + chunkSize, arraySize)
            Log.d("EssentiaModule", "Processing chunk $i to $end (size: ${end - i})")

            for (j in i until end) {
              // Type safety check
              if (pcmArray.getType(j) != ReadableType.Number) {
                promise.reject("ESSENTIA_TYPE_ERROR",
                  "Invalid data type at index $j. Expected number, got ${pcmArray.getType(j)}")
                return@execute
              }
              pcmFloatArray[j] = pcmArray.getDouble(j).toFloat()
            }
            i = end
          }
        } catch (e: Exception) {
          Log.e("EssentiaModule", "Error converting PCM data: ${e.message}", e)
          promise.reject("ESSENTIA_CONVERSION_ERROR", "Failed to convert PCM data: ${e.message}")
          return@execute
        }

        Log.d("EssentiaModule", "Successfully converted all PCM data, now sending to native code")

        val result: Boolean
        synchronized(lock) {
          if (nativeHandle == 0L) {
            promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
            return@execute
          }
          result = nativeSetAudioData(nativeHandle, pcmFloatArray, sampleRate)
        }

        if (result) {
          Log.d("EssentiaModule", "Successfully set PCM audio data in native layer")
        } else {
          Log.e("EssentiaModule", "Failed to set PCM audio data in native layer")
        }
        promise.resolve(result)
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error in setAudioData: ${e.message}", e)
      promise.reject("ESSENTIA_SET_AUDIO_ERROR", "Failed to set audio data: ${e.message}")
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
      val value = jsonObject.get(key)

      when (value) {
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
      val value = jsonArray.get(i)

      when (value) {
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
  @ReactMethod
  fun executeAlgorithm(algorithm: String, params: ReadableMap, promise: Promise) {
    synchronized(lock) {
      if (nativeHandle == 0L) {
        promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
        return
      }
    }

    try {
      executor.execute {
        // Validate inputs
        if (algorithm.isEmpty()) {
          promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm name cannot be empty")
          return@execute
        }

        // Convert params to JSON string
        val paramsJson = params.toString()

        // Execute the algorithm and get the JSON result
        val resultJsonString: String
        synchronized(lock) {
          if (nativeHandle == 0L) {
            promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
            return@execute
          }
          resultJsonString = nativeExecuteAlgorithm(nativeHandle, algorithm, paramsJson)
        }

        Log.d("EssentiaModule", "Raw result from C++: $resultJsonString")

        // Convert the JSON string to a WritableMap
        val resultMap = convertJsonToWritableMap(resultJsonString)

        // Check if there was an error
        if (resultMap.hasKey("success") && !resultMap.getBoolean("success")) {
          if (resultMap.hasKey("error")) {
            val errorMap = resultMap.getMap("error")
            if (errorMap != null && errorMap.hasKey("code") && errorMap.hasKey("message")) {
              promise.reject(
                errorMap.getString("code") ?: "UNKNOWN_ERROR",
                errorMap.getString("message") ?: "Unknown error occurred"
              )
              return@execute
            }
          }
          // Fallback if error structure is not as expected
          promise.reject("ESSENTIA_ALGORITHM_ERROR", "Algorithm execution failed")
          return@execute
        }

        // Resolve the promise with the properly structured map
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error executing algorithm: ${e.message}", e)
      promise.reject("ESSENTIA_ALGORITHM_ERROR", "Failed to execute algorithm: ${e.message}")
    }
  }

  /**
   * Simple test method to verify JNI connection is working
   * @param promise Promise that resolves to a string message
   */
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
  @ReactMethod
  fun getAlgorithmInfo(algorithm: String, promise: Promise) {
    synchronized(lock) {
      if (nativeHandle == 0L) {
        promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
        return
      }
    }

    try {
      executor.execute {
        // Validate inputs
        if (algorithm.isEmpty()) {
          promise.reject("ESSENTIA_INVALID_INPUT", "Algorithm name cannot be empty")
          return@execute
        }

        // Get the algorithm info
        val resultJsonString: String
        synchronized(lock) {
          if (nativeHandle == 0L) {
            promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia was destroyed during processing")
            return@execute
          }
          resultJsonString = nativeGetAlgorithmInfo(nativeHandle, algorithm)
        }

        Log.d("EssentiaModule", "Algorithm info from C++ for $algorithm: $resultJsonString")

        // Convert the JSON string to a WritableMap
        val resultMap = convertJsonToWritableMap(resultJsonString)

        // Check if there was an error
        if (resultMap.hasKey("success") && !resultMap.getBoolean("success")) {
          if (resultMap.hasKey("error")) {
            val errorMap = resultMap.getMap("error")
            if (errorMap != null && errorMap.hasKey("code") && errorMap.hasKey("message")) {
              promise.reject(
                errorMap.getString("code") ?: "UNKNOWN_ERROR",
                errorMap.getString("message") ?: "Unknown error occurred"
              )
              return@execute
            }
          }
          // Fallback if error structure is not as expected
          promise.reject("ESSENTIA_ALGORITHM_ERROR", "Algorithm info request failed")
          return@execute
        }

        // Resolve the promise with the properly structured map
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error getting algorithm info: ${e.message}", e)
      promise.reject("ESSENTIA_ALGORITHM_ERROR", "Failed to get algorithm info: ${e.message}")
    }
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()

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
  }
}
