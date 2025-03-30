import SherpaOnnx from '@siteed/sherpa-onnx.rn';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Interface for extraction result
 */
interface ExtractionResult {
  success: boolean;
  message?: string;
  error?: string;
  extractedFiles?: string[];
}

/**
 * Extracts a tar.bz2 file using platform-specific methods
 * On Android and iOS, uses the native module
 * No mock files are created on extraction failure.
 * 
 * @param archivePath Path to the tar.bz2 file
 * @param targetDir Directory to extract to
 * @returns Promise with the extraction result
 */
export async function extractTarBz2(
  archivePath: string, 
  targetDir: string
): Promise<ExtractionResult> {
  try {
    console.log(`ArchiveUtils: Extracting tar.bz2 from ${archivePath} to ${targetDir}...`);
    
    // Verify the archive exists
    const archiveInfo = await FileSystem.getInfoAsync(archivePath);
    console.log(`ArchiveUtils: Archive info:`, archiveInfo);
    
    if (!archiveInfo.exists) {
      console.warn(`ArchiveUtils: Archive file not found at ${archivePath}`);
      return {
        success: false, 
        message: `Archive file not found at ${archivePath}`
      };
    }
    
    // Verify the target directory exists
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    console.log(`ArchiveUtils: Target directory info:`, dirInfo);
    
    if (!dirInfo.exists) {
      console.log(`ArchiveUtils: Creating target directory: ${targetDir}`);
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }
    
    // Check if NativeSherpaOnnx is properly initialized
    if (!SherpaOnnx.Archive || typeof SherpaOnnx.Archive.extractTarBz2 !== 'function') {
      console.error('ArchiveUtils: NativeSherpaOnnx.extractTarBz2 is not available');
      return {
        success: false,
        message: 'Native module not available',
        extractedFiles: []
      };
    }
    
    // First validate that the library is loaded
    const validationResult = await SherpaOnnx.validateLibraryLoaded();
    if (!validationResult.loaded) {
      console.error(`ArchiveUtils: Native library not loaded: ${validationResult.status}`);
      return {
        success: false,
        message: `Native library not loaded: ${validationResult.status}`,
        extractedFiles: []
      };
    }
    
    console.log(`ArchiveUtils: Using native module to extract tar.bz2 on ${Platform.OS}`);
    
    try {
      // Call the extractTarBz2 method directly from SherpaOnnx.Archive
      const result = await SherpaOnnx.Archive.extractTarBz2(archivePath, targetDir);
      console.log(`ArchiveUtils: Native extraction result:`, result);
      
      if (result.success) {
        return {
          success: true,
          extractedFiles: result.extractedFiles,
          message: "Extraction successful"
        };
      } else {
        console.warn(`ArchiveUtils: Native extraction failed: ${result.message}`);
        // Check if there are any files already extracted
        const existingFiles = await FileSystem.readDirectoryAsync(targetDir);
        
        if (existingFiles.length > 0) {
          console.log(`ArchiveUtils: Found ${existingFiles.length} existing files in target directory`);
          return {
            success: true,
            extractedFiles: existingFiles,
            message: "Found existing files in target directory"
          };
        }
        
        // Clean up target directory on failure
        try {
          console.log(`ArchiveUtils: Cleaning up failed extraction directory: ${targetDir}`);
          await FileSystem.deleteAsync(targetDir, { idempotent: true });
        } catch (cleanupError) {
          console.error(`ArchiveUtils: Error cleaning up directory:`, cleanupError);
        }
        
        return {
          success: false,
          message: `Native extraction failed: ${result.message}`,
          extractedFiles: []
        };
      }
    } catch (nativeError) {
      console.error(`ArchiveUtils: Error in native extraction:`, nativeError);
      
      // Clean up target directory on error
      try {
        console.log(`ArchiveUtils: Cleaning up failed extraction directory: ${targetDir}`);
        await FileSystem.deleteAsync(targetDir, { idempotent: true });
      } catch (cleanupError) {
        console.error(`ArchiveUtils: Error cleaning up directory:`, cleanupError);
      }
      
      return {
        success: false,
        message: `Error in native extraction: ${nativeError instanceof Error ? nativeError.message : String(nativeError)}`,
        extractedFiles: []
      };
    }
  } catch (error) {
    console.error('ArchiveUtils: Error extracting tar.bz2:', error);
    
    // Clean up target directory on general error
    try {
      console.log(`ArchiveUtils: Cleaning up failed extraction directory: ${targetDir}`);
      await FileSystem.deleteAsync(targetDir, { idempotent: true });
    } catch (cleanupError) {
      console.error(`ArchiveUtils: Error cleaning up directory:`, cleanupError);
    }
    
    return {
      success: false,
      message: `Error extracting archive: ${error instanceof Error ? error.message : String(error)}`,
      extractedFiles: []
    };
  }
}

/**
 * This function represents a proper implementation that would:
 * 1. Extract the model files from the Android app's assets
 * 2. Copy them to the app's documents directory
 * 
 * @param modelType The type of model (e.g., 'tts', 'asr')
 * @param modelId The ID of the model to extract
 * @param targetDir The directory to extract to
 */
export async function extractModelFromAssets(
  modelType: string,
  modelId: string,
  targetDir: string
): Promise<ExtractionResult> {
  try {
    console.log(`ArchiveUtils: Attempting to extract model ${modelId} from assets to ${targetDir}`);
    
    // Check if there are already files in the directory
    let existingFiles: string[] = [];
    try {
      existingFiles = await FileSystem.readDirectoryAsync(targetDir);
      console.log(`ArchiveUtils: Found ${existingFiles.length} existing files:`, existingFiles);
      
      if (existingFiles.length > 0 && existingFiles.some(f => f.includes('.onnx'))) {
        console.log(`ArchiveUtils: Found existing model files, skipping extraction`);
        return {
          success: true,
          message: 'Model files already exist',
          extractedFiles: existingFiles
        };
      }
    } catch (readError) {
      console.error(`ArchiveUtils: Error reading directory:`, readError);
    }
    
    return {
      success: false,
      message: 'Asset extraction not implemented',
      extractedFiles: []
    };
  } catch (error) {
    console.error('ArchiveUtils: Error in extractModelFromAssets:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 