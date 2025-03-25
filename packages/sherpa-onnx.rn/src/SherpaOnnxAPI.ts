import NativeSherpaOnnx from './NativeSherpaOnnx';
import type {
  ValidateResult,
  TtsModelConfig,
  TtsInitResult,
  TtsOptions,
  TtsGenerateResult,
  SttModelConfig,
  SttInitResult,
  SttRecognizeResult,
  AudioTaggingModelConfig,
  AudioTaggingInitResult,
  AudioTaggingResult,
} from './types/interfaces';

/**
 * Api interface for the Sherpa-ONNX native module
 * This provides type-safe access to the native methods
 */
export class SherpaOnnxAPI {
  /**
   * Check if the library is loaded
   * @returns Promise that resolves with validation result
   */
  public static validateLibraryLoaded(): Promise<ValidateResult> {
    return NativeSherpaOnnx.validateLibraryLoaded();
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
   * Generate speech from text using the TTS engine
   * @param text Text to synthesize
   * @param options Options for speech generation
   * @returns Promise that resolves with generation result
   */
  public static async generateTts(
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsGenerateResult> {
    const { speakerId = 0, speakingRate = 1.0, playAudio = false } = options;
    
    try {
      return await NativeSherpaOnnx.generateTts(
        text,
        speakerId,
        speakingRate,
        playAudio
      );
    } catch (error: any) {
      console.error('Failed to generate TTS:', error);
      throw error;
    }
  }
  
  /**
   * Stop ongoing TTS playback
   * @returns Promise that resolves when playback is stopped
   */
  public static async stopTts(): Promise<{ stopped: boolean; message?: string }> {
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
  
  /**
   * Initialize the Audio Tagging engine with the provided model configuration
   * @param config Configuration for the audio tagging model
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
   * Process and compute audio tagging for a file in a single operation
   * @param filePath Path to the audio file to process
   * @returns Promise that resolves with audio tagging result
   */
  public static async processAndComputeAudioTagging(
    filePath: string
  ): Promise<AudioTaggingResult> {
    try {
      return await NativeSherpaOnnx.processAndComputeAudioTagging(filePath);
    } catch (error: any) {
      console.error('Failed to process and compute audio tagging:', error);
      throw error;
    }
  }
  
  /**
   * Process and compute audio tagging for samples
   * @param sampleRate Sample rate of the audio
   * @param samples Audio samples as float array
   * @returns Promise that resolves with audio tagging result
   */
  public static async processAndComputeAudioSamples(
    sampleRate: number, 
    samples: number[]
  ): Promise<AudioTaggingResult> {
    try {
      return await NativeSherpaOnnx.processAndComputeAudioSamples(
        sampleRate,
        samples
      );
    } catch (error: any) {
      console.error('Failed to process and compute audio samples:', error);
      throw error;
    }
  }
  
  /**
   * Release Audio Tagging resources
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
   * Extract a tar.bz2 archive to a directory
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory where files should be extracted
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
      console.error('Failed to extract archive:', error);
      throw error;
    }
  }
}
