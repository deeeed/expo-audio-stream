package com.k2fsa.sherpa.onnx

import android.util.Log

/**
 * Stream for handling online audio data
 */
class OnlineStream(var ptr: Long) {
    private val TAG = "OnlineStream"

    init {
        if (ptr == 0L) {
            Log.e(TAG, "Invalid stream pointer")
        }
    }

    fun acceptWaveform(sampleRate: Int, waveform: FloatArray): Boolean =
        acceptWaveform(ptr, sampleRate, waveform)

    fun inputFinished() = inputFinished(ptr)

    protected fun finalize() {
        if (ptr != 0L) {
            delete(ptr)
            ptr = 0
        }
    }

    fun release() = finalize()

    fun use(block: (OnlineStream) -> Unit) {
        try {
            block(this)
        } finally {
            release()
        }
    }

    private external fun acceptWaveform(ptr: Long, sampleRate: Int, waveform: FloatArray): Boolean
    private external fun inputFinished(ptr: Long)
    private external fun delete(ptr: Long)

    companion object {
        init {
            System.loadLibrary("sherpa-onnx-jni")
        }
    }
} 