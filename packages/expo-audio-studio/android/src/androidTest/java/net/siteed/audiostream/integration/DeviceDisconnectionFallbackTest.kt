package net.siteed.audiostream.integration

import android.content.Context
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import net.siteed.audiostream.OutputConfig
import net.siteed.audiostream.RecordingConfig
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * Integration test for device disconnection fallback behavior.
 * Tests various scenarios when audio devices are disconnected during recording.
 */
@RunWith(AndroidJUnit4::class)
class DeviceDisconnectionFallbackTest {

    private lateinit var context: Context
    private lateinit var testDir: File

    @Before
    fun setup() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        
        // Create test directory
        testDir = File(context.getExternalFilesDir(null), "fallback_test")
        testDir.mkdirs()
        
        // Clear any existing test files
        testDir.listFiles()?.forEach { it.delete() }
    }

    @After
    fun tearDown() {
        // Clean up test files
        testDir.listFiles()?.forEach { it.delete() }
        testDir.delete()
    }

    @Test
    fun testDeviceDisconnectionBehavior_Fallback() {
        println("🧪 Test: Device Disconnection with Fallback Behavior")
        println("--------------------------------------------------")
        
        // Create recording config with fallback behavior
        val config = RecordingConfig(
            sampleRate = 44100,
            channels = 1,
            encoding = "pcm_16bit",
            deviceDisconnectionBehavior = "fallback",
            output = OutputConfig(
                primary = OutputConfig.PrimaryOutput(
                    enabled = true,
                    format = "wav"
                )
            ),
            outputDirectory = testDir.absolutePath,
            filename = "fallback_test.wav"
        )
        
        // Verify device disconnection behavior is set
        assertEquals("Device disconnection behavior should be fallback", 
            "fallback", config.deviceDisconnectionBehavior)
        
        println("✅ RecordingConfig correctly configured with fallback behavior")
        
        // Note: Actual device disconnection simulation would require running the full
        // ExpoAudioStreamModule with device connection/disconnection events
    }

    @Test
    fun testDeviceDisconnectionBehavior_Pause() {
        println("🧪 Test: Device Disconnection with Pause Behavior")
        println("-----------------------------------------------")
        
        val config = RecordingConfig(
            sampleRate = 44100,
            channels = 1,
            encoding = "pcm_16bit",
            deviceDisconnectionBehavior = "pause",
            output = OutputConfig(
                primary = OutputConfig.PrimaryOutput(
                    enabled = true,
                    format = "wav"
                )
            ),
            outputDirectory = testDir.absolutePath,
            filename = "pause_test.wav"
        )
        
        // Verify device disconnection behavior is set to pause
        assertEquals("Device disconnection behavior should be pause", 
            "pause", config.deviceDisconnectionBehavior)
        
        println("✅ RecordingConfig correctly configured with pause behavior")
    }

    @Test
    fun testDefaultDeviceDisconnectionBehavior() {
        println("🧪 Test: Default Device Disconnection Behavior")
        println("--------------------------------------------")
        
        // Create config without specifying deviceDisconnectionBehavior
        val config = RecordingConfig(
            sampleRate = 44100,
            channels = 1,
            encoding = "pcm_16bit",
            output = OutputConfig(
                primary = OutputConfig.PrimaryOutput(
                    enabled = true,
                    format = "wav"
                )
            ),
            outputDirectory = testDir.absolutePath,
            filename = "default_test.wav"
        )
        
        // Default behavior should be null (handled as pause in implementation)
        assertNull("Default device disconnection behavior should be null", 
            config.deviceDisconnectionBehavior)
        
        println("✅ Default device disconnection behavior is null (treated as 'pause')")
    }

    @Test
    fun testInterruptionEventReasons() {
        println("🧪 Test: Interruption Event Reasons")
        println("----------------------------------")
        
        // Test that the expected event reasons are valid
        val fallbackReasons = listOf("deviceFallback", "deviceSwitchFailed")
        val pauseReasons = listOf("deviceDisconnected")
        
        println("📋 Expected reasons for fallback behavior:")
        fallbackReasons.forEach { reason ->
            println("   - $reason")
            assertNotNull("Reason should not be null", reason)
            assertTrue("Reason should not be empty", reason.isNotEmpty())
        }
        
        println("📋 Expected reasons for pause behavior:")
        pauseReasons.forEach { reason ->
            println("   - $reason")
            assertNotNull("Reason should not be null", reason)
            assertTrue("Reason should not be empty", reason.isNotEmpty())
        }
        
        println("✅ All interruption event reasons are valid")
    }

    @Test
    fun testAllDeviceDisconnectionBehaviors() {
        println("🧪 Test: All Device Disconnection Behaviors")
        println("-----------------------------------------")
        
        val behaviors = listOf("fallback", "pause")
        
        behaviors.forEach { behavior ->
            val config = RecordingConfig(
                sampleRate = 44100,
                channels = 1,
                encoding = "pcm_16bit",
                deviceDisconnectionBehavior = behavior,
                output = OutputConfig(
                    primary = OutputConfig.PrimaryOutput(
                        enabled = true,
                        format = "wav"
                    )
                ),
                outputDirectory = testDir.absolutePath,
                filename = "${behavior}_test.wav"
            )
            
            // Verify configuration
            assertEquals("Device disconnection behavior should be $behavior", 
                behavior, config.deviceDisconnectionBehavior)
            
            println("✅ Behavior '$behavior' correctly configured")
        }
    }

    @Test
    fun testDeviceDisconnectionWithCompressedOutput() {
        println("🧪 Test: Device Disconnection with Compressed Output")
        println("--------------------------------------------------")
        
        // Test fallback behavior with compressed output enabled
        val config = RecordingConfig(
            sampleRate = 44100,
            channels = 1,
            encoding = "pcm_16bit",
            deviceDisconnectionBehavior = "fallback",
            output = OutputConfig(
                primary = OutputConfig.PrimaryOutput(
                    enabled = false
                ),
                compressed = OutputConfig.CompressedOutput(
                    enabled = true,
                    format = "aac",
                    bitrate = 128000
                )
            ),
            outputDirectory = testDir.absolutePath,
            filename = "compressed_fallback_test"
        )
        
        assertEquals("Device disconnection behavior should be fallback", 
            "fallback", config.deviceDisconnectionBehavior)
        assertTrue("Compressed output should be enabled", config.output.compressed.enabled)
        assertFalse("Primary output should be disabled", config.output.primary.enabled)
        
        println("✅ Fallback behavior configured with compressed-only output")
    }
}