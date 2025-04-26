import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { ArchiveService } from './services/ArchiveService';
import { AsrService } from './services/AsrService';
import { AudioTaggingService } from './services/AudioTaggingService';
import { SpeakerIdService } from './services/SpeakerIdService';
import { TtsService } from './services/TtsService';
import type { ApiInterface } from './types/api';
<<<<<<< HEAD
import { getWasmModule, isWasmAvailable, loadWasmModule } from './WebUtils';

// Initialize services with API
// Use web implementation if we're on the web, but hide this from consumers
const api: ApiInterface = SherpaOnnxAPI;

=======
import type { SherpaOnnxInterface } from './types/interfaces';

// Initialize services with API
const api: ApiInterface = SherpaOnnxAPI;
>>>>>>> origin/main
const ttsService = new TtsService(api);
const asrService = new AsrService(api);
const audioTaggingService = new AudioTaggingService(api);
const speakerIdService = new SpeakerIdService(api);
const archiveService = new ArchiveService(api);

// Create the public interface
<<<<<<< HEAD
const SherpaOnnx = {
  validateLibraryLoaded: api.validateLibraryLoaded.bind(api),
=======
const SherpaOnnx: SherpaOnnxInterface = {
  ...api,
>>>>>>> origin/main
  TTS: ttsService,
  ASR: asrService,
  AudioTagging: audioTaggingService,
  SpeakerId: speakerIdService,
  Archive: archiveService,
<<<<<<< HEAD
  // Expose web-specific functionality
  Web: {
    isWasmAvailable,
    loadWasmModule,
    getWasmModule,
  },
=======
>>>>>>> origin/main
};

// Export the main interface
export default SherpaOnnx;

// Export services for direct use
export const TTS = ttsService;
export const ASR = asrService;
export const AudioTagging = audioTaggingService;
export const SpeakerId = speakerIdService;

<<<<<<< HEAD
// Export validateLibraryLoaded function directly
export const validateLibraryLoaded = api.validateLibraryLoaded.bind(api);

// Export Web utilities directly
export { getWasmModule, isWasmAvailable, loadWasmModule } from './WebUtils';
export type { WasmLoadOptions } from './WebUtils';

=======
>>>>>>> origin/main
// Export types
export * from './types/api';
export * from './types/interfaces';
