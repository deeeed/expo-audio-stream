package com.essentia

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.util.concurrent.Executors
import java.util.concurrent.ExecutorService
import android.util.Log

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
        val result = executeEssentiaAlgorithm(algorithm, paramsJson)

        // Convert result string back to a map and resolve
        val resultMap = parseJsonToMap(result)
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      promise.reject("ESSENTIA_ALGORITHM_ERROR", "Failed to execute algorithm: ${e.message}")
    }
  }

  // Helper function to parse JSON to WritableMap
  private fun parseJsonToMap(jsonStr: String): WritableMap {
    // This is a placeholder - implement actual JSON parsing
    // For a real implementation, use a JSON library like Gson or Moshi
    val map = Arguments.createMap()
    map.putString("result", jsonStr)
    return map
  }

  override fun onCatalystInstanceDestroy() {
    super.onCatalystInstanceDestroy()
    executor.shutdown()
  }
}
