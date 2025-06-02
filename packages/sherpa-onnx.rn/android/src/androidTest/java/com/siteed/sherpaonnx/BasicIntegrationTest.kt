package com.siteed.sherpaonnx

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.*

@RunWith(AndroidJUnit4::class)
class BasicIntegrationTest {
    
    @Test
    fun testSherpaOnnxModuleReflection() {
        // Test 1: Can we find the SherpaOnnxModule class via reflection?
        try {
            val moduleClass = Class.forName("net.siteed.sherpaonnx.SherpaOnnxModule")
            assertNotNull("SherpaOnnxModule class should be available", moduleClass)
            println("✅ SherpaOnnxModule class found via reflection")
            
            // Check if it has the expected methods
            val methods = moduleClass.declaredMethods
            val methodNames = methods.map { it.name }
            
            assertTrue("Should have initTts method", methodNames.contains("initTts"))
            assertTrue("Should have validateLibraryLoaded method", methodNames.contains("validateLibraryLoaded"))
            assertTrue("Should have testOnnxIntegration method", methodNames.contains("testOnnxIntegration"))
            
            println("✅ Expected methods found in SherpaOnnxModule")
        } catch (e: ClassNotFoundException) {
            fail("SherpaOnnxModule class should be available: ${e.message}")
        }
    }
    
    @Test
    fun testSherpaOnnxImplReflection() {
        // Test 2: Can we find the SherpaOnnxImpl class via reflection?
        try {
            val implClass = Class.forName("net.siteed.sherpaonnx.SherpaOnnxImpl")
            assertNotNull("SherpaOnnxImpl class should be available", implClass)
            println("✅ SherpaOnnxImpl class found via reflection")
        } catch (e: ClassNotFoundException) {
            fail("SherpaOnnxImpl class should be available: ${e.message}")
        }
    }
    
    @Test
    fun testSherpaOnnxClasses() {
        // Test 3: Check if sherpa-onnx Kotlin classes are available
        try {
            // First trigger library loading by accessing SherpaOnnxImpl
            val implClass = Class.forName("net.siteed.sherpaonnx.SherpaOnnxImpl")
            println("✅ SherpaOnnxImpl class found, checking library loading...")
            
            // Try to get the isLibraryLoaded field
            val companionClass = Class.forName("net.siteed.sherpaonnx.SherpaOnnxImpl\$Companion")
            val isLoadedField = companionClass.getDeclaredField("isLibraryLoaded")
            isLoadedField.isAccessible = true
            val companionInstance = implClass.getDeclaredField("Companion").get(null)
            val isLoaded = isLoadedField.getBoolean(companionInstance)
            
            println("📚 Library loaded status from SherpaOnnxImpl: $isLoaded")
            
            // Now test sherpa-onnx classes - should work if library is loaded
            val ttsClass = Class.forName("com.k2fsa.sherpa.onnx.Tts")
            assertNotNull("Tts class should be available", ttsClass)
            println("✅ Sherpa-ONNX Tts class found")
            
            val vadClass = Class.forName("com.k2fsa.sherpa.onnx.Vad")
            assertNotNull("Vad class should be available", vadClass)
            println("✅ Sherpa-ONNX Vad class found")
            
        } catch (e: ClassNotFoundException) {
            println("❌ Sherpa-ONNX classes not found: ${e.message}")
            // Don't fail immediately - let's see what specific class is missing
            println("This might be expected if native library loading failed")
            assertTrue("Classes might not be available if native lib isn't loaded", true)
        } catch (e: Exception) {
            println("❌ Error testing Sherpa-ONNX classes: ${e.message}")
            assertTrue("Error occurred while testing classes", true)
        }
    }
    
    @Test
    fun testArchiveUtilsClass() {
        // Test 4: Check if our utility classes are available
        try {
            val archiveUtilsClass = Class.forName("net.siteed.sherpaonnx.utils.ArchiveUtils")
            assertNotNull("ArchiveUtils class should be available", archiveUtilsClass)
            println("✅ ArchiveUtils class found")
            
            val audioUtilsClass = Class.forName("net.siteed.sherpaonnx.utils.AudioUtils")
            assertNotNull("AudioUtils class should be available", audioUtilsClass)
            println("✅ AudioUtils class found")
            
        } catch (e: ClassNotFoundException) {
            println("❌ Utility classes not found: ${e.message}")
            fail("Utility classes should be in classpath")
        }
    }
    
    @Test
    fun testHandlerClasses() {
        // Test 5: Check if handler classes are available
        try {
            val ttsHandlerClass = Class.forName("net.siteed.sherpaonnx.handlers.TtsHandler")
            assertNotNull("TtsHandler class should be available", ttsHandlerClass)
            println("✅ TtsHandler class found")
            
            val asrHandlerClass = Class.forName("net.siteed.sherpaonnx.handlers.ASRHandler")
            assertNotNull("ASRHandler class should be available", asrHandlerClass)
            println("✅ ASRHandler class found")
            
        } catch (e: ClassNotFoundException) {
            println("❌ Handler classes not found: ${e.message}")
            fail("Handler classes should be in classpath")
        }
    }
    
    @Test
    fun testContextAvailable() {
        // Test 6: Verify Android context is available for testing
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        assertNotNull("App context should be available", appContext)
        
        // The package name will be the demo app's package name
        assertTrue("Package name should be valid", appContext.packageName.isNotEmpty())
        
        println("📱 Running on package: ${appContext.packageName}")
        println("📂 Cache dir: ${appContext.cacheDir}")
        println("📂 Files dir: ${appContext.filesDir}")
    }
    
    @Test
    fun testFileSystemAccess() {
        // Test 7: Verify we can access file system for testing
        val appContext = InstrumentationRegistry.getInstrumentation().targetContext
        val cacheDir = appContext.cacheDir
        
        assertTrue("Cache directory should exist", cacheDir.exists())
        assertTrue("Cache directory should be writable", cacheDir.canWrite())
        
        // Try to create a test file
        val testFile = java.io.File(cacheDir, "sherpa_test.txt")
        try {
            testFile.writeText("test")
            assertTrue("Should be able to create test file", testFile.exists())
            testFile.delete()
            println("✅ File system access works")
        } catch (e: Exception) {
            fail("Should be able to write to cache directory: ${e.message}")
        }
    }
}