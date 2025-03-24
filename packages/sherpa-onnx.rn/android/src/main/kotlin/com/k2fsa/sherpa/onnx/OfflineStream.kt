package com.k2fsa.sherpa.onnx

import android.util.Log

/**
 * Represents an audio stream for processing by Sherpa ONNX
 */
class OfflineStream(
    val ptr: Long
) {
    private val TAG = "OfflineStream"

    init {
        if (ptr == 0L) {
            Log.e(TAG, "Invalid stream pointer")
        }
    }

    protected fun finalize() {
        if (ptr != 0L) {
            delete(ptr)
        }
    }

    fun release() = finalize()

    fun acceptWaveform(sampleRate: Int, samples: FloatArray): Boolean {
        return acceptWaveform(ptr, sampleRate, samples)
    }

    fun inputFinished() {
        inputFinished(ptr)
    }

    companion object {
        // Native methods
        @JvmStatic external fun delete(ptr: Long)
        @JvmStatic external fun acceptWaveform(ptr: Long, sampleRate: Int, samples: FloatArray): Boolean
        @JvmStatic external fun inputFinished(ptr: Long)
    }
} 