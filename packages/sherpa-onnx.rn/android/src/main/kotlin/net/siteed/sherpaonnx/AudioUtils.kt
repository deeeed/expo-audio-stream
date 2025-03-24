package net.siteed.sherpaonnx

import android.util.Log
import java.io.File
import java.io.FileOutputStream
// Explicitly import Kotlin standard library
import kotlin.FloatArray
import kotlin.Int
import kotlin.String
import kotlin.Boolean

/**
 * Utility class for audio processing and file handling
 */
object AudioUtils {
    private const val TAG = "AudioUtils"

    /**
     * Converts float audio samples to a WAV file
     * 
     * @param samples Float array of audio samples (typically in range -1.0 to 1.0)
     * @param sampleRate Sample rate of the audio in Hz
     * @param path Output file path
     * @return True if saving succeeded, false otherwise
     */
    fun saveAsWav(samples: FloatArray, sampleRate: Int, path: String): Boolean {
        Log.d(TAG, "Starting saveAsWav for path: $path, sample count: ${samples.size}, sampleRate: $sampleRate")
        
        return try {
            Log.i(TAG, "Saving audio to $path")
            
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
            
            Log.d(TAG, "WAV header data: channels=$numChannels, bits=$bitsPerSample, byteRate=$byteRate, dataSize=$dataSize")
            
            try {
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
                
                Log.d(TAG, "WAV header written successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed writing WAV header: ${e.message}")
                throw e
            }
            
            try {
                // Write the audio data (convert float to 16-bit PCM)
                for (sample in samples) {
                    // Convert float (-1.0 to 1.0) to 16-bit PCM
                    val intValue = (sample * 32767f).toInt()
                    val pcmValue = when {
                        intValue < -32768 -> -32768
                        intValue > 32767 -> 32767
                        else -> intValue
                    }.toShort()
                    writeShort(outputStream, pcmValue.toInt())
                }
                Log.d(TAG, "WAV audio data written successfully (${samples.size} samples)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed writing WAV audio data: ${e.message}")
                throw e
            }
            
            try {
                outputStream.close()
                Log.i(TAG, "Audio saved successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed closing output stream: ${e.message}")
                throw e
            }
            
            // Validate file exists and has appropriate size
            val savedFile = File(path)
            if (savedFile.exists()) {
                Log.i(TAG, "File exists, size: ${savedFile.length()} bytes")
            } else {
                Log.e(TAG, "File was not created at $path")
            }
            
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save audio: ${e.message}")
            e.printStackTrace()
            Log.e(TAG, "Stack trace: ${e.stackTraceToString()}")
            false
        }
    }
    
    /**
     * Creates an empty audio sample for error cases
     */
    fun createEmptyAudio(sampleRate: Int = 22050): Pair<FloatArray, Int> {
        Log.w(TAG, "Creating empty audio due to error with sample rate: $sampleRate")
        // Create small non-zero audio to detect issues
        val samples = FloatArray(1000) { (it % 100) * 0.01f } // Simple pattern
        Log.d(TAG, "Created empty audio with ${samples.size} samples at ${sampleRate}Hz")
        return Pair(samples, sampleRate)
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