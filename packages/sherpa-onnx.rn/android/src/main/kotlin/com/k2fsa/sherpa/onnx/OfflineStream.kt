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

    fun acceptWaveform(samples: FloatArray, sampleRate: Int): Boolean {
        return acceptWaveform(ptr, samples, sampleRate)
    }

    companion object {
        // Native methods
        @JvmStatic external fun delete(ptr: Long)
        @JvmStatic external fun acceptWaveform(ptr: Long, samples: FloatArray, sampleRate: Int): Boolean
    }
} 