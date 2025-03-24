import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { TtsService } from './services/TtsService';

// Export types
export * from './types/interfaces';

// Create the default export
export default {
  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   */
  validateLibraryLoaded: SherpaOnnxAPI.validateLibraryLoaded,

  /**
   * Debug asset loading - useful for diagnosing asset issues
   */
  debugAssetLoading: SherpaOnnxAPI.debugAssetLoading,

  /**
   * List all available assets in the application bundle
   * This is helpful for debugging asset loading issues
   */
  listAllAssets: SherpaOnnxAPI.listAllAssets,

  // Services
  TTS: TtsService,

  // Add to your interface or export:
  debugAssetPath: SherpaOnnxAPI.debugAssetPath,

  /**
   * Extract a tar.bz2 file to a target directory
   * This uses platform-specific native implementation
   * 
   * @param sourcePath Path to the tar.bz2 file 
   * @param targetDir Directory to extract to
   * @returns Promise with extraction result
   */
  extractTarBz2: SherpaOnnxAPI.extractTarBz2,

  /**
   * Create mock model files when extraction fails
   * This creates placeholder files that can be used for testing
   * 
   * @param targetDir Directory to create files in
   * @param modelId Model ID for naming the files
   * @returns Promise with creation result
   */
  createMockModelFiles: SherpaOnnxAPI.createMockModelFiles,
};
