import NativeSherpaOnnx from './NativeSherpaOnnx';
import { TtsService } from './services/TtsService';
import { AudioTaggingService } from './services/AudioTaggingService';
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

// Main export
export default {
  /**
   * Check if the native library is loaded correctly
   */
  async validateLibraryLoaded() {
    return NativeSherpaOnnx.validateLibraryLoaded();
  },

  /**
   * TTS service for text-to-speech functionality
   */
  TTS: TtsService,

  /**
   * STT service for speech-to-text functionality
   */
  STT: SttService,

  /**
   * AudioTagging service for audio classification
   */
  AudioTagging: AudioTaggingService,

  /**
   * Archive utilities for working with compressed model files
   */
  Archive: ArchiveService,

  /**
   * Extract a tar.bz2 file to a target directory
   * This uses platform-specific native implementation
   *
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory to extract to
   * @returns Promise with extraction result
   */
  async extractTarBz2(sourcePath: string, targetDir: string) {
    return NativeSherpaOnnx.extractTarBz2(sourcePath, targetDir);
  },
};

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
