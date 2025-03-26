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
  private static modelType?: string;

  /**
   * Get the model type
   */
  public static getModelType(): string | undefined {
    return this.modelType;
  }

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

      // If we're already initialized, release resources
      if (this.initialized) {
        await this.release();
      }

      // Set default values for model parameters if not specified
      if (config.modelType === 'vits' && config.noiseScale === undefined) {
        config.noiseScale = 0.667;
      }

      if (config.modelType === 'vits' && config.noiseScaleW === undefined) {
        config.noiseScaleW = 0.8;
      }

      if (config.lengthScale === undefined) {
        config.lengthScale = 1.0;
      }

      const result = await SherpaOnnxAPI.initTts(config);
      this.initialized = result.success;
      this.sampleRate = result.sampleRate;
      this.numSpeakers = result.numSpeakers;
      this.modelType = config.modelType;
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
   * @param text Text to synthesize
   * @param options Options for speech generation
   * @returns Promise resolving with generation result
   */
  public static async generateSpeech(
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsGenerateResult> {
    if (!this.initialized) {
      throw new Error('TTS must be initialized first');
    }

    try {
      const result = await SherpaOnnxAPI.generateTts(text, options);

      // Always ensure both numSamples and samplesLength are set correctly
      if (
        result.numSamples !== undefined &&
        result.samplesLength === undefined
      ) {
        result.samplesLength = result.numSamples;
      } else if (
        result.samplesLength !== undefined &&
        result.numSamples === undefined
      ) {
        result.numSamples = result.samplesLength;
      } else if (
        result.samplesLength === undefined &&
        result.numSamples === undefined
      ) {
        // If neither is defined (shouldn't happen, but just in case)
        result.samplesLength = 0;
        result.numSamples = 0;
      }

      return result;
    } catch (error) {
      console.error('Failed to generate speech:', error);
      throw error;
    }
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
