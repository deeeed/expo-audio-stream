/**
 * Handler for Archive operations
 */
package net.siteed.sherpaonnx

import android.util.Log
import com.facebook.react.bridge.*
import java.io.File
import java.util.concurrent.Executors

class ArchiveHandler(private val reactContext: ReactApplicationContext) {
    
    private val executor = Executors.newSingleThreadExecutor()
    
    companion object {
        private const val TAG = "SherpaOnnxArchive"
    }
    
    /**
     * Extract a tar.bz2 file to a target directory
     * 
     * @param sourcePath Path to the tar.bz2 file
     * @param targetDir Directory to extract to
     * @param promise Promise to resolve or reject
     */
    fun extractTarBz2(sourcePath: String, targetDir: String, promise: Promise) {
        executor.execute {
            try {
                // Clean up the paths
                val cleanSourcePath = sourcePath.replace("file://", "")
                val cleanTargetDir = targetDir.replace("file://", "")
                
                Log.i(TAG, "Extracting tar.bz2 from $cleanSourcePath to $cleanTargetDir")
                
                // Use our ArchiveUtils to extract the file
                val result = ArchiveUtils.extractTarBz2(reactContext, cleanSourcePath, cleanTargetDir)
                
                // Create a result map to return to JavaScript
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", result.success)
                resultMap.putString("message", result.message)
                
                // Add extracted files list
                val filesArray = Arguments.createArray()
                for (file in result.extractedFiles) {
                    filesArray.pushString(file)
                }
                resultMap.putArray("extractedFiles", filesArray)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in extractTarBz2: ${e.message}", e)
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_EXTRACT_TAR_BZ2", "Failed to extract tar.bz2: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Create mock model files for testing
     */
    fun createMockModelFiles(targetDir: String, modelId: String, promise: Promise) {
        executor.execute {
            try {
                // Clean up the paths
                val cleanTargetDir = targetDir.replace("file://", "")
                
                Log.i(TAG, "Creating mock model files in $cleanTargetDir for model $modelId")
                
                // Use ArchiveUtils to create mock files
                val result = ArchiveUtils.createMockModelFiles(cleanTargetDir, modelId)
                
                // Create a result map to return to JavaScript
                val resultMap = Arguments.createMap()
                resultMap.putBoolean("success", result.success)
                resultMap.putString("message", result.message)
                
                // Add mock files list
                val filesArray = Arguments.createArray()
                for (file in result.extractedFiles) {
                    filesArray.pushString(file)
                }
                resultMap.putArray("createdFiles", filesArray)
                
                reactContext.runOnUiQueueThread {
                    promise.resolve(resultMap)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in createMockModelFiles: ${e.message}", e)
                reactContext.runOnUiQueueThread {
                    promise.reject("ERR_CREATE_MOCK_FILES", "Failed to create mock model files: ${e.message}")
                }
            }
        }
    }
} 