package net.siteed.sherpaonnx

import android.content.res.AssetManager
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

/**
 * Utility class for working with Android assets
 */
object AssetUtils {
    private const val TAG = "AssetUtils"

    /**
     * Verify if the required model assets exist
     */
    fun verifyModelAssets(
        assetManager: AssetManager,
        modelDir: String,
        modelName: String,
        acousticModelName: String,
        voices: String
    ): Boolean {
        // Log what we're looking for
        Log.i(TAG, "Verifying model assets:")
        
        // Try a more exhaustive check of asset directories
        try {
            Log.i(TAG, "Checking all model directories in assets:")
            val baseAssets = assetManager.list("") ?: emptyArray()
            Log.i(TAG, "Root assets: ${baseAssets.joinToString(", ")}")
            
            if (baseAssets.contains("tts")) {
                val ttsAssets = assetManager.list("tts") ?: emptyArray()
                Log.i(TAG, "tts directory contents: ${ttsAssets.joinToString(", ")}")
                
                for (ttsDir in ttsAssets) {
                    try {
                        val subAssets = assetManager.list("tts/$ttsDir") ?: emptyArray()
                        Log.i(TAG, "tts/$ttsDir contents: ${subAssets.joinToString(", ")}")
                    } catch (e: IOException) {
                        Log.e(TAG, "Error listing tts/$ttsDir: ${e.message}")
                    }
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error listing root assets: ${e.message}")
        }
        
        // Try to list all files in the modelDir to help diagnose issues
        try {
            val allAssets = assetManager.list(modelDir) ?: emptyArray()
            Log.i(TAG, "Contents of modelDir '$modelDir': ${allAssets.joinToString(", ") ?: "none"}")
            
            // If the directory exists but is empty, this might be a path issue
            if (allAssets.isEmpty()) {
                Log.w(TAG, "modelDir '$modelDir' exists but contains no files. This might be a path issue.")
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error listing assets in modelDir '$modelDir': ${e.message}")
        }
        
        // Determine which type of model we're using based on the parameters
        val isKokoroModel = voices.isNotEmpty()
        val isMatchaModel = acousticModelName.isNotEmpty()
        val isVitsModel = modelName.isNotEmpty() && !isKokoroModel && !isMatchaModel
        
        Log.i(TAG, "Model type: ${
            when {
                isKokoroModel -> "Kokoro"
                isMatchaModel -> "Matcha"
                isVitsModel -> "VITS"
                else -> "Unknown"
            }
        }")
        
        // Try a more flexible approach to finding the files
        // Let's try different path combinations to find the model files
        val possiblePaths = mutableListOf<String>()
        possiblePaths.add(modelDir) // Original path
        
        // Extract the model name part (in case it's tts/model-name)
        val modelDirParts = modelDir.split("/")
        if (modelDirParts.size > 1) {
            possiblePaths.add(modelDirParts.last()) // Try just the model name part
        }
        
        for (basePath in possiblePaths) {
            Log.i(TAG, "Trying with base path: '$basePath'")
            
            // Check for specific model files based on model type
            if (isKokoroModel) {
                // For Kokoro model, check model file and voices file
                val modelPath = if (modelName.isEmpty()) "$basePath/model.onnx" else "$basePath/$modelName"
                val voicesPath = if (voices.isEmpty()) "$basePath/voices.bin" else "$basePath/$voices"
                val tokensPath = "$basePath/tokens.txt"
                
                Log.i(TAG, "Checking Kokoro model files with basePath '$basePath':")
                Log.i(TAG, "  Model file: '$modelPath' exists: ${assetExists(assetManager, modelPath)}")
                Log.i(TAG, "  Voices file: '$voicesPath' exists: ${assetExists(assetManager, voicesPath)}")
                Log.i(TAG, "  Tokens file: '$tokensPath' exists: ${assetExists(assetManager, tokensPath)}")
                
                if (assetExists(assetManager, modelPath) && 
                    assetExists(assetManager, voicesPath) &&
                    assetExists(assetManager, tokensPath)) {
                    Log.i(TAG, "Found all required files with basePath '$basePath'")
                    return true
                }
            } else if (isMatchaModel) {
                // Similar checks for Matcha model
                // ...
            } else if (isVitsModel) {
                // Similar checks for VITS model
                // ...
            } else {
                // Try default files
                // ...
            }
        }
        
        // Fall back to original behavior
        Log.w(TAG, "Could not find model files in any of the tried paths, falling back to original check")
        
        if (isKokoroModel) {
            // For Kokoro model, check model file and voices file
            val modelFilePath = if (modelName.isEmpty()) "$modelDir/model.onnx" else "$modelDir/$modelName"
            val voicesFilePath = if (voices.isEmpty()) "$modelDir/voices.bin" else "$modelDir/$voices"
            val tokensFilePath = "$modelDir/tokens.txt"
            
            Log.i(TAG, "Final check for Kokoro model files:")
            Log.i(TAG, "  Model file: '$modelFilePath' exists: ${assetExists(assetManager, modelFilePath)}")
            Log.i(TAG, "  Voices file: '$voicesFilePath' exists: ${assetExists(assetManager, voicesFilePath)}")
            Log.i(TAG, "  Tokens file: '$tokensFilePath' exists: ${assetExists(assetManager, tokensFilePath)}")
            
            return assetExists(assetManager, modelFilePath) && 
                   assetExists(assetManager, voicesFilePath) &&
                   assetExists(assetManager, tokensFilePath)
        } 
        
        // Rest of existing code...
        return false
    }

    /**
     * Check if an asset exists - improved version
     */
    fun assetExists(assetManager: AssetManager, path: String): Boolean {
        if (path.isEmpty()) {
            Log.d(TAG, "Empty path provided to assetExists")
            return false
        }
        
        // First try direct file access
        try {
            val inputStream = assetManager.open(path)
            inputStream.close()
            Log.d(TAG, "Asset exists as file: $path")
            return true
        } catch (e: IOException) {
            // File doesn't exist, try directory access next
        }
        
        // Check if it's a directory
        try {
            val files = assetManager.list(path)
            if (files != null && files.isNotEmpty()) {
                Log.d(TAG, "Asset exists as directory: $path with ${files.size} files")
                return true
            }
        } catch (e: IOException) {
            // Not a directory either
        }
        
        // Try with different case (Android assets can be case sensitive)
        try {
            // Get the parent directory
            val lastSlash = path.lastIndexOf('/')
            if (lastSlash >= 0) {
                val parentDir = path.substring(0, lastSlash)
                val fileName = path.substring(lastSlash + 1)
                
                // List files in parent directory
                val parentFiles = assetManager.list(parentDir) ?: emptyArray()
                
                // Check if any file matches ignoring case
                for (file in parentFiles) {
                    if (file.equals(fileName, ignoreCase = true)) {
                        Log.d(TAG, "Asset exists with different case: $parentDir/$file (searched for $fileName)")
                        return true
                    }
                }
            }
        } catch (e: IOException) {
            // Couldn't check parent directory
        }
        
        Log.d(TAG, "Asset does not exist: $path")
        return false
    }

    /**
     * Copy an asset directory recursively to a target directory
     */
    fun copyAssetDir(assetManager: AssetManager, assetDirPath: String, targetBaseDir: File): String {
        Log.i(TAG, "Copying asset directory from '$assetDirPath' to '${targetBaseDir.absolutePath}'")
        
        val targetDir = File(targetBaseDir, assetDirPath)
        if (!targetDir.exists()) {
            if (!targetDir.mkdirs()) {
                Log.e(TAG, "Failed to create directory: ${targetDir.absolutePath}")
                return targetBaseDir.absolutePath
            }
        }
        
        try {
            val assets = assetManager.list(assetDirPath) ?: emptyArray()
            Log.d(TAG, "Found ${assets.size} items in asset directory '$assetDirPath'")
            
            if (assets.isEmpty()) {
                // It's a file, not a directory
                val targetFile = File(targetBaseDir, assetDirPath)
                copyAssetFile(assetManager, assetDirPath, targetFile)
            } else {
                // It's a directory
                for (asset in assets) {
                    val subPath = if (assetDirPath.isEmpty()) asset else "$assetDirPath/$asset"
                    val subAssets = assetManager.list(subPath) ?: emptyArray()
                    
                    if (subAssets.isEmpty()) {
                        // It's a file
                        val targetFile = File(targetDir, asset)
                        copyAssetFile(assetManager, subPath, targetFile)
                    } else {
                        // It's a subdirectory, recurse
                        copyAssetDir(assetManager, subPath, targetBaseDir)
                    }
                }
            }
        } catch (e: IOException) {
            Log.e(TAG, "Error copying asset directory '$assetDirPath': ${e.message}")
            e.printStackTrace()
        }
        
        return targetBaseDir.absolutePath
    }

    /**
     * Copy an asset file to a target file
     */
    private fun copyAssetFile(assetManager: AssetManager, assetPath: String, targetFile: File) {
        try {
            Log.d(TAG, "Copying asset file from '$assetPath' to '${targetFile.absolutePath}'")
            
            if (targetFile.exists()) {
                Log.d(TAG, "Target file already exists, skipping: ${targetFile.absolutePath}")
                return
            }
            
            val inputStream = assetManager.open(assetPath)
            val outputStream = FileOutputStream(targetFile)
            
            val buffer = ByteArray(4 * 1024)
            var read: Int
            
            while (inputStream.read(buffer).also { read = it } != -1) {
                outputStream.write(buffer, 0, read)
            }
            
            outputStream.flush()
            outputStream.close()
            inputStream.close()
            
            Log.d(TAG, "Successfully copied asset file to: ${targetFile.absolutePath}")
        } catch (e: IOException) {
            Log.e(TAG, "Error copying asset file '$assetPath': ${e.message}")
            e.printStackTrace()
        }
    }
} 