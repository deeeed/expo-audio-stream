import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { TtsService } from './services/TtsService';
import { SttService } from './services/SttService';
import { AudioTaggingService } from './services/AudioTaggingService';
import { ArchiveService } from './services/archive-service';
import type {
  AudioEvent,
  AudioFileProcessResult,
  AudioProcessResult,
  AudioTaggingInitResult,
  AudioTaggingModelConfig,
  AudioTaggingProcessOptions,
  AudioTaggingProcessResult,
  AudioTaggingResult,
  SttInitResult,
  SttModelConfig,
  SttRecognizeResult,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
} from './types/interfaces';

// Re-export all types from interfaces
export * from './types/interfaces';

// Export services
export { TtsService, SttService, AudioTaggingService, ArchiveService };

// Create a structured SherpaOnnx object for backwards compatibility
const SherpaOnnx = {
  // The low-level API
  API: SherpaOnnxAPI,
  // Service objects for easier access
  TTS: TtsService,
  STT: SttService,
  AudioTagging: AudioTaggingService,
  Archive: ArchiveService,
};

// Default export for easier imports
export default SherpaOnnx;

// Type export
export type {
  AudioEvent,
  AudioFileProcessResult,
  AudioProcessResult,
  AudioTaggingInitResult,
  AudioTaggingModelConfig,
  AudioTaggingProcessOptions,
  AudioTaggingProcessResult,
  AudioTaggingResult,
  SttInitResult,
  SttModelConfig,
  SttRecognizeResult,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
};
