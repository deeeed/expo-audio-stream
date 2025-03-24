import NativeSherpaOnnx from './NativeSherpaOnnx';
import type {
  AssetListResult,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
  TtsOptions,
  ValidateResult,
} from './types/interfaces';

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

  /**
   * List all available assets in the application bundle
   * This is helpful for debugging asset loading issues
   * @returns Promise that resolves with a list of all assets and their count
   */
  public static async listAllAssets(): Promise<{
    assets: string[];
    count: number;
  }> {
    try {
      return await NativeSherpaOnnx.listAllAssets();
    } catch (error: any) {
      console.error('Failed to list assets:', error);
      throw error;
    }
  }

  /**
   * Debug asset path - useful for diagnosing asset issues
   * @param path Path to debug
   * @returns Promise that resolves with details about the asset path
   */
  public static async debugAssetPath(path: string): Promise<AssetListResult> {
    try {
      return await NativeSherpaOnnx.debugAssetPath(path);
    } catch (error: any) {
      console.error('Failed to debug asset path:', error);
      throw error;
    }
  }

  /**
   * Extract a tar.bz2 file to a target directory
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory to extract to
   * @returns Promise that resolves with extraction result
   */
  public static async extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
  }> {
    try {
      return await NativeSherpaOnnx.extractTarBz2(sourcePath, targetDir);
    } catch (error: any) {
      console.error('Failed to extract tar.bz2 file:', error);
      throw error;
    }
  }

  /**
   * Create mock model files when extraction fails
   * @param targetDir Directory to create files in
   * @param modelId Model ID for naming
   * @returns Promise that resolves with creation result
   */
  public static async createMockModelFiles(
    targetDir: string,
    modelId: string
  ): Promise<{
    success: boolean;
    message: string;
    createdFiles: string[];
  }> {
    try {
      return await NativeSherpaOnnx.createMockModelFiles(targetDir, modelId);
    } catch (error: any) {
      console.error('Failed to create mock model files:', error);
      throw error;
    }
  }
}
