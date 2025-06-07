package net.siteed.audiostream

import org.junit.Test
import org.junit.Assert.*

/**
 * Unit tests for audio focus strategy configuration and logic.
 * These tests verify that the RecordingConfig correctly handles audioFocusStrategy
 * parameter and that the smart defaults work as expected.
 */
class AudioFocusStrategyTest {

    @Test
    fun testRecordingConfigWithExplicitBackgroundStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "android" to mapOf(
                "audioFocusStrategy" to "background"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertEquals("Audio focus strategy should be background", "background", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigWithExplicitInteractiveStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "android" to mapOf(
                "audioFocusStrategy" to "interactive"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertEquals("Audio focus strategy should be interactive", "interactive", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigWithExplicitCommunicationStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "android" to mapOf(
                "audioFocusStrategy" to "communication"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertEquals("Audio focus strategy should be communication", "communication", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigWithExplicitNoneStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "android" to mapOf(
                "audioFocusStrategy" to "none"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertEquals("Audio focus strategy should be none", "none", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigWithoutAudioFocusStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit"
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertNull("Audio focus strategy should be null when not specified", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigWithInvalidAudioFocusStrategy() {
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
        assertEquals("Invalid audio focus strategy should be preserved", "invalid_strategy", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigWithNullAudioFocusStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "android" to mapOf(
                "audioFocusStrategy" to null
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertNull("Audio focus strategy should be null", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigKeepAwakeAndBackgroundStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to true,
            "android" to mapOf(
                "audioFocusStrategy" to "background"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertTrue("keepAwake should be true", config.keepAwake)
        assertEquals("Audio focus strategy should be background", "background", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigKeepAwakeFalseAndInteractiveStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to false,
            "android" to mapOf(
                "audioFocusStrategy" to "interactive"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertFalse("keepAwake should be false", config.keepAwake)
        assertEquals("Audio focus strategy should be interactive", "interactive", config.audioFocusStrategy)
    }

    @Test
    fun testRecordingConfigWithAutoResumeAndBackgroundStrategy() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "autoResumeAfterInterruption" to true,
            "android" to mapOf(
                "audioFocusStrategy" to "background"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertEquals("Audio focus strategy should be background", "background", config.audioFocusStrategy)
        assertTrue("autoResumeAfterInterruption should be true", config.autoResumeAfterInterruption)
    }

    @Test
    fun testRecordingConfigWithCommunicationStrategyAndSpeechSampleRate() {
        val options = mapOf(
            "sampleRate" to 16000, // Common speech sample rate
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "android" to mapOf(
                "audioFocusStrategy" to "communication"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertEquals("Sample rate should be 16000", 16000, config.sampleRate)
        assertEquals("Audio focus strategy should be communication", "communication", config.audioFocusStrategy)
    }

    @Test
    fun testDefaultRecordingConfigValues() {
        val result = RecordingConfig.fromMap(null)
        assertTrue("Config creation should succeed with null input", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertNull("Default audio focus strategy should be null", config.audioFocusStrategy)
        assertTrue("Default keepAwake should be true", config.keepAwake)
        assertFalse("Default autoResumeAfterInterruption should be false", config.autoResumeAfterInterruption)
    }

    @Test
    fun testRecordingConfigCompleteAudioFocusConfiguration() {
        val options = mapOf(
            "sampleRate" to 44100,
            "channels" to 1,
            "encoding" to "pcm_16bit",
            "keepAwake" to true,
            "autoResumeAfterInterruption" to true,
            "showNotification" to true,
            "android" to mapOf(
                "audioFocusStrategy" to "background"
            )
        )

        val result = RecordingConfig.fromMap(options)
        assertTrue("Config creation should succeed", result.isSuccess)

        val (config, _) = result.getOrThrow()
        assertEquals("Audio focus strategy should be background", "background", config.audioFocusStrategy)
        assertTrue("keepAwake should be true", config.keepAwake)
        assertTrue("autoResumeAfterInterruption should be true", config.autoResumeAfterInterruption)
        assertTrue("showNotification should be true", config.showNotification)
    }
}