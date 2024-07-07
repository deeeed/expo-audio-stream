package net.siteed.audiostream

import org.junit.Test
import org.junit.Assert.*

class AudioProcessorTest {

    private val sampleRate = 44100
    private val channels = 1
    private val encoding = "pcm_16bit"
    private val pointsPerSecond = 1000
    private val algorithm = "rms"
    private val features = mapOf("rms" to true, "zcr" to true)

    private val recordingConfig = RecordingConfig(
        sampleRate = sampleRate,
        channels = channels,
        encoding = encoding,
        interval = 1000,
        enableProcessing = true,
        pointsPerSecond = pointsPerSecond,
        algorithm = algorithm,
        features = features
    )

    private val audioProcessor = AudioProcessor()

    @Test
    fun testProcessAudioData() {
        val data = generateSineWave(440.0, sampleRate, 2.0)

        val result = audioProcessor.processAudioData(data, recordingConfig)

        assertNotNull(result)
        assertEquals(pointsPerSecond, result.pointsPerSecond)
        assertEquals((data.size / sampleRate) * 1000, result.durationMs.toInt())
        assertEquals(16, result.bitDepth)
        assertEquals(channels, result.numberOfChannels)
        assertEquals(sampleRate, result.sampleRate.toInt())
    }

    // Helper function to generate a sine wave
    private fun generateSineWave(frequency: Double, sampleRate: Int, durationSeconds: Double): ByteArray {
        val numSamples = (sampleRate * durationSeconds).toInt()
        val output = ByteArray(numSamples * 2) // 16-bit PCM

        for (i in 0 until numSamples) {
            val time = i / sampleRate.toDouble()
            val amplitude = (Math.sin(2.0 * Math.PI * frequency * time) * 32767).toInt()
            output[i * 2] = (amplitude and 0xff).toByte()
            output[i * 2 + 1] = ((amplitude shr 8) and 0xff).toByte()
        }

        return output
    }
}
