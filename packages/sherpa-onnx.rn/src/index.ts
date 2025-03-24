import { SherpaOnnxAPI } from './SherpaOnnxAPI';
import { TtsService } from './services/TtsService';
import { NativeModules, Platform } from 'react-native';
import type {
  AudioEvent,
  AudioProcessResult,
  AudioTaggingInitResult,
  AudioTaggingModelConfig,
  AudioTaggingResult,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
} from './types/interfaces';

// Export types
export * from './types/interfaces';

const LINKING_ERROR =
  `The package '@siteed/sherpa-onnx.rn' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const SherpaOnnx = NativeModules.SherpaOnnx
  ? NativeModules.SherpaOnnx
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Create the default export
export default {
  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   */
  validateLibraryLoaded: SherpaOnnxAPI.validateLibraryLoaded,

  /**
   * Debug asset loading - useful for diagnosing asset issues
   */
  debugAssetLoading: SherpaOnnxAPI.debugAssetLoading,

  /**
   * List all available assets in the application bundle
   * This is helpful for debugging asset loading issues
   */
  listAllAssets: SherpaOnnxAPI.listAllAssets,

  // Services
  TTS: TtsService,

  // Add to your interface or export:
  debugAssetPath: SherpaOnnxAPI.debugAssetPath,

  /**
   * Extract a tar.bz2 file to a target directory
   * This uses platform-specific native implementation
   *
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory to extract to
   * @returns Promise with extraction result
   */
  extractTarBz2: SherpaOnnxAPI.extractTarBz2,

  /**
   * Create mock model files when extraction fails
   * This creates placeholder files that can be used for testing
   *
   * @param targetDir Directory to create files in
   * @param modelId Model ID for naming the files
   * @returns Promise with creation result
   */
  createMockModelFiles: SherpaOnnxAPI.createMockModelFiles,

  // AudioTagging methods
  /**
   * Initialize the AudioTagging module with the provided configuration
   * @param config AudioTagging model configuration
   * @returns Promise resolving to initialization result
   */
  initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    return SherpaOnnx.initAudioTagging(config);
  },

  /**
   * Process audio samples through the audio tagging engine
   * @param sampleRate Sample rate of the audio in Hz
   * @param samples Array of audio samples (raw PCM float samples)
   * @returns Promise resolving to success status
   */
  processAudioSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AudioProcessResult> {
    if (!Array.isArray(samples)) {
      return Promise.reject(new Error('Samples must be an array'));
    }
    if (sampleRate <= 0) {
      return Promise.reject(new Error('Sample rate must be positive'));
    }
    return SherpaOnnx.processAudioSamples(sampleRate, samples);
  },

  /**
   * Compute the audio tagging results after processing audio samples
   * @returns Promise resolving to the audio tagging results
   */
  computeAudioTagging(): Promise<AudioTaggingResult> {
    return SherpaOnnx.computeAudioTagging();
  },

  /**
   * Release AudioTagging resources
   * @returns Promise resolving to release status
   */
  releaseAudioTagging(): Promise<{ released: boolean }> {
    return SherpaOnnx.releaseAudioTagging();
  },
};

// Type export
export type {
  AudioEvent,
  AudioProcessResult,
  AudioTaggingInitResult,
  AudioTaggingModelConfig,
  AudioTaggingResult,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
};
