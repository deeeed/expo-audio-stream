package net.siteed.audiostream.integration

import android.os.Bundle
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*
import java.io.File
import kotlin.math.abs

/**
 * Integration test to validate event emission interval enforcement.
 * 
 * This test verifies that the configured intervals respect platform
 * minimums to prevent excessive CPU usage.
 */
@RunWith(AndroidJUnit4::class)
class EventEmissionIntervalTest {

    private val TAG = "EventEmissionIntervalTest"
    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Test
    fun testMinimumIntervalEnforcement() {
        println("🧪 Test: Minimum Interval Enforcement")
        println("------------------------------------")
        
        // Test cases for different requested intervals
        val testCases = listOf(
            5 to 10,    // 5ms should be clamped to MIN_INTERVAL (10ms)
            10 to 10,   // 10ms should remain 10ms
            50 to 50,   // 50ms should remain 50ms
            100 to 100  // 100ms should remain 100ms
        )
        
        for ((requested, expected) in testCases) {
            val config = Bundle().apply {
                putInt("sampleRate", 48000)
                putInt("channels", 1)
                putLong("interval", requested.toLong())
                putLong("intervalAnalysis", requested.toLong())
            }
            
            // Parse the config to validate interval enforcement
            val configMap = bundleToMap(config)
            val result = net.siteed.audiostream.RecordingConfig.fromMap(configMap)
            
            assertTrue("Config parsing should succeed", result.isSuccess)
            val (recordingConfig, _) = result.getOrNull()!!
            
            println("Requested interval: ${requested}ms")
            println("Actual interval: ${recordingConfig.interval}ms")
            println("Expected interval: ${expected}ms")
            
            assertEquals(
                "Interval should be clamped to minimum if below MIN_INTERVAL",
                expected.toLong(),
                recordingConfig.interval
            )
            
            assertEquals(
                "Analysis interval should be clamped to minimum if below MIN_INTERVAL",
                expected.toLong(),
                recordingConfig.intervalAnalysis
            )
            
            println("✓ Passed\n")
        }
    }
    
    @Test
    fun testIntervalConsistencyAcrossPlatforms() {
        println("🧪 Test: Platform Consistency Check")
        println("----------------------------------")
        
        // Document the expected behavior across platforms
        println("Expected behavior after fix:")
        println("- iOS: Minimum interval = 10ms")
        println("- Android: Minimum interval = 10ms (enforced)")
        println("")
        
        // Verify Android enforces the minimum
        val intervals = listOf(1, 5, 10, 50, 100)
        for (interval in intervals) {
            val config = Bundle().apply {
                putLong("interval", interval.toLong())
                putLong("intervalAnalysis", interval.toLong())
            }
            
            val configMap = bundleToMap(config)
            val result = net.siteed.audiostream.RecordingConfig.fromMap(configMap)
            val (recordingConfig, _) = result.getOrNull()!!
            
            val expectedInterval = maxOf(10, interval).toLong()
            assertEquals(
                "Android should enforce MIN_INTERVAL of 10ms",
                expectedInterval,
                recordingConfig.interval
            )
            
            println("✓ Interval ${interval}ms -> ${recordingConfig.interval}ms")
        }
    }

    /**
     * Helper to convert Bundle to Map for RecordingConfig
     */
    private fun bundleToMap(bundle: Bundle): Map<String, Any?> {
        val map = mutableMapOf<String, Any?>()
        for (key in bundle.keySet()) {
            when (val value = bundle.get(key)) {
                is Bundle -> map[key] = bundleToMap(value)
                else -> map[key] = value
            }
        }
        return map
    }
}