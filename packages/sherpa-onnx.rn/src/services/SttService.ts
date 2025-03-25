/**
 * STT Service for speech-to-text functionality
 */

import NativeSherpaOnnx from '../NativeSherpaOnnx';
import type { SttInitResult, SttModelConfig, SttRecognizeResult } from '../types/interfaces';

/**
 * SttService provides methods for speech recognition (ASR)
 */
export const SttService = {
  /**
   * Initialize the STT engine with a model
   * 
   * @param modelConfig Configuration for the STT model
   * @returns Promise with initialization result
   */
  async initialize(modelConfig: SttModelConfig): Promise<SttInitResult> {
    try {
      return await NativeSherpaOnnx.initStt(modelConfig);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * Recognize speech from audio samples (PCM float array)
   * 
   * @param sampleRate Sample rate of the audio (e.g., 16000)
   * @param audioBuffer Float array of audio samples
   * @returns Promise with recognition result
   */
  async recognizeFromSamples(
    sampleRate: number,
    audioBuffer: number[]
  ): Promise<SttRecognizeResult> {
    try {
      return await NativeSherpaOnnx.recognizeFromSamples(sampleRate, audioBuffer);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * Recognize speech from an audio file
   * 
   * @param filePath Path to the audio file (support for wav, mp3, etc. depends on platform)
   * @returns Promise with recognition result
   */
  async recognizeFromFile(filePath: string): Promise<SttRecognizeResult> {
    try {
      return await NativeSherpaOnnx.recognizeFromFile(filePath);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * Release STT resources
   * Call this when you're done with STT to free up resources
   * 
   * @returns Promise that resolves when resources are released
   */
  async release(): Promise<{ released: boolean }> {
    try {
      return await NativeSherpaOnnx.releaseStt();
    } catch (error) {
      return {
        released: false
      };
    }
  },
}; 