package net.siteed.sherpaonnx

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import net.siteed.sherpaonnx.utils.TestModelManager
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * Integration tests for test model management utilities
 * 
 * These tests validate that our test utilities can properly
 * manage models for integration testing purposes.
 * 
 * Note: These are test utilities, not part of the library API.
 */
@RunWith(AndroidJUnit4::class)
class TestModelManagementTest {
    
    private lateinit var context: android.content.Context
    private lateinit var testDir: File
    
    @Before
    fun setUp() {
        context = InstrumentationRegistry.getInstrumentation().targetContext
        testDir = File(context.filesDir, "test_models")
    }
    
    @Test
    fun testModelRegistryContainsExpectedModels() {
        // Test that our test model registry contains the expected models
        val models = TestModelManager.TEST_MODELS
        
        assertEquals("Should have 3 test models", 3, models.size)
        
        // Verify each model has required properties
        models.forEach { (id, model) ->
            assertNotNull("Model $id should have name", model.name)
            assertNotNull("Model $id should have type", model.type)
            assertNotNull("Model $id should have localPath", model.localPath)
            assertNotNull("Model $id should have description", model.description)
            
            println("✅ Test model $id: ${model.name}")
        }
        
        // Verify specific models exist
        assertTrue("Should have vits-test", models.containsKey("vits-test"))
        assertTrue("Should have silero-vad-test", models.containsKey("silero-vad-test"))
        assertTrue("Should have whisper-tiny-test", models.containsKey("whisper-tiny-test"))
    }
    
    @Test
    fun testModelTypesAreCategorizedCorrectly() {
        // Test that models are correctly categorized by type
        val models = TestModelManager.TEST_MODELS
        
        val ttsModels = models.values.filter { it.type == "tts" }
        val vadModels = models.values.filter { it.type == "vad" }
        val asrModels = models.values.filter { it.type == "asr" }
        
        assertEquals("Should have 1 TTS model", 1, ttsModels.size)
        assertEquals("Should have 1 VAD model", 1, vadModels.size)
        assertEquals("Should have 1 ASR model", 1, asrModels.size)
    }
    
    @Test
    fun testGetTestModelPath() {
        // Test that we can get paths for test models
        val vitsPath = TestModelManager.getTestModelPath(context, "vits-test")
        assertNotNull("Should return path for vits-test", vitsPath)
        assertTrue("Path should contain model ID", vitsPath!!.path.contains("vits-test"))
        
        val unknownPath = TestModelManager.getTestModelPath(context, "unknown-model")
        assertNull("Should return null for unknown model", unknownPath)
    }
    
    @Test
    fun testModelAvailabilityCheck() {
        // Test checking if models are available
        // Note: This will return false as we don't have actual test models yet
        val isVitsAvailable = TestModelManager.isTestModelAvailable(context, "vits-test")
        assertFalse("Test models not yet implemented", isVitsAvailable)
        
        println("⚠️ Test models not yet implemented - this is expected")
    }
    
    @Test
    fun testPrepareTestModel() {
        // Test preparing a model for testing
        // Note: This will return null as we don't have actual test models yet
        val preparedModel = TestModelManager.prepareTestModel(context, "vits-test")
        assertNull("Test model preparation not yet implemented", preparedModel)
        
        println("⚠️ Test model preparation not yet implemented - this is expected")
    }
    
    @Test
    fun testModelPathStructure() {
        // Test that model paths follow expected structure
        TestModelManager.TEST_MODELS.forEach { (id, model) ->
            assertTrue(
                "Model path should end with .onnx",
                model.localPath.endsWith(".onnx")
            )
            assertTrue(
                "Model path should start with models/",
                model.localPath.startsWith("models/")
            )
        }
    }
    
    @Test
    fun testModelManagerIsTestOnly() {
        // Verify that TestModelManager is in the test package
        val className = TestModelManager::class.java.name
        assertTrue(
            "TestModelManager should be in test utils package",
            className.contains("utils.TestModelManager")
        )
        
        // Verify it's not in the main library package structure
        assertFalse(
            "TestModelManager should not be in handlers package",
            className.contains("handlers")
        )
    }
}