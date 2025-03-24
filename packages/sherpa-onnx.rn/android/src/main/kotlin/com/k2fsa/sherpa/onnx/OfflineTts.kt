/**
 * JNI Bridge for sherpa-onnx native library
 * This class exists solely to match the JNI method signatures expected by the native library.
 */
package com.k2fsa.sherpa.onnx

import android.content.res.AssetManager
import android.util.Log

/**
 * VITS model configuration class
 */
data class OfflineTtsVitsModelConfig(
    var model: String = "",
    var lexicon: String = "",
    var tokens: String = "",
    var dataDir: String = "",
    var dictDir: String = "",
    var noiseScale: Float = 0.667f,
    var noiseScaleW: Float = 0.8f,
    var lengthScale: Float = 1.0f,
)

/**
 * Matcha model configuration class
 */
data class OfflineTtsMatchaModelConfig(
    var acousticModel: String = "",
    var vocoder: String = "",
    var lexicon: String = "",
    var tokens: String = "",
    var dataDir: String = "",
    var dictDir: String = "",
    var noiseScale: Float = 1.0f,
    var lengthScale: Float = 1.0f,
)

/**
 * Kokoro model configuration class
 */
data class OfflineTtsKokoroModelConfig(
    var model: String = "",
    var voices: String = "",
    var tokens: String = "",
    var dataDir: String = "",
    var lexicon: String = "",
    var dictDir: String = "",
    var lengthScale: Float = 1.0f,
)

/**
 * TTS model configuration class
 */
data class OfflineTtsModelConfig(
    var vits: OfflineTtsVitsModelConfig = OfflineTtsVitsModelConfig(),
    var matcha: OfflineTtsMatchaModelConfig = OfflineTtsMatchaModelConfig(),
    var kokoro: OfflineTtsKokoroModelConfig = OfflineTtsKokoroModelConfig(),
    var numThreads: Int = 1,
    var debug: Boolean = false,
    var provider: String = "cpu",
)

/**
 * Complete offline TTS configuration class
 */
data class OfflineTtsConfig(
    var model: OfflineTtsModelConfig = OfflineTtsModelConfig(),
    var ruleFsts: String = "",
    var ruleFars: String = "",
    var maxNumSentences: Int = 1,
    var silenceScale: Float = 0.2f,
)

/**
 * Audio data class for JNI bridge
 */
class OfflineTtsAudio(
    val samples: FloatArray,
    val sampleRate: Int
)

/**
 * Bridge class for JNI access - this is the class that the JNI methods will find
 */
class OfflineTts(
    private val assetManager: AssetManager,
    var config: OfflineTtsConfig,
) {
    private var ptr: Long = 0

    init {
        ptr = newFromAsset(assetManager, config)
    }

    companion object {
        private const val TAG = "OfflineTtsBridge"
        
        init {
            try {
                System.loadLibrary("sherpa-onnx-jni")
                Log.i(TAG, "Successfully loaded sherpa-onnx-jni library in bridge class")
            } catch (e: UnsatisfiedLinkError) {
                Log.e(TAG, "Failed to load sherpa-onnx-jni library: ${e.message}")
                e.printStackTrace()
            }
        }
        
        @JvmStatic external fun newFromAsset(
            assetManager: AssetManager,
            config: OfflineTtsConfig
        ): Long
        
        @JvmStatic external fun newFromFile(
            config: OfflineTtsConfig
        ): Long
        
        @JvmStatic external fun generateImpl(
            ptr: Long, 
            text: String, 
            sid: Int, 
            speed: Float
        ): Array<Any>
        
        @JvmStatic external fun generateWithCallbackImpl(
            ptr: Long, 
            text: String, 
            sid: Int, 
            speed: Float,
            callback: (FloatArray) -> Int
        ): Array<Any>
        
        @JvmStatic external fun getSampleRate(ptr: Long): Int
        @JvmStatic external fun getNumSpeakers(ptr: Long): Int
        @JvmStatic external fun delete(ptr: Long)
    }

    fun sampleRate() = getSampleRate(ptr)
    fun numSpeakers() = getNumSpeakers(ptr)
    fun free() = delete(ptr)

    fun generate(
        text: String,
        sid: Int = 0,
        speed: Float = 1.0f
    ): OfflineTtsAudio {
        val objArray = generateImpl(ptr, text, sid, speed)
        return OfflineTtsAudio(
            samples = objArray[0] as FloatArray,
            sampleRate = objArray[1] as Int
        )
    }

    fun generateWithCallback(
        text: String,
        sid: Int = 0,
        speed: Float = 1.0f,
        callback: (FloatArray) -> Int
    ): OfflineTtsAudio {
        val objArray = generateWithCallbackImpl(ptr, text, sid, speed, callback)
        return OfflineTtsAudio(
            samples = objArray[0] as FloatArray,
            sampleRate = objArray[1] as Int
        )
    }
} 