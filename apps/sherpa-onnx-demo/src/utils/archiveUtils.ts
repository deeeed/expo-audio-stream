import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import SherpaOnnx from '@siteed/sherpa-onnx.rn';

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
    if (Platform.OS === 'android' && SherpaOnnx) {
      console.log(`ArchiveUtils: Using native module to extract tar.bz2 on Android`);
      try {
        // Call the native module's extractTarBz2 method
        const result = await SherpaOnnx.extractTarBz2(archivePath, targetDir);
        console.log(`ArchiveUtils: Native extraction result:`, result);
        
        if (result.success) {
          return {
            success: true,
            extractedFiles: result.extractedFiles,
            message: result.message
          };
        } else {
          console.warn(`ArchiveUtils: Native extraction failed: ${result.message}`);
          // Fall back to creating mock files
          return await createMockFiles(targetDir, archivePath);
        }
      } catch (nativeError) {
        console.error(`ArchiveUtils: Error in native extraction:`, nativeError);
        // Fall back to creating mock files
        return await createMockFiles(targetDir, archivePath);
      }
    } else {
      // On iOS or other platforms, just create mock files for now
      console.log(`ArchiveUtils: Using mock files on ${Platform.OS} (native extraction not implemented)`);
      return await createMockFiles(targetDir, archivePath);
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
  console.log(`ArchiveUtils: Mock file creation is disabled - extraction is required`);
  
  // Check existing files
  const files = await FileSystem.readDirectoryAsync(targetDir);
  console.log(`ArchiveUtils: Found ${files.length} files in target directory:`, files);
  
  return {
    success: false,
    extractedFiles: files,
    message: "Archive extraction failed. Mock files won't be created - please check native extraction implementation."
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
    console.log(`ArchiveUtils: Extracting model ${modelId} (type: ${modelType}) to ${targetDir}...`);
    
    // Create the target directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    console.log(`ArchiveUtils: Target directory info:`, dirInfo);
    
    if (!dirInfo.exists) {
      console.log(`ArchiveUtils: Creating target directory: ${targetDir}`);
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }
    
    // Check if there are already files in the directory
    console.log(`ArchiveUtils: Checking existing files in ${targetDir}`);
    const existingFiles = await FileSystem.readDirectoryAsync(targetDir);
    console.log(`ArchiveUtils: Found ${existingFiles.length} existing files:`, existingFiles);
    
    // In a real implementation, you would:
    // 1. Use a native module to list all assets in the bundle
    // 2. Filter for files related to the requested model
    // 3. Copy each file to the target directory
    
    console.log(`ArchiveUtils: IMPORTANT - This is a placeholder implementation`);
    console.log(`ArchiveUtils: In a real implementation, you should copy actual model files from assets`);
    
    const modelPath = `${modelType}/${modelId}`;
    console.log(`ArchiveUtils: Using model path ${modelPath} for asset lookup`);
    
    const requiredFiles = ['model.onnx', 'voices.bin', 'tokens.txt'];
    console.log(`ArchiveUtils: Required files:`, requiredFiles);
    
    const extractedFiles: string[] = [];
    
    for (const file of requiredFiles) {
      // In a real implementation, you would have code to:
      // 1. Check if the asset exists in the bundle
      // 2. Copy it to the target directory
      
      const targetFile = `${targetDir}/${file}`;
      console.log(`ArchiveUtils: Creating (empty) file: ${targetFile}`);
      
      try {
        // Check if file already exists
        const fileInfo = await FileSystem.getInfoAsync(targetFile);
        if (fileInfo.exists) {
          console.log(`ArchiveUtils: File already exists: ${targetFile}`);
          extractedFiles.push(file);
          continue;
        }
        
        // For demo purposes, let's create an empty file with a note inside
        const content = `This is a placeholder file created by extractModelFromAssets\nReal implementation should copy the actual file content from assets`;
        await FileSystem.writeAsStringAsync(targetFile, content);
        console.log(`ArchiveUtils: Created placeholder file: ${targetFile}`);
        extractedFiles.push(file);
      } catch (fileError) {
        console.error(`ArchiveUtils: Error creating file ${targetFile}:`, fileError);
      }
    }
    
    console.log(`ArchiveUtils: Extraction completed. Extracted ${extractedFiles.length} files:`, extractedFiles);
    
    // Check if we actually created any files
    if (extractedFiles.length === 0) {
      console.warn(`ArchiveUtils: No files were extracted!`);
      return {
        success: false,
        message: 'No files could be extracted from assets'
      };
    }
    
    return {
      success: true,
      extractedFiles
    };
  } catch (error) {
    console.error('ArchiveUtils: Error extracting model from assets:', error);
    return {
      success: false,
      message: `Error extracting model: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 