package com.k2fsa.sherpa.onnx

import android.content.res.AssetManager
import kotlin.collections.List
import kotlin.String
import kotlin.Float
import kotlin.Long
import kotlin.Unit
import kotlin.Boolean
import kotlin.Int
import kotlin.collections.ArrayList

/**
 * Result class for offline recognition
 */
data class OfflineRecognizeResult(
    val text: String,
    val tokens: List<String>,
    val timestamps: List<Float>
)

/**
 * Class for Offline STT Recognition
 */
class OfflineRecognizer(
    private val assetManager: AssetManager? = null,
    private val config: OfflineRecognizerConfig
) {
    private var ptr: Long = 0

    init {
        ptr = if (assetManager != null) {
            newFromAsset(assetManager, config)
        } else {
            newFromFile(config)
        }
    }

    fun createStream(): OfflineStream {
        val streamPtr = createStream(ptr)
        return OfflineStream(streamPtr)
    }

    fun decode(stream: OfflineStream): OfflineRecognizeResult {
        val objArray = decode(ptr, stream.ptr)
        val text = objArray[0] as String
        val tokens = (objArray[1] as Array<String>).toList()
        val timestamps = (objArray[2] as FloatArray).toList()
        
        return OfflineRecognizeResult(
            text = text,
            tokens = tokens,
            timestamps = timestamps
        )
    }

    fun release() {
        if (ptr != 0L) {
            delete(ptr)
            ptr = 0
        }
    }

    protected fun finalize() {
        release()
    }

    private external fun delete(ptr: Long)
    private external fun newFromAsset(assetManager: AssetManager, config: OfflineRecognizerConfig): Long
    private external fun newFromFile(config: OfflineRecognizerConfig): Long
    private external fun createStream(ptr: Long): Long
    private external fun decode(ptr: Long, streamPtr: Long): Array<Any>

    companion object {
        init {
            System.loadLibrary("sherpa-onnx-jni")
        }
    }
} 