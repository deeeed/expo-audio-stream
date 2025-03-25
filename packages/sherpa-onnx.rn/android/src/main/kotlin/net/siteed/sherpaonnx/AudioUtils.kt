package net.siteed.sherpaonnx

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
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

    /**
     * Load audio data from a file path
     * @param filePath Path to the audio file to load
     * @return AudioData with samples and sample rate, or null if loading fails
     */
    fun loadAudioFromFile(filePath: String): AudioData? {
        Log.d(TAG, "Loading audio file: $filePath")
        
        val file = File(filePath)
        if (!file.exists()) {
            Log.e(TAG, "Audio file does not exist: $filePath")
            return null
        }
        
        try {
            // Check the file extension to determine format
            val extension = file.extension.lowercase()
            
            if (extension == "wav") {
                // Use direct WAV reading for WAV files
                val wavData = readWavFile(filePath)
                if (wavData != null) {
                    val (samples, sampleRate) = wavData
                    Log.d(TAG, "Loaded WAV file with ${samples.size} samples at ${sampleRate}Hz")
                    return AudioData(samples, sampleRate)
                }
            }
            
            // For other formats or if WAV reading failed, use MediaExtractor
            val extractor = MediaExtractor()
            extractor.setDataSource(filePath)
            
            // Find the first audio track
            var audioTrackIndex = -1
            for (i in 0 until extractor.trackCount) {
                val format = extractor.getTrackFormat(i)
                val mime = format.getString(MediaFormat.KEY_MIME)
                if (mime?.startsWith("audio/") == true) {
                    audioTrackIndex = i
                    break
                }
            }
            
            if (audioTrackIndex < 0) {
                Log.e(TAG, "No audio track found in the file")
                return null
            }
            
            // Select this track and get its format
            extractor.selectTrack(audioTrackIndex)
            val format = extractor.getTrackFormat(audioTrackIndex)
            
            // Get necessary audio parameters
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channelCount = if (format.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
                format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            } else {
                1 // Default to mono if channel count is not specified
            }
            
            Log.d(TAG, "Audio format: $sampleRate Hz, $channelCount channels")
            
            // Create a decoder for this format
            val mime = format.getString(MediaFormat.KEY_MIME)
            val decoder = MediaCodec.createDecoderByType(mime ?: "audio/mp4a-latm")
            decoder.configure(format, null, null, 0)
            decoder.start()
            
            // Decode the audio data
            val pcmData = decodeAudioToPCM(extractor, decoder)
            
            // Convert stereo to mono if needed
            val monoData = if (channelCount > 1) {
                convertMultiChannelToMono(pcmData, channelCount)
            } else {
                pcmData
            }
            
            // Convert to float array in range [-1.0, 1.0]
            val floatSamples = convertPcmToFloat(monoData)
            
            // Clean up
            extractor.release()
            decoder.stop()
            decoder.release()
            
            Log.d(TAG, "Successfully loaded audio with ${floatSamples.size} samples at ${sampleRate}Hz")
            return AudioData(floatSamples, sampleRate)
        } catch (e: Exception) {
            Log.e(TAG, "Error loading audio file: ${e.message}")
            e.printStackTrace()
            return null
        }
    }

    /**
     * Decode audio data using MediaCodec
     */
    private fun decodeAudioToPCM(extractor: MediaExtractor, decoder: MediaCodec): ByteArray {
        val bufferInfo = MediaCodec.BufferInfo()
        val outputBuffers = mutableListOf<ByteArray>()
        var inputEOS = false
        var outputEOS = false
        
        while (!outputEOS) {
            // Handle input
            if (!inputEOS) {
                val inputBufferId = decoder.dequeueInputBuffer(10000)
                if (inputBufferId >= 0) {
                    val inputBuffer = decoder.getInputBuffer(inputBufferId)
                    inputBuffer?.clear()
                    
                    val sampleSize = if (inputBuffer != null) extractor.readSampleData(inputBuffer, 0) else -1
                    
                    if (sampleSize < 0) {
                        // End of stream
                        decoder.queueInputBuffer(
                            inputBufferId, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM
                        )
                        inputEOS = true
                    } else {
                        // Queue this buffer
                        decoder.queueInputBuffer(
                            inputBufferId, 0, sampleSize, extractor.sampleTime, 0
                        )
                        extractor.advance()
                    }
                }
            }
            
            // Handle output
            val outputBufferId = decoder.dequeueOutputBuffer(bufferInfo, 10000)
            if (outputBufferId >= 0) {
                if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                    outputEOS = true
                }
                
                if (bufferInfo.size > 0) {
                    val outputBuffer = decoder.getOutputBuffer(outputBufferId)
                    if (outputBuffer != null) {
                        val chunk = ByteArray(bufferInfo.size)
                        outputBuffer.position(bufferInfo.offset)
                        outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
                        outputBuffer.get(chunk)
                        outputBuffers.add(chunk)
                    }
                }
                
                decoder.releaseOutputBuffer(outputBufferId, false)
            }
        }
        
        // Combine all output chunks
        val totalSize = outputBuffers.sumOf { it.size }
        val result = ByteArray(totalSize)
        var offset = 0
        
        for (buffer in outputBuffers) {
            System.arraycopy(buffer, 0, result, offset, buffer.size)
            offset += buffer.size
        }
        
        return result
    }

    /**
     * Convert multi-channel PCM data to mono by averaging channels
     */
    private fun convertMultiChannelToMono(input: ByteArray, channelCount: Int): ByteArray {
        // Assuming 16-bit PCM, 2 bytes per sample
        val bytesPerSample = 2
        val bytesPerFrame = bytesPerSample * channelCount
        val frameCount = input.size / bytesPerFrame
        
        val output = ByteArray(frameCount * bytesPerSample)
        
        for (i in 0 until frameCount) {
            var sum = 0
            
            // Sum all channels
            for (c in 0 until channelCount) {
                val offset = i * bytesPerFrame + c * bytesPerSample
                
                // Convert bytes to 16-bit sample (little endian)
                val sample = (input[offset].toInt() and 0xFF) or 
                             ((input[offset + 1].toInt() and 0xFF) shl 8)
                
                // Convert to signed
                val signedSample = if (sample >= 32768) sample - 65536 else sample
                
                sum += signedSample
            }
            
            // Calculate average
            val avg = (sum / channelCount).toShort()
            
            // Store mono sample
            val outOffset = i * bytesPerSample
            output[outOffset] = (avg.toInt() and 0xFF).toByte()
            output[outOffset + 1] = ((avg.toInt() shr 8) and 0xFF).toByte()
        }
        
        return output
    }

    /**
     * Convert 16-bit PCM to float array with range [-1.0, 1.0]
     */
    private fun convertPcmToFloat(pcm: ByteArray): FloatArray {
        val samples = FloatArray(pcm.size / 2)
        
        for (i in samples.indices) {
            val idx = i * 2
            
            // Convert bytes to 16-bit sample (little endian)
            val sample = (pcm[idx].toInt() and 0xFF) or 
                         ((pcm[idx + 1].toInt() and 0xFF) shl 8)
            
            // Convert to signed
            val signedSample = if (sample >= 32768) sample - 65536 else sample
            
            // Normalize to [-1.0, 1.0]
            samples[i] = signedSample / 32768f
        }
        
        return samples
    }
} 