import { SherpaOnnxAPI } from '../SherpaOnnxAPI';
import type {
  TtsModelConfig,
  TtsInitResult,
  TtsOptions,
  TtsGenerateResult,
  ValidateResult,
} from '../types/interfaces';

/**
 * Service for Text-to-Speech functionality
 */
export class TtsService {
  private static initialized = false;
  private static sampleRate = 0;
  private static numSpeakers = 0;

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public static validateLibrary(): Promise<ValidateResult> {
    return SherpaOnnxAPI.validateLibraryLoaded();
  }

  /**
   * Initialize the TTS engine
   * @param config The TTS model configuration
   * @returns Promise resolving to initialization result
   */
  public static async initialize(
    config: TtsModelConfig
  ): Promise<TtsInitResult> {
    try {
      // First validate library
      const validation = await SherpaOnnxAPI.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }
      
      const result = await SherpaOnnxAPI.initTts(config);
      this.initialized = result.success;
      this.sampleRate = result.sampleRate;
      this.numSpeakers = result.numSpeakers;
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
   * Get the number of available speakers
   */
  public static getNumSpeakers(): number {
    return this.numSpeakers;
  }

  /**
   * Generate speech from text
   * @param text The text to synthesize
   * @param options TTS options
   * @returns Promise resolving to generation result
   */
  public static async generateSpeech(
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsGenerateResult> {
    if (!this.initialized) {
      throw new Error('TTS is not initialized. Call initialize() first.');
    }

    return SherpaOnnxAPI.generateTts(text, options);
  }

  /**
   * Stop ongoing speech generation
   */
  public static async stopSpeech(): Promise<{
    stopped: boolean;
    message?: string;
  }> {
    return SherpaOnnxAPI.stopTts();
  }

  /**
   * Release TTS resources
   */
  public static async release(): Promise<{ released: boolean }> {
    const result = await SherpaOnnxAPI.releaseTts();
    if (result.released) {
      this.initialized = false;
      this.sampleRate = 0;
      this.numSpeakers = 0;
    }
    return result;
  }
}
