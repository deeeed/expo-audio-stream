import NativeSherpaOnnx from './NativeSherpaOnnx';
import type {
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
  TtsOptions,
  ValidateResult,
  AudioTaggingModelConfig,
  AudioTaggingInitResult,
  AudioTaggingResult,
  SttModelConfig,
  SttInitResult,
  SttRecognizeResult,
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
   * Initialize audio tagging with the provided model configuration
   * @param config Audio tagging model configuration
   * @returns Promise that resolves with initialization result
   */
  public static async initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    try {
      return await NativeSherpaOnnx.initAudioTagging(config);
    } catch (error: any) {
      console.error('Failed to initialize audio tagging:', error);
      throw error;
    }
  }

  /**
   * Process and compute audio tagging for file in a single call
   * This is the most robust way to process audio files as it handles
   * stream creation and management internally.
   * @param options Processing options with filePath
   * @returns Promise resolving to audio tagging result
   */
  public static async processAndComputeAudioTagging(options: {
    filePath: string;
  }): Promise<AudioTaggingResult> {
    if (!options?.filePath) {
      return Promise.reject(new Error('File path is required'));
    }

    try {
      return await NativeSherpaOnnx.processAndComputeAudioTagging(
        options.filePath
      );
    } catch (error: any) {
      console.error('Failed to process and compute audio tagging:', error);
      throw error;
    }
  }

  /**
   * Process and compute audio tagging for samples in a single call
   * This is the safest way to process audio samples as it handles
   * stream creation and cleanup internally.
   * @param options Processing options with samples and sampleRate
   * @returns Promise resolving to audio tagging result
   */
  public static async processAndComputeAudioSamples(options: {
    samples: number[];
    sampleRate: number;
  }): Promise<AudioTaggingResult> {
    if (!options?.samples || !options?.sampleRate) {
      return Promise.reject(new Error('Samples and sample rate are required'));
    }

    if (!Array.isArray(options.samples)) {
      return Promise.reject(new Error('Samples must be an array'));
    }

    if (options.sampleRate <= 0) {
      return Promise.reject(new Error('Sample rate must be positive'));
    }

    try {
      return await NativeSherpaOnnx.processAndComputeAudioSamples(
        options.sampleRate,
        options.samples
      );
    } catch (error: any) {
      console.error('Failed to process and compute audio samples:', error);
      throw error;
    }
  }

  /**
   * Release AudioTagging resources
   * @returns Promise that resolves when resources are released
   */
  public static async releaseAudioTagging(): Promise<{ released: boolean }> {
    try {
      return await NativeSherpaOnnx.releaseAudioTagging();
    } catch (error: any) {
      console.error('Failed to release audio tagging resources:', error);
      throw error;
    }
  }

  /**
   * Initialize the STT engine with the provided model configuration
   * @param config Configuration for the STT model
   * @returns Promise that resolves with initialization result
   */
  public static async initStt(config: SttModelConfig): Promise<SttInitResult> {
    try {
      return await NativeSherpaOnnx.initStt(config);
    } catch (error: any) {
      console.error('Failed to initialize STT:', error);
      throw error;
    }
  }

  /**
   * Recognize speech from audio samples
   * @param sampleRate Sample rate of the audio
   * @param samples Audio samples as float array
   * @returns Promise that resolves with recognition result
   */
  public static async recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SttRecognizeResult> {
    try {
      return await NativeSherpaOnnx.recognizeFromSamples(sampleRate, samples);
    } catch (error: any) {
      console.error('Failed to recognize speech from samples:', error);
      throw error;
    }
  }

  /**
   * Recognize speech from an audio file
   * @param filePath Path to the audio file
   * @returns Promise that resolves with recognition result
   */
  public static async recognizeFromFile(
    filePath: string
  ): Promise<SttRecognizeResult> {
    try {
      return await NativeSherpaOnnx.recognizeFromFile(filePath);
    } catch (error: any) {
      console.error('Failed to recognize speech from file:', error);
      throw error;
    }
  }

  /**
   * Release STT resources
   * @returns Promise that resolves when resources are released
   */
  public static async releaseStt(): Promise<{ released: boolean }> {
    try {
      return await NativeSherpaOnnx.releaseStt();
    } catch (error: any) {
      console.error('Failed to release STT resources:', error);
      throw error;
    }
  }
}
