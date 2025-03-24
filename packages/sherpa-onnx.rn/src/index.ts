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
   * Initialize the AudioTagging module with the specified model
   * @param config Configuration for the audio tagging model
   * @returns Promise that resolves with initialization result
   */
  initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    return SherpaOnnx.initAudioTagging(config);
  },

  /**
   * Process audio samples through the AudioTagging engine
   * @param sampleRate Sample rate of the audio data
   * @param audioBuffer Float array of audio samples (-1.0 to 1.0)
   * @returns Promise that resolves with processing result
   */
  processAudioSamples(
    sampleRate: number,
    audioBuffer: number[]
  ): Promise<AudioProcessResult> {
    return SherpaOnnx.processAudioSamples(sampleRate, audioBuffer);
  },

  /**
   * Compute audio tagging results from processed audio
   * @param topK Number of top results to return (-1 for all)
   * @returns Promise that resolves with audio tagging results
   */
  computeAudioTagging(topK: number = -1): Promise<AudioTaggingResult> {
    return SherpaOnnx.computeAudioTagging(topK);
  },

  /**
   * Release AudioTagging resources
   * @returns Promise that resolves when resources are released
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
