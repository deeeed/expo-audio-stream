package net.siteed.sherpaonnx

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import junit.framework.TestCase.*
import net.siteed.sherpaonnx.utils.createPromise
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.system.measureTimeMillis

@RunWith(AndroidJUnit4::class)
class ArchitectureSpecificTest {

    private lateinit var sherpaOnnxImpl: SherpaOnnxImpl
    private lateinit var reactContext: ReactApplicationContext
    private var isNewArchitecture: Boolean = false

    companion object {
        init {
            val context = InstrumentationRegistry.getInstrumentation().targetContext
            com.facebook.soloader.SoLoader.init(context, false)
        }
    }

    @Before
    fun setUp() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        reactContext = ReactApplicationContext(context)
        sherpaOnnxImpl = SherpaOnnxImpl(reactContext)
        
        // Detect architecture
        val latch = CountDownLatch(1)
        var systemInfo: ReadableMap? = null
        
        sherpaOnnxImpl.getSystemInfo(createPromise(
            onResolve = { result ->
                systemInfo = result as? ReadableMap
                latch.countDown()
            },
            onReject = { _, _, _ -> latch.countDown() }
        ))
        
        latch.await(5, TimeUnit.SECONDS)
        val archType = systemInfo?.getMap("architecture")?.getString("type")
        isNewArchitecture = archType == "new"
    }

    @Test
    fun testArchitectureDetection() {
        val latch = CountDownLatch(1)
        var systemInfo: ReadableMap? = null
        var error: String? = null

        val promise = createPromise(
            onResolve = { result ->
                systemInfo = result as? ReadableMap
                latch.countDown()
            },
            onReject = { _, message, _ ->
                error = message
                latch.countDown()
            }
        )

        sherpaOnnxImpl.getSystemInfo(promise)
        assertTrue("Should complete within 5 seconds", latch.await(5, TimeUnit.SECONDS))
        assertNull("Should not have error", error)
        
        val architecture = systemInfo?.getMap("architecture")
        assertNotNull("Architecture info should be present", architecture)
        
        // Verify architecture type
        val archType = architecture?.getString("type")
        assertTrue("Architecture type should be 'old' or 'new'", archType in listOf("old", "new"))
        
        // Verify module type matches architecture
        val moduleType = architecture?.getString("moduleType")
        if (archType == "new") {
            assertEquals("Module type should be TurboModule for new arch", "TurboModule", moduleType)
            assertTrue("TurboModules should be enabled", architecture.getBoolean("turboModulesEnabled"))
        } else {
            assertEquals("Module type should be Bridge Module for old arch", "Bridge Module", moduleType)
            assertFalse("TurboModules should be disabled", architecture.getBoolean("turboModulesEnabled"))
        }
    }

    @Test
    fun testPromiseBasedAsyncCalls() {
        // Test multiple async calls in sequence
        val promises = mutableListOf<Pair<String, Long>>()
        
        // Test 1: Library validation
        measureAsyncCall("validateLibraryLoaded") { promise ->
            sherpaOnnxImpl.validateLibraryLoaded(promise)
        }?.let { promises.add(it) }
        
        // Test 2: System info
        measureAsyncCall("getSystemInfo") { promise ->
            sherpaOnnxImpl.getSystemInfo(promise)
        }?.let { promises.add(it) }
        
        // Test 3: Architecture info
        measureAsyncCall("getArchitectureInfo") { promise ->
            sherpaOnnxImpl.getArchitectureInfo(promise)
        }?.let { promises.add(it) }
        
        // Verify all promises resolved
        assertTrue("All promises should resolve", promises.size == 3)
        
        // Log performance metrics
        promises.forEach { (method, duration) ->
            println("$method took ${duration}ms on ${if (isNewArchitecture) "New" else "Old"} Architecture")
            assertTrue("$method should complete in reasonable time", duration < 1000)
        }
    }

    @Test
    fun testErrorPropagation() {
        // Test error handling through bridge/JSI
        val testCases = listOf(
            // Invalid model config for TTS
            Triple("initTts", { promise: Promise ->
                val invalidConfig = com.facebook.react.bridge.Arguments.createMap().apply {
                    putString("modelDir", "/invalid/path/that/does/not/exist")
                    putString("ttsModelType", "invalid_type")
                }
                sherpaOnnxImpl.initTts(invalidConfig, promise)
            }, "TTS initialization with invalid config"),
            
            // Invalid file path for ASR
            Triple("recognizeFromFile", { promise: Promise ->
                sherpaOnnxImpl.recognizeFromFile("/non/existent/audio.wav", promise)
            }, "ASR with non-existent file"),
            
            // Invalid archive extraction
            Triple("extractTarBz2", { promise: Promise ->
                sherpaOnnxImpl.extractTarBz2("/invalid/archive.tar.bz2", "/invalid/target", promise)
            }, "Archive extraction with invalid paths")
        )
        
        testCases.forEach { (methodName, methodCall, description) ->
            val latch = CountDownLatch(1)
            var error: String? = null
            var errorCode: String? = null
            
            val promise = createPromise(
                onResolve = { _ ->
                    // Some operations might return success:false instead of rejecting
                    latch.countDown()
                },
                onReject = { code, message, _ ->
                    errorCode = code
                    error = message
                    latch.countDown()
                }
            )
            
            methodCall(promise)
            
            assertTrue("$description should complete", latch.await(5, TimeUnit.SECONDS))
            println("Error propagation for $methodName: code=$errorCode, message=$error")
        }
    }

    @Test
    fun testThreadingBehavior() {
        // Test which thread operations run on
        val threadNames = mutableListOf<String>()
        val mainThreadId = Thread.currentThread().id
        
        // Capture thread info during async operations
        val operations = listOf(
            "validateLibraryLoaded" to { promise: Promise ->
                sherpaOnnxImpl.validateLibraryLoaded(promise)
            },
            "getSystemInfo" to { promise: Promise ->
                sherpaOnnxImpl.getSystemInfo(promise)
            },
            "testOnnxIntegration" to { promise: Promise ->
                sherpaOnnxImpl.testOnnxIntegration(promise)
            }
        )
        
        operations.forEach { (name, operation) ->
            val latch = CountDownLatch(1)
            var operationThreadName: String? = null
            var operationThreadId: Long? = null
            
            val promise = object : Promise {
                override fun resolve(value: Any?) {
                    operationThreadName = Thread.currentThread().name
                    operationThreadId = Thread.currentThread().id
                    latch.countDown()
                }
                
                override fun reject(code: String?, message: String?) {
                    operationThreadName = Thread.currentThread().name
                    operationThreadId = Thread.currentThread().id
                    latch.countDown()
                }
                
                override fun reject(code: String?, throwable: Throwable?) {
                    operationThreadName = Thread.currentThread().name
                    operationThreadId = Thread.currentThread().id
                    latch.countDown()
                }
                
                override fun reject(code: String?, message: String?, throwable: Throwable?) {
                    operationThreadName = Thread.currentThread().name
                    operationThreadId = Thread.currentThread().id
                    latch.countDown()
                }
                
                override fun reject(throwable: Throwable?) {
                    operationThreadName = Thread.currentThread().name
                    operationThreadId = Thread.currentThread().id
                    latch.countDown()
                }
                
                override fun reject(message: String?) {
                    operationThreadName = Thread.currentThread().name  
                    operationThreadId = Thread.currentThread().id
                    latch.countDown()
                }
            }
            
            operation(promise)
            latch.await(5, TimeUnit.SECONDS)
            
            threadNames.add("$name: thread=$operationThreadName, sameAsMain=${operationThreadId == mainThreadId}")
        }
        
        // Log threading behavior
        println("Threading behavior on ${if (isNewArchitecture) "New" else "Old"} Architecture:")
        threadNames.forEach { println("  $it") }
    }

    @Test
    fun testMemoryManagementAcrossArchitectures() {
        // Get baseline memory
        val baselineMemory = getMemoryUsage()
        println("Baseline memory: $baselineMemory")
        
        // Perform multiple operations to test memory behavior
        val memorySnapshots = mutableListOf<MemorySnapshot>()
        
        repeat(10) { iteration ->
            // Get system info multiple times
            repeat(5) {
                val latch = CountDownLatch(1)
                sherpaOnnxImpl.getSystemInfo(createPromise(
                    onResolve = { _ -> latch.countDown() },
                    onReject = { _, _, _ -> latch.countDown() }
                ))
                latch.await(1, TimeUnit.SECONDS)
            }
            
            // Force garbage collection
            System.gc()
            Thread.sleep(100)
            
            // Capture memory snapshot
            val currentMemory = getMemoryUsage()
            memorySnapshots.add(MemorySnapshot(iteration, currentMemory))
        }
        
        // Analyze memory pattern
        val avgMemoryIncrease = memorySnapshots.map { it.memory.usedMemoryMB - baselineMemory.usedMemoryMB }.average()
        val maxMemoryIncrease = memorySnapshots.maxOf { it.memory.usedMemoryMB - baselineMemory.usedMemoryMB }
        
        println("Memory behavior on ${if (isNewArchitecture) "New" else "Old"} Architecture:")
        println("  Average increase: ${String.format("%.2f", avgMemoryIncrease)} MB")
        println("  Max increase: ${String.format("%.2f", maxMemoryIncrease)} MB")
        
        // Memory should not continuously increase (no leaks)
        assertTrue("Memory increase should be reasonable", maxMemoryIncrease < 10.0)
    }

    @Test
    fun testPerformanceComparison() {
        // Compare performance of operations between architectures
        val performanceMetrics = mutableMapOf<String, Long>()
        
        // Test 1: Rapid sequential calls
        val sequentialTime = measureTimeMillis {
            repeat(50) {
                val latch = CountDownLatch(1)
                sherpaOnnxImpl.validateLibraryLoaded(createPromise(
                    onResolve = { _ -> latch.countDown() },
                    onReject = { _, _, _ -> latch.countDown() }
                ))
                latch.await(1, TimeUnit.SECONDS)
            }
        }
        performanceMetrics["sequential_50_calls"] = sequentialTime
        
        // Test 2: Concurrent calls
        val concurrentTime = measureTimeMillis {
            val latch = CountDownLatch(10)
            repeat(10) {
                Thread {
                    sherpaOnnxImpl.getSystemInfo(createPromise(
                        onResolve = { _ -> latch.countDown() },
                        onReject = { _, _, _ -> latch.countDown() }
                    ))
                }.start()
            }
            latch.await(5, TimeUnit.SECONDS)
        }
        performanceMetrics["concurrent_10_calls"] = concurrentTime
        
        // Test 3: Heavy operation (system info)
        val heavyOpTime = measureTimeMillis {
            val latch = CountDownLatch(1)
            sherpaOnnxImpl.getSystemInfo(createPromise(
                onResolve = { _ -> latch.countDown() },
                onReject = { _, _, _ -> latch.countDown() }
            ))
            latch.await(1, TimeUnit.SECONDS)
        }
        performanceMetrics["single_system_info"] = heavyOpTime
        
        // Log performance metrics
        println("Performance on ${if (isNewArchitecture) "New" else "Old"} Architecture:")
        performanceMetrics.forEach { (test, duration) ->
            println("  $test: ${duration}ms")
        }
    }

    // Helper functions
    private fun measureAsyncCall(methodName: String, method: (Promise) -> Unit): Pair<String, Long>? {
        val latch = CountDownLatch(1)
        var success = false
        
        val duration = measureTimeMillis {
            val promise = createPromise(
                onResolve = { _ ->
                    success = true
                    latch.countDown()
                },
                onReject = { _, _, _ ->
                    success = false
                    latch.countDown()
                }
            )
            
            method(promise)
            latch.await(5, TimeUnit.SECONDS)
        }
        
        return if (success) Pair(methodName, duration) else null
    }
    
    private fun getMemoryUsage(): MemoryInfo {
        val latch = CountDownLatch(1)
        var memoryInfo: MemoryInfo? = null
        
        sherpaOnnxImpl.getSystemInfo(createPromise(
            onResolve = { result ->
                val systemInfo = result as? ReadableMap
                val memory = systemInfo?.getMap("memory")
                if (memory != null) {
                    memoryInfo = MemoryInfo(
                        maxMemoryMB = memory.getDouble("maxMemoryMB"),
                        totalMemoryMB = memory.getDouble("totalMemoryMB"),
                        freeMemoryMB = memory.getDouble("freeMemoryMB"),
                        usedMemoryMB = memory.getDouble("usedMemoryMB")
                    )
                }
                latch.countDown()
            },
            onReject = { _, _, _ -> latch.countDown() }
        ))
        
        latch.await(5, TimeUnit.SECONDS)
        return memoryInfo ?: MemoryInfo(0.0, 0.0, 0.0, 0.0)
    }
    
    data class MemoryInfo(
        val maxMemoryMB: Double,
        val totalMemoryMB: Double,
        val freeMemoryMB: Double,
        val usedMemoryMB: Double
    )
    
    data class MemorySnapshot(
        val iteration: Int,
        val memory: MemoryInfo
    )
}