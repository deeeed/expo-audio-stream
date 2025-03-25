package com.k2fsa.sherpa.onnx

import android.util.Log

/**
 * Stream for handling audio data
 */
class OfflineStream(var ptr: Long) {
    private val TAG = "OfflineStream"

    init {
        if (ptr == 0L) {
            Log.e(TAG, "Invalid stream pointer")
        }
    }

    fun acceptWaveform(samples: FloatArray, sampleRate: Int) =
        acceptWaveform(ptr, samples, sampleRate)

    protected fun finalize() {
        if (ptr != 0L) {
            delete(ptr)
            ptr = 0
        }
    }

    fun release() = finalize()

    fun use(block: (OfflineStream) -> Unit) {
        try {
            block(this)
        } finally {
            release()
        }
    }

    companion object {
        // Native methods
        @JvmStatic external fun delete(ptr: Long)
        @JvmStatic external fun acceptWaveform(ptr: Long, samples: FloatArray, sampleRate: Int): Boolean

        init {
            System.loadLibrary("sherpa-onnx-jni")
        }
    }
} 