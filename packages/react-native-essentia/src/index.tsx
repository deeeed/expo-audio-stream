import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-essentia' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Define the categories of Essentia algorithms
export enum EssentiaCategory {
  BASIC = 'basic',
  SPECTRAL = 'spectral',
  TONAL = 'tonal',
  RHYTHM = 'rhythm',
  AUDIO_FEATURES = 'audioFeatures',
  VOICE = 'voice',
  MACHINE_LEARNING = 'machineLearning',
}

// Base interface for algorithm parameters
export interface AlgorithmParams {
  [key: string]: string | number | boolean | number[] | string[];
}

// Define the base interface for the native module
interface EssentiaInterface {
  // Core functionality
  initialize(): Promise<boolean>;

  // Audio data handling
  setAudioData(pcmData: Float32Array, sampleRate: number): Promise<boolean>;

  // Algorithm execution
  executeAlgorithm(algorithm: string, params: AlgorithmParams): Promise<any>;

  // Testing
  testConnection(): Promise<string>;

  // Algorithm information
  getAlgorithmInfo(algorithm: string): Promise<any>;

  // Get all available algorithms
  getAllAlgorithms(): Promise<any>;
}

// Get the native module
const Essentia = NativeModules.Essentia
  ? NativeModules.Essentia
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Define result interfaces
export interface AlgorithmResult {
  success: boolean;
  data?: Record<string, number | string | number[]>;
  error?: string;
}

// Define the algorithm info interface
export interface AlgorithmInfo {
  name: string;
  inputs: Array<{ name: string; type: string }>;
  outputs: Array<{ name: string; type: string }>;
  parameters: Record<string, unknown>;
}

// Implement the API class
class EssentiaAPI implements EssentiaInterface {
  /**
   * Initializes the Essentia library, preparing it for use.
   * @returns A Promise that resolves to true on success or rejects with an error if initialization fails
   */
  async initialize(): Promise<boolean> {
    try {
      return await Essentia.initialize();
    } catch (error) {
      console.error('Essentia initialization error:', error);
      throw error;
    }
  }

  /**
   * Sets the raw audio data (PCM samples) and sample rate for subsequent algorithm processing.
   * @param pcmData Float32Array of audio samples
   * @param sampleRate Sampling rate in Hz (e.g., 44100)
   * @returns A Promise that resolves to true on success or rejects with an error if data cannot be set
   */
  async setAudioData(
    pcmData: Float32Array,
    sampleRate: number
  ): Promise<boolean> {
    try {
      // Convert Float32Array to regular array for React Native bridge
      const pcmArray = Array.from(pcmData);
      return await Essentia.setAudioData(pcmArray, sampleRate);
    } catch (error) {
      console.error('Essentia setAudioData error:', error);
      throw error;
    }
  }

  /**
   * Executes a specified Essentia algorithm on the set audio data, using provided parameters.
   * @param algorithm Name of the Essentia algorithm (e.g., "MFCC", "Spectrum", "Key")
   * @param params An object containing key-value pairs for algorithm configuration
   * @returns A Promise that resolves to an object containing the algorithm's output
   */
  async executeAlgorithm(
    algorithm: string,
    params: AlgorithmParams = {}
  ): Promise<any> {
    try {
      return await Essentia.executeAlgorithm(algorithm, params);
    } catch (error) {
      console.error(`Essentia algorithm error (${algorithm}):`, error);
      throw error;
    }
  }

  async testConnection(): Promise<string> {
    try {
      return await Essentia.testConnection();
    } catch (error) {
      console.error('Essentia testConnection error:', error);
      throw error;
    }
  }

  /**
   * Gets information about an Essentia algorithm, including its inputs, outputs, and parameters.
   * @param algorithm Name of the Essentia algorithm to get information about
   * @returns A Promise that resolves to an object containing algorithm information
   */
  async getAlgorithmInfo(algorithm: string): Promise<any> {
    try {
      return await Essentia.getAlgorithmInfo(algorithm);
    } catch (error) {
      console.error(`Essentia getAlgorithmInfo error (${algorithm}):`, error);
      throw error;
    }
  }

  /**
   * Gets a list of all available Essentia algorithms.
   * @returns A Promise that resolves to an array of algorithm names
   */
  async getAllAlgorithms(): Promise<any> {
    try {
      return await Essentia.getAllAlgorithms();
    } catch (error) {
      console.error('Essentia getAllAlgorithms error:', error);
      throw error;
    }
  }
}

// Export the API instance
export default new EssentiaAPI();
