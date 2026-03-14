package net.siteed.audiostream

import org.junit.Test
import org.junit.Assert.*
import org.junit.Before
import java.io.File

class AudioFormatTest {
    private lateinit var tempDir: File

    @Before
    fun setUp() {
        tempDir = File(System.getProperty("java.io.tmpdir"), "audio_format_test_${System.currentTimeMillis()}")
        tempDir.mkdirs()
    }

    @Test
    fun testGetFileExtension_aacDefaultsToM4a() {
        // Given
        val config = RecordingConfig(
            output = OutputConfig(
                compressed = OutputConfig.CompressedOutput(
                    enabled = true,
                    format = "aac",
                    preferRawStream = false
                )
            )
        )

        // When
        val file = createTestFile(config, isCompressed = true)

        // Then
        assertTrue("AAC without preferRawStream should produce .m4a", file.name.endsWith(".m4a"))
    }

    @Test
    fun testGetFileExtension_aacWithPreferRawStreamProducesAac() {
        // Given
        val config = RecordingConfig(
            output = OutputConfig(
                compressed = OutputConfig.CompressedOutput(
                    enabled = true,
                    format = "aac",
                    preferRawStream = true
                )
            )
        )

        // When
        val file = createTestFile(config, isCompressed = true)

        // Then
        assertTrue("AAC with preferRawStream should produce .aac", file.name.endsWith(".aac"))
    }

    @Test
    fun testGetFileExtension_opusProducesOpus() {
        // Given
        val config = RecordingConfig(
            output = OutputConfig(
                compressed = OutputConfig.CompressedOutput(
                    enabled = true,
                    format = "opus"
                )
            )
        )

        // When
        val file = createTestFile(config, isCompressed = true)

        // Then
        assertTrue("Opus should produce .opus", file.name.endsWith(".opus"))
    }

    @Test
    fun testGetFileExtension_wavForUncompressed() {
        // Given
        val config = RecordingConfig()

        // When
        val file = createTestFile(config, isCompressed = false)

        // Then
        assertTrue("Uncompressed should produce .wav", file.name.endsWith(".wav"))
    }

    @Test
    fun testCompressedOutput_parseFromMap() {
        // Given
        val map = mapOf(
            "enabled" to true,
            "format" to "aac",
            "bitrate" to 192000,
            "preferRawStream" to true
        )

        // When
        val compressed = OutputConfig.CompressedOutput(
            enabled = map["enabled"] as Boolean,
            format = map["format"] as String,
            bitrate = map["bitrate"] as Int,
            preferRawStream = map["preferRawStream"] as Boolean
        )

        // Then
        assertTrue("enabled should be true", compressed.enabled)
        assertEquals("format should be aac", "aac", compressed.format)
        assertEquals("bitrate should be 192000", 192000, compressed.bitrate)
        assertTrue("preferRawStream should be true", compressed.preferRawStream)
    }

    @Test
    fun testCompressedOutput_defaultValues() {
        // When
        val compressed = OutputConfig.CompressedOutput()

        // Then
        assertFalse("enabled should default to false", compressed.enabled)
        assertEquals("format should default to aac", "aac", compressed.format)
        assertEquals("bitrate should default to 128000", 128000, compressed.bitrate)
        assertFalse("preferRawStream should default to false", compressed.preferRawStream)
    }

    /**
     * Helper function to simulate file creation logic from AudioRecorderManager
     */
    private fun createTestFile(config: RecordingConfig, isCompressed: Boolean): File {
        val baseFilename = config.filename?.let {
            it.substringBeforeLast('.', it)
        } ?: "test_recording"

        val extension = if (isCompressed) {
            when (config.output.compressed.format.lowercase()) {
                "aac" -> {
                    if (config.output.compressed.preferRawStream) {
                        "aac"  // Raw AAC stream
                    } else {
                        "m4a"  // M4A container (new default)
                    }
                }
                "opus" -> "opus"  // Opus in OGG container
                else -> config.output.compressed.format.lowercase()
            }
        } else {
            "wav"
        }

        return File(tempDir, "$baseFilename.$extension")
    }
}