import type {
  ValidateResult,
  TtsModelConfig,
  TtsInitResult,
  TtsOptions,
  TtsGenerateResult,
} from './types/interfaces';
import NativeSherpaOnnx from './NativeSherpaOnnx';

/**
 * Sherpa-onnx internal API wrapper for React Native
 * This is the lower-level API that communicates with the native module.
 * Applications should use the service classes instead of this directly.
 */
export class SherpaOnnxAPI {
  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public static async validateLibraryLoaded(): Promise<ValidateResult> {
    try {
      return await NativeSherpaOnnx.validateLibraryLoaded();
    } catch (error: any) {
      console.error('Failed to validate library loaded:', error);
      throw error;
    }
  }

  /**
   * Debug asset loading - useful for diagnosing asset issues
   * @returns Promise that resolves with details about asset loading
   */
  public static async debugAssetLoading(): Promise<any> {
    try {
      return await NativeSherpaOnnx.debugAssetLoading();
    } catch (error: any) {
      console.error('Failed to debug asset loading:', error);
      throw error;
    }
  }

  /**
   * Initialize the TTS engine with the provided model configuration
   * @param config Configuration for the TTS model
   * @returns Promise that resolves with initialization result
   */
  public static async initTts(config: TtsModelConfig): Promise<TtsInitResult> {
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
