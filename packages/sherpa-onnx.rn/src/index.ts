import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { TtsService } from './services/TtsService';
import { SttService } from './services/SttService';
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
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
} from './types/interfaces';

// Re-export types
export * from './types/interfaces';

/**
 * Sherpa ONNX React Native module
 */
export default SherpaOnnxAPI;

export { TtsService, SttService, ArchiveService };

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
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
};
