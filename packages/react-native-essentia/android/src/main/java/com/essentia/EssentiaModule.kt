package com.essentia

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import java.util.concurrent.Executors
import java.util.concurrent.ExecutorService

class EssentiaModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val executor: ExecutorService = Executors.newSingleThreadExecutor()
  private var isInitialized: Boolean = false
  private var currentAudioBuffer: String? = null
  private var lastResults: WritableMap? = null

  override fun getName(): String {
    return NAME
  }

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  @ReactMethod
  fun multiply(a: Double, b: Double, promise: Promise) {
    promise.resolve(a * b)
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
  private external fun getEssentiaVersion(): String
  private external fun executeEssentiaAlgorithm(category: String, algorithm: String, paramsJson: String): String
  private external fun loadAudioFile(path: String, sampleRate: Double): Boolean
  private external fun unloadAudioFile(): Boolean
  private external fun processAudioFrames(frameSize: Int, hopSize: Int): Boolean

  // Wrapper methods to expose to JavaScript
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

  @ReactMethod
  fun getVersion(promise: Promise) {
    try {
      executor.execute {
        val version = getEssentiaVersion()
        promise.resolve(version)
      }
    } catch (e: Exception) {
      promise.reject("ESSENTIA_VERSION_ERROR", "Failed to get Essentia version: ${e.message}")
    }
  }

  @ReactMethod
  fun executeAlgorithm(category: String, algorithm: String, params: ReadableMap, promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        // Convert params to JSON string
        val paramsJson = params.toString()
        val result = executeEssentiaAlgorithm(category, algorithm, paramsJson)

        // Convert result string back to a map and resolve
        val resultMap = parseJsonToMap(result)
        lastResults = resultMap
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      promise.reject("ESSENTIA_ALGORITHM_ERROR", "Failed to execute algorithm: ${e.message}")
    }
  }

  @ReactMethod
  fun loadAudio(audioPath: String, sampleRate: Double, promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        // Handle file:// prefix here
        val normalizedPath = if (audioPath.startsWith("file://")) {
          audioPath.substring(7)  // Remove the 'file://' prefix
        } else {
          audioPath
        }

        // Log the path transformation for debugging
        println("Original path: $audioPath")
        println("Normalized path: $normalizedPath")

        val result = loadAudioFile(normalizedPath, sampleRate)
        if (result) {
          currentAudioBuffer = audioPath
        }
        promise.resolve(result)
      }
    } catch (e: Exception) {
      promise.reject("ESSENTIA_AUDIO_LOAD_ERROR", "Failed to load audio: ${e.message}")
    }
  }

  @ReactMethod
  fun unloadAudio(promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        val result = unloadAudioFile()
        if (result) {
          currentAudioBuffer = null
        }
        promise.resolve(result)
      }
    } catch (e: Exception) {
      promise.reject("ESSENTIA_AUDIO_UNLOAD_ERROR", "Failed to unload audio: ${e.message}")
    }
  }

  @ReactMethod
  fun processAudio(frameSize: Int, hopSize: Int, promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    if (currentAudioBuffer == null) {
      promise.reject("ESSENTIA_NO_AUDIO", "No audio loaded. Call loadAudio() first.")
      return
    }

    try {
      executor.execute {
        val result = processAudioFrames(frameSize, hopSize)
        promise.resolve(result)
      }
    } catch (e: Exception) {
      promise.reject("ESSENTIA_AUDIO_PROCESS_ERROR", "Failed to process audio: ${e.message}")
    }
  }

  @ReactMethod
  fun getResults(promise: Promise) {
    if (lastResults == null) {
      promise.resolve(Arguments.createMap())
      return
    }

    promise.resolve(lastResults)
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
