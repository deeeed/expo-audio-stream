package net.siteed.sherpaonnx.utils

import android.content.Context
import java.io.File

/**
 * Test-only utility for managing ONNX models during integration tests.
 * This is NOT part of the library - it's only for testing purposes.
 */
object TestModelManager {
    
    // Lightweight models suitable for CI testing
    data class TestModel(
        val id: String,
        val name: String,
        val type: String,
        val localPath: String,  // Path within test assets
        val description: String
    )
    
    val TEST_MODELS = mapOf(
        "vits-test" to TestModel(
            id = "vits-test",
            name = "Test VITS Model",
            type = "tts",
            localPath = "models/vits-test.onnx",
            description = "Minimal VITS model for TTS testing"
        ),
        "silero-vad-test" to TestModel(
            id = "silero-vad-test",
            name = "Test VAD Model",
            type = "vad",
            localPath = "models/silero-vad-test.onnx",
            description = "Minimal VAD model for voice activity detection testing"
        ),
        "whisper-tiny-test" to TestModel(
            id = "whisper-tiny-test",
            name = "Test Whisper Model",
            type = "asr",
            localPath = "models/whisper-tiny-test.onnx",
            description = "Minimal Whisper model for ASR testing"
        )
    )
    
    /**
     * Get the path to a test model file.
     * Models should be placed in androidTest/assets/models/ directory.
     */
    fun getTestModelPath(context: Context, modelId: String): File? {
        val model = TEST_MODELS[modelId] ?: return null
        
        // In real tests, models would be copied from test assets
        // For now, return a placeholder path
        val testDir = File(context.filesDir, "test_models")
        testDir.mkdirs()
        
        return File(testDir, model.localPath)
    }
    
    /**
     * Check if a test model exists in the test assets.
     */
    fun isTestModelAvailable(context: Context, modelId: String): Boolean {
        val model = TEST_MODELS[modelId] ?: return false
        
        // In a real implementation, check if the model exists in test assets
        // For now, return false as we don't have actual test models
        return false
    }
    
    /**
     * Copy a test model from assets to a temporary location for testing.
     */
    fun prepareTestModel(context: Context, modelId: String): File? {
        // This would copy the model from test assets to a temporary location
        // For now, just return null as we don't have actual test models
        return null
    }
}