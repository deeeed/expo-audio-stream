package net.siteed.audiostream

import org.junit.Test
import org.junit.Assert.*
import org.junit.Before
import org.junit.After
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.test.assertNotNull

class AudioFileHandlerTest {
    private lateinit var tempDir: File
    private lateinit var audioFileHandler: AudioFileHandler

    @Before
    fun setUp() {
        // Create a temporary directory for testing
        tempDir = File(System.getProperty("java.io.tmpdir"), "audio_test_${System.currentTimeMillis()}")
        tempDir.mkdirs()
        audioFileHandler = AudioFileHandler(tempDir)
    }

    @After
    fun tearDown() {
        // Clean up temporary directory
        tempDir.deleteRecursively()
    }

    @Test
    fun testWriteWavHeader_writesCorrectHeaderFormat() {
        // Given
        val outputStream = ByteArrayOutputStream()
        val sampleRate = 44100
        val channels = 2
        val bitDepth = 16

        // When
        audioFileHandler.writeWavHeader(outputStream, sampleRate, channels, bitDepth)
        val header = outputStream.toByteArray()

        // Then
        assertEquals("WAV header should be 44 bytes", 44, header.size)
        
        // Check RIFF header
        assertEquals("Should start with RIFF", "RIFF", String(header.sliceArray(0..3)))
        assertEquals("Should contain WAVE identifier", "WAVE", String(header.sliceArray(8..11)))
        assertEquals("Should contain fmt chunk", "fmt ", String(header.sliceArray(12..15)))
        assertEquals("Should contain data chunk", "data", String(header.sliceArray(36..39)))
        
        // Check audio format (PCM = 1)
        val audioFormat = ByteBuffer.wrap(header.sliceArray(20..21)).order(ByteOrder.LITTLE_ENDIAN).short
        assertEquals("Audio format should be 1 (PCM)", 1, audioFormat.toInt())
        
        // Check channels
        val headerChannels = ByteBuffer.wrap(header.sliceArray(22..23)).order(ByteOrder.LITTLE_ENDIAN).short
        assertEquals("Channels should match", channels, headerChannels.toInt())
        
        // Check sample rate
        val headerSampleRate = ByteBuffer.wrap(header.sliceArray(24..27)).order(ByteOrder.LITTLE_ENDIAN).int
        assertEquals("Sample rate should match", sampleRate, headerSampleRate)
        
        // Check bit depth
        val headerBitDepth = ByteBuffer.wrap(header.sliceArray(34..35)).order(ByteOrder.LITTLE_ENDIAN).short
        assertEquals("Bit depth should match", bitDepth, headerBitDepth.toInt())
    }

    @Test
    fun testWriteWavHeader_calculatesCorrectByteRate() {
        // Given
        val outputStream = ByteArrayOutputStream()
        val sampleRate = 48000
        val channels = 1
        val bitDepth = 24
        val expectedByteRate = sampleRate * channels * bitDepth / 8

        // When
        audioFileHandler.writeWavHeader(outputStream, sampleRate, channels, bitDepth)
        val header = outputStream.toByteArray()

        // Then
        val byteRate = ByteBuffer.wrap(header.sliceArray(28..31)).order(ByteOrder.LITTLE_ENDIAN).int
        assertEquals("Byte rate should be correctly calculated", expectedByteRate, byteRate)
    }

    @Test
    fun testCreateAudioFile_createsFileWithCorrectExtension() {
        // Given
        val extension = "wav"

        // When
        val file = audioFileHandler.createAudioFile(extension)

        // Then
        assertNotNull("File should not be null", file)
        assertTrue("File should exist", file.exists())
        assertTrue("File should have correct extension", file.name.endsWith(".$extension"))
        assertTrue("File should have correct prefix", file.name.startsWith("recording_"))
        
        // Clean up
        file.delete()
    }

    @Test
    fun testCreateAudioFile_createsUniqueFiles() {
        // Given
        val extension = "wav"

        // When
        val file1 = audioFileHandler.createAudioFile(extension)
        Thread.sleep(10) // Small delay to ensure different timestamps
        val file2 = audioFileHandler.createAudioFile(extension)

        // Then
        assertNotEquals("Files should have unique names", file1.name, file2.name)
        assertTrue("First file should exist", file1.exists())
        assertTrue("Second file should exist", file2.exists())
        
        // Clean up
        file1.delete()
        file2.delete()
    }

    @Test
    fun testDeleteFile_deletesExistingFile() {
        // Given
        val file = audioFileHandler.createAudioFile("wav")
        assertTrue("File should exist before deletion", file.exists())

        // When
        val result = audioFileHandler.deleteFile(file)

        // Then
        assertTrue("Delete should return true", result)
        assertFalse("File should not exist after deletion", file.exists())
    }

    @Test
    fun testDeleteFile_handlesNullFile() {
        // When
        val result = audioFileHandler.deleteFile(null)

        // Then
        assertFalse("Delete should return false for null file", result)
    }

    @Test
    fun testDeleteFile_handlesNonExistentFile() {
        // Given
        val nonExistentFile = File(tempDir, "non_existent.wav")
        assertFalse("File should not exist", nonExistentFile.exists())

        // When
        val result = audioFileHandler.deleteFile(nonExistentFile)

        // Then
        assertFalse("Delete should return false for non-existent file", result)
    }

    @Test
    fun testClearAudioStorage_deletesAllFiles() {
        // Given
        val file1 = audioFileHandler.createAudioFile("wav")
        val file2 = audioFileHandler.createAudioFile("mp3")
        val file3 = audioFileHandler.createAudioFile("aac")
        
        assertTrue("File 1 should exist", file1.exists())
        assertTrue("File 2 should exist", file2.exists())
        assertTrue("File 3 should exist", file3.exists())

        // When
        audioFileHandler.clearAudioStorage()

        // Then
        assertFalse("File 1 should be deleted", file1.exists())
        assertFalse("File 2 should be deleted", file2.exists())
        assertFalse("File 3 should be deleted", file3.exists())
        assertEquals("Directory should be empty", 0, tempDir.listFiles()?.size ?: 0)
    }

    @Test
    fun testUpdateWavHeader_updatesFileSizeCorrectly() {
        // Given
        val file = audioFileHandler.createAudioFile("wav")
        val outputStream = file.outputStream()
        
        // Write header
        audioFileHandler.writeWavHeader(outputStream, 44100, 2, 16)
        
        // Write some audio data (1 second of silence)
        val audioDataSize = 44100 * 2 * 2 // sampleRate * channels * bytesPerSample
        val audioData = ByteArray(audioDataSize)
        outputStream.write(audioData)
        outputStream.close()

        // When
        audioFileHandler.updateWavHeader(file)

        // Then
        val updatedHeader = file.inputStream().use { it.readNBytes(44) }
        
        // Check file size field (bytes 4-7)
        val fileSize = ByteBuffer.wrap(updatedHeader.sliceArray(4..7)).order(ByteOrder.LITTLE_ENDIAN).int
        assertEquals("File size should be data size + 36", audioDataSize + 36, fileSize)
        
        // Check data size field (bytes 40-43)
        val dataSize = ByteBuffer.wrap(updatedHeader.sliceArray(40..43)).order(ByteOrder.LITTLE_ENDIAN).int
        assertEquals("Data size should match audio data size", audioDataSize, dataSize)
        
        // Clean up
        file.delete()
    }

    @Test
    fun testLoadRealWavFile_readsHeaderCorrectly() {
        // Given - Load a real WAV file from test resources
        val resourceStream = javaClass.classLoader?.getResourceAsStream("jfk.wav")
        assertNotNull("Test resource jfk.wav should exist", resourceStream)
        
        val testFile = File(tempDir, "test_jfk.wav")
        resourceStream?.use { input ->
            testFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }
        
        // When - Read the WAV header
        val header = testFile.inputStream().use { it.readNBytes(44) }
        
        // Then - Validate header structure
        assertEquals("Should start with RIFF", "RIFF", String(header.sliceArray(0..3)))
        assertEquals("Should contain WAVE identifier", "WAVE", String(header.sliceArray(8..11)))
        assertEquals("Should contain fmt chunk", "fmt ", String(header.sliceArray(12..15)))
        
        // Extract audio properties
        val channels = ByteBuffer.wrap(header.sliceArray(22..23)).order(ByteOrder.LITTLE_ENDIAN).short
        val sampleRate = ByteBuffer.wrap(header.sliceArray(24..27)).order(ByteOrder.LITTLE_ENDIAN).int
        val bitDepth = ByteBuffer.wrap(header.sliceArray(34..35)).order(ByteOrder.LITTLE_ENDIAN).short
        
        // JFK.wav is known to be mono, 16kHz, 16-bit
        assertEquals("JFK audio should be mono", 1, channels.toInt())
        assertEquals("JFK audio should be 16kHz", 16000, sampleRate)
        assertEquals("JFK audio should be 16-bit", 16, bitDepth.toInt())
        
        // Clean up
        testFile.delete()
    }

    @Test
    fun testProcessMultipleRealWavFiles() {
        // Test with different real WAV files to ensure compatibility
        val testFiles = listOf("jfk.wav", "recorder_hello_world.wav", "osr_us_000_0010_8k.wav")
        
        for (fileName in testFiles) {
            val resourceStream = javaClass.classLoader?.getResourceAsStream(fileName)
            if (resourceStream != null) {
                val testFile = File(tempDir, "test_$fileName")
                resourceStream.use { input ->
                    testFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
                
                // Verify file was created and has content
                assertTrue("$fileName should exist", testFile.exists())
                assertTrue("$fileName should have more than just header", testFile.length() > 44)
                
                // Read and validate header
                val header = testFile.inputStream().use { it.readNBytes(44) }
                assertEquals("$fileName should have RIFF header", "RIFF", String(header.sliceArray(0..3)))
                assertEquals("$fileName should have WAVE format", "WAVE", String(header.sliceArray(8..11)))
                
                // Clean up
                testFile.delete()
            }
        }
    }
} 