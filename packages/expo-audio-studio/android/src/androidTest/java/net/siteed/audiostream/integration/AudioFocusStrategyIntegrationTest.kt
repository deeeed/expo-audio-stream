package net.siteed.audiostream.integration

import android.media.AudioManager
import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.Assert.*
import org.junit.Before
import org.junit.After
import org.junit.runner.RunWith
import net.siteed.audiostream.RecordingConfig
import java.io.File

/**
 * Integration tests for audio focus strategy functionality.
 * These tests run on actual Android devices/emulators to validate that
 * audio focus strategies work correctly in real scenarios.
 */
@RunWith(AndroidJUnit4::class)
class AudioFocusStrategyIntegrationTest {

    private lateinit var context: Context
    private lateinit var audioManager: AudioManager
    private lateinit var filesDir: File

    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        filesDir = context.filesDir
    }

    @After
    fun tearDown() {
        // Clean up any test files
        val testFiles = filesDir.listFiles { _, name -> 
            name.startsWith("test_audio_focus_") 
        }
        testFiles?.forEach { it.delete() }
    }

    @Test
    fun testRecordingConfigWithBackgroundStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to true,
            "autoResumeAfterInterruption" to true,
            "android" to mapOf(
                "audioFocusStrategy" to "background"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, audioFormat) = result.getOrThrow()
        
        // Verify audio focus strategy configuration
        assertEquals("Audio focus strategy should be background", "background", config.audioFocusStrategy)
        assertTrue("keepAwake should be true for background recording", config.keepAwake)
        assertTrue("autoResumeAfterInterruption should be true", config.autoResumeAfterInterruption)
        
        // Verify audio format is properly configured
        assertNotNull("Audio format should be created", audioFormat)
        assertEquals("MIME type should be audio/wav", "audio/wav", audioFormat.mimeType)
    }

    @Test
    fun testRecordingConfigWithInteractiveStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to false,
            "autoResumeAfterInterruption" to true,
            "android" to mapOf(
                "audioFocusStrategy" to "interactive"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, audioFormat) = result.getOrThrow()
        
        // Verify audio focus strategy configuration
        assertEquals("Audio focus strategy should be interactive", "interactive", config.audioFocusStrategy)
        assertFalse("keepAwake should be false for interactive recording", config.keepAwake)
        assertTrue("autoResumeAfterInterruption should be true", config.autoResumeAfterInterruption)
        
        // Verify audio format is properly configured
        assertNotNull("Audio format should be created", audioFormat)
        assertEquals("MIME type should be audio/wav", "audio/wav", audioFormat.mimeType)
    }

    @Test
    fun testRecordingConfigWithCommunicationStrategy() {
        val options = mapOf(
            "sampleRate" to 16000, // Common speech sample rate
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to false,
            "autoResumeAfterInterruption" to true,
            "android" to mapOf(
                "audioFocusStrategy" to "communication"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, audioFormat) = result.getOrThrow()
        
        // Verify audio focus strategy configuration
        assertEquals("Audio focus strategy should be communication", "communication", config.audioFocusStrategy)
        assertEquals("Sample rate should be 16000 for speech", 16000, config.sampleRate)
        assertFalse("keepAwake should be false", config.keepAwake)
        assertTrue("autoResumeAfterInterruption should be true", config.autoResumeAfterInterruption)
        
        // Verify audio format is properly configured
        assertNotNull("Audio format should be created", audioFormat)
        assertEquals("MIME type should be audio/wav", "audio/wav", audioFormat.mimeType)
    }

    @Test
    fun testRecordingConfigWithNoneStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to false,
            "android" to mapOf(
                "audioFocusStrategy" to "none"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, audioFormat) = result.getOrThrow()
        
        // Verify audio focus strategy configuration
        assertEquals("Audio focus strategy should be none", "none", config.audioFocusStrategy)
        
        // Verify audio format is properly configured
        assertNotNull("Audio format should be created", audioFormat)
        assertEquals("MIME type should be audio/wav", "audio/wav", audioFormat.mimeType)
    }

    @Test
    fun testStrategyOverrideBehavior() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to true, // This would normally default to background
            "android" to mapOf(
                "audioFocusStrategy" to "communication" // But we override to communication
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, audioFormat) = result.getOrThrow()
        
        // Verify that explicit strategy overrides keepAwake defaults
        assertEquals("Audio focus strategy should be communication (overriding keepAwake default)", "communication", config.audioFocusStrategy)
        assertTrue("keepAwake should still be true", config.keepAwake)
        
        // Verify audio format is properly configured
        assertNotNull("Audio format should be created", audioFormat)
    }

    @Test
    fun testAudioFocusStrategyWithCompression() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "android" to mapOf(
                "audioFocusStrategy" to "background"
            ),
            "output" to mapOf(
                "compressed" to mapOf(
                    "enabled" to true,
                    "format" to "aac",
                    "bitrate" to 128000
                )
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, audioFormat) = result.getOrThrow()
        
        // Verify audio focus strategy works with compression
        assertEquals("Audio focus strategy should be background", "background", config.audioFocusStrategy)
        assertTrue("Compressed output should be enabled", config.output.compressed.enabled)
        assertEquals("Compression format should be aac", "aac", config.output.compressed.format)
        assertEquals("Bitrate should be 128000", 128000, config.output.compressed.bitrate)
        
        // Verify audio format is properly configured
        assertNotNull("Audio format should be created", audioFormat)
        assertEquals("MIME type should be audio/wav", "audio/wav", audioFormat.mimeType)
    }

    @Test
    fun testAudioFocusStrategyWithNotifications() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "showNotification" to true,
            "showWaveformInNotification" to true,
            "android" to mapOf(
                "audioFocusStrategy" to "background"
            ),
            "notification" to mapOf(
                "title" to "Recording Audio",
                "text" to "Background recording in progress",
                "icon" to "ic_mic"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, audioFormat) = result.getOrThrow()
        
        // Verify audio focus strategy works with notifications
        assertEquals("Audio focus strategy should be background", "background", config.audioFocusStrategy)
        assertTrue("Notifications should be enabled", config.showNotification)
        assertTrue("Waveform in notification should be enabled", config.showWaveformInNotification)
        assertEquals("Notification title should match", "Recording Audio", config.notification.title)
        assertEquals("Notification text should match", "Background recording in progress", config.notification.text)
        assertEquals("Notification icon should match", "ic_mic", config.notification.icon)
        
        // Verify audio format is properly configured
        assertNotNull("Audio format should be created", audioFormat)
        assertEquals("MIME type should be audio/wav", "audio/wav", audioFormat.mimeType)
    }

    @Test
    fun testAudioFocusStrategyValidation() {
        // Test all valid strategies
        val strategies = listOf("background", "interactive", "communication", "none")
        
        for (strategy in strategies) {
            val options = mapOf(
                "sampleRate" to 44100,
                "channels" to 1,
                "encoding" to "pcm_16bit",
                "android" to mapOf(
                    "audioFocusStrategy" to strategy
                )
            )

            val result = RecordingConfig.fromMap(options)
            assertTrue("Config creation should succeed for strategy: $strategy", result.isSuccess)
            
            val (config, _) = result.getOrThrow()
            assertEquals("Audio focus strategy should be $strategy", strategy, config.audioFocusStrategy)
        }
    }

    @Test
    fun testInvalidAudioFocusStrategyHandling() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "android" to mapOf(
                "audioFocusStrategy" to "invalid_strategy"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed even with invalid strategy", result.isSuccess)
        
        val (config, _) = result.getOrThrow()
        assertEquals("Invalid strategy should be preserved", "invalid_strategy", config.audioFocusStrategy)
    }

    @Test
    fun testCompleteAudioFocusConfiguration() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to true,
            "autoResumeAfterInterruption" to true,
            "showNotification" to true,
            "showWaveformInNotification" to false,
            "enableProcessing" to false,
            "android" to mapOf(
                "audioFocusStrategy" to "communication"
            ),
            "notification" to mapOf(
                "title" to "Voice Call Recording",
                "text" to "Call in progress",
                "icon" to "ic_call"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, audioFormat) = result.getOrThrow()
        
        // Verify complete configuration
        assertEquals("Audio focus strategy should be communication", "communication", config.audioFocusStrategy)
        assertEquals("Sample rate should be 44100", 44100, config.sampleRate)
        assertEquals("Channels should be 1", 1, config.channels)
        assertEquals("Encoding should be pcm_16bit", "pcm_16bit", config.encoding)
        assertTrue("keepAwake should be true", config.keepAwake)
        assertFalse("showWaveformInNotification should be false", config.showWaveformInNotification)
        assertTrue("showNotification should be true", config.showNotification)
        assertTrue("autoResumeAfterInterruption should be true", config.autoResumeAfterInterruption)
        assertFalse("enableProcessing should be false", config.enableProcessing)
        assertEquals("Notification title should match", "Voice Call Recording", config.notification.title)
        assertEquals("Notification text should match", "Call in progress", config.notification.text)
        
        // Verify audio format is properly configured
        assertNotNull("Audio format should be created", audioFormat)
        assertEquals("MIME type should be audio/wav", "audio/wav", audioFormat.mimeType)
    }
}