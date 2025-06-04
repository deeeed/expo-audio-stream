package net.siteed.audiostream.integration

import android.media.MediaExtractor
import android.media.MediaFormat
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import net.siteed.audiostream.AudioRecorderManager
import net.siteed.audiostream.OutputConfig
import net.siteed.audiostream.RecordingConfig
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class M4aFormatTest {
    private lateinit var recorderManager: AudioRecorderManager
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val testDir = File(context.cacheDir, "m4a_test_${System.currentTimeMillis()}")

    @Before
    fun setUp() {
        testDir.mkdirs()
        recorderManager = AudioRecorderManager(context)
    }

    @After
    fun tearDown() {
        try {
            recorderManager.stopRecording(createTestPromise())
        } catch (e: Exception) {
            // Ignore - might not be recording
        }
        testDir.deleteRecursively()
    }

    @Test
    fun testAacFormat_producesM4aByDefault() {
        // Given
        val config = RecordingConfig(
            sampleRate = 44100,
            channels = 1,
            outputDirectory = testDir.absolutePath,
            filename = "test_m4a_default",
            output = OutputConfig(
                primary = OutputConfig.PrimaryOutput(enabled = false),
                compressed = OutputConfig.CompressedOutput(
                    enabled = true,
                    format = "aac"
                )
            )
        )

        // When
        val promise = createTestPromise()
        recorderManager.prepareRecording(config.toMap(), promise)
        val result = recorderManager.startRecording(promise)
        
        Thread.sleep(1000) // Record for 1 second
        
        val stopResult = recorderManager.stopRecording(promise)

        // Then
        assertNotNull("Start result should not be null", result)
        assertNotNull("Stop result should not be null", stopResult)
        
        val compressedUri = stopResult.getString("compressedFileUri")
        assertNotNull("Compressed file URI should not be null", compressedUri)
        
        val file = File(compressedUri.removePrefix("file://"))
        assertTrue("File should exist", file.exists())
        assertTrue("File should have .m4a extension", file.name.endsWith(".m4a"))
        
        // Verify it's actually an M4A file
        verifyM4aFormat(file)
    }

    @Test
    fun testAacFormat_withPreferRawStream_producesAac() {
        // Given
        val config = RecordingConfig(
            sampleRate = 44100,
            channels = 1,
            outputDirectory = testDir.absolutePath,
            filename = "test_raw_aac",
            output = OutputConfig(
                primary = OutputConfig.PrimaryOutput(enabled = false),
                compressed = OutputConfig.CompressedOutput(
                    enabled = true,
                    format = "aac",
                    preferRawStream = true
                )
            )
        )

        // When
        val promise = createTestPromise()
        recorderManager.prepareRecording(config.toMap(), promise)
        val result = recorderManager.startRecording(promise)
        
        Thread.sleep(1000) // Record for 1 second
        
        val stopResult = recorderManager.stopRecording(promise)

        // Then
        assertNotNull("Start result should not be null", result)
        assertNotNull("Stop result should not be null", stopResult)
        
        val compressedUri = stopResult.getString("compressedFileUri")
        assertNotNull("Compressed file URI should not be null", compressedUri)
        
        val file = File(compressedUri.removePrefix("file://"))
        assertTrue("File should exist", file.exists())
        assertTrue("File should have .aac extension", file.name.endsWith(".aac"))
        
        // Verify it's actually an AAC ADTS file
        verifyAacAdtsFormat(file)
    }

    @Test
    fun testOpusFormat_producesOpus() {
        // Given
        val config = RecordingConfig(
            sampleRate = 48000,
            channels = 1,
            outputDirectory = testDir.absolutePath,
            filename = "test_opus",
            output = OutputConfig(
                primary = OutputConfig.PrimaryOutput(enabled = false),
                compressed = OutputConfig.CompressedOutput(
                    enabled = true,
                    format = "opus"
                )
            )
        )

        // When
        val promise = createTestPromise()
        recorderManager.prepareRecording(config.toMap(), promise)
        val result = recorderManager.startRecording(promise)
        
        Thread.sleep(1000) // Record for 1 second
        
        val stopResult = recorderManager.stopRecording(promise)

        // Then
        assertNotNull("Start result should not be null", result)
        assertNotNull("Stop result should not be null", stopResult)
        
        val compressedUri = stopResult.getString("compressedFileUri")
        assertNotNull("Compressed file URI should not be null", compressedUri)
        
        val file = File(compressedUri.removePrefix("file://"))
        assertTrue("File should exist", file.exists())
        assertTrue("File should have .opus extension", file.name.endsWith(".opus"))
    }

    private fun verifyM4aFormat(file: File) {
        val extractor = MediaExtractor()
        try {
            extractor.setDataSource(file.absolutePath)
            assertTrue("Should have at least one track", extractor.trackCount > 0)
            
            val format = extractor.getTrackFormat(0)
            val mimeType = format.getString(MediaFormat.KEY_MIME)
            assertTrue("MIME type should be AAC", mimeType?.contains("aac", ignoreCase = true) == true)
            
            // Read file header to verify MP4 container
            val header = file.inputStream().use { it.readNBytes(12) }
            val ftypIndex = header.indexOf("ftyp".toByteArray()[0])
            assertTrue("File should contain ftyp box (MP4 container)", ftypIndex >= 0)
        } finally {
            extractor.release()
        }
    }

    private fun verifyAacAdtsFormat(file: File) {
        // ADTS header starts with 0xFFF
        val header = file.inputStream().use { it.readNBytes(2) }
        val syncWord = ((header[0].toInt() and 0xFF) shl 4) or ((header[1].toInt() and 0xF0) shr 4)
        assertEquals("ADTS sync word should be 0xFFF", 0xFFF, syncWord)
    }

    private fun createTestPromise(): TestPromise = TestPromise()

    private fun RecordingConfig.toMap(): Map<String, Any?> = mapOf(
        "sampleRate" to sampleRate,
        "channels" to channels,
        "encoding" to encoding,
        "outputDirectory" to outputDirectory,
        "filename" to filename,
        "output" to mapOf(
            "primary" to mapOf(
                "enabled" to output.primary.enabled,
                "format" to output.primary.format
            ),
            "compressed" to mapOf(
                "enabled" to output.compressed.enabled,
                "format" to output.compressed.format,
                "bitrate" to output.compressed.bitrate,
                "preferRawStream" to output.compressed.preferRawStream
            )
        )
    )
}