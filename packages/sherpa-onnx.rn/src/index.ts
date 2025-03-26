import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { TtsService } from './services/TtsService';
import { AsrService } from './services/AsrService';
import { AudioTaggingService } from './services/AudioTaggingService';
import { SpeakerIdService } from './services/SpeakerIdService';
import { ArchiveService } from './services/ArchiveService';

// Create a default implementation of the SherpaOnnx API
const SherpaOnnx = {
  ...SherpaOnnxAPI,
  validateLibraryLoaded: SherpaOnnxAPI.validateLibraryLoaded,
  TTS: TtsService,
  ASR: AsrService,
  AudioTagging: AudioTaggingService,
  SpeakerId: SpeakerIdService,
  Archive: ArchiveService,
};

// Set up namespace exports
export { TtsService as TTS };
export { AsrService as ASR };
export { AudioTaggingService as AudioTagging };
export { SpeakerIdService as SpeakerId };
export { ArchiveService as Archive };

// Export default object
export default SherpaOnnx;

// Export types
export * from './types/interfaces';
