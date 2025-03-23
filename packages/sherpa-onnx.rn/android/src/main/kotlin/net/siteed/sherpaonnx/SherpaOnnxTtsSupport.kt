/**
 * Support classes for Sherpa ONNX TTS implementation
 * Minimal interface to support the SherpaOnnxModule
 */
package net.siteed.sherpaonnx

import android.content.res.AssetManager
import java.io.File
import java.io.FileOutputStream

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
            
            // Create the parent directory if it doesn't exist
            val file = File(path)
            file.parentFile?.mkdirs()
            
            // Create FileOutputStream to write the WAV file
            val outputStream = FileOutputStream(file)
            
            // Calculate sizes for WAV header
            val numChannels = 1 // Mono
            val bitsPerSample = 16 // 16-bit audio
            val byteRate = sampleRate * numChannels * (bitsPerSample / 8)
            val blockAlign = numChannels * (bitsPerSample / 8)
            val dataSize = samples.size * (bitsPerSample / 8)
            val totalSize = 36 + dataSize
            
            // Write WAV header - RIFF chunk
            outputStream.write("RIFF".toByteArray()) // ChunkID
            writeInt(outputStream, totalSize) // ChunkSize
            outputStream.write("WAVE".toByteArray()) // Format
            
            // Write WAV header - fmt subchunk
            outputStream.write("fmt ".toByteArray()) // Subchunk1ID
            writeInt(outputStream, 16) // Subchunk1Size (PCM)
            writeShort(outputStream, 1) // AudioFormat (1 = PCM)
            writeShort(outputStream, numChannels) // NumChannels
            writeInt(outputStream, sampleRate) // SampleRate
            writeInt(outputStream, byteRate) // ByteRate
            writeShort(outputStream, blockAlign) // BlockAlign
            writeShort(outputStream, bitsPerSample) // BitsPerSample
            
            // Write WAV header - data subchunk
            outputStream.write("data".toByteArray()) // Subchunk2ID
            writeInt(outputStream, dataSize) // Subchunk2Size
            
            // Write the audio data (convert float to 16-bit PCM)
            for (sample in samples) {
                // Convert float (-1.0 to 1.0) to 16-bit PCM
                val pcmValue = (sample * 32767f).toInt().coerceIn(-32768, 32767).toShort()
                writeShort(outputStream, pcmValue.toInt())
            }
            
            outputStream.close()
            android.util.Log.i("OfflineTtsAudio", "Audio saved successfully")
            true
        } catch (e: Exception) {
            android.util.Log.e("OfflineTtsAudio", "Failed to save audio: ${e.message}")
            e.printStackTrace()
            false
        }
    }
    
    // Helper function to write an integer in little-endian format
    private fun writeInt(output: FileOutputStream, value: Int) {
        output.write(value and 0xFF)
        output.write((value shr 8) and 0xFF)
        output.write((value shr 16) and 0xFF)
        output.write((value shr 24) and 0xFF)
    }
    
    // Helper function to write a short in little-endian format
    private fun writeShort(output: FileOutputStream, value: Int) {
        output.write(value and 0xFF)
        output.write((value shr 8) and 0xFF)
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