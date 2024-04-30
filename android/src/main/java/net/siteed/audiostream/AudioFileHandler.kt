package net.siteed.audiostream

import java.io.File
import java.io.IOException
import java.io.OutputStream
import java.io.RandomAccessFile

class AudioFileHandler(private val filesDir: File) {
    // Method to write WAV file header
    fun writeWavHeader(out: OutputStream, sampleRateInHz: Int, channels: Int, bitDepth: Int) {
        val header = ByteArray(44)
        val byteRate = sampleRateInHz * channels * bitDepth / 8
        val blockAlign = channels * bitDepth / 8

        // RIFF/WAVE header
        "RIFF".toByteArray().copyInto(header, 0)
        header[4] = 0 // Size will be updated later
        "WAVE".toByteArray().copyInto(header, 8)
        "fmt ".toByteArray().copyInto(header, 12)

        // 16 for PCM
        header[16] = 16
        header[20] = 1 // Audio format 1 for PCM (not compressed)
        header[22] = channels.toByte()
        header[24] = (sampleRateInHz and 0xff).toByte()
        header[25] = (sampleRateInHz shr 8 and 0xff).toByte()
        header[26] = (sampleRateInHz shr 16 and 0xff).toByte()
        header[27] = (sampleRateInHz shr 24 and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte()
        header[29] = (byteRate shr 8 and 0xff).toByte()
        header[30] = (byteRate shr 16 and 0xff).toByte()
        header[31] = (byteRate shr 24 and 0xff).toByte()
        header[32] = blockAlign.toByte()
        header[34] = bitDepth.toByte()
        "data".toByteArray().copyInto(header, 36)

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
}