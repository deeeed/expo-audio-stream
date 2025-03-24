// Import services
import { TtsService } from './services/TtsService';

// Export types
export type {
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
  TtsOptions,
  ValidateResult,
} from './types/interfaces';

// Export a default object for easier import
const SherpaOnnx = {
  // Library validation - keep this at top level for convenience
  validateLibraryLoaded: TtsService.validateLibrary,

  // Group all TTS functionality under TTS namespace
  TTS: {
    // Core functions
    initialize: TtsService.initialize,
    generateSpeech: TtsService.generateSpeech,
    stopSpeech: TtsService.stopSpeech,
    release: TtsService.release,

    // Status functions
    isInitialized: TtsService.isInitialized,
    getSampleRate: TtsService.getSampleRate,
    getNumSpeakers: TtsService.getNumSpeakers,
  },
};

// Export for advanced usage if needed
export { TtsService };
export default SherpaOnnx;
