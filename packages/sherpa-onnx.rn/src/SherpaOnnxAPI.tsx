import { NativeModules, Platform } from 'react-native';
import type { SherpaOnnxConfig, SherpaOnnxResult, SttOptions, TtsOptions } from './types/interfaces';
import { DEFAULT_CHANNELS, DEFAULT_LANGUAGE, DEFAULT_SAMPLE_RATE } from './constants';

const LINKING_ERROR =
  `The package '@siteed/sherpa-onnx.rn' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const SherpaOnnx = NativeModules.SherpaOnnx
  ? NativeModules.SherpaOnnx
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * Sherpa-onnx API wrapper for React Native
 */
export class SherpaOnnxAPI {
  private config: SherpaOnnxConfig;
  private isInitialized: boolean = false;

  /**
   * Create a new instance of the SherpaOnnxAPI
   * @param config Configuration options
   */
  constructor(config: SherpaOnnxConfig) {
    this.config = {
      ...config,
      sampleRate: config.sampleRate || DEFAULT_SAMPLE_RATE,
      channels: config.channels || DEFAULT_CHANNELS,
      language: config.language || DEFAULT_LANGUAGE,
    };
  }

  /**
   * Initialize the Sherpa-onnx engine
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    try {
      const result = await SherpaOnnx.initialize(this.config);
      this.isInitialized = result;
      return result;
    } catch (error) {
      console.error('Failed to initialize Sherpa-onnx:', error);
      throw error;
    }
  }

  /**
   * Convert speech to text
   * @param audioData Array of audio samples or path to audio file
   * @param options STT options
   * @returns Promise that resolves with recognition result
   */
  public async speechToText(
    audioData: number[] | string,
    options?: SttOptions
  ): Promise<SherpaOnnxResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const isFilePath = typeof audioData === 'string';
      if (isFilePath) {
        return await SherpaOnnx.recognizeFile(audioData, options || {});
      } else {
        return await SherpaOnnx.recognize(audioData, options || {});
      }
    } catch (error) {
      console.error('Speech recognition failed:', error);
      throw error;
    }
  }

  /**
   * Convert text to speech
   * @param text Text to convert to speech
   * @param options TTS options
   * @returns Promise that resolves with path to audio file
   */
  public async textToSpeech(
    text: string,
    options?: TtsOptions
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await SherpaOnnx.synthesize(text, options || {});
    } catch (error) {
      console.error('Text to speech synthesis failed:', error);
      throw error;
    }
  }

  /**
   * Start streaming speech recognition
   * @param options STT options
   * @returns Promise that resolves when streaming starts
   */
  public async startStreaming(options?: SttOptions): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await SherpaOnnx.startStreaming(options || {});
    } catch (error) {
      console.error('Failed to start streaming:', error);
      throw error;
    }
  }

  /**
   * Feed audio data to streaming recognition
   * @param audioChunk Array of audio samples
   * @returns Promise that resolves with interim recognition result
   */
  public async feedAudioContent(
    audioChunk: number[]
  ): Promise<SherpaOnnxResult> {
    if (!this.isInitialized) {
      throw new Error('SherpaOnnx is not initialized');
    }

    try {
      return await SherpaOnnx.feedAudioContent(audioChunk);
    } catch (error) {
      console.error('Failed to feed audio content:', error);
      throw error;
    }
  }

  /**
   * Stop streaming speech recognition
   * @returns Promise that resolves with final recognition result
   */
  public async stopStreaming(): Promise<SherpaOnnxResult> {
    if (!this.isInitialized) {
      throw new Error('SherpaOnnx is not initialized');
    }

    try {
      return await SherpaOnnx.stopStreaming();
    } catch (error) {
      console.error('Failed to stop streaming:', error);
      throw error;
    }
  }

  /**
   * Release resources used by Sherpa-onnx
   * @returns Promise that resolves when cleanup is complete
   */
  public async release(): Promise<boolean> {
    if (!this.isInitialized) {
      return true;
    }

    try {
      const result = await SherpaOnnx.release();
      this.isInitialized = false;
      return result;
    } catch (error) {
      console.error('Failed to release Sherpa-onnx resources:', error);
      throw error;
    }
  }

  /**
   * Get available voices for TTS
   * @returns Promise that resolves with list of available voices
   */
  public async getAvailableVoices(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await SherpaOnnx.getAvailableVoices();
    } catch (error) {
      console.error('Failed to get available voices:', error);
      throw error;
    }
  }

  /**
   * Check if the specified feature is supported on this device
   * @param feature Feature to check
   * @returns Promise that resolves with true if feature is supported
   */
  public static async isFeatureSupported(feature: string): Promise<boolean> {
    try {
      return await SherpaOnnx.isFeatureSupported(feature);
    } catch (error) {
      console.error(`Failed to check if ${feature} is supported:`, error);
      return false;
    }
  }
} 