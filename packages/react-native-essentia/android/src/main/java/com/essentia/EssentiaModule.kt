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

class EssentiaModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor: ExecutorService = Executors.newSingleThreadExecutor()
  private var isInitialized: Boolean = false

  override fun getName(): String {
    return NAME
  }

  // Load the native library
  companion object {
    const val NAME = "Essentia"

    init {
      System.loadLibrary("react-native-essentia")
    }
  }

  // Native methods that will be implemented in C++
  private external fun initializeEssentia(): Boolean
  private external fun executeEssentiaAlgorithm(algorithm: String, paramsJson: String): String
  private external fun setAudioData(pcmData: FloatArray, sampleRate: Double): Boolean

  /**
   * Initializes the Essentia library, preparing it for use.
   * @param promise Promise that resolves to a boolean indicating success or failure
   */
  @ReactMethod
  fun initialize(promise: Promise) {
    try {
      executor.execute {
        val result = initializeEssentia()
        isInitialized = result
        promise.resolve(result)
      }
    } catch (e: Exception) {
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
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        // Log start of processing
        Log.d("EssentiaModule", "Starting to process PCM data: ${pcmArray.size()} samples at ${sampleRate}Hz")

        // Convert ReadableArray to FloatArray in chunks
        val arraySize = pcmArray.size()
        val pcmFloatArray = FloatArray(arraySize)

        // Use a reasonable chunk size to avoid stack issues
        val chunkSize = 1000
        var i = 0

        Log.d("EssentiaModule", "Converting PCM data in chunks of $chunkSize (total: $arraySize samples)")

        while (i < arraySize) {
          val end = Math.min(i + chunkSize, arraySize)
          Log.d("EssentiaModule", "Processing chunk $i to $end (size: ${end - i})")

          for (j in i until end) {
            pcmFloatArray[j] = pcmArray.getDouble(j).toFloat()
          }
          i = end
        }

        Log.d("EssentiaModule", "Successfully converted all PCM data, now sending to native code")

        val result = setAudioData(pcmFloatArray, sampleRate)
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
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        // Convert params to JSON string
        val paramsJson = params.toString()

        // Execute the algorithm and get the JSON result
        val resultJsonString = executeEssentiaAlgorithm(algorithm, paramsJson)
        Log.d("EssentiaModule", "Raw result from C++: $resultJsonString")

        // Convert the JSON string to a WritableMap
        val resultMap = convertJsonToWritableMap(resultJsonString)

        // Resolve the promise with the properly structured map
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error executing algorithm: ${e.message}", e)
      promise.reject("ESSENTIA_ALGORITHM_ERROR", "Failed to execute algorithm: ${e.message}")
    }
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    executor.shutdown()
  }
}
