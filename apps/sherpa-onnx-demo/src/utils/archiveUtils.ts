import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { ArchiveService } from '@siteed/sherpa-onnx.rn';

/**
 * Interface for extraction result
 */
interface ExtractionResult {
  success: boolean;
  message?: string;
  extractedFiles?: string[];
}

/**
 * Extracts a tar.bz2 file using platform-specific methods
 * On Android, uses the native module
 * On iOS, creates mock files for now until native implementation is added
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
    
    // Use platform-specific extraction methods
    if (Platform.OS === 'android') {
      console.log(`ArchiveUtils: Using native module to extract tar.bz2 on Android`);
      try {
        // Call the ArchiveService extractTarBz2 method
        const result = await ArchiveService.extractTarBz2(archivePath, targetDir);
        console.log(`ArchiveUtils: Native extraction result:`, result);
        
        if (result.success) {
          return {
            success: true,
            extractedFiles: result.extractedFiles,
            message: "Extraction successful"
          };
        } else {
          console.warn(`ArchiveUtils: Native extraction failed: ${result.error}`);
          // Check if there are any files already extracted
          const existingFiles = await FileSystem.readDirectoryAsync(targetDir);
          
          if (existingFiles.length > 0) {
            console.log(`ArchiveUtils: Found ${existingFiles.length} existing files in target directory`);
            return {
              success: true,
              extractedFiles: existingFiles,
              message: "Found existing files - skipping placeholder creation"
            };
          }
          
          return {
            success: false,
            message: `Native extraction failed: ${result.error} - No placeholder files will be created`,
            extractedFiles: []
          };
        }
      } catch (nativeError) {
        console.error(`ArchiveUtils: Error in native extraction:`, nativeError);
        return {
          success: false,
          message: `Error in native extraction: ${nativeError instanceof Error ? nativeError.message : String(nativeError)} - No placeholder files will be created`,
          extractedFiles: []
        };
      }
    } else {
      // On iOS or other platforms
      console.log(`ArchiveUtils: Native extraction not implemented on ${Platform.OS}`);
      // Just check if there are any files already in the directory
      const existingFiles = await FileSystem.readDirectoryAsync(targetDir);
      
      if (existingFiles.length > 0) {
        console.log(`ArchiveUtils: Found ${existingFiles.length} existing files in target directory`);
        return {
          success: true,
          extractedFiles: existingFiles,
          message: "Found existing files in target directory"
        };
      }
      
      return {
        success: false,
        message: `Native extraction not implemented on ${Platform.OS} - No placeholder files will be created`,
        extractedFiles: []
      };
    }
  } catch (error) {
    console.error('ArchiveUtils: Error extracting tar.bz2:', error);
    return {
      success: false,
      message: `Error extracting archive: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Helper function to inform that extraction failed and no mock files will be created
 */
async function createMockFiles(targetDir: string, archivePath: string): Promise<ExtractionResult> {
  // Extract the model ID from the archive path (last part of the path)
  const parts = archivePath.split('/');
  const archiveFileName = parts[parts.length - 1];
  const modelId = archiveFileName.replace('.tar.bz2', '');
  
  console.log(`ArchiveUtils: Extraction failed for model ${modelId}`);
  console.log(`ArchiveUtils: Mock file creation is completely disabled - extraction is required`);
  
  // Check existing files only to report them in logs
  let files: string[] = [];
  try {
    files = await FileSystem.readDirectoryAsync(targetDir);
    console.log(`ArchiveUtils: Found ${files.length} files in target directory:`, files);
  } catch (readError) {
    console.error(`ArchiveUtils: Error reading directory:`, readError);
  }
  
  // For Matcha models, we should still check if extraction actually succeeded partially
  if (modelId.includes('matcha')) {
    console.log(`ArchiveUtils: Checking for Matcha model files in subdirectories`);
    
    // Look for the matcha subdirectory
    const matchaDir = files.find(file => 
      file.includes('matcha') || 
      (file.includes('en_US') && file.includes('ljspeech'))
    );
    
    if (matchaDir) {
      const matchaPath = `${targetDir}/${matchaDir}`;
      
      try {
        const matchaInfo = await FileSystem.getInfoAsync(matchaPath);
        
        if (matchaInfo.exists && matchaInfo.isDirectory) {
          console.log(`ArchiveUtils: Found Matcha subdirectory: ${matchaPath}`);
          
          // Get files in the Matcha subdirectory
          const matchaFiles = await FileSystem.readDirectoryAsync(matchaPath);
          console.log(`ArchiveUtils: Files in Matcha subdirectory: ${matchaFiles.join(', ')}`);
          
          // If the subdirectory has extracted files, especially the model file, extraction was likely successful
          const hasModelFile = matchaFiles.some(file => 
            file.includes('model-steps') || 
            file.includes('acoustic_model')
          );
          
          if (hasModelFile) {
            console.log(`ArchiveUtils: Found model file in subdirectory, extraction appears successful`);
            return {
              success: true,
              extractedFiles: files.concat(matchaFiles.map(file => `${matchaDir}/${file}`)),
              message: "Archive extraction successful via subdirectory check."
            };
          }
        }
      } catch (error) {
        console.error(`ArchiveUtils: Error checking Matcha subdirectory:`, error);
      }
    }
  }
  
  return {
    success: false,
    extractedFiles: files,
    message: "Archive extraction failed. Mock file creation is disabled - native extraction is required."
  };
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
    console.log(`ArchiveUtils: Extraction from assets is currently disabled for model ${modelId}`);
    
    // Check if there are already files in the directory - we'll just report these
    console.log(`ArchiveUtils: Checking existing files in ${targetDir}`);
    let existingFiles: string[] = [];
    try {
      existingFiles = await FileSystem.readDirectoryAsync(targetDir);
      console.log(`ArchiveUtils: Found ${existingFiles.length} existing files:`, existingFiles);
    } catch (readError) {
      console.error(`ArchiveUtils: Error reading directory:`, readError);
    }
    
    // Skip placeholder file creation entirely
    console.log(`ArchiveUtils: Placeholder file creation is now disabled`);
    
    return {
      success: false,
      message: 'Placeholder file creation is disabled, please use native extraction',
      extractedFiles: existingFiles
    };
  } catch (error) {
    console.error('ArchiveUtils: Error in extractModelFromAssets:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 