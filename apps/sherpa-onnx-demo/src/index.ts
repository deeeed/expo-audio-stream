import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { TtsService } from './services/TtsService';

// Export types
export * from './types/interfaces';

// Create the default export
export default {
  validateLibraryLoaded: SherpaOnnxAPI.validateLibraryLoaded,
  debugAssetLoading: SherpaOnnxAPI.debugAssetLoading,
  TTS: TtsService,
}; 