package net.siteed.audiostream

import android.util.Log
import java.io.File
import java.io.IOException
import java.io.OutputStream
import java.io.RandomAccessFile
import java.util.UUID
import net.siteed.audiostream.LogUtils

class AudioFileHandler(private val filesDir: File) {
    companion object {
        private const val CLASS_NAME = "AudioFileHandler"
    }
    
    // Method to write WAV file header
    fun writeWavHeader(out: OutputStream, sampleRateInHz: Int, channels: Int, bitDepth: Int) {
        val header = ByteArray(44)
        val byteRate = sampleRateInHz * channels * bitDepth / 8
        val blockAlign = channels * bitDepth / 8

        // RIFF/WAVE header
        "RIFF".toByteArray().copyInto(header, 0)
        // (file size - 8) to be updated later
        header[4] = 0 // Placeholder
        header[5] = 0 // Placeholder
        header[6] = 0 // Placeholder
        header[7] = 0 // Placeholder
        "WAVE".toByteArray().copyInto(header, 8)
        "fmt ".toByteArray().copyInto(header, 12)

        // 16 for PCM
        header[16] = 16
        header[17] = 0
        header[18] = 0
        header[19] = 0

        // PCM format ID
        header[20] = 1 // Audio format 1 for PCM (not compressed)
        header[21] = 0

        // Number of channels
        header[22] = (channels and 0xff).toByte()
        header[23] = (channels shr 8 and 0xff).toByte()

        // Sample rate
        header[24] = (sampleRateInHz and 0xff).toByte()
        header[25] = (sampleRateInHz shr 8 and 0xff).toByte()
        header[26] = (sampleRateInHz shr 16 and 0xff).toByte()
        header[27] = (sampleRateInHz shr 24 and 0xff).toByte()

        // Byte rate
        header[28] = (byteRate and 0xff).toByte()
        header[29] = (byteRate shr 8 and 0xff).toByte()
        header[30] = (byteRate shr 16 and 0xff).toByte()
        header[31] = (byteRate shr 24 and 0xff).toByte()

        // Block align
        header[32] = (blockAlign and 0xff).toByte()
        header[33] = (blockAlign shr 8 and 0xff).toByte()

        // Bits per sample
        header[34] = (bitDepth and 0xff).toByte()
        header[35] = (bitDepth shr 8 and 0xff).toByte()

        // Data chunk
        "data".toByteArray().copyInto(header, 36)
        // Data size to be updated later
        header[40] = 0 // Placeholder
        header[41] = 0 // Placeholder
        header[42] = 0 // Placeholder
        header[43] = 0 // Placeholder

        out.write(header, 0, 44)
    }

    fun updateWavHeader(file: File) {
        try {
            RandomAccessFile(file, "rw").use { raf ->
                val fileSize = raf.length()
                val dataSize = fileSize - 44 // Subtract the header size

                raf.seek(4) // Write correct file size, excluding the first 8 bytes of the RIFF header
                raf.writeInt(Integer.reverseBytes((dataSize + 36).toInt()))

                raf.seek(40) // Go to the data size position
                raf.writeInt(Integer.reverseBytes(dataSize.toInt())) // Write the size of the data segment
            }
        } catch (e: IOException) {
            println("Could not update WAV header: ${e.message}")
        }
    }

    fun clearAudioStorage() {
        filesDir.listFiles()?.forEach {
            it.delete()
        }
    }

    fun createAudioFile(extension: String): File {
        val timestamp = System.currentTimeMillis()
        val uuid = UUID.randomUUID().toString()
        val filename = "recording_${timestamp}_${uuid}.${extension}"
        
        return try {
            File(filesDir, filename).apply {
                parentFile?.mkdirs() // Create directories if they don't exist
                createNewFile()      // Create the file
            }
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Failed to create audio file", e)
            throw e
        }
    }

    fun deleteFile(file: File?): Boolean {
        return try {
            if (file == null) {
                LogUtils.w(CLASS_NAME, "Attempted to delete null file")
                false
            } else if (!file.exists()) {
                LogUtils.w(CLASS_NAME, "File does not exist: ${file.absolutePath}")
                false
            } else {
                val wasDeleted = file.delete()
                if (!wasDeleted) {
                    LogUtils.w(CLASS_NAME, "Failed to delete file: ${file.absolutePath}")
                }
                wasDeleted
            }
        } catch (e: Exception) {
            LogUtils.e(CLASS_NAME, "Error deleting file: ${file?.absolutePath}", e)
            false
        }
    }
}