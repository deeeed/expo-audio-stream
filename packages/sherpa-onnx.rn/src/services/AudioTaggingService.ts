import type { ApiInterface } from '../types/api';
import type {
  AudioTaggingModelConfig,
  AudioTaggingInitResult,
  AudioTaggingResult,
  AudioTaggingProcessOptions,
  ValidateResult,
} from '../types/interfaces';

/**
 * Service for Audio Tagging functionality
 */
export class AudioTaggingService {
  private initialized = false;
  private api: ApiInterface;

  constructor(api: ApiInterface) {
    this.api = api;
  }

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public validateLibrary(): Promise<ValidateResult> {
    return this.api.validateLibraryLoaded();
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
      const validation = await this.api.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }

      const result = await this.api.initAudioTagging(config);
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
  public isInitialized(): boolean {
    return this.initialized;
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
    if (!this.initialized) {
      throw new Error(
        'Audio Tagging is not initialized. Call initialize() first.'
      );
    }

    // Use our safer dedicated methods for both files and samples
    if (options.filePath) {
      // Pass the filePath directly to the native method
      return this.api.processAndComputeAudioTagging(options.filePath);
    } else if (options.samples && options.sampleRate) {
      // Pass the samples and sampleRate separately to the native method
      return this.api.processAndComputeAudioSamples(
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
    const result = await this.api.releaseAudioTagging();
    if (result.released) {
      this.initialized = false;
    }
    return result;
  }
}
