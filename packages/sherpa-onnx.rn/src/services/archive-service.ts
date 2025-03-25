import { SherpaOnnxAPI } from '../SherpaOnnxAPI';
import type { ValidateResult } from '../types/interfaces';

/**
 * Service for handling archive/file operations
 */
export class ArchiveService {
  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public static validateLibrary(): Promise<ValidateResult> {
    return SherpaOnnxAPI.validateLibraryLoaded();
  }

  /**
   * Extract a tar.bz2 archive
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory where the contents should be extracted
   * @returns Promise resolving to extraction result
   */
  public static async extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    extractedFiles?: string[];
    error?: string;
  }> {
    try {
      // First validate library
      const validation = await SherpaOnnxAPI.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }

      return await SherpaOnnxAPI.extractTarBz2(sourcePath, targetDir);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
