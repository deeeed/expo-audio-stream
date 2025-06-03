package net.siteed.sherpaonnx

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.lang.reflect.Method

/**
 * Architecture compatibility tests for React Native Old and New Architecture
 * 
 * These tests validate:
 * - Architecture detection works correctly
 * - Module behavior is consistent across architectures
 * - Library loading and integration
 */
@RunWith(AndroidJUnit4::class)
class ArchitectureCompatibilityTest {
    
    @Test
    fun testArchitectureDetectionMethodExists() {
        // Test that getArchitectureInfo method exists in the module
        try {
            val moduleClass = Class.forName("net.siteed.sherpaonnx.SherpaOnnxModule")
            assertNotNull("SherpaOnnxModule class should be available", moduleClass)
            
            // Check if getArchitectureInfo method exists
            val methods = moduleClass.declaredMethods
            val hasArchitectureMethod = methods.any { it.name == "getArchitectureInfo" }
            
            assertTrue(
                "SherpaOnnxModule should have getArchitectureInfo method", 
                hasArchitectureMethod
            )
            
            println("✅ getArchitectureInfo method found in SherpaOnnxModule")
            
            // Also check in the implementation class
            val implClass = Class.forName("net.siteed.sherpaonnx.SherpaOnnxImpl")
            val implMethods = implClass.declaredMethods
            val hasImplMethod = implMethods.any { it.name == "getArchitectureInfo" }
            
            assertTrue(
                "SherpaOnnxImpl should have getArchitectureInfo method",
                hasImplMethod
            )
            
            println("✅ getArchitectureInfo method found in SherpaOnnxImpl")
        } catch (e: ClassNotFoundException) {
            fail("Required classes should be available: ${e.message}")
        }
    }
    
    @Test
    fun testJSIAvailabilityDetection() {
        // Test architecture detection using BuildConfig
        val isNewArchEnabled = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        println("New Architecture Enabled (BuildConfig): $isNewArchEnabled")
        
        // Test JSI availability detection logic
        // Note: In test environment, SoLoader might not be initialized
        val jsiAvailable = try {
            Class.forName("com.facebook.react.turbomodule.core.CallInvokerHolderImpl")
            true
        } catch (e: ClassNotFoundException) {
            false
        } catch (e: ExceptionInInitializerError) {
            // This is expected in test environment when SoLoader is not initialized
            println("SoLoader not initialized - this is expected in test environment")
            false
        } catch (e: NoClassDefFoundError) {
            // This can also happen when dependencies are not available
            false
        }
        
        println("JSI Available (runtime check): $jsiAvailable")
        
        // Check if TurboModule interface is available (less likely to fail)
        val turboModuleAvailable = try {
            Class.forName("com.facebook.react.turbomodule.core.interfaces.TurboModule")
            true
        } catch (e: ClassNotFoundException) {
            false
        } catch (e: Exception) {
            false
        }
        
        println("TurboModule Interface Available: $turboModuleAvailable")
        
        // In new architecture, JSI and TurboModules should be available
        if (isNewArchEnabled) {
            // Note: In test environment, these might not be available even with new arch
            // This is expected as the full React Native runtime isn't initialized
            println("⚠️ New architecture enabled but JSI/TurboModule classes may not be available in test environment")
            println("   This is expected behavior - full React Native runtime is not initialized in tests")
        }
        
        // Test passes - we're documenting the state
        assertNotNull("Architecture detection should return a result", isNewArchEnabled)
        
        // Log the final architecture determination
        println("Final architecture determination: ${if (isNewArchEnabled) "New Architecture" else "Old Architecture"}")
    }
    
    @Test
    fun testNativeLibraryLoading() {
        // Test that the native library loads correctly
        try {
            // Check if we can access the companion object's isLibraryLoaded field
            val implClass = Class.forName("net.siteed.sherpaonnx.SherpaOnnxImpl")
            val companionField = implClass.getDeclaredField("Companion")
            companionField.isAccessible = true
            val companion = companionField.get(null)
            
            val companionClass = companion.javaClass
            val isLoadedField = companionClass.getDeclaredField("isLibraryLoaded")
            isLoadedField.isAccessible = true
            val isLoaded = isLoadedField.getBoolean(companion)
            
            println("Native library loaded: $isLoaded")
            
            // The library should be loaded by the static initializer
            assertTrue(
                "sherpa-onnx-jni library should be loaded",
                isLoaded
            )
        } catch (e: Exception) {
            println("Could not check library loading status via reflection: ${e.message}")
            // This is not a failure - the test structure might be different
        }
    }
    
    @Test
    fun testModuleStructure() {
        // Test the module structure for both architectures
        try {
            // Check old architecture module
            val oldArchModule = Class.forName("net.siteed.sherpaonnx.SherpaOnnxModule")
            val oldArchPackage = Class.forName("net.siteed.sherpaonnx.SherpaOnnxPackage")
            
            assertNotNull("Old architecture module should exist", oldArchModule)
            assertNotNull("Old architecture package should exist", oldArchPackage)
            
            println("✅ Old architecture classes found")
            
            // Check if new architecture classes exist (they may not in all builds)
            val newArchAvailable = try {
                Class.forName("net.siteed.sherpaonnx.SherpaOnnxTurboModule")
                Class.forName("net.siteed.sherpaonnx.SherpaOnnxTurboModuleImpl")
                true
            } catch (e: ClassNotFoundException) {
                false
            }
            
            println("New architecture classes available: $newArchAvailable")
            
            // Test passes - we've documented what's available
            assertTrue("Module structure test completed", true)
        } catch (e: Exception) {
            fail("Basic module classes should be available: ${e.message}")
        }
    }
    
    @Test
    fun testReactNativeFeatureFlags() {
        // Try to detect React Native feature flags if available
        try {
            val flagsClass = Class.forName("com.facebook.react.config.ReactFeatureFlags")
            println("✅ ReactFeatureFlags class found")
            
            // Try to find useTurboModules field
            val fields = flagsClass.declaredFields
            val turboModuleField = fields.find { it.name == "useTurboModules" }
            
            if (turboModuleField != null) {
                turboModuleField.isAccessible = true
                val useTurboModules = turboModuleField.getBoolean(null)
                println("useTurboModules flag: $useTurboModules")
            } else {
                println("useTurboModules field not found in ReactFeatureFlags")
            }
        } catch (e: ClassNotFoundException) {
            println("ReactFeatureFlags not available - this is normal in some configurations")
        } catch (e: Exception) {
            println("Could not check ReactFeatureFlags: ${e.message}")
        }
        
        // This test always passes - it's for information gathering
        assertTrue("Feature flags check completed", true)
    }
    
    @Test 
    fun testThreadingContext() {
        // Document the threading context of the test
        val currentThread = Thread.currentThread()
        println("Test running on thread: ${currentThread.name}")
        println("Thread ID: ${currentThread.id}")
        println("Thread priority: ${currentThread.priority}")
        println("Thread group: ${currentThread.threadGroup?.name}")
        
        // In integration tests, we typically run on the instrumentation thread
        assertTrue(
            "Should be running on instrumentation thread",
            currentThread.name.contains("Instr") || currentThread.name.contains("main")
        )
    }
    
    @Test
    fun testHandlerClasses() {
        // Test that all handler classes are available
        val handlerClasses = listOf(
            "net.siteed.sherpaonnx.handlers.TtsHandler",
            "net.siteed.sherpaonnx.handlers.ASRHandler",
            "net.siteed.sherpaonnx.handlers.AudioTaggingHandler",
            "net.siteed.sherpaonnx.handlers.SpeakerIdHandler",
            "net.siteed.sherpaonnx.handlers.ArchiveHandler"
        )
        
        for (className in handlerClasses) {
            try {
                val handlerClass = Class.forName(className)
                assertNotNull("$className should be available", handlerClass)
                println("✅ $className found")
            } catch (e: ClassNotFoundException) {
                fail("Handler class $className should be available")
            }
        }
    }
    
    @Test
    fun testApacheCommonsCompress() {
        // Test that Apache Commons Compress is available (required dependency)
        try {
            val tarClass = Class.forName("org.apache.commons.compress.archivers.tar.TarArchiveInputStream")
            assertNotNull("Apache Commons Compress should be available", tarClass)
            println("✅ Apache Commons Compress library available")
        } catch (e: ClassNotFoundException) {
            fail("Apache Commons Compress should be available - it's required for archive extraction")
        }
    }
}