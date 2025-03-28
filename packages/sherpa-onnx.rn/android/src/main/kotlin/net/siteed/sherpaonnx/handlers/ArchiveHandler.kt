/**
 * Handler for Archive operations
 */
package net.siteed.sherpaonnx.handlers

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import net.siteed.sherpaonnx.utils.ArchiveUtils
import net.siteed.sherpaonnx.utils.AssetUtils
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
                val cleanSourcePath = AssetUtils.cleanFilePath(sourcePath)
                val cleanTargetDir = AssetUtils.cleanFilePath(targetDir)
                
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
} 