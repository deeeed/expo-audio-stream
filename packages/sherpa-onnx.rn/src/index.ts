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
};
