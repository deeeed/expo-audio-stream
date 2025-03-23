/**
 * Support classes for Sherpa ONNX TTS implementation
 * Minimal interface to support the SherpaOnnxModule
 */
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import java.io.File

/**
 * Configuration for Offline TTS
 */
data class OfflineTtsConfig(
    val modelDir: String = "",
    val modelName: String = "",
    val acousticModelName: String = "",
    val vocoder: String = "",
    val voices: String = "",
    val lexicon: String = "",
    val dataDir: String = "",
    val dictDir: String = "",
    val ruleFsts: String = "",
    val ruleFars: String = "",
    val numThreads: Int? = null
)

/**
 * Audio data class
 */
class OfflineTtsAudio(
    val samples: FloatArray,
    val sampleRate: Int
) {
    fun save(path: String): Boolean {
        return try {
            // In a real implementation, this would save the audio to a WAV file
            File(path).createNewFile()
            true
        } catch (e: Exception) {
            false
        }
    }
}

/**
 * Callback interface for audio generation
 */
typealias AudioCallback = (FloatArray) -> Int

/**
 * Offline TTS class
 * This is a mock implementation for development without the actual library
 */
class OfflineTts(
    private val assetManager: AssetManager,
    private val config: OfflineTtsConfig
) {
    private val mockSampleRate = 22050
    private val mockNumSpeakers = 1

    fun generate(text: String, sid: Int = 0, speed: Float = 1.0f): OfflineTtsAudio {
        // Mock implementation - would generate actual audio in real implementation
        return OfflineTtsAudio(
            samples = FloatArray(1000) { 0f },
            sampleRate = mockSampleRate
        )
    }

    fun generateWithCallback(
        text: String,
        sid: Int = 0,
        speed: Float = 1.0f,
        callback: AudioCallback
    ): OfflineTtsAudio {
        // Mock implementation - would generate actual audio with callback in real implementation
        val audio = generate(text, sid, speed)
        callback(audio.samples)
        return audio
    }

    fun sampleRate(): Int = mockSampleRate

    fun numSpeakers(): Int = mockNumSpeakers

    fun free() {
        // Would release native resources in real implementation
    }
}

/**
 * Helper function to create OfflineTtsConfig from parameters
 */
fun getOfflineTtsConfig(
    modelDir: String = "",
    modelName: String = "",
    acousticModelName: String = "",
    vocoder: String = "",
    voices: String = "",
    lexicon: String = "",
    dataDir: String = "",
    dictDir: String = "",
    ruleFsts: String = "",
    ruleFars: String = "",
    numThreads: Int? = null
): OfflineTtsConfig {
    return OfflineTtsConfig(
        modelDir = modelDir,
        modelName = modelName,
        acousticModelName = acousticModelName,
        vocoder = vocoder,
        voices = voices,
        lexicon = lexicon,
        dataDir = dataDir,
        dictDir = dictDir,
        ruleFsts = ruleFsts,
        ruleFars = ruleFars,
        numThreads = numThreads
    )
} 