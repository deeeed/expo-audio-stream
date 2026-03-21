import SherpaOnnx from '@siteed/sherpa-onnx.rn';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { baseLogger } from '../config';

const logger = baseLogger.extend('ArchiveUtils');

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
    logger.info(`Extracting tar.bz2 from ${archivePath} to ${targetDir}...`);

    // Verify the archive exists
    const archiveInfo = await FileSystem.getInfoAsync(archivePath);
    logger.info(`Archive info: exists=${archiveInfo.exists}, uri=${archiveInfo.uri}`);

    if (!archiveInfo.exists) {
      logger.warn(`Archive file not found at ${archivePath}`);
      return {
        success: false,
        message: `Archive file not found at ${archivePath}`
      };
    }

    // Verify the target directory exists
    const dirInfo = await FileSystem.getInfoAsync(targetDir);

    if (!dirInfo.exists) {
      logger.info(`Creating target directory: ${targetDir}`);
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }

    // Check if NativeSherpaOnnx is properly initialized
    if (!SherpaOnnx.Archive || typeof SherpaOnnx.Archive.extractTarBz2 !== 'function') {
      logger.error('NativeSherpaOnnx.extractTarBz2 is not available');
      return {
        success: false,
        message: 'Native module not available',
        extractedFiles: []
      };
    }

    // First validate that the library is loaded
    const validationResult = await SherpaOnnx.validateLibraryLoaded();
    if (!validationResult.loaded) {
      logger.error(`Native library not loaded: ${validationResult.status}`);
      return {
        success: false,
        message: `Native library not loaded: ${validationResult.status}`,
        extractedFiles: []
      };
    }

    logger.info(`Using native module to extract tar.bz2 on ${Platform.OS}`);

    try {
      // Call the extractTarBz2 method directly from SherpaOnnx.Archive
      const result = await SherpaOnnx.Archive.extractTarBz2(archivePath, targetDir);
      logger.info(`Native extraction result: success=${result.success}, files=${result.extractedFiles?.length ?? 0}`);

      if (result.success) {
        return {
          success: true,
          extractedFiles: result.extractedFiles,
          message: "Extraction successful"
        };
      } else {
        logger.warn(`Native extraction failed: ${result.message}`);
        // Check if there are any files already extracted
        const existingFiles = await FileSystem.readDirectoryAsync(targetDir);

        if (existingFiles.length > 0) {
          logger.info(`Found ${existingFiles.length} existing files in target directory`);
          return {
            success: true,
            extractedFiles: existingFiles,
            message: "Found existing files in target directory"
          };
        }

        // Clean up target directory on failure
        try {
          logger.info(`Cleaning up failed extraction directory: ${targetDir}`);
          await FileSystem.deleteAsync(targetDir, { idempotent: true });
        } catch (cleanupError) {
          logger.error(`Error cleaning up directory: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }

        return {
          success: false,
          message: `Native extraction failed: ${result.message}`,
          extractedFiles: []
        };
      }
    } catch (nativeError) {
      logger.error(`Error in native extraction: ${nativeError instanceof Error ? nativeError.message : String(nativeError)}`);

      // Clean up target directory on error
      try {
        logger.info(`Cleaning up failed extraction directory: ${targetDir}`);
        await FileSystem.deleteAsync(targetDir, { idempotent: true });
      } catch (cleanupError) {
        logger.error(`Error cleaning up directory: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }

      return {
        success: false,
        message: `Error in native extraction: ${nativeError instanceof Error ? nativeError.message : String(nativeError)}`,
        extractedFiles: []
      };
    }
  } catch (error) {
    logger.error(`Error extracting tar.bz2: ${error instanceof Error ? error.message : String(error)}`);

    // Clean up target directory on general error
    try {
      logger.info(`Cleaning up failed extraction directory: ${targetDir}`);
      await FileSystem.deleteAsync(targetDir, { idempotent: true });
    } catch (cleanupError) {
      logger.error(`Error cleaning up directory: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
    }

    return {
      success: false,
      message: `Error extracting archive: ${error instanceof Error ? error.message : String(error)}`,
      extractedFiles: []
    };
  }
}
