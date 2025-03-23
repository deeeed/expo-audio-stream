/**
 * SherpaOnnxModule - React Native module for sherpa-onnx
 * Supports both old architecture and New Architecture
 */
package net.siteed.sherpaonnx

import android.util.Log
import com.facebook.react.bridge.*

class SherpaOnnxModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SherpaOnnxModule"
        private var isLibraryLoaded = false
        
        init {
            try {
                System.loadLibrary("sherpa-onnx-jni")
                Log.i(TAG, "Loaded sherpa-onnx-jni library successfully")
                isLibraryLoaded = true
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load sherpa-onnx-jni: ${e.message}")
                isLibraryLoaded = false
            }
        }
    }

    override fun getName(): String = "SherpaOnnx"
    
    @ReactMethod
    fun validateLibraryLoaded(promise: Promise) {
        val resultMap = Arguments.createMap()
        resultMap.putBoolean("loaded", isLibraryLoaded)
        
        if (isLibraryLoaded) {
            resultMap.putString("status", "Sherpa ONNX JNI library loaded successfully")
        } else {
            resultMap.putString("status", "Failed to load Sherpa ONNX JNI library")
        }
        
        promise.resolve(resultMap)
    }
} 