/**
 * Utility class for audio file extraction
 */
package net.siteed.sherpaonnx

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.String
import kotlin.Int
import kotlin.FloatArray
import kotlin.Unit
import kotlin.Boolean
import kotlin.collections.List
import kotlin.collections.mutableListOf
import kotlin.collections.toFloatArray

/**
 * Utility class for extracting audio data from various audio file formats
 */
object AudioExtractor {
    private const val TAG = "AudioExtractor"
    private const val BUFFER_SIZE = 1024 * 1024 // 1MB buffer

    /**
     * Extract audio data from a file
     * @param file The audio file to extract from
     * @return AudioData containing the samples and sample rate, or null if failed
     */
    fun extractAudioFromFile(file: File): AudioData? {
        try {
            val extractor = MediaExtractor()
            extractor.setDataSource(file.absolutePath)

            // Find the audio track
            var audioTrackIndex = -1
            var audioFormat: MediaFormat? = null

            for (i in 0 until extractor.trackCount) {
                val format = extractor.getTrackFormat(i)
                val mime = format.getString(MediaFormat.KEY_MIME)
                if (mime?.startsWith("audio/") == true) {
                    audioTrackIndex = i
                    audioFormat = format
                    break
                }
            }

            if (audioTrackIndex == -1 || audioFormat == null) {
                Log.e(TAG, "No audio track found in file: ${file.absolutePath}")
                return null
            }

            // Get audio parameters
            val sampleRate = audioFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channelCount = audioFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)

            // Select the audio track
            extractor.selectTrack(audioTrackIndex)

            // Create decoder
            val decoder = MediaCodec.createDecoderByType(audioFormat.getString(MediaFormat.KEY_MIME)!!)
            decoder.configure(audioFormat, null, null, 0)
            decoder.start()

            // Prepare buffers
            val inputBuffers = decoder.inputBuffers
            val outputBuffers = decoder.outputBuffers
            val bufferInfo = MediaCodec.BufferInfo()
            val buffer = ByteBuffer.allocate(BUFFER_SIZE)

            // Process the audio data
            val samples = mutableListOf<Float>()
            var isEOS = false

            while (!isEOS) {
                // Feed input to decoder
                if (!isEOS) {
                    val inputBufferIndex = decoder.dequeueInputBuffer(10000)
                    if (inputBufferIndex >= 0) {
                        val inputBuffer = inputBuffers[inputBufferIndex]
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        if (sampleSize < 0) {
                            isEOS = true
                            decoder.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        } else {
                            decoder.queueInputBuffer(inputBufferIndex, 0, sampleSize, extractor.sampleTime, 0)
                            extractor.advance()
                        }
                    }
                }

                // Get decoded output
                val outputBufferIndex = decoder.dequeueOutputBuffer(bufferInfo, 10000)
                if (outputBufferIndex >= 0) {
                    val outputBuffer = outputBuffers[outputBufferIndex]
                    outputBuffer.position(bufferInfo.offset)
                    outputBuffer.limit(bufferInfo.offset + bufferInfo.size)

                    // Convert to float samples
                    val sampleData = ByteArray(bufferInfo.size)
                    outputBuffer.get(sampleData)

                    // Convert to float samples based on format
                    when (audioFormat.getString(MediaFormat.KEY_MIME)) {
                        "audio/raw" -> {
                            // Raw PCM data
                            val numSamples = sampleData.size / 2 // Assuming 16-bit PCM
                            for (i in 0 until numSamples) {
                                val sample = (sampleData[i * 2].toInt() and 0xFF) or
                                        ((sampleData[i * 2 + 1].toInt() and 0xFF) shl 8)
                                samples.add(sample / 32768f)
                            }
                        }
                        else -> {
                            Log.e(TAG, "Unsupported audio format: ${audioFormat.getString(MediaFormat.KEY_MIME)}")
                            return null
                        }
                    }

                    decoder.releaseOutputBuffer(outputBufferIndex, false)
                }
            }

            // Clean up
            decoder.stop()
            decoder.release()
            extractor.release()

            // Convert to float array
            val floatSamples = samples.toFloatArray()

            // If stereo, convert to mono by averaging channels
            val monoSamples = if (channelCount > 1) {
                val frameCount = floatSamples.size / channelCount
                FloatArray(frameCount) { i ->
                    var sum = 0f
                    for (c in 0 until channelCount) {
                        sum += floatSamples[i * channelCount + c]
                    }
                    sum / channelCount
                }
            } else {
                floatSamples
            }

            return AudioData(monoSamples, sampleRate)
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting audio: ${e.message}")
            e.printStackTrace()
            return null
        }
    }
} 