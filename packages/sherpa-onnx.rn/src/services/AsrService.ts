/**
 * ASR Service for automatic speech recognition functionality
 */

import { SherpaOnnxAPI } from '../SherpaOnnxAPI';
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
  private static initialized = false;
  private static sampleRate = 0;
  private static modelType = '';

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public static validateLibrary(): Promise<ValidateResult> {
    return SherpaOnnxAPI.validateLibraryLoaded();
  }

  /**
   * Initialize the ASR engine
   * @param config The ASR model configuration
   * @returns Promise resolving to initialization result
   */
  public static async initialize(
    config: AsrModelConfig
  ): Promise<AsrInitResult> {
    try {
      // First validate library
      const validation = await SherpaOnnxAPI.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }

      const result = await SherpaOnnxAPI.initAsr(config);
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
  public static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the sample rate
   */
  public static getSampleRate(): number {
    return this.sampleRate;
  }

  /**
   * Get the model type
   */
  public static getModelType(): string {
    return this.modelType;
  }

  /**
   * Recognize speech from audio samples
   * @param sampleRate The sample rate of the audio
   * @param samples Float array of audio samples
   * @returns Promise resolving to recognition result
   */
  public static async recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult> {
    if (!this.initialized) {
      throw new Error('ASR is not initialized. Call initialize() first.');
    }

    return SherpaOnnxAPI.recognizeFromSamples(sampleRate, samples);
  }

  /**
   * Recognize speech from an audio file
   * @param filePath Path to the audio file
   * @returns Promise resolving to recognition result
   */
  public static async recognizeFromFile(
    filePath: string
  ): Promise<AsrRecognizeResult> {
    if (!this.initialized) {
      throw new Error('ASR is not initialized. Call initialize() first.');
    }

    return SherpaOnnxAPI.recognizeFromFile(filePath);
  }

  /**
   * Release ASR resources
   */
  public static async release(): Promise<{ released: boolean }> {
    const result = await SherpaOnnxAPI.releaseAsr();
    if (result.released) {
      this.initialized = false;
      this.sampleRate = 0;
      this.modelType = '';
    }
    return result;
  }
}
