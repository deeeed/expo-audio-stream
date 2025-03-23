// Export the main API
import { SherpaOnnxAPI } from './SherpaOnnxAPI';

// Export types
export type { 
  ValidateResult,
  TtsModelConfig, 
  TtsInitResult, 
  TtsOptions, 
  TtsGenerateResult
} from './types/interfaces';

// Export a default object for easier import
const SherpaOnnx = {
  // Library validation
  validateLibraryLoaded: SherpaOnnxAPI.validateLibraryLoaded,
  
  // TTS methods
  initTts: SherpaOnnxAPI.initTts,
  generateTts: SherpaOnnxAPI.generateTts,
  stopTts: SherpaOnnxAPI.stopTts,
  releaseTts: SherpaOnnxAPI.releaseTts,
};

export { SherpaOnnxAPI };
export default SherpaOnnx;
