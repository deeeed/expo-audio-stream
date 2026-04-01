package net.siteed.sherpaonnx.utils

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.util.Log
import net.siteed.sherpaonnx.AudioData
import java.io.File
import java.io.FileInputStream

/**
 * Utility class for audio file extraction
 */
/**
 * Utility class for extracting audio data from various audio file formats
 */
object AudioExtractor {
    private const val TAG = "AudioExtractor"
    private const val DEFAULT_INITIAL_DURATION_SECONDS = 30

    private fun setDataSource(extractor: MediaExtractor, file: File): FileInputStream? {
        return try {
            extractor.setDataSource(file.absolutePath)
            null
        } catch (pathError: Exception) {
            Log.w(
                TAG,
                "Path-based extractor setup failed for ${file.absolutePath}: ${pathError.message}. Falling back to FileDescriptor.",
            )
            val stream = FileInputStream(file)
            extractor.setDataSource(stream.fd)
            stream
        }
    }

    /**
     * Extract audio data from a file
     * @param file The audio file to extract from
     * @return AudioData containing the samples and sample rate, or null if failed
     */
    fun extractAudioFromFile(
        file: File,
        targetSampleRate: Int? = null,
    ): AudioData? {
        return extractAudioWindowFromFile(file, 0L, null, targetSampleRate)
    }

    fun extractAudioWindowFromFile(
        file: File,
        startTimeUs: Long = 0L,
        maxDurationUs: Long? = null,
        targetSampleRate: Int? = null,
    ): AudioData? {
        var extractor: MediaExtractor? = null
        var decoder: MediaCodec? = null
        var inputStream: FileInputStream? = null
        try {
            extractor = MediaExtractor()
            inputStream = setDataSource(extractor, file)

            val trackInfo = findAudioTrack(extractor)
            if (trackInfo == null) {
                Log.e(TAG, "No audio track found in file: ${file.absolutePath}")
                return null
            }
            val (audioTrackIndex, audioFormat) = trackInfo

            // Get audio parameters
            val sourceSampleRate = audioFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channelCount = audioFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            val windowEndUs = maxDurationUs?.let { startTimeUs + it }
            val outputSampleRate = targetSampleRate?.takeIf { it > 0 } ?: sourceSampleRate
            val resampler = if (outputSampleRate != sourceSampleRate) {
                Log.i(
                    TAG,
                    "Resampling extracted audio from ${sourceSampleRate}Hz to ${outputSampleRate}Hz for ${file.name}",
                )
                StreamingLinearResampler(sourceSampleRate, outputSampleRate)
            } else {
                null
            }

            // Select the audio track
            extractor.selectTrack(audioTrackIndex)
            if (startTimeUs > 0L) {
                extractor.seekTo(startTimeUs, MediaExtractor.SEEK_TO_CLOSEST_SYNC)
            }

            // Create decoder
            decoder = MediaCodec.createDecoderByType(audioFormat.getString(MediaFormat.KEY_MIME)!!)
            decoder.configure(audioFormat, null, null, 0)
            decoder.start()

            val bufferInfo = MediaCodec.BufferInfo()

            val estimatedFrameCount = estimateMonoFrameCount(audioFormat, outputSampleRate, maxDurationUs)
            var monoSamples = FloatArray(estimatedFrameCount)
            var monoSampleCount = 0

            var inputDone = false
            var outputDone = false

            while (!outputDone) {
                if (!inputDone) {
                    val inputBufferIndex = decoder.dequeueInputBuffer(10_000)
                    if (inputBufferIndex >= 0) {
                        val sampleTimeUs = extractor.sampleTime
                        if (sampleTimeUs < 0L || (windowEndUs != null && sampleTimeUs >= windowEndUs)) {
                            inputDone = true
                            decoder.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            continue
                        }

                        val inputBuffer = decoder.getInputBuffer(inputBufferIndex)
                            ?: throw IllegalStateException("Decoder input buffer is null")
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        if (sampleSize < 0) {
                            inputDone = true
                            decoder.queueInputBuffer(inputBufferIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                        } else {
                            decoder.queueInputBuffer(inputBufferIndex, 0, sampleSize, sampleTimeUs, 0)
                            extractor.advance()
                        }
                    }
                }

                when (val outputBufferIndex = decoder.dequeueOutputBuffer(bufferInfo, 10_000)) {
                    MediaCodec.INFO_TRY_AGAIN_LATER -> {
                        // No output yet.
                    }

                    MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        Log.i(TAG, "Decoder output format changed to ${decoder.outputFormat}")
                    }

                    MediaCodec.INFO_OUTPUT_BUFFERS_CHANGED -> {
                        // Deprecated on newer Android versions, safe to ignore.
                    }

                    else -> {
                        if (outputBufferIndex >= 0) {
                            val outputBuffer = decoder.getOutputBuffer(outputBufferIndex)
                                ?: throw IllegalStateException("Decoder output buffer is null")
                            outputBuffer.position(bufferInfo.offset)
                            outputBuffer.limit(bufferInfo.offset + bufferInfo.size)

                            val sampleData = ByteArray(bufferInfo.size)
                            outputBuffer.get(sampleData)

                            val frameCount = sampleData.size / (channelCount * 2)
                            val monoChunk = FloatArray(frameCount)

                            var byteIndex = 0
                            for (frameIndex in 0 until frameCount) {
                                var sum = 0f
                                for (channelIndex in 0 until channelCount) {
                                    val lo = sampleData[byteIndex].toInt() and 0xFF
                                    val hi = sampleData[byteIndex + 1].toInt() and 0xFF
                                    val sample = ((hi shl 8) or lo).toShort()
                                    sum += sample / 32768f
                                    byteIndex += 2
                                }
                                monoChunk[frameIndex] = if (channelCount > 1) sum / channelCount else sum
                            }

                            val outputChunk = resampler?.processChunk(monoChunk) ?: monoChunk
                            monoSamples = ensureCapacity(monoSamples, monoSampleCount + outputChunk.size)
                            outputChunk.copyInto(
                                destination = monoSamples,
                                destinationOffset = monoSampleCount,
                                startIndex = 0,
                                endIndex = outputChunk.size,
                            )
                            monoSampleCount += outputChunk.size

                            decoder.releaseOutputBuffer(outputBufferIndex, false)

                            if ((bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                                outputDone = true
                            }
                        }
                    }
                }
            }

            val finalSamples = if (monoSampleCount == monoSamples.size) {
                monoSamples
            } else {
                Log.i(
                    TAG,
                    "Trimming extracted audio buffer from ${monoSamples.size} to ${monoSampleCount} samples for ${file.name}",
                )
                monoSamples.copyOf(monoSampleCount)
            }

            return AudioData(finalSamples, outputSampleRate)
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting audio: ${e.message}")
            e.printStackTrace()
            return null
        } finally {
            try {
                decoder?.stop()
            } catch (_: Exception) {
                // Best-effort cleanup.
            }
            try {
                decoder?.release()
            } catch (_: Exception) {
                // Best-effort cleanup.
            }
            try {
                extractor?.release()
            } catch (_: Exception) {
                // Best-effort cleanup.
            }
            try {
                inputStream?.close()
            } catch (_: Exception) {
                // Best-effort cleanup.
            }
        }
    }

    fun getAudioDurationUs(file: File): Long? {
        var extractor: MediaExtractor? = null
        var inputStream: FileInputStream? = null
        return try {
            extractor = MediaExtractor()
            inputStream = setDataSource(extractor, file)
            val trackInfo = findAudioTrack(extractor) ?: return null
            val (_, audioFormat) = trackInfo
            if (audioFormat.containsKey(MediaFormat.KEY_DURATION)) {
                audioFormat.getLong(MediaFormat.KEY_DURATION)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading audio duration: ${e.message}")
            null
        } finally {
            try {
                extractor?.release()
            } catch (_: Exception) {
                // Best-effort cleanup.
            }
            try {
                inputStream?.close()
            } catch (_: Exception) {
                // Best-effort cleanup.
            }
        }
    }

    private fun findAudioTrack(extractor: MediaExtractor): Pair<Int, MediaFormat>? {
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME)
            if (mime?.startsWith("audio/") == true) {
                return i to format
            }
        }
        return null
    }

    private fun estimateMonoFrameCount(
        audioFormat: MediaFormat,
        sampleRate: Int,
        maxDurationUs: Long?,
    ): Int {
        val durationUs = maxDurationUs ?: if (audioFormat.containsKey(MediaFormat.KEY_DURATION)) {
            audioFormat.getLong(MediaFormat.KEY_DURATION)
        } else {
            0L
        }
        if (durationUs <= 0L) {
            return sampleRate * DEFAULT_INITIAL_DURATION_SECONDS
        }

        val estimatedFrames = kotlin.math.ceil(
            durationUs.toDouble() * sampleRate.toDouble() / 1_000_000.0,
        ).toLong()
        val safetyFrames = (sampleRate / 2).coerceAtLeast(1024)
        return (estimatedFrames + safetyFrames.toLong())
            .coerceAtMost(Int.MAX_VALUE.toLong())
            .toInt()
            .coerceAtLeast(sampleRate)
    }

    private fun ensureCapacity(samples: FloatArray, requiredCapacity: Int): FloatArray {
        if (requiredCapacity <= samples.size) {
            return samples
        }

        if (samples.size >= 1_000_000) {
            return samples.copyOf(requiredCapacity)
        }

        var newCapacity = samples.size.coerceAtLeast(1)
        while (newCapacity < requiredCapacity) {
            newCapacity *= 2
        }
        return samples.copyOf(newCapacity)
    }

    private class StreamingLinearResampler(
        inputSampleRate: Int,
        outputSampleRate: Int,
    ) {
        private val step = inputSampleRate.toDouble() / outputSampleRate.toDouble()
        private var nextOutputSourceIndex = 0.0
        private var totalInputSamplesSeen = 0L
        private var previousSample = 0f
        private var hasPreviousSample = false

        fun processChunk(input: FloatArray): FloatArray {
            if (input.isEmpty()) {
                return input
            }

            var output = FloatArray(estimateCapacity(input.size))
            var outputCount = 0

            for (sample in input) {
                val currentSourceIndex = totalInputSamplesSeen
                if (!hasPreviousSample) {
                    if (nextOutputSourceIndex <= currentSourceIndex.toDouble()) {
                        output = ensureCapacity(output, outputCount + 1)
                        output[outputCount++] = sample
                        nextOutputSourceIndex += step
                    }
                    previousSample = sample
                    hasPreviousSample = true
                    totalInputSamplesSeen += 1
                    continue
                }

                val lowerIndex = currentSourceIndex - 1
                val upperIndex = currentSourceIndex
                val lowerSample = previousSample

                while (nextOutputSourceIndex <= upperIndex.toDouble()) {
                    val interpolation =
                        (nextOutputSourceIndex - lowerIndex.toDouble()).coerceIn(0.0, 1.0).toFloat()
                    val value = lowerSample + ((sample - lowerSample) * interpolation)
                    output = ensureCapacity(output, outputCount + 1)
                    output[outputCount++] = value
                    nextOutputSourceIndex += step
                }

                previousSample = sample
                totalInputSamplesSeen += 1
            }

            return output.copyOf(outputCount)
        }

        private fun estimateCapacity(inputFrameCount: Int): Int {
            val estimated = kotlin.math.ceil(inputFrameCount.toDouble() / step).toInt()
            return estimated.coerceAtLeast(1)
        }
    }
}
