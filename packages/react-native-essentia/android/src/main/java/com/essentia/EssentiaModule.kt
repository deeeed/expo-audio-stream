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
  private external fun listAvailableAlgorithms(): String
  private external fun executeEssentiaAlgorithm(category: String, algorithm: String, paramsJson: String): String
  private external fun loadAudioFile(path: String, sampleRate: Double): Boolean
  private external fun unloadAudioFile(): Boolean
  private external fun processAudioFrames(frameSize: Int, hopSize: Int): Boolean
  private external fun setAudioData(pcmData: FloatArray, sampleRate: Double): Boolean
  private external fun nativeClearAudioBuffer()
  private external fun nativeSetAudioDataChunk(chunk: DoubleArray, startIdx: Int, totalSize: Int, sampleRate: Double): Boolean
  private external fun testMFCC(): String
  private external fun testFFmpegIntegration(): String
  private external fun extractFeatures(nMfcc: Int, nFft: Int, hopLength: Int, winLength: Int,
                                      window: String, nChroma: Int, nMels: Int, nBands: Int, fmin: Double): String

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
  fun setAudioData(pcmArray: ReadableArray, sampleRate: Double, promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        // Log start of processing
        Log.d("EssentiaModule", "Starting to process PCM data: ${pcmArray.size()} samples at ${sampleRate}Hz")

        // Process the array more efficiently to avoid stack overflow
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
          currentAudioBuffer = "PCM_DATA" // Indicate PCM data is loaded
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

  // Add simple test method that doesn't depend on audio loading
  @ReactMethod
  fun testMFCC(promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        Log.d("EssentiaModule", "Running MFCC test with dummy data")

        // Call the native implementation that runs MFCC with dummy data
        val result = testMFCC()

        // Create a result map
        val resultMap = parseJsonToMap(result)

        Log.d("EssentiaModule", "MFCC test result: $result")
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error in testMFCC: ${e.message}", e)
      promise.reject("ESSENTIA_TEST_ERROR", "Failed to run MFCC test: ${e.message}")
    }
  }

  // Add FFmpeg integration test method
  @ReactMethod
  fun testFFmpegIntegration(promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        Log.d("EssentiaModule", "Testing FFmpeg integration")

        // Call the native implementation
        val result = testFFmpegIntegration()

        // Create a result map
        val resultMap = parseJsonToMap(result)

        Log.d("EssentiaModule", "FFmpeg integration test result: $result")
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error in testFFmpegIntegration: ${e.message}", e)
      promise.reject("ESSENTIA_FFMPEG_TEST_ERROR", "Failed to test FFmpeg integration: ${e.message}")
    }
  }

  // Add method to list available algorithms
  @ReactMethod
  fun listAlgorithms(promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        Log.d("EssentiaModule", "Listing available algorithms")

        // Call the native implementation
        val result = listAvailableAlgorithms()

        // Create a result map
        val resultMap = parseJsonToMap(result)

        Log.d("EssentiaModule", "Available algorithms result: $result")
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error listing algorithms: ${e.message}", e)
      promise.reject("ESSENTIA_LIST_ALGORITHMS_ERROR", "Failed to list algorithms: ${e.message}")
    }
  }

  @ReactMethod
  fun extractAudioFeatures(nMfcc: Int, nFft: Int, hopLength: Int, winLength: Int,
                          window: String, nChroma: Int, nMels: Int, nBands: Int, fmin: Double, promise: Promise) {
    if (!isInitialized) {
      promise.reject("ESSENTIA_NOT_INITIALIZED", "Essentia is not initialized. Call initialize() first.")
      return
    }

    try {
      executor.execute {
        Log.d("EssentiaModule", "Extracting audio features with parameters: nMfcc=$nMfcc, nFft=$nFft, hopLength=$hopLength, winLength=$winLength, window=$window, nChroma=$nChroma, nMels=$nMels, nBands=$nBands, fmin=$fmin")

        // Call the native implementation
        val result = extractFeatures(nMfcc, nFft, hopLength, winLength, window, nChroma, nMels, nBands, fmin)

        // Create a result map
        val resultMap = parseJsonToMap(result)

        Log.d("EssentiaModule", "Feature extraction result: $result")
        promise.resolve(resultMap)
      }
    } catch (e: Exception) {
      Log.e("EssentiaModule", "Error in extractAudioFeatures: ${e.message}", e)
      promise.reject("ESSENTIA_FEATURE_EXTRACTION_ERROR", "Failed to extract audio features: ${e.message}")
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
