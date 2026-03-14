package net.siteed.audiostream

import android.media.AudioFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.*

object AudioFormatUtils {
    /**
     * Converts a byte array of audio data to a float array based on the given encoding.
     * @param audioData The raw audio data in bytes.
     * @param encoding The encoding format (e.g., "pcm_8bit", "pcm_16bit", "pcm_32bit").
     * @return A float array with normalized audio samples in the range [-1.0, 1.0].
     */
    fun convertByteArrayToFloatArray(audioData: ByteArray, encoding: String): FloatArray {
        return when (encoding) {
            "pcm_8bit" -> {
                val floatArray = FloatArray(audioData.size)
                for (i in audioData.indices) {
                    // Convert unsigned 8-bit to float in range [-1.0, 1.0]
                    floatArray[i] = ((audioData[i].toInt() and 0xFF) - 128) / 128.0f
                }
                floatArray
            }
            "pcm_16bit" -> {
                val floatArray = FloatArray(audioData.size / 2)
                val buffer = ByteBuffer.wrap(audioData).order(ByteOrder.LITTLE_ENDIAN)
                for (i in floatArray.indices) {
                    floatArray[i] = buffer.short / 32768.0f // Normalize to [-1.0, 1.0]
                }
                floatArray
            }
            "pcm_32bit" -> {
                val floatArray = FloatArray(audioData.size / 4)
                val buffer = ByteBuffer.wrap(audioData).order(ByteOrder.LITTLE_ENDIAN)
                for (i in floatArray.indices) {
                    floatArray[i] = buffer.int / 2_147_483_648.0f // Normalize to [-1.0, 1.0]
                }
                floatArray
            }
            else -> {
                // Default to 16-bit PCM if encoding is not recognized
                val floatArray = FloatArray(audioData.size / 2)
                val buffer = ByteBuffer.wrap(audioData).order(ByteOrder.LITTLE_ENDIAN)
                for (i in floatArray.indices) {
                    floatArray[i] = buffer.short / 32768.0f
                }
                floatArray
            }
        }
    }

    /**
     * Calculates the bit depth (number of bits per sample) based on the encoding string.
     * @param encoding The encoding format (e.g., "pcm_8bit", "pcm_16bit", "pcm_32bit").
     * @return The bit depth as an integer.
     */
    fun getBitDepth(encoding: String): Int {
        return when (encoding) {
            "pcm_8bit" -> 8
            "pcm_16bit" -> 16
            "pcm_32bit" -> 32
            else -> 16 // Default to 16-bit if not recognized
        }
    }

    /**
     * Determines the AudioFormat encoding constant based on the encoding string.
     * @param encoding The encoding format (e.g., "pcm_8bit", "pcm_16bit", "pcm_32bit").
     * @return The corresponding AudioFormat constant.
     */
    fun getAudioFormat(encoding: String): Int {
        return when (encoding) {
            "pcm_8bit" -> AudioFormat.ENCODING_PCM_8BIT
            "pcm_16bit" -> AudioFormat.ENCODING_PCM_16BIT
            "pcm_32bit" -> AudioFormat.ENCODING_PCM_FLOAT
            else -> AudioFormat.ENCODING_PCM_16BIT // Default to 16-bit PCM
        }
    }

    /**
     * Converts audio data between different bit depths
     * @param audioData The raw audio data
     * @param sourceBitDepth The original bit depth
     * @param targetBitDepth The desired bit depth
     * @return The converted audio data
     */
    fun convertBitDepth(audioData: ByteArray, sourceBitDepth: Int, targetBitDepth: Int): ByteArray {
        if (sourceBitDepth == targetBitDepth || audioData.isEmpty()) {
            return audioData
        }
        
        return when {
            sourceBitDepth == 8 && targetBitDepth == 16 -> convert8to16(audioData)
            sourceBitDepth == 16 && targetBitDepth == 8 -> convert16to8(audioData)
            sourceBitDepth == 16 && targetBitDepth == 32 -> convert16to32(audioData)
            sourceBitDepth == 32 && targetBitDepth == 16 -> convert32to16(audioData)
            sourceBitDepth == 8 && targetBitDepth == 32 -> {
                // Convert 8 -> 16 -> 32
                val temp16 = convert8to16(audioData)
                convert16to32(temp16)
            }
            sourceBitDepth == 32 && targetBitDepth == 8 -> {
                // Convert 32 -> 16 -> 8
                val temp16 = convert32to16(audioData)
                convert16to8(temp16)
            }
            else -> throw IllegalArgumentException("Unsupported bit depth conversion: $sourceBitDepth to $targetBitDepth")
        }
    }
    
    private fun convert8to16(data: ByteArray): ByteArray {
        val output = ByteBuffer.allocate(data.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        for (sample in data) {
            // Convert unsigned 8-bit (0-255) to signed 16-bit (-32768 to 32767)
            val unsigned = sample.toInt() and 0xFF
            // Map [0, 255] to [-32768, 32767]
            // Special case for 0 to map to -32768
            val signed16 = when (unsigned) {
                0 -> -32768
                255 -> 32767
                else -> {
                    val normalized = (unsigned - 128) / 128.0f
                    (normalized * 32768).toInt().coerceIn(-32768, 32767)
                }
            }.toShort()
            output.putShort(signed16)
        }
        return output.array()
    }
    
    private fun convert16to8(data: ByteArray): ByteArray {
        val input = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
        val output = ByteArray(data.size / 2)
        
        for (i in output.indices) {
            // Convert signed 16-bit to unsigned 8-bit
            val sample16 = input.getShort()
            // Map [-32768, 32767] to [0, 255]
            val normalized = sample16 / 32768.0f
            val sample8 = ((normalized * 128) + 128).toInt().coerceIn(0, 255).toByte()
            output[i] = sample8
        }
        return output
    }
    
    private fun convert16to32(data: ByteArray): ByteArray {
        val input = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
        val output = ByteBuffer.allocate(data.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        
        while (input.hasRemaining()) {
            val sample16 = input.getShort()
            // Scale 16-bit to 32-bit range
            val sample32 = (sample16.toInt() shl 16)
            output.putInt(sample32)
        }
        return output.array()
    }
    
    private fun convert32to16(data: ByteArray): ByteArray {
        val input = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
        val output = ByteBuffer.allocate(data.size / 2).order(ByteOrder.LITTLE_ENDIAN)
        
        while (input.hasRemaining()) {
            val sample32 = input.getInt()
            // Scale 32-bit to 16-bit range
            val sample16 = (sample32 shr 16).toShort()
            output.putShort(sample16)
        }
        return output.array()
    }

    /**
     * Convert between different channel configurations
     */
    fun convertChannels(data: ByteArray, fromChannels: Int, toChannels: Int, bitDepth: Int): ByteArray {
        if (fromChannels == toChannels || data.isEmpty()) {
            return data
        }
        
        val bytesPerSample = bitDepth / 8
        val samplesPerFrame = fromChannels
        val totalFrames = data.size / (bytesPerSample * samplesPerFrame)
        
        return when {
            fromChannels == 1 && toChannels == 2 -> monoToStereo(data, bitDepth, totalFrames)
            fromChannels == 2 && toChannels == 1 -> stereoToMono(data, bitDepth, totalFrames)
            else -> throw IllegalArgumentException("Unsupported channel conversion: $fromChannels to $toChannels")
        }
    }
    
    private fun monoToStereo(data: ByteArray, bitDepth: Int, totalFrames: Int): ByteArray {
        val bytesPerSample = bitDepth / 8
        val output = ByteBuffer.allocate(data.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        val input = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
        
        for (i in 0 until totalFrames) {
            when (bitDepth) {
                16 -> {
                    val sample = input.getShort()
                    output.putShort(sample) // Left
                    output.putShort(sample) // Right
                }
                32 -> {
                    val sample = input.getInt()
                    output.putInt(sample) // Left
                    output.putInt(sample) // Right
                }
                8 -> {
                    val sample = input.get()
                    output.put(sample) // Left
                    output.put(sample) // Right
                }
            }
        }
        return output.array()
    }
    
    private fun stereoToMono(data: ByteArray, bitDepth: Int, totalFrames: Int): ByteArray {
        val bytesPerSample = bitDepth / 8
        val output = ByteBuffer.allocate(data.size / 2).order(ByteOrder.LITTLE_ENDIAN)
        val input = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
        
        for (i in 0 until totalFrames) {
            when (bitDepth) {
                16 -> {
                    val left = input.getShort()
                    val right = input.getShort()
                    val mono = ((left + right) / 2).toShort()
                    output.putShort(mono)
                }
                32 -> {
                    val left = input.getInt()
                    val right = input.getInt()
                    val mono = ((left.toLong() + right.toLong()) / 2).toInt()
                    output.putInt(mono)
                }
                8 -> {
                    val left = input.get().toInt() and 0xFF
                    val right = input.get().toInt() and 0xFF
                    val mono = ((left + right) / 2).toByte()
                    output.put(mono)
                }
            }
        }
        return output.array()
    }
    
    /**
     * Normalize audio to maximum amplitude
     */
    fun normalizeAudio(data: ByteArray, bitDepth: Int): ByteArray {
        if (data.isEmpty()) return data
        
        val input = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
        var maxAmplitude = 0
        
        // Find maximum amplitude
        input.rewind()
        when (bitDepth) {
            16 -> {
                while (input.hasRemaining()) {
                    val sample = abs(input.getShort().toInt())
                    maxAmplitude = maxOf(maxAmplitude, sample)
                }
            }
            32 -> {
                while (input.hasRemaining()) {
                    val sample = abs(input.getInt())
                    maxAmplitude = maxOf(maxAmplitude, sample)
                }
            }
            8 -> {
                while (input.hasRemaining()) {
                    val sample = abs((input.get().toInt() and 0xFF) - 128)
                    maxAmplitude = maxOf(maxAmplitude, sample)
                }
            }
        }
        
        // If already at max or silent, return as is
        if (maxAmplitude == 0) return data
        
        val maxValue = when (bitDepth) {
            16 -> Short.MAX_VALUE.toInt()
            32 -> Int.MAX_VALUE
            8 -> 127
            else -> throw IllegalArgumentException("Unsupported bit depth: $bitDepth")
        }
        
        if (maxAmplitude >= maxValue) return data
        
        // Normalize
        val scaleFactor = maxValue.toFloat() / maxAmplitude
        val output = ByteBuffer.allocate(data.size).order(ByteOrder.LITTLE_ENDIAN)
        input.rewind()
        
        when (bitDepth) {
            16 -> {
                while (input.hasRemaining()) {
                    val sample = input.getShort()
                    val normalized = (sample * scaleFactor).toInt().coerceIn(-32768, 32767).toShort()
                    output.putShort(normalized)
                }
            }
            32 -> {
                while (input.hasRemaining()) {
                    val sample = input.getInt()
                    val normalized = (sample * scaleFactor).toLong().coerceIn(Int.MIN_VALUE.toLong(), Int.MAX_VALUE.toLong()).toInt()
                    output.putInt(normalized)
                }
            }
            8 -> {
                while (input.hasRemaining()) {
                    val sample = (input.get().toInt() and 0xFF) - 128
                    val normalized = ((sample * scaleFactor).toInt() + 128).coerceIn(0, 255).toByte()
                    output.put(normalized)
                }
            }
        }
        
        return output.array()
    }
    
    /**
     * Resample audio data to a different sample rate
     */
    fun resampleAudio(samples: FloatArray, fromSampleRate: Int, toSampleRate: Int): FloatArray {
        if (fromSampleRate == toSampleRate || samples.isEmpty()) {
            return samples
        }
        
        val resampleRatio = toSampleRate.toDouble() / fromSampleRate
        val newLength = (samples.size * resampleRatio).toInt()
        val resampled = FloatArray(newLength)
        
        for (i in resampled.indices) {
            val sourceIndex = i / resampleRatio
            val sourceIndexInt = sourceIndex.toInt()
            val fraction = sourceIndex - sourceIndexInt
            
            if (sourceIndexInt >= samples.size - 1) {
                resampled[i] = samples.last()
            } else {
                // Linear interpolation
                val sample1 = samples[sourceIndexInt]
                val sample2 = samples[sourceIndexInt + 1]
                resampled[i] = (sample1 * (1 - fraction) + sample2 * fraction).toFloat()
            }
        }
        
        return resampled
    }
}