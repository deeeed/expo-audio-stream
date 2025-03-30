import type { ApiInterface } from '../types/api';
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
  private initialized = false;
  private sampleRate = 0;
  private numSpeakers = 0;
  private modelType?: string;
  private api: ApiInterface;

  constructor(api: ApiInterface) {
    this.api = api;
  }

  /**
   * Get the model type
   */
  public getModelType(): string | undefined {
    return this.modelType;
  }

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public validateLibrary(): Promise<ValidateResult> {
    return this.api.validateLibraryLoaded();
  }

  /**
   * Initialize the TTS engine
   * @param config The TTS model configuration
   * @returns Promise resolving to initialization result
   */
  public async initialize(config: TtsModelConfig): Promise<TtsInitResult> {
    try {
      // First validate library
      const validation = await this.api.validateLibraryLoaded();
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

      const result = await this.api.initTts(config);
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
   * Get the number of available speakers
   */
  public getNumSpeakers(): number {
    return this.numSpeakers;
  }

  /**
   * Generate speech from text
   * @param text Text to synthesize
   * @param options Options for speech generation
   * @returns Promise resolving with generation result
   */
  public async generateSpeech(
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsGenerateResult> {
    if (!this.initialized) {
      throw new Error('TTS must be initialized first');
    }

    try {
      // Call the native API with minimized expectation of return values
      const result = await this.api.generateTts({
        text,
        speakerId: options.speakerId ?? 0,
        speakingRate: options.speakingRate ?? 1.0,
        playAudio: options.playAudio ?? false,
        fileNamePrefix: options.fileNamePrefix,
        lengthScale: options.lengthScale,
        noiseScale: options.noiseScale,
        noiseScaleW: options.noiseScaleW,
      });

      // Return the basic result directly without normalization
      // The native module should return just { success, filePath, error }
      return result;
    } catch (error) {
      console.error('Failed to generate speech:', error);
      return {
        success: false,
      };
    }
  }

  /**
   * Stop ongoing speech generation
   */
  public async stopSpeech(): Promise<{
    stopped: boolean;
    message?: string;
  }> {
    return this.api.stopTts();
  }

  /**
   * Release TTS resources
   */
  public async release(): Promise<{ released: boolean }> {
    const result = await this.api.releaseTts();
    if (result.released) {
      this.initialized = false;
      this.sampleRate = 0;
      this.numSpeakers = 0;
    }
    return result;
  }
}
