// Copyright (c)  2023  Xiaomi Corporation
package com.k2fsa.sherpa.onnx

import android.content.res.AssetManager
import android.util.Log

data class SileroVadModelConfig(
    var model: String = "",
    var threshold: Float = 0.5F,
    var minSilenceDuration: Float = 0.25F,
    var minSpeechDuration: Float = 0.25F,
    var windowSize: Int = 512,
    var maxSpeechDuration: Float = 5.0F,
)

data class VadModelConfig(
    var sileroVadModelConfig: SileroVadModelConfig = SileroVadModelConfig(),
    var sampleRate: Int = 16000,
    var numThreads: Int = 1,
    var provider: String = "cpu",
    var debug: Boolean = false,
)

class SpeechSegment(val start: Int, val samples: FloatArray)

/**
 * Bridge class for VAD (Voice Activity Detection) JNI access
 */
class Vad(
    assetManager: AssetManager? = null,
    var config: VadModelConfig,
) {
    private var ptr: Long = 0
    
    companion object {
        private const val TAG = "VadBridge"
        
        init {
            try {
                System.loadLibrary("sherpa-onnx-jni")
                Log.i(TAG, "Successfully loaded sherpa-onnx-jni library in VAD bridge")
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load sherpa-onnx-jni library: ${e.message}")
                e.printStackTrace()
            }
        }

        @JvmStatic external fun delete(ptr: Long)
        
        @JvmStatic external fun newFromAsset(
            assetManager: AssetManager,
            config: VadModelConfig
        ): Long

        @JvmStatic external fun newFromFile(
            config: VadModelConfig
        ): Long
        
        @JvmStatic external fun acceptWaveform(ptr: Long, samples: FloatArray)
        @JvmStatic external fun empty(ptr: Long): Boolean
        @JvmStatic external fun pop(ptr: Long)
        @JvmStatic external fun clear(ptr: Long)
        @JvmStatic external fun front(ptr: Long): Array<Any>
        @JvmStatic external fun isSpeechDetected(ptr: Long): Boolean
        @JvmStatic external fun reset(ptr: Long)
        @JvmStatic external fun flush(ptr: Long)
    }

    init {
        try {
            ptr = if (assetManager != null) {
                Vad.newFromAsset(assetManager, config)
            } else {
                Vad.newFromFile(config)
            }
            Log.i(TAG, "VAD initialized with ptr: $ptr")
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing VAD: ${e.message}")
            ptr = 0
            throw e
        }
    }

    protected fun finalize() {
        if (ptr != 0L) {
            Vad.delete(ptr)
            ptr = 0
        }
    }

    fun release() = finalize()

    fun acceptWaveform(samples: FloatArray) = Vad.acceptWaveform(ptr, samples)
    fun empty(): Boolean = Vad.empty(ptr)
    fun pop() = Vad.pop(ptr)

    fun front(): SpeechSegment {
        val segment = Vad.front(ptr)
        return SpeechSegment(segment[0] as Int, segment[1] as FloatArray)
    }

    fun clear() = Vad.clear(ptr)
    fun isSpeechDetected(): Boolean = Vad.isSpeechDetected(ptr)
    fun reset() = Vad.reset(ptr)
    fun flush() = Vad.flush(ptr)
}

// Helper function to get default VAD model configuration
fun getVadModelConfig(type: Int): VadModelConfig? {
    when (type) {
        0 -> {
            return VadModelConfig(
                sileroVadModelConfig = SileroVadModelConfig(
                    model = "silero_vad.onnx",
                    threshold = 0.5F,
                    minSilenceDuration = 0.25F,
                    minSpeechDuration = 0.25F,
                    windowSize = 512,
                ),
                sampleRate = 16000,
                numThreads = 1,
                provider = "cpu",
            )
        }
    }
    return null
} 