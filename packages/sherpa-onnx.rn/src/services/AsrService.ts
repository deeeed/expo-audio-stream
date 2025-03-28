/**
 * ASR Service for automatic speech recognition functionality
 */

import type { ApiInterface } from '../types/api';
import type {
  AsrModelConfig,
  AsrInitResult,
  AsrRecognizeResult,
  ValidateResult,
} from '../types/interfaces';

/**
 * Service for Automatic Speech Recognition functionality
 */
export class AsrService {
  private initialized = false;
  private sampleRate = 0;
  private modelType = '';
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
   * Initialize the ASR engine
   * @param config The ASR model configuration
   * @returns Promise resolving to initialization result
   */
  public async initialize(config: AsrModelConfig): Promise<AsrInitResult> {
    try {
      // First validate library
      const validation = await this.api.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }

      const result = await this.api.initAsr(config);
      this.initialized = result.success;
      this.sampleRate = result.sampleRate ?? 0;
      this.modelType = result.modelType ?? '';
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
   * Get the sample rate
   */
  public getSampleRate(): number {
    return this.sampleRate;
  }

  /**
   * Get the model type
   */
  public getModelType(): string {
    return this.modelType;
  }

  /**
   * Recognize speech from audio samples
   * @param sampleRate The sample rate of the audio
   * @param samples Float array of audio samples
   * @returns Promise resolving to recognition result
   */
  public async recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult> {
    if (!this.initialized) {
      throw new Error('ASR is not initialized. Call initialize() first.');
    }

    return this.api.recognizeFromSamples(sampleRate, samples);
  }

  /**
   * Recognize speech from an audio file
   * @param filePath Path to the audio file
   * @returns Promise resolving to recognition result
   */
  public async recognizeFromFile(
    filePath: string
  ): Promise<AsrRecognizeResult> {
    if (!this.initialized) {
      throw new Error('ASR is not initialized. Call initialize() first.');
    }

    return this.api.recognizeFromFile(filePath);
  }

  /**
   * Release ASR resources
   */
  public async release(): Promise<{ released: boolean }> {
    const result = await this.api.releaseAsr();
    if (result.released) {
      this.initialized = false;
      this.sampleRate = 0;
      this.modelType = '';
    }
    return result;
  }
}
