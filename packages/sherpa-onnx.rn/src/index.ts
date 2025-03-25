import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { AsrService } from './services/AsrService';
import { TtsService } from './services/TtsService';
import { AudioTaggingService } from './services/AudioTaggingService';
import { ArchiveService } from './services/archive-service';

// Export the services
export const TTS = TtsService;
export const ASR = AsrService;
export const AudioTagging = AudioTaggingService;

// Export the Sherpa Onnx object with static methods
export const SherpaOnnx = {
  validateLibraryLoaded: SherpaOnnxAPI.validateLibraryLoaded,
  TTS,
  ASR,
  AudioTagging,
  ArchiveService,
};

// Export types
export * from './types/interfaces';
