package com.k2fsa.sherpa.onnx

/**
 * Result class for offline recognition
 */
class OfflineRecognizeResult(
    val text: String,
    val tokens: List<String>,
    val timestamps: List<Float>
)

/**
 * Class for Offline STT Recognition
 */
class OfflineRecognizer(private val config: OfflineRecognizerConfig) {
    private var ptr: Long = 0

    init {
        ptr = createOfflineRecognizer(config)
    }

    fun createStream(): OfflineStream {
        val streamPtr = createStream(ptr)
        return OfflineStream(streamPtr)
    }

    fun decode(stream: OfflineStream): OfflineRecognizeResult {
        return decode(ptr, stream.ptr)
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

    private external fun createOfflineRecognizer(config: OfflineRecognizerConfig): Long
    private external fun createStream(ptr: Long): Long
    private external fun decode(ptr: Long, streamPtr: Long): OfflineRecognizeResult
    private external fun delete(ptr: Long)

    companion object {
        init {
            System.loadLibrary("sherpa-onnx-jni")
        }
    }
} 