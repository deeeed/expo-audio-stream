import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { ArchiveService } from './services/ArchiveService';
import { AsrService } from './services/AsrService';
import { AudioTaggingService } from './services/AudioTaggingService';
import { KWSService } from './services/KWSService';
import { LanguageIdService } from './services/LanguageIdService';
import { SpeakerIdService } from './services/SpeakerIdService';
import { TtsService } from './services/TtsService';
import { VadService } from './services/VadService';
import type { ApiInterface } from './types/api';
import type { SherpaOnnxInterface } from './types/interfaces';

// Initialize services with API
const api: ApiInterface = SherpaOnnxAPI;
const ttsService = new TtsService(api);
const asrService = new AsrService(api);
const audioTaggingService = new AudioTaggingService(api);
const speakerIdService = new SpeakerIdService(api);
const kwsService = new KWSService(api);
const vadService = new VadService(api);
const languageIdService = new LanguageIdService(api);
const archiveService = new ArchiveService(api);

// Create the public interface
const SherpaOnnx: SherpaOnnxInterface = {
  ...api,
  TTS: ttsService,
  ASR: asrService,
  AudioTagging: audioTaggingService,
  SpeakerId: speakerIdService,
  KWS: kwsService,
  VAD: vadService,
  LanguageId: languageIdService,
  Archive: archiveService,
};

// Export the main interface
export default SherpaOnnx;

// Export services for direct use
export const TTS = ttsService;
export const ASR = asrService;
export const AudioTagging = audioTaggingService;
export const SpeakerId = speakerIdService;
export const KWS = kwsService;
export const VAD = vadService;
export const LanguageId = languageIdService;

// Export types
export * from './types/api';
export * from './types/interfaces';

// Export web utilities
export { loadWasmModule } from './WebUtils';
