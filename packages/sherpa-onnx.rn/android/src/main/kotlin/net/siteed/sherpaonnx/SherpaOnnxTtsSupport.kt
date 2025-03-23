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
            android.util.Log.i("OfflineTtsAudio", "Saving audio to $path")
            // In a real implementation, this would save the audio to a WAV file
            val file = File(path)
            file.parentFile?.mkdirs()
            file.createNewFile()
            
            // Mock writing some data to the file for testing
            file.writeBytes(ByteArray(samples.size / 10))
            android.util.Log.i("OfflineTtsAudio", "Audio saved successfully")
            true
        } catch (e: Exception) {
            android.util.Log.e("OfflineTtsAudio", "Failed to save audio: ${e.message}")
            e.printStackTrace()
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
    private val tag = "OfflineTts"

    init {
        android.util.Log.i(tag, "Initializing OfflineTts with config: $config")
        
        // Log what models are found
        try {
            val modelDir = config.modelDir
            android.util.Log.d(tag, "Checking model dir: $modelDir")
            
            val files = assetManager.list(modelDir)
            android.util.Log.d(tag, "Files in $modelDir: ${files?.joinToString()}")
            
            // Check for model.onnx
            if (files?.contains("model.onnx") == true) {
                android.util.Log.i(tag, "Found model.onnx in $modelDir")
            }
            
            // Check for voices.bin
            if (files?.contains("voices.bin") == true) {
                android.util.Log.i(tag, "Found voices.bin in $modelDir")
            }
            
            // Check for espeak-ng-data
            if (files?.contains("espeak-ng-data") == true) {
                android.util.Log.i(tag, "Found espeak-ng-data in $modelDir")
                
                // Check what's inside espeak-ng-data
                val espeakFiles = assetManager.list("$modelDir/espeak-ng-data")
                android.util.Log.d(tag, "Files in espeak-ng-data: ${espeakFiles?.joinToString()}")
            }
        } catch (e: Exception) {
            android.util.Log.e(tag, "Error checking model files: ${e.message}")
            e.printStackTrace()
        }
    }

    fun generate(text: String, sid: Int = 0, speed: Float = 1.0f): OfflineTtsAudio {
        android.util.Log.i(tag, "Generating TTS for text: '$text', sid: $sid, speed: $speed")
        
        // Mock implementation - would generate actual audio in real implementation
        // For better testing, generate longer samples for longer text
        val sampleSize = 1000 + text.length * 100
        android.util.Log.d(tag, "Generated mock audio with $sampleSize samples")
        
        return OfflineTtsAudio(
            samples = FloatArray(sampleSize) { 0f },
            sampleRate = mockSampleRate
        )
    }

    fun generateWithCallback(
        text: String,
        sid: Int = 0,
        speed: Float = 1.0f,
        callback: AudioCallback
    ): OfflineTtsAudio {
        android.util.Log.i(tag, "Generating TTS with callback for text: '$text', sid: $sid, speed: $speed")
        
        // Mock implementation - would generate actual audio with callback in real implementation
        val audio = generate(text, sid, speed)
        
        // Call callback with chunks of the audio to simulate streaming
        val chunkSize = 500
        val numChunks = (audio.samples.size / chunkSize) + 1
        
        android.util.Log.d(tag, "Calling callback with $numChunks chunks of size $chunkSize")
        for (i in 0 until numChunks) {
            val start = i * chunkSize
            val end = minOf(start + chunkSize, audio.samples.size)
            if (start < end) {
                val chunk = audio.samples.sliceArray(start until end)
                val result = callback(chunk)
                if (result == 0) {
                    android.util.Log.d(tag, "Callback returned 0, stopping audio generation")
                    break // Stop if callback returns 0
                }
                // Simulate processing time
                Thread.sleep(50)
            }
        }
        
        return audio
    }

    fun sampleRate(): Int = mockSampleRate

    fun numSpeakers(): Int = mockNumSpeakers

    fun free() {
        android.util.Log.i(tag, "Releasing OfflineTts resources")
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