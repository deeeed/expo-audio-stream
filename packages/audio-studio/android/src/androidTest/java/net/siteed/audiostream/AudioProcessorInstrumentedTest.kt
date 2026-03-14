package net.siteed.audiostream

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.Assert.*
import org.junit.Before
import org.junit.After
import org.junit.runner.RunWith
import java.io.File
import kotlin.math.abs

/**
 * Instrumented tests for AudioProcessor that require Android framework components.
 * These tests run on an Android device/emulator and have access to MediaExtractor/MediaCodec.
 */
@RunWith(AndroidJUnit4::class)
class AudioProcessorInstrumentedTest {
    private lateinit var context: android.content.Context
    private lateinit var audioProcessor: AudioProcessor
    private lateinit var testFilesDir: File

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        testFilesDir = context.filesDir
        audioProcessor = AudioProcessor(testFilesDir)
        
        // Copy test assets to files directory
        copyTestAssets()
    }

    @After
    fun tearDown() {
        // Clean up test files
        testFilesDir.listFiles()?.forEach { file ->
            if (file.name.endsWith(".wav")) {
                file.delete()
            }
        }
    }

    private fun copyTestAssets() {
        val assetManager = context.assets
        val testFiles = listOf("jfk.wav", "chorus.wav", "recorder_hello_world.wav")
        
        testFiles.forEach { fileName ->
            try {
                assetManager.open(fileName).use { input ->
                    File(testFilesDir, fileName).outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
            } catch (e: Exception) {
                // If asset doesn't exist, skip it
                println("Warning: Test asset $fileName not found")
            }
        }
    }

    // ========== Audio Loading Tests ==========

    @Test
    fun testLoadAudioFromAnyFormat_loadsWavFile() {
        // Given
        val wavFile = File(testFilesDir, "jfk.wav")
        assertTrue("Test file should exist", wavFile.exists())

        // When
        val audioData = audioProcessor.loadAudioFromAnyFormat(wavFile.absolutePath, null)

        // Then
        assertNotNull("Audio data should not be null", audioData)
        assertEquals("Sample rate should be 16000", 16000, audioData!!.sampleRate)
        assertEquals("Should be mono", 1, audioData.channels)
        assertEquals("Should be 16-bit", 16, audioData.bitDepth)
        assertTrue("Should have audio data", audioData.data.isNotEmpty())
        assertTrue("Duration should be positive", audioData.durationMs > 0)
    }

    @Test
    fun testLoadAudioFromAnyFormat_withDecodingConfig() {
        // Given
        val wavFile = File(testFilesDir, "jfk.wav")
        val config = DecodingConfig(
            targetSampleRate = 44100,
            targetChannels = 2,  // Test channel conversion - bug fixed
            targetBitDepth = 16,
            normalizeAudio = false
        )

        // When
        val audioData = audioProcessor.loadAudioFromAnyFormat(wavFile.absolutePath, config)

        // Then
        assertNotNull("Audio data should not be null", audioData)
        assertEquals("Sample rate should be converted to 44100", 44100, audioData!!.sampleRate)
        assertEquals("Should be converted to stereo", 2, audioData.channels)
    }

    // ========== Audio Trimming Tests ==========

    @Test
    fun testTrimAudio_basicTrimming() {
        // Given
        val wavFile = File(testFilesDir, "jfk.wav")
        val startTimeMs = 1000L
        val endTimeMs = 3000L

        // When
        val trimmedAudio = audioProcessor.trimAudio(
            fileUri = wavFile.absolutePath,
            startTimeMs = startTimeMs,
            endTimeMs = endTimeMs,
            config = null,
            outputFileName = "trimmed_jfk.wav"
        )

        // Then
        assertNotNull("Trimmed audio should not be null", trimmedAudio)
        
        // Verify the trimmed file was created
        val trimmedFile = File(testFilesDir, "trimmed_jfk.wav")
        assertTrue("Trimmed file should exist", trimmedFile.exists())
    }

    // ========== Mel Spectrogram Tests ==========

    @Test
    fun testExtractMelSpectrogram_basicGeneration() {
        // Given
        val wavFile = File(testFilesDir, "jfk.wav")
        val audioData = audioProcessor.loadAudioFromAnyFormat(wavFile.absolutePath, null)
        assertNotNull("Audio data should load", audioData)

        // When
        val melSpectrogram = audioProcessor.extractMelSpectrogram(
            audioData = audioData!!,
            windowSizeMs = 25f,
            hopLengthMs = 10f,
            nMels = 40,
            fftLength = 512
        )

        // Then
        assertNotNull("Mel spectrogram should not be null", melSpectrogram)
        assertTrue("Should have time frames", melSpectrogram.spectrogram.isNotEmpty())
        assertEquals("Should have 40 mel bins", 40, melSpectrogram.spectrogram[0].size)
        
        // Verify timestamps
        assertTrue("Should have timestamps", melSpectrogram.timeStamps.isNotEmpty())
        assertEquals("Timestamps should match frames", 
            melSpectrogram.spectrogram.size, melSpectrogram.timeStamps.size)
        
        // Verify frequencies
        assertEquals("Should have 40 frequency bins", 40, melSpectrogram.frequencies.size)
        assertTrue("Frequencies should be ascending", 
            melSpectrogram.frequencies.zip(melSpectrogram.frequencies.drop(1))
                .all { (a, b) -> a < b })
    }

    // ========== Preview Generation Tests ==========

    @Test
    fun testGeneratePreview_basicPreview() {
        // Given
        val wavFile = File(testFilesDir, "chorus.wav")
        val audioData = audioProcessor.loadAudioFromAnyFormat(wavFile.absolutePath, null)
        assertNotNull("Audio data should load", audioData)
        
        val config = RecordingConfig(
            sampleRate = audioData!!.sampleRate,
            channels = audioData.channels,
            encoding = "pcm_16bit",
            segmentDurationMs = 20 // 50 points per second
        )

        // When
        val preview = audioProcessor.generatePreview(
            audioData = audioData,
            numberOfPoints = 100,
            startTimeMs = null,
            endTimeMs = null,
            config = config
        )

        // Then
        assertNotNull("Preview should not be null", preview)
        assertEquals("Should have 100 data points", 100, preview.dataPoints.size)
        
        // Verify amplitude range
        assertTrue("Min amplitude should be reasonable", preview.amplitudeRange.min >= 0)
        assertTrue("Max amplitude should be reasonable", preview.amplitudeRange.max <= 1)
        assertTrue("Max should be greater than min", 
            preview.amplitudeRange.max > preview.amplitudeRange.min)
    }
} 