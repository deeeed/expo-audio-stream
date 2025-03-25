import NativeSherpaOnnx from './NativeSherpaOnnx';
import type {
  TtsModelConfig,
  TtsInitResult,
  TtsOptions,
  TtsGenerateResult,
  ValidateResult,
  SttModelConfig,
  SttInitResult,
  SttRecognizeResult,
} from './types/interfaces';

/**
 * Interface defining the Sherpa ONNX API
 */
export interface SherpaOnnxAPIInterface {
  // Library validation
  validateLibraryLoaded(): Promise<ValidateResult>;

  // TTS Methods
  initTts(config: TtsModelConfig): Promise<TtsInitResult>;
  generateTts(text: string, options: TtsOptions): Promise<TtsGenerateResult>;
  stopTts(): Promise<{ stopped: boolean; message?: string }>;
  releaseTts(): Promise<{ released: boolean }>;

  // STT Methods
  initStt(config: SttModelConfig): Promise<SttInitResult>;
  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SttRecognizeResult>;
  recognizeFromFile(filePath: string): Promise<SttRecognizeResult>;
  releaseStt(): Promise<{ released: boolean }>;

  // Archive Methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    extractedFiles?: string[];
    error?: string;
  }>;
}

/**
 * API for Sherpa ONNX functionality
 */
export const SherpaOnnxAPI: SherpaOnnxAPIInterface = {
  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   */
  validateLibraryLoaded(): Promise<ValidateResult> {
    return NativeSherpaOnnx.validateLibraryLoaded();
  },

  // TTS Methods

  /**
   * Initialize the TTS engine
   * @param config TTS model configuration
   */
  initTts(config: TtsModelConfig): Promise<TtsInitResult> {
    return NativeSherpaOnnx.initTts(config);
  },

  /**
   * Generate speech from text
   * @param text Text to synthesize
   * @param options TTS options
   */
  generateTts(
    text: string,
    options: TtsOptions = {}
  ): Promise<TtsGenerateResult> {
    const { speakerId = 0, speakingRate = 1.0, playAudio = false } = options;
    return NativeSherpaOnnx.generateTts(
      text,
      speakerId,
      speakingRate,
      playAudio
    );
  },

  /**
   * Stop ongoing TTS generation
   */
  stopTts(): Promise<{ stopped: boolean; message?: string }> {
    return NativeSherpaOnnx.stopTts();
  },

  /**
   * Release TTS resources
   */
  releaseTts(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseTts();
  },

  // STT Methods

  /**
   * Initialize the STT engine
   * @param config STT model configuration
   */
  initStt(config: SttModelConfig): Promise<SttInitResult> {
    return NativeSherpaOnnx.initStt(config);
  },

  /**
   * Recognize speech from audio samples
   * @param sampleRate Sample rate of the audio
   * @param samples Audio samples as float array
   */
  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SttRecognizeResult> {
    return NativeSherpaOnnx.recognizeFromSamples(sampleRate, samples);
  },

  /**
   * Recognize speech from an audio file
   * @param filePath Path to the audio file
   */
  recognizeFromFile(filePath: string): Promise<SttRecognizeResult> {
    return NativeSherpaOnnx.recognizeFromFile(filePath);
  },

  /**
   * Release STT resources
   */
  releaseStt(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseStt();
  },

  // Archive Methods

  /**
   * Extract a tar.bz2 archive
   * @param sourcePath Path to the tar.bz2 file
   * @param targetDir Directory to extract to
   */
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    extractedFiles?: string[];
    error?: string;
  }> {
    return NativeSherpaOnnx.extractTarBz2(sourcePath, targetDir);
  },
};
