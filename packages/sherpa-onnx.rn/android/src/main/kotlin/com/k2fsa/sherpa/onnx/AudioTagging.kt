/**
 * JNI Bridge for sherpa-onnx native library - AudioTagging functionality
 * This class exists solely to match the JNI method signatures expected by the native library.
 */
package com.k2fsa.sherpa.onnx

import android.content.res.AssetManager
import android.util.Log

/**
 * Zipformer model configuration for audio tagging
 */
data class OfflineZipformerAudioTaggingModelConfig(
    var model: String = "",
)

/**
 * Audio tagging model configuration
 */
data class AudioTaggingModelConfig(
    var zipformer: OfflineZipformerAudioTaggingModelConfig = OfflineZipformerAudioTaggingModelConfig(),
    var ced: String = "",
    var numThreads: Int = 1,
    var debug: Boolean = false,
    var provider: String = "cpu",
)

/**
 * Complete audio tagging configuration
 */
data class AudioTaggingConfig(
    var model: AudioTaggingModelConfig = AudioTaggingModelConfig(),
    var labels: String = "",
    var topK: Int = 3,
)

/**
 * Represents a detected audio event
 */
data class AudioEvent(
    val name: String,
    val index: Int,
    val prob: Float,
)

/**
 * Bridge class for JNI access to audio tagging functionality
 */
class AudioTagging(
    assetManager: AssetManager? = null,
    config: AudioTaggingConfig,
) {
    private val TAG = "AudioTagging"
    private var ptr: Long = 0

    init {
        try {
            ptr = if (assetManager != null) {
                newFromAsset(assetManager, config)
            } else {
                newFromFile(config)
            }
            
            if (ptr == 0L) {
                Log.e(TAG, "Failed to initialize AudioTagging (null pointer)")
            } else {
                Log.i(TAG, "AudioTagging initialized successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing AudioTagging: ${e.message}")
            throw e
        }
    }

    protected fun finalize() {
        if (ptr != 0L) {
            try {
                delete(ptr)
                ptr = 0
            } catch (e: Exception) {
                Log.e(TAG, "Error releasing AudioTagging in finalize: ${e.message}")
            }
        }
    }

    fun release() = finalize()

    fun createStream(): OfflineStream {
        val p = createStream(ptr)
        return OfflineStream(p)
    }

    @Suppress("UNCHECKED_CAST")
    fun compute(stream: OfflineStream, topK: Int = -1): ArrayList<AudioEvent> {
        val events: Array<Any> = compute(ptr, stream.ptr, topK)
        val ans = ArrayList<AudioEvent>()

        for (e in events) {
            val p: Array<Any> = e as Array<Any>
            ans.add(
                AudioEvent(
                    name = p[0] as String,
                    index = p[1] as Int,
                    prob = p[2] as Float,
                )
            )
        }

        return ans
    }

    companion object {
        init {
            try {
                System.loadLibrary("sherpa-onnx-jni")
                Log.i("AudioTagging", "Successfully loaded sherpa-onnx-jni library")
            } catch (e: UnsatisfiedLinkError) {
                Log.e("AudioTagging", "Failed to load sherpa-onnx-jni library: ${e.message}")
            }
        }
        
        @JvmStatic external fun newFromAsset(
            assetManager: AssetManager,
            config: AudioTaggingConfig
        ): Long

        @JvmStatic external fun newFromFile(
            config: AudioTaggingConfig
        ): Long

        @JvmStatic external fun delete(ptr: Long)

        @JvmStatic external fun createStream(ptr: Long): Long

        @JvmStatic external fun compute(ptr: Long, streamPtr: Long, topK: Int): Array<Any>
    }
}

/**
 * Helper function to get a predefined audio tagging configuration
 * @param type The type of model to use (0-5)
 * @param numThreads Number of threads to use for computation
 * @return An AudioTaggingConfig for the selected model
 */
fun getAudioTaggingConfig(type: Int, numThreads: Int = 1): AudioTaggingConfig? {
    when (type) {
        0 -> {
            val modelDir = "sherpa-onnx-zipformer-small-audio-tagging-2024-04-15"
            return AudioTaggingConfig(
                model = AudioTaggingModelConfig(
                    zipformer = OfflineZipformerAudioTaggingModelConfig(model = "$modelDir/model.int8.onnx"),
                    numThreads = numThreads,
                    debug = true,
                ),
                labels = "$modelDir/class_labels_indices.csv",
                topK = 3,
            )
        }

        1 -> {
            val modelDir = "sherpa-onnx-zipformer-audio-tagging-2024-04-09"
            return AudioTaggingConfig(
                model = AudioTaggingModelConfig(
                    zipformer = OfflineZipformerAudioTaggingModelConfig(model = "$modelDir/model.int8.onnx"),
                    numThreads = numThreads,
                    debug = true,
                ),
                labels = "$modelDir/class_labels_indices.csv",
                topK = 3,
            )
        }

        2 -> {
            val modelDir = "sherpa-onnx-ced-tiny-audio-tagging-2024-04-19"
            return AudioTaggingConfig(
                model = AudioTaggingModelConfig(
                    ced = "$modelDir/model.int8.onnx",
                    numThreads = numThreads,
                    debug = true,
                ),
                labels = "$modelDir/class_labels_indices.csv",
                topK = 3,
            )
        }

        3 -> {
            val modelDir = "sherpa-onnx-ced-mini-audio-tagging-2024-04-19"
            return AudioTaggingConfig(
                model = AudioTaggingModelConfig(
                    ced = "$modelDir/model.int8.onnx",
                    numThreads = numThreads,
                    debug = true,
                ),
                labels = "$modelDir/class_labels_indices.csv",
                topK = 3,
            )
        }

        4 -> {
            val modelDir = "sherpa-onnx-ced-small-audio-tagging-2024-04-19"
            return AudioTaggingConfig(
                model = AudioTaggingModelConfig(
                    ced = "$modelDir/model.int8.onnx",
                    numThreads = numThreads,
                    debug = true,
                ),
                labels = "$modelDir/class_labels_indices.csv",
                topK = 3,
            )
        }

        5 -> {
            val modelDir = "sherpa-onnx-ced-base-audio-tagging-2024-04-19"
            return AudioTaggingConfig(
                model = AudioTaggingModelConfig(
                    ced = "$modelDir/model.int8.onnx",
                    numThreads = numThreads,
                    debug = true,
                ),
                labels = "$modelDir/class_labels_indices.csv",
                topK = 3,
            )
        }
    }

    return null
} 