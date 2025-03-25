import type {
  AudioTaggingModelConfig,
  AudioTaggingInitResult,
  AudioTaggingResult,
  AudioTaggingProcessOptions,
  ValidateResult,
} from '../types/interfaces';
import { SherpaOnnxAPI } from '../SherpaOnnxAPI';

/**
 * Service for Audio Tagging functionality
 */
export class AudioTaggingService {
  private static initialized = false;
  private sampleRate = 0;

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public validateLibrary(): Promise<ValidateResult> {
    return SherpaOnnxAPI.validateLibraryLoaded();
  }

  /**
   * Initialize the Audio Tagging engine
   * @param config The Audio Tagging model configuration
   * @returns Promise resolving to initialization result
   */
  public async initialize(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    try {
      // First validate library
      const validation = await SherpaOnnxAPI.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }

      const result = await SherpaOnnxAPI.initAudioTagging(config);
      AudioTaggingService.initialized = result.success;
      return result;
    } catch (error) {
      AudioTaggingService.initialized = false;
      throw error;
    }
  }

  /**
   * Get the initialized status
   */
  public isInitialized(): boolean {
    return AudioTaggingService.initialized;
  }

  /**
   * Process and compute audio tagging in a single call
   * This method properly manages resources throughout the operation
   * for both file-based and sample-based processing.
   * @param options Options for processing audio
   * @returns Promise resolving to the audio tagging result
   */
  public async processAndCompute(
    options: AudioTaggingProcessOptions
  ): Promise<AudioTaggingResult> {
    if (!AudioTaggingService.initialized) {
      throw new Error(
        'Audio Tagging is not initialized. Call initialize() first.'
      );
    }

    // Use our safer dedicated methods for both files and samples
    if (options.filePath) {
      // Pass the filePath directly to the native method
      return SherpaOnnxAPI.processAndComputeAudioTagging(options.filePath);
    } else if (options.samples && options.sampleRate) {
      // Pass the samples and sampleRate separately to the native method
      return SherpaOnnxAPI.processAndComputeAudioSamples(
        options.sampleRate,
        options.samples
      );
    } else {
      throw new Error(
        'Either filePath or (samples and sampleRate) must be provided'
      );
    }
  }

  /**
   * Release Audio Tagging resources
   */
  public async release(): Promise<{ released: boolean }> {
    const result = await SherpaOnnxAPI.releaseAudioTagging();
    if (result.released) {
      AudioTaggingService.initialized = false;
    }
    return result;
  }
}


