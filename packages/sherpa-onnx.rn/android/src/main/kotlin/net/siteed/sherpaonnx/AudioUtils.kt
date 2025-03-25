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

    /**
     * Read a WAV file and return its audio samples and sample rate
     * 
     * @param path Path to the WAV file
     * @return Pair of (samples as FloatArray, sampleRate as Int) or null if failed
     */
    fun readWavFile(path: String): Pair<FloatArray, Int>? {
        Log.d(TAG, "Reading WAV file: $path")
        
        val file = File(path)
        if (!file.exists() || !file.canRead()) {
            Log.e(TAG, "WAV file doesn't exist or can't be read: $path")
            return null
        }
        
        var inputStream = file.inputStream().buffered()
        
        try {
            // Read WAV header
            val header = ByteArray(44)
            if (inputStream.read(header) != 44) {
                Log.e(TAG, "Failed to read WAV header (not enough bytes)")
                return null
            }
            
            // Verify it's a WAV file
            val riffHeader = String(header, 0, 4)
            val waveHeader = String(header, 8, 4)
            
            if (riffHeader != "RIFF" || waveHeader != "WAVE") {
                Log.e(TAG, "Invalid WAV file format: RIFF=$riffHeader, WAVE=$waveHeader")
                return null
            }
            
            // Extract format information
            val numChannels = ((header[22].toInt() and 0xFF) or 
                              ((header[23].toInt() and 0xFF) shl 8))
            
            val sampleRate = ((header[24].toInt() and 0xFF) or 
                             ((header[25].toInt() and 0xFF) shl 8) or
                             ((header[26].toInt() and 0xFF) shl 16) or
                             ((header[27].toInt() and 0xFF) shl 24))
            
            val bitsPerSample = ((header[34].toInt() and 0xFF) or 
                                ((header[35].toInt() and 0xFF) shl 8))
            
            Log.d(TAG, "WAV format: channels=$numChannels, sampleRate=$sampleRate, bitsPerSample=$bitsPerSample")
            
            // For now we only support 16-bit PCM
            if (bitsPerSample != 16) {
                Log.e(TAG, "Unsupported bits per sample: $bitsPerSample (only 16-bit supported)")
                return null
            }
            
            // Find data chunk (might not be immediately after header in some WAV files)
            var dataChunkSize = 0
            var dataChunkFound = false
            
            // Start by checking if "data" is where we expect it
            val dataHeader = String(header, 36, 4)
            if (dataHeader == "data") {
                dataChunkSize = ((header[40].toInt() and 0xFF) or 
                                ((header[41].toInt() and 0xFF) shl 8) or
                                ((header[42].toInt() and 0xFF) shl 16) or
                                ((header[43].toInt() and 0xFF) shl 24))
                dataChunkFound = true
                Log.d(TAG, "Found data chunk at standard position, size: $dataChunkSize bytes")
            } else {
                // Search for "data" chunk
                Log.d(TAG, "Data chunk not at standard position, searching...")
                val chunkBuffer = ByteArray(8) // 4 bytes ID + 4 bytes size
                
                while (inputStream.available() > 0) {
                    if (inputStream.read(chunkBuffer) != 8) break
                    
                    val chunkId = String(chunkBuffer, 0, 4)
                    if (chunkId == "data") {
                        dataChunkSize = ((chunkBuffer[4].toInt() and 0xFF) or 
                                        ((chunkBuffer[5].toInt() and 0xFF) shl 8) or
                                        ((chunkBuffer[6].toInt() and 0xFF) shl 16) or
                                        ((chunkBuffer[7].toInt() and 0xFF) shl 24))
                        dataChunkFound = true
                        Log.d(TAG, "Found data chunk while searching, size: $dataChunkSize bytes")
                        break
                    } else {
                        // Skip this chunk
                        val chunkSize = ((chunkBuffer[4].toInt() and 0xFF) or 
                                        ((chunkBuffer[5].toInt() and 0xFF) shl 8) or
                                        ((chunkBuffer[6].toInt() and 0xFF) shl 16) or
                                        ((chunkBuffer[7].toInt() and 0xFF) shl 24))
                        
                        Log.d(TAG, "Skipping chunk: $chunkId, size: $chunkSize bytes")
                        if (chunkSize > 0) {
                            inputStream.skip(chunkSize.toLong())
                        }
                    }
                }
            }
            
            if (!dataChunkFound) {
                Log.e(TAG, "Could not find data chunk in WAV file")
                return null
            }
            
            // Calculate number of samples
            val bytesPerSample = bitsPerSample / 8
            val totalSamples = dataChunkSize / (bytesPerSample * numChannels)
            
            // Read the raw audio data
            val rawData = ByteArray(dataChunkSize)
            var bytesRead = 0
            var offset = 0
            
            while (offset < dataChunkSize && inputStream.available() > 0) {
                val read = inputStream.read(rawData, offset, dataChunkSize - offset)
                if (read == -1) break
                offset += read
                bytesRead += read
            }
            
            if (bytesRead < dataChunkSize) {
                Log.w(TAG, "Could only read $bytesRead bytes out of $dataChunkSize bytes of audio data")
            }
            
            Log.d(TAG, "Read $bytesRead bytes of audio data")
            
            // Convert to float samples
            val floatSamples: FloatArray
            
            if (numChannels == 1) {
                // Mono: direct conversion
                floatSamples = FloatArray(totalSamples)
                for (i in 0 until totalSamples) {
                    val sampleOffset = i * bytesPerSample
                    if (sampleOffset + 1 < bytesRead) {
                        // Convert 16-bit PCM to float
                        val pcmValue = (rawData[sampleOffset].toInt() and 0xFF) or 
                                       ((rawData[sampleOffset + 1].toInt() and 0xFF) shl 8)
                        // Convert to signed short
                        val signedPcm = if (pcmValue >= 32768) pcmValue - 65536 else pcmValue
                        // Normalize to -1.0 to 1.0
                        floatSamples[i] = signedPcm / 32768f
                    }
                }
            } else {
                // Multi-channel: convert to mono by averaging
                val frameCount = totalSamples / numChannels
                floatSamples = FloatArray(frameCount)
                
                for (i in 0 until frameCount) {
                    var sum = 0f
                    for (c in 0 until numChannels) {
                        val sampleOffset = (i * numChannels + c) * bytesPerSample
                        if (sampleOffset + 1 < bytesRead) {
                            // Get channel sample
                            val pcmValue = (rawData[sampleOffset].toInt() and 0xFF) or 
                                          ((rawData[sampleOffset + 1].toInt() and 0xFF) shl 8)
                            // Convert to signed short
                            val signedPcm = if (pcmValue >= 32768) pcmValue - 65536 else pcmValue
                            // Add to sum (already normalized)
                            sum += signedPcm / 32768f
                        }
                    }
                    // Average all channels
                    floatSamples[i] = sum / numChannels
                }
            }
            
            Log.i(TAG, "Successfully read WAV file: ${floatSamples.size} samples at ${sampleRate}Hz")
            return Pair(floatSamples, sampleRate)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error reading WAV file: ${e.message}")
            e.printStackTrace()
            return null
        } finally {
            try {
                inputStream.close()
            } catch (e: Exception) {
                Log.e(TAG, "Error closing input stream: ${e.message}")
            }
        }
    }
} 