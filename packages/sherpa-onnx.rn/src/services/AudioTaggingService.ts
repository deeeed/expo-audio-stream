import { SherpaOnnxAPI } from '../SherpaOnnxAPI';
import type {
  AudioTaggingInitResult,
  AudioTaggingModelConfig,
  AudioTaggingProcessOptions,
  AudioTaggingResult,
  ValidateResult,
} from '../types/interfaces';

/**
 * Service for Audio Tagging functionality
 */
export class AudioTaggingService {
  private static initialized = false;

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public static validateLibrary(): Promise<ValidateResult> {
    return SherpaOnnxAPI.validateLibraryLoaded();
  }

  /**
   * Initialize the Audio Tagging engine
   * @param config The Audio Tagging model configuration
   * @returns Promise resolving to initialization result
   */
  public static async initialize(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    try {
      // First validate library
      const validation = await SherpaOnnxAPI.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }

      const result = await SherpaOnnxAPI.initAudioTagging(config);
      this.initialized = result.success;
      return result;
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Get the initialized status
   */
  public static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Process audio and compute results in a single call
   * This method properly manages resources throughout the operation
   * for both file-based and sample-based processing.
   * @param options Options for processing audio
   * @returns Promise resolving to the audio tagging result
   */
  public static async processAndCompute(
    options: AudioTaggingProcessOptions
  ): Promise<AudioTaggingResult> {
    if (!this.initialized) {
      throw new Error(
        'Audio Tagging is not initialized. Call initialize() first.'
      );
    }

    // Use our safer dedicated methods for both files and samples
    if (options.filePath) {
      // Use direct file processing method
      return SherpaOnnxAPI.processAndComputeAudioTagging({
        filePath: options.filePath,
      });
    } else if (options.samples && options.sampleRate) {
      // Use direct samples processing method
      return SherpaOnnxAPI.processAndComputeAudioSamples({
        samples: options.samples,
        sampleRate: options.sampleRate,
      });
    } else {
      throw new Error(
        'Either filePath or (samples and sampleRate) must be provided'
      );
    }
  }

  /**
   * Release Audio Tagging resources
   */
  public static async release(): Promise<{ released: boolean }> {
    const result = await SherpaOnnxAPI.releaseAudioTagging();
    if (result.released) {
      this.initialized = false;
    }
    return result;
  }
}
