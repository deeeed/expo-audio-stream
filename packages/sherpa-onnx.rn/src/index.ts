import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { ArchiveService } from './services/ArchiveService';
import { AsrService } from './services/AsrService';
import { AudioTaggingService } from './services/AudioTaggingService';
import { SpeakerIdService } from './services/SpeakerIdService';
import { TtsService } from './services/TtsService';
import type { ApiInterface } from './types/api';
import { getWasmModule, isWasmAvailable, loadWasmModule } from './WebUtils';

// Initialize services with API
// Use web implementation if we're on the web, but hide this from consumers
const api: ApiInterface = SherpaOnnxAPI;

const ttsService = new TtsService(api);
const asrService = new AsrService(api);
const audioTaggingService = new AudioTaggingService(api);
const speakerIdService = new SpeakerIdService(api);
const archiveService = new ArchiveService(api);

// Create the public interface
const SherpaOnnx = {
  validateLibraryLoaded: api.validateLibraryLoaded.bind(api),
  TTS: ttsService,
  ASR: asrService,
  AudioTagging: audioTaggingService,
  SpeakerId: speakerIdService,
  Archive: archiveService,
  // Expose web-specific functionality
  Web: {
    isWasmAvailable,
    loadWasmModule,
    getWasmModule,
  },
};

// Export the main interface
export default SherpaOnnx;

// Export services for direct use
export const TTS = ttsService;
export const ASR = asrService;
export const AudioTagging = audioTaggingService;
export const SpeakerId = speakerIdService;

// Export validateLibraryLoaded function directly
export const validateLibraryLoaded = api.validateLibraryLoaded.bind(api);

// Export Web utilities directly
export { getWasmModule, isWasmAvailable, loadWasmModule } from './WebUtils';
export type { WasmLoadOptions } from './WebUtils';

// Export types
export * from './types/api';
export * from './types/interfaces';
