/**
 * Utility class for audio file extraction
 */
package net.siteed.sherpaonnx

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
import java.io.File

/**
 * Utility for extracting audio data from media files
 */
object AudioExtractor {
    private const val TAG = "AudioExtractor"
    private const val TIMEOUT_US = 10000L
    
    /**
     * Extract audio data from any supported audio file using MediaExtractor
     * This handles MP3, WAV, AAC, and other formats supported by Android
     */
    fun extractAudioFromFile(file: File): AudioData? {
        val extractor = MediaExtractor()
        val decoder = MediaCodec.createDecoderByType(MediaFormat.MIMETYPE_AUDIO_MPEG)
        
        try {
            // Set the data source to our audio file
            extractor.setDataSource(file.absolutePath)
            
            // Find the first audio track
            val audioTrackIndex = selectAudioTrack(extractor)
            if (audioTrackIndex < 0) {
                Log.e(TAG, "No audio track found in the file")
                return null
            }
            
            // Select this track for extraction
            extractor.selectTrack(audioTrackIndex)
            
            // Get the format for this track
            val format = extractor.getTrackFormat(audioTrackIndex)
            
            // Get sample rate from format
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            Log.i(TAG, "Audio sample rate: $sampleRate")
            
            // Get channel count
            val channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            Log.i(TAG, "Audio channels: $channelCount")
            
            // Configure and start the decoder
            decoder.configure(format, null, null, 0)
            decoder.start()
            
            // Decode the audio to PCM
            val pcmData = decodeAudioToPCM(extractor, format, decoder)
            
            // If this is stereo or multi-channel, convert to mono by averaging the channels
            val monoSamples = if (channelCount > 1) {
                convertToMono(pcmData, channelCount)
            } else {
                pcmData
            }
            
            // Convert byte array to float array
            val floatSamples = byteArrayToFloatArray(monoSamples)
            
            return AudioData(floatSamples, sampleRate)
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting audio: ${e.message}")
            e.printStackTrace()
            return null
        } finally {
            try {
                extractor.release()
                decoder.stop()
                decoder.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error cleaning up MediaExtractor: ${e.message}")
            }
        }
    }
    
    /**
     * Find and select the first audio track in the media file
     */
    private fun selectAudioTrack(extractor: MediaExtractor): Int {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime?.startsWith("audio/") == true) {
                return i
            }
        }
        return -1
    }
    
    /**
     * Decode audio data to raw PCM using MediaCodec
     */
    private fun decodeAudioToPCM(extractor: MediaExtractor, format: MediaFormat, decoder: MediaCodec): ByteArray {
        val outputBuffers = mutableListOf<ByteArray>()
        val bufferInfo = MediaCodec.BufferInfo()
        var inputEOS = false
        var outputEOS = false
        
        // Start decoding
        while (!outputEOS) {
            if (!inputEOS) {
                val inputBufferId = decoder.dequeueInputBuffer(TIMEOUT_US)
                if (inputBufferId >= 0) {
                    val inputBuffer = decoder.getInputBuffer(inputBufferId)
                    inputBuffer?.clear()
                    
                    val sampleSize = if (inputBuffer != null) {
                        extractor.readSampleData(inputBuffer, 0)
                    } else -1
                    
                    if (sampleSize < 0) {
                        decoder.queueInputBuffer(
                            inputBufferId, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM
                        )
                        inputEOS = true
                        Log.d(TAG, "End of audio stream reached")
                    } else {
                        decoder.queueInputBuffer(
                            inputBufferId, 0, sampleSize, extractor.sampleTime, 0
                        )
                        extractor.advance()
                    }
                }
            }
            
            // Get decoded data
            val outputBufferId = decoder.dequeueOutputBuffer(bufferInfo, TIMEOUT_US)
            if (outputBufferId >= 0) {
                if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                    outputEOS = true
                }
                
                // If we have valid output, copy it
                if (bufferInfo.size > 0) {
                    val outputBuffer = decoder.getOutputBuffer(outputBufferId)
                    if (outputBuffer != null) {
                        val data = ByteArray(bufferInfo.size)
                        outputBuffer.position(bufferInfo.offset)
                        outputBuffer.limit(bufferInfo.offset + bufferInfo.size)
                        outputBuffer.get(data)
                        outputBuffers.add(data)
                    }
                }
                
                decoder.releaseOutputBuffer(outputBufferId, false)
            }
        }
        
        // Combine all output chunks into a single byte array
        val totalSize = outputBuffers.sumOf { it.size }
        val result = ByteArray(totalSize)
        var offset = 0
        
        for (buffer in outputBuffers) {
            System.arraycopy(buffer, 0, result, offset, buffer.size)
            offset += buffer.size
        }
        
        Log.i(TAG, "Decoded ${result.size} bytes of PCM audio data")
        return result
    }
    
    /**
     * Convert multi-channel audio to mono by averaging all channels
     */
    private fun convertToMono(input: ByteArray, channels: Int): ByteArray {
        // Assuming 16-bit PCM, 2 bytes per sample
        val bytesPerSample = 2
        val samplesPerFrame = channels
        val bytesPerFrame = bytesPerSample * samplesPerFrame
        val frameCount = input.size / bytesPerFrame
        
        val output = ByteArray(frameCount * bytesPerSample)
        
        for (i in 0 until frameCount) {
            var sum = 0L
            
            // Average all channels
            for (c in 0 until channels) {
                val offset = i * bytesPerFrame + c * bytesPerSample
                // Read 16-bit sample (little endian)
                val sample = (input[offset].toInt() and 0xFF) or
                             ((input[offset + 1].toInt() and 0xFF) shl 8)
                sum += sample
            }
            
            // Calculate the average
            val average = (sum / channels).toInt()
            
            // Write back the mono sample (little endian)
            val outOffset = i * bytesPerSample
            output[outOffset] = (average and 0xFF).toByte()
            output[outOffset + 1] = ((average shr 8) and 0xFF).toByte()
        }
        
        return output
    }
    
    /**
     * Convert a PCM byte array to float array with values in range [-1.0, 1.0]
     */
    private fun byteArrayToFloatArray(input: ByteArray): FloatArray {
        // Assuming 16-bit PCM, 2 bytes per sample
        val bytesPerSample = 2
        val sampleCount = input.size / bytesPerSample
        val output = FloatArray(sampleCount)
        
        for (i in 0 until sampleCount) {
            val offset = i * bytesPerSample
            // Read 16-bit sample (little endian)
            val sample = (input[offset].toInt() and 0xFF) or
                         ((input[offset + 1].toInt() and 0xFF) shl 8)
            
            // Convert to signed value
            val signedSample = if (sample >= 32768) sample - 65536 else sample
            
            // Normalize to [-1.0, 1.0]
            output[i] = signedSample / 32768f
        }
        
        return output
    }
} 