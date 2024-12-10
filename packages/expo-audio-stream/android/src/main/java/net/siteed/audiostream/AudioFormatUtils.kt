package net.siteed.audiostream

import android.media.AudioFormat
import java.nio.ByteBuffer
import java.nio.ByteOrder

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
}