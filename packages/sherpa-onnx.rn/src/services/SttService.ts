/**
 * STT Service for speech-to-text functionality
 */

import { SherpaOnnxAPI } from '../SherpaOnnxAPI';
import type {
  SttModelConfig,
  SttInitResult,
  SttRecognizeResult,
  ValidateResult,
} from '../types/interfaces';

/**
 * Service for Speech-to-Text functionality
 */
export class SttService {
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
   * Initialize the STT engine
   * @param config The STT model configuration
   * @returns Promise resolving to initialization result
   */
  public static async initialize(
    config: SttModelConfig
  ): Promise<SttInitResult> {
    try {
      // First validate library
      const validation = await SherpaOnnxAPI.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }

      const result = await SherpaOnnxAPI.initStt(config);
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
  ): Promise<SttRecognizeResult> {
    if (!this.initialized) {
      throw new Error('STT is not initialized. Call initialize() first.');
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
  ): Promise<SttRecognizeResult> {
    if (!this.initialized) {
      throw new Error('STT is not initialized. Call initialize() first.');
    }

    return SherpaOnnxAPI.recognizeFromFile(filePath);
  }

  /**
   * Release STT resources
   */
  public static async release(): Promise<{ released: boolean }> {
    const result = await SherpaOnnxAPI.releaseStt();
    if (result.released) {
      this.initialized = false;
      this.sampleRate = 0;
      this.modelType = '';
    }
    return result;
  }
}
