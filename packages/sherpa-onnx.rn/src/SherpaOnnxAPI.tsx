import type {
  ValidateResult,
  TtsModelConfig,
  TtsInitResult,
  TtsOptions,
  TtsGenerateResult,
} from './types/interfaces';
import NativeSherpaOnnx from './NativeSherpaOnnx';

/**
 * Sherpa-onnx API wrapper for React Native
 * Minimal implementation for validation
 */
export class SherpaOnnxAPI {
  // Track if the module is available
  private static isModuleAvailable: boolean | null = null;

  /**
   * Check if the native module is available
   */
  private static async checkModuleAvailability(): Promise<boolean> {
    if (this.isModuleAvailable === null) {
      try {
        const result = await NativeSherpaOnnx.validateLibraryLoaded();
        this.isModuleAvailable = result.loaded;
        return result.loaded;
      } catch (error) {
        this.isModuleAvailable = false;
        return false;
      }
    }
    return this.isModuleAvailable;
  }

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public static async validateLibraryLoaded(): Promise<ValidateResult> {
    try {
      return await NativeSherpaOnnx.validateLibraryLoaded();
    } catch (error: any) {
      console.error('Failed to validate Sherpa-ONNX library:', error);
      return {
        loaded: false,
        status: `Error validating library: ${error?.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Initialize the TTS engine with the provided model configuration
   * @param config Configuration for the TTS model
   * @returns Promise that resolves with initialization result
   */
  public static async initTts(config: TtsModelConfig): Promise<TtsInitResult> {
    if (!(await this.checkModuleAvailability())) {
      throw new Error('SherpaOnnx native module is not available');
    }

    try {
      return await NativeSherpaOnnx.initTts(config);
    } catch (error: any) {
      console.error('Failed to initialize TTS:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text
   * @param text Text to synthesize
   * @param options Options for speech generation
   * @returns Promise that resolves with generation result
   */
  public static async generateTts(
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsGenerateResult> {
    try {
      const { speakerId = 0, speakingRate = 1.0, playAudio = true } = options;

      return await NativeSherpaOnnx.generateTts(
        text,
        speakerId,
        speakingRate,
        playAudio
      );
    } catch (error: any) {
      console.error('Failed to generate speech:', error);
      throw error;
    }
  }

  /**
   * Stop ongoing TTS generation
   * @returns Promise that resolves when TTS is stopped
   */
  public static async stopTts(): Promise<{
    stopped: boolean;
    message?: string;
  }> {
    try {
      return await NativeSherpaOnnx.stopTts();
    } catch (error: any) {
      console.error('Failed to stop TTS:', error);
      throw error;
    }
  }

  /**
   * Release TTS resources
   * @returns Promise that resolves when resources are released
   */
  public static async releaseTts(): Promise<{ released: boolean }> {
    try {
      return await NativeSherpaOnnx.releaseTts();
    } catch (error: any) {
      console.error('Failed to release TTS resources:', error);
      throw error;
    }
  }
}
