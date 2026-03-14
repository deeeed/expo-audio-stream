package net.siteed.audiostream.integration

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.abs

/**
 * Integration test for Buffer Duration feature
 * This tests the ACTUAL behavior of Android AudioRecord with different buffer sizes
 */
@RunWith(AndroidJUnit4::class)
class BufferDurationIntegrationTest {
    
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val results = mutableListOf<TestResult>()
    private var audioRecord: AudioRecord? = null
    
    data class TestResult(
        val name: String,
        val passed: Boolean,
        val message: String
    )
    
    @Before
    fun setup() {
        println("🧪 Buffer Duration Integration Test")
        println("===================================\n")
    }
    
    @After
    fun tearDown() {
        audioRecord?.release()
        printResults()
    }
    
    @Test
    fun testDefaultBufferSize() {
        println("Test 1: Default Buffer Size")
        println("---------------------------")
        
        val sampleRate = 48000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        
        // Get minimum buffer size
        val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        println("✓ Android minimum buffer size: $minBufferSize bytes")
        
        // Calculate frames from bytes (16-bit = 2 bytes per sample)
        val minFrames = minBufferSize / 2
        println("✓ Minimum frames: $minFrames")
        
        // Test with default 1024 frames (2048 bytes)
        val requestedBytes = 1024 * 2
        val actualBufferSize = if (requestedBytes < minBufferSize) minBufferSize else requestedBytes
        
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            actualBufferSize
        )
        
        val state = audioRecord?.state
        val passed = state == AudioRecord.STATE_INITIALIZED
        
        results.add(TestResult(
            name = "Default Buffer Size",
            passed = passed,
            message = "Requested: 1024 frames, Min required: $minFrames frames, State: ${if (passed) "INITIALIZED" else "UNINITIALIZED"}"
        ))
        
        println("✓ Requested: 1024 frames (${requestedBytes} bytes)")
        println("✓ Actual buffer: ${actualBufferSize / 2} frames ($actualBufferSize bytes)")
        println("✓ Initialization: ${if (passed) "SUCCESS" else "FAILED"}\n")
    }
    
    @Test
    fun testCustomBufferSizes() {
        println("Test 2: Custom Buffer Sizes")
        println("---------------------------")
        
        val sampleRate = 48000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        
        val testCases = listOf(
            0.01 to "10ms",
            0.05 to "50ms",
            0.1 to "100ms",
            0.2 to "200ms",
            0.5 to "500ms"
        )
        
        for ((duration, name) in testCases) {
            val requestedFrames = (duration * sampleRate).toInt()
            val requestedBytes = requestedFrames * 2 // 16-bit = 2 bytes
            val actualBufferSize = if (requestedBytes < minBufferSize) minBufferSize else requestedBytes
            
            audioRecord?.release()
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                actualBufferSize
            )
            
            val state = audioRecord?.state
            val passed = state == AudioRecord.STATE_INITIALIZED
            
            // Test actual read behavior
            if (passed) {
                audioRecord?.startRecording()
                val buffer = ByteArray(requestedBytes)
                val bytesRead = audioRecord?.read(buffer, 0, buffer.size) ?: -1
                audioRecord?.stop()
                
                val framesRead = if (bytesRead > 0) bytesRead / 2 else 0
                
                results.add(TestResult(
                    name = "Buffer $name",
                    passed = bytesRead > 0,
                    message = "Requested: $requestedFrames frames, Read: $framesRead frames"
                ))
                
                println("  $name: Requested $requestedFrames → Read $framesRead frames")
            } else {
                results.add(TestResult(
                    name = "Buffer $name",
                    passed = false,
                    message = "Failed to initialize AudioRecord"
                ))
                println("  $name: Failed to initialize")
            }
        }
        println()
    }
    
    @Test
    fun testBufferSizeLimits() {
        println("Test 3: Buffer Size Limits")
        println("--------------------------")
        
        val sampleRate = 48000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        
        val extremeCases = listOf(
            100 to "Very small (100 frames)",
            50000 to "Very large (50000 frames)"
        )
        
        for ((frames, name) in extremeCases) {
            val requestedBytes = frames * 2
            val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
            val actualBufferSize = if (requestedBytes < minBufferSize) minBufferSize else requestedBytes
            
            audioRecord?.release()
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                actualBufferSize
            )
            
            val state = audioRecord?.state
            val passed = state == AudioRecord.STATE_INITIALIZED
            
            results.add(TestResult(
                name = name,
                passed = passed,
                message = "Requested: $frames frames, Buffer size: ${actualBufferSize / 2} frames"
            ))
            
            println("  $name: $frames → ${actualBufferSize / 2} frames")
        }
        println()
    }
    
    @Test
    fun testBufferAccumulation() {
        println("Test 4: Buffer Accumulation for Small Durations")
        println("-----------------------------------------------")
        
        val sampleRate = 48000
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
        
        // Test very small buffer (20ms = 960 frames)
        val targetDuration = 0.02 // 20ms
        val targetFrames = (targetDuration * sampleRate).toInt()
        val targetBytes = targetFrames * 2
        
        audioRecord?.release()
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            sampleRate,
            channelConfig,
            audioFormat,
            minBufferSize // Use minimum buffer size
        )
        
        if (audioRecord?.state == AudioRecord.STATE_INITIALIZED) {
            audioRecord?.startRecording()
            
            // Accumulate small chunks
            val accumulator = mutableListOf<ByteArray>()
            var totalFrames = 0
            val smallBuffer = ByteArray(targetBytes)
            
            // Read multiple times to accumulate
            repeat(5) {
                val bytesRead = audioRecord?.read(smallBuffer, 0, smallBuffer.size) ?: -1
                if (bytesRead > 0) {
                    accumulator.add(smallBuffer.copyOf(bytesRead))
                    totalFrames += bytesRead / 2
                }
            }
            
            audioRecord?.stop()
            
            val passed = totalFrames >= targetFrames
            results.add(TestResult(
                name = "Buffer Accumulation",
                passed = passed,
                message = "Target: $targetFrames frames, Accumulated: $totalFrames frames over ${accumulator.size} reads"
            ))
            
            println("✓ Target frames: $targetFrames")
            println("✓ Accumulated: $totalFrames frames")
            println("✓ Number of reads: ${accumulator.size}")
        } else {
            results.add(TestResult(
                name = "Buffer Accumulation",
                passed = false,
                message = "Failed to initialize AudioRecord"
            ))
        }
        println()
    }
    
    @Test
    fun testDifferentSampleRates() {
        println("Test 5: Different Sample Rates")
        println("------------------------------")
        
        val channelConfig = AudioFormat.CHANNEL_IN_MONO
        val audioFormat = AudioFormat.ENCODING_PCM_16BIT
        val bufferDuration = 0.1 // 100ms
        
        val sampleRates = listOf(16000, 44100, 48000)
        
        for (sampleRate in sampleRates) {
            val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
            val targetFrames = (bufferDuration * sampleRate).toInt()
            val targetBytes = targetFrames * 2
            val actualBufferSize = if (targetBytes < minBufferSize) minBufferSize else targetBytes
            
            audioRecord?.release()
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                actualBufferSize
            )
            
            val state = audioRecord?.state
            val passed = state == AudioRecord.STATE_INITIALIZED
            
            results.add(TestResult(
                name = "Sample Rate ${sampleRate}Hz",
                passed = passed,
                message = "Buffer duration: ${bufferDuration}s, Frames: ${actualBufferSize / 2}"
            ))
            
            println("  ${sampleRate}Hz: ${if (passed) "SUCCESS" else "FAILED"} - ${actualBufferSize / 2} frames")
        }
        println()
    }
    
    private fun printResults() {
        println("📊 Test Results")
        println("===============")
        
        val passed = results.count { it.passed }
        val total = results.size
        
        for (result in results) {
            val status = if (result.passed) "✅" else "❌"
            println("$status ${result.name}")
            println("   ${result.message}")
        }
        
        println("\nSummary: $passed/$total tests passed")
        
        if (passed == total) {
            println("🎉 All tests passed!")
        } else {
            println("⚠️  Some tests failed")
        }
        
        println("\n📝 Key Findings:")
        println("- Android enforces minimum buffer size via getMinBufferSize()")
        println("- Minimum varies by device and sample rate")
        println("- Small buffers require accumulation strategy")
        println("- AudioRecord handles buffer sizing more flexibly than iOS")
    }
} 