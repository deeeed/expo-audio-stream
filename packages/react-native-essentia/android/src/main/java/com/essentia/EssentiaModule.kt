package com.essentia

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class EssentiaModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

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

  // Wrapper methods to expose to JavaScript
  @ReactMethod
  fun initialize(promise: Promise) {
    try {
      val result = initializeEssentia()
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("ESSENTIA_INIT_ERROR", "Failed to initialize Essentia: ${e.message}")
    }
  }

  @ReactMethod
  fun getVersion(promise: Promise) {
    try {
      val version = getEssentiaVersion()
      promise.resolve(version)
    } catch (e: Exception) {
      promise.reject("ESSENTIA_VERSION_ERROR", "Failed to get Essentia version: ${e.message}")
    }
  }
}
