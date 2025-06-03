import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { ArchiveService } from './services/ArchiveService';
import { AsrService } from './services/AsrService';
import { AudioTaggingService } from './services/AudioTaggingService';
import { SpeakerIdService } from './services/SpeakerIdService';
import { TtsService } from './services/TtsService';
import type { ApiInterface } from './types/api';
import type { SherpaOnnxInterface } from './types/interfaces';

// Initialize services with API
const api: ApiInterface = SherpaOnnxAPI;
const ttsService = new TtsService(api);
const asrService = new AsrService(api);
const audioTaggingService = new AudioTaggingService(api);
const speakerIdService = new SpeakerIdService(api);
const archiveService = new ArchiveService(api);

// Create the public interface
const SherpaOnnx: SherpaOnnxInterface = {
  ...api,
  TTS: ttsService,
  ASR: asrService,
  AudioTagging: audioTaggingService,
  SpeakerId: speakerIdService,
  Archive: archiveService,
};

// Export the main interface
export default SherpaOnnx;

// Export services for direct use
export const TTS = ttsService;
export const ASR = asrService;
export const AudioTagging = audioTaggingService;
export const SpeakerId = speakerIdService;

// Export types
export * from './types/api';
export * from './types/interfaces';

// Export web utilities
export { loadWasmModule } from './WebUtils';
