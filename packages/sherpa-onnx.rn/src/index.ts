import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { TtsService } from './services/TtsService';

// Export types
export * from './types/interfaces';

// Create the default export
export default {
  // Validation
  validateLibraryLoaded: SherpaOnnxAPI.validateLibraryLoaded,
  
  // Debug utilities
  debugAssetLoading: SherpaOnnxAPI.debugAssetLoading,
  
  // Services
  TTS: TtsService
}; 