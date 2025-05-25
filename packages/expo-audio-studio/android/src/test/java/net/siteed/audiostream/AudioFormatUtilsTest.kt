package net.siteed.audiostream

import org.junit.Test
import org.junit.Assert.*
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs

class AudioFormatUtilsTest {

    @Test
    fun testConvertBitDepth_8to16() {
        // Given - 8-bit PCM data (unsigned, centered at 128)
        val input8bit = byteArrayOf(0, 64, 128.toByte(), 192.toByte(), 255.toByte())
        
        // When
        val output16bit = AudioFormatUtils.convertBitDepth(input8bit, 8, 16)
        
        // Then
        val buffer = ByteBuffer.wrap(output16bit).order(ByteOrder.LITTLE_ENDIAN)
        val samples = ShortArray(output16bit.size / 2)
        buffer.asShortBuffer().get(samples)
        
        // Verify conversion (8-bit 128 = silence = 16-bit 0)
        assertEquals("First sample should be -32768", -32768, samples[0].toInt())
        assertEquals("Middle sample (128) should be 0", 0, samples[2].toInt())
        assertEquals("Last sample should be 32767", 32767, samples[4].toInt())
    }

    @Test
    fun testConvertBitDepth_16to8() {
        // Given - 16-bit PCM data
        val buffer16 = ByteBuffer.allocate(10).order(ByteOrder.LITTLE_ENDIAN)
        buffer16.putShort(-32768) // Min value
        buffer16.putShort(-16384) // -0.5
        buffer16.putShort(0)      // Silence
        buffer16.putShort(16384)  // 0.5
        buffer16.putShort(32767)  // Max value
        
        // When
        val output8bit = AudioFormatUtils.convertBitDepth(buffer16.array(), 16, 8)
        
        // Then
        assertEquals("Should have 5 samples", 5, output8bit.size)
        assertEquals("Min should convert to 0", 0, output8bit[0].toInt() and 0xFF)
        assertEquals("Silence should convert to 128", 128, output8bit[2].toInt() and 0xFF)
        assertEquals("Max should convert to 255", 255, output8bit[4].toInt() and 0xFF)
    }

    @Test
    fun testConvertBitDepth_16to32() {
        // Given - 16-bit PCM data
        val buffer16 = ByteBuffer.allocate(6).order(ByteOrder.LITTLE_ENDIAN)
        buffer16.putShort(-32768) // Min
        buffer16.putShort(0)      // Silence
        buffer16.putShort(32767)  // Max
        
        // When
        val output32bit = AudioFormatUtils.convertBitDepth(buffer16.array(), 16, 32)
        
        // Then
        val buffer32 = ByteBuffer.wrap(output32bit).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("Should have 3 32-bit samples", 12, output32bit.size)
        
        // Check values (scaled appropriately)
        val sample1 = buffer32.getInt()
        val sample2 = buffer32.getInt()
        val sample3 = buffer32.getInt()
        
        assertTrue("Min value should be negative", sample1 < 0)
        assertEquals("Silence should be 0", 0, sample2)
        assertTrue("Max value should be positive", sample3 > 0)
    }

    @Test
    fun testConvertBitDepth_32to16() {
        // Given - 32-bit PCM data
        val buffer32 = ByteBuffer.allocate(12).order(ByteOrder.LITTLE_ENDIAN)
        buffer32.putInt(Int.MIN_VALUE)  // Min
        buffer32.putInt(0)              // Silence
        buffer32.putInt(Int.MAX_VALUE)  // Max
        
        // When
        val output16bit = AudioFormatUtils.convertBitDepth(buffer32.array(), 32, 16)
        
        // Then
        val buffer16 = ByteBuffer.wrap(output16bit).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("Should have 3 16-bit samples", 6, output16bit.size)
        
        assertEquals("Min should convert to -32768", -32768, buffer16.getShort().toInt())
        assertEquals("Silence should be 0", 0, buffer16.getShort().toInt())
        assertEquals("Max should convert to 32767", 32767, buffer16.getShort().toInt())
    }

    @Test
    fun testConvertBitDepth_sameDepth() {
        // Given
        val input = byteArrayOf(1, 2, 3, 4, 5, 6)
        
        // When - Convert 16 to 16 (no-op)
        val output = AudioFormatUtils.convertBitDepth(input, 16, 16)
        
        // Then
        assertArrayEquals("Should return same data", input, output)
    }

    @Test
    fun testConvertBitDepth_emptyData() {
        // Given
        val emptyData = byteArrayOf()
        
        // When
        val output = AudioFormatUtils.convertBitDepth(emptyData, 16, 32)
        
        // Then
        assertEquals("Should return empty array", 0, output.size)
    }

    @Test
    fun testConvertChannels_monoToStereo() {
        // Given - Mono 16-bit data
        val monoData = ByteBuffer.allocate(6).order(ByteOrder.LITTLE_ENDIAN).apply {
            putShort(1000)
            putShort(2000)
            putShort(3000)
        }.array()
        
        // When
        val stereoData = AudioFormatUtils.convertChannels(monoData, 1, 2, 16)
        
        // Then
        val buffer = ByteBuffer.wrap(stereoData).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("Should have 6 samples (3 stereo pairs)", 12, stereoData.size)
        
        // Each mono sample should be duplicated to both channels
        assertEquals("L1", 1000, buffer.getShort().toInt())
        assertEquals("R1", 1000, buffer.getShort().toInt())
        assertEquals("L2", 2000, buffer.getShort().toInt())
        assertEquals("R2", 2000, buffer.getShort().toInt())
        assertEquals("L3", 3000, buffer.getShort().toInt())
        assertEquals("R3", 3000, buffer.getShort().toInt())
    }

    @Test
    fun testConvertChannels_stereoToMono() {
        // Given - Stereo 16-bit data
        val stereoData = ByteBuffer.allocate(8).order(ByteOrder.LITTLE_ENDIAN).apply {
            putShort(1000)  // L1
            putShort(2000)  // R1
            putShort(3000)  // L2
            putShort(4000)  // R2
        }.array()
        
        // When
        val monoData = AudioFormatUtils.convertChannels(stereoData, 2, 1, 16)
        
        // Then
        val buffer = ByteBuffer.wrap(monoData).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("Should have 2 mono samples", 4, monoData.size)
        
        // Each mono sample should be average of L+R
        assertEquals("Sample 1", 1500, buffer.getShort().toInt()) // (1000+2000)/2
        assertEquals("Sample 2", 3500, buffer.getShort().toInt()) // (3000+4000)/2
    }

    @Test
    fun testNormalizeAudio_quietSignal() {
        // Given - Quiet 16-bit signal
        val quietData = ByteBuffer.allocate(6).order(ByteOrder.LITTLE_ENDIAN).apply {
            putShort(100)
            putShort(-100)
            putShort(50)
        }.array()
        
        // When
        val normalized = AudioFormatUtils.normalizeAudio(quietData, 16)
        
        // Then
        val buffer = ByteBuffer.wrap(normalized).order(ByteOrder.LITTLE_ENDIAN)
        val maxSample = abs(buffer.getShort().toInt())
        buffer.rewind()
        
        // The loudest sample should be close to max value
        assertTrue("Should be normalized to near max", maxSample > 30000)
    }

    @Test
    fun testNormalizeAudio_alreadyLoud() {
        // Given - Already loud signal
        val loudData = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).apply {
            putShort(32000)
            putShort(-32000)
        }.array()
        
        // When
        val normalized = AudioFormatUtils.normalizeAudio(loudData, 16)
        
        // Then
        val buffer = ByteBuffer.wrap(normalized).order(ByteOrder.LITTLE_ENDIAN)
        val sample1 = abs(buffer.getShort().toInt())
        val sample2 = abs(buffer.getShort().toInt())
        
        // Should be normalized but not clipped
        assertTrue("Samples should be near max", sample1 > 32000 && sample2 > 32000)
        assertTrue("Samples should not exceed max", sample1 <= 32767 && sample2 <= 32767)
    }

    @Test
    fun testNormalizeAudio_silentSignal() {
        // Given - Silent signal
        val silentData = ByteBuffer.allocate(6).order(ByteOrder.LITTLE_ENDIAN).apply {
            putShort(0)
            putShort(0)
            putShort(0)
        }.array()
        
        // When
        val normalized = AudioFormatUtils.normalizeAudio(silentData, 16)
        
        // Then
        val buffer = ByteBuffer.wrap(normalized).order(ByteOrder.LITTLE_ENDIAN)
        assertEquals("Silent should remain silent", 0, buffer.getShort().toInt())
        assertEquals("Silent should remain silent", 0, buffer.getShort().toInt())
        assertEquals("Silent should remain silent", 0, buffer.getShort().toInt())
    }

    @Test
    fun testResampleAudio_upsample() {
        // Given - 8kHz mono audio
        val samples8k = floatArrayOf(0.0f, 0.5f, 1.0f, 0.5f, 0.0f, -0.5f, -1.0f, -0.5f)
        
        // When - Upsample to 16kHz
        val samples16k = AudioFormatUtils.resampleAudio(samples8k, 8000, 16000)
        
        // Then
        assertEquals("Should have approximately double samples", 16, samples16k.size)
        // First and last samples should match
        assertEquals("First sample", samples8k[0], samples16k[0], 0.01f)
        assertEquals("Last sample", samples8k.last(), samples16k.last(), 0.01f)
    }

    @Test
    fun testResampleAudio_downsample() {
        // Given - 16kHz mono audio
        val samples16k = floatArrayOf(
            0.0f, 0.25f, 0.5f, 0.75f, 1.0f, 0.75f, 0.5f, 0.25f,
            0.0f, -0.25f, -0.5f, -0.75f, -1.0f, -0.75f, -0.5f, -0.25f
        )
        
        // When - Downsample to 8kHz
        val samples8k = AudioFormatUtils.resampleAudio(samples16k, 16000, 8000)
        
        // Then
        assertEquals("Should have approximately half samples", 8, samples8k.size)
        // Check general shape is preserved
        val maxValue = samples8k.maxOrNull() ?: 0f
        val minValue = samples8k.minOrNull() ?: 0f
        assertTrue("Peak should be preserved", maxValue > 0.9f)
        assertTrue("Trough should be preserved", minValue < -0.9f)
    }

    @Test
    fun testResampleAudio_sameRate() {
        // Given
        val samples = floatArrayOf(0.1f, 0.2f, 0.3f, 0.4f, 0.5f)
        
        // When - Same sample rate
        val resampled = AudioFormatUtils.resampleAudio(samples, 44100, 44100)
        
        // Then
        assertArrayEquals("Should return same samples", samples, resampled, 0.001f)
    }
} 