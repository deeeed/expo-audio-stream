import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

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

// Progress update interface
export interface ProgressUpdate {
  progress: number;
}

// Define the base interface for the native module
interface EssentiaInterface {
  // Core functionality
  initialize(): Promise<boolean>;

  // Version information
  getVersion(): Promise<string>;

  // Audio data handling
  setAudioData(pcmData: Float32Array, sampleRate: number): Promise<boolean>;

  // Algorithm execution
  executeAlgorithm(algorithm: string, params: AlgorithmParams): Promise<any>;

  // Batch algorithm execution
  executeBatch(algorithms: FeatureConfig[]): Promise<any>;

  // Progress updates registration
  addProgressListener(): Promise<boolean>;

  // Testing
  testConnection(): Promise<string>;

  // Algorithm information
  getAlgorithmInfo(algorithm: string): Promise<any>;

  // Get all available algorithms
  getAllAlgorithms(): Promise<any>;

  // Feature extraction
  extractFeatures(features: FeatureConfig[]): Promise<any>;
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

// Create an event emitter for progress updates
export const EssentiaEvents = new NativeEventEmitter(Essentia);

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

// Define feature configuration interface
export interface FeatureConfig {
  name: string;
  params?: AlgorithmParams;
}

// For batch processing results
export interface BatchProcessingResults {
  // Known specific feature fields
  mfcc?: number[];
  mfcc_bands?: number[];
  spectrum?: number[];
  key?: string;
  scale?: string;
  strength?: number;
  mel_bands?: number[];
  // Allow for additional dynamic properties
  [key: string]: number | string | number[] | string[] | undefined;
}

// You could also export a more generic result type
export interface EssentiaResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
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
   * Gets the version of the Essentia library
   * @returns A Promise that resolves to the version string
   */
  async getVersion(): Promise<string> {
    try {
      return await Essentia.getVersion();
    } catch (error) {
      console.error('Essentia getVersion error:', error);
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

  /**
   * Executes multiple algorithms as a batch, optimizing by reusing intermediate results.
   * @param algorithms Array of algorithm configurations to execute
   * @returns A Promise that resolves to an object containing all algorithms' outputs
   */
  async executeBatch(algorithms: FeatureConfig[]): Promise<any> {
    try {
      if (!algorithms || algorithms.length === 0) {
        throw new Error('Algorithm list cannot be empty');
      }

      return await Essentia.executeBatch(algorithms);
    } catch (error) {
      console.error('Essentia batch execution error:', error);
      throw error;
    }
  }

  /**
   * Registers for progress updates from the native module
   * @returns A Promise that resolves to true when successfully registered
   */
  async addProgressListener(): Promise<boolean> {
    try {
      return await Essentia.addProgressListener();
    } catch (error) {
      console.error('Essentia progress listener error:', error);
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

  /**
   * Extracts multiple audio features in a single batch operation.
   * @param features Array of feature configurations, each with a name and optional parameters
   * @returns A Promise that resolves to an object containing all extracted features
   */
  async extractFeatures(features: FeatureConfig[]): Promise<any> {
    try {
      if (!features || features.length === 0) {
        throw new Error('Feature list cannot be empty');
      }

      // Validate feature configurations
      features.forEach((feature) => {
        if (!feature.name) {
          throw new Error('Each feature must have a name');
        }
      });

      return await Essentia.extractFeatures(features);
    } catch (error) {
      console.error('Essentia feature extraction error:', error);
      throw error;
    }
  }

  /**
   * Convenience method to extract MFCC features.
   * @param params Optional parameters for MFCC extraction
   * @returns A Promise that resolves to the MFCC features
   */
  async extractMFCC(params: AlgorithmParams = {}): Promise<any> {
    const result = await this.extractFeatures([
      {
        name: 'MFCC',
        params,
      },
    ]);

    return result.data?.mfcc
      ? { mfcc: result.data.mfcc, bands: result.data.mfcc_bands }
      : result;
  }

  /**
   * Convenience method to extract Mel spectrogram.
   * @param params Optional parameters for Mel extraction
   * @returns A Promise that resolves to the Mel bands
   */
  async extractMelBands(params: AlgorithmParams = {}): Promise<any> {
    const result = await this.extractFeatures([
      {
        name: 'MelBands',
        params,
      },
    ]);

    return result.data?.mel_bands
      ? { melBands: result.data.mel_bands }
      : result;
  }

  /**
   * Convenience method to extract musical key.
   * @param params Optional parameters for key detection
   * @returns A Promise that resolves to the detected key information
   */
  async extractKey(params: AlgorithmParams = {}): Promise<any> {
    const result = await this.extractFeatures([
      {
        name: 'Key',
        params,
      },
    ]);

    if (result.data?.key && result.data?.scale && result.data?.strength) {
      return {
        key: result.data.key,
        scale: result.data.scale,
        strength: result.data.strength,
      };
    }

    return result;
  }
}

// Export the API instance
export default new EssentiaAPI();
