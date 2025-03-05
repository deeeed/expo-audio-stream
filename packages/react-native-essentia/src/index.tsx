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
  multiply(a: number, b: number): Promise<number>;
  initialize(): Promise<boolean>;
  getVersion(): Promise<string>;

  // Algorithm execution
  executeAlgorithm(category: string, algorithm: string, params: AlgorithmParams): Promise<any>;

  // Audio processing
  loadAudio(audioPath: string, sampleRate?: number): Promise<boolean>;
  unloadAudio(): Promise<boolean>;
  processAudio(frameSize: number, hopSize: number): Promise<boolean>;

  // Results retrieval
  getResults(): Promise<any>;
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
      },
    );

// Legacy functions for backward compatibility
export function multiply(a: number, b: number): Promise<number> {
  return Essentia.multiply(a, b);
}

export function initialize(): Promise<boolean> {
  return Essentia.initialize();
}

export function getVersion(): Promise<string> {
  return Essentia.getVersion();
}

// Define interfaces and types
export interface ValidationResult {
  success: boolean;
  initialized?: boolean;
  version?: string;
  message?: string;
  algorithmResults?: Record<string, any>;
  error?: string;
}

export interface IEssentiaAPI {
  // Core functionality
  initialize(): Promise<boolean>;
  getVersion(): Promise<string>;

  // Validation
  validateIntegration(): Promise<ValidationResult>;
  debugEssentiaFile(filePath: string): Promise<Record<string, string>>;

  // Algorithm execution
  executeAlgorithm(category: EssentiaCategory, algorithm: string, params?: AlgorithmParams): Promise<any>;

  // Audio processing
  loadAudio(audioPath: string, sampleRate: number): Promise<boolean>;
  unloadAudio(): Promise<boolean>;
  processAudio(frameSize?: number, hopSize?: number): Promise<boolean>;
  getResults(): Promise<any>;

  // Category-specific APIs
  spectral: {
    mfcc(params: AlgorithmParams): Promise<any>;
    spectralCentroid(params: AlgorithmParams): Promise<any>;
  };
  tonal: {
    key(params?: AlgorithmParams): Promise<any>;
    chords(params?: AlgorithmParams): Promise<any>;
  };
  rhythm: {
    beatTracking(params?: AlgorithmParams): Promise<any>;
    bpm(params?: AlgorithmParams): Promise<any>;
  };
}

// Structured API for Essentia algorithms
class EssentiaAPI {
  // Core methods
  async initialize(): Promise<boolean> {
    return Essentia.initialize();
  }

  async getVersion(): Promise<string> {
    return Essentia.getVersion();
  }

  // Validation methods
  async validateIntegration(): Promise<ValidationResult> {
    try {
      const result: ValidationResult = { success: false };

      // Check initialization
      result.initialized = await this.initialize();
      if (!result.initialized) {
        result.error = "Failed to initialize Essentia";
        return result;
      }

      // Get version
      result.version = await this.getVersion();

      // Success if we got this far
      result.success = true;
      result.message = "Essentia integration is working properly";

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async debugEssentiaFile(filePath: string): Promise<Record<string, string>> {
    // This will help debug file path issues
    console.log(`Debugging file path: ${filePath}`);

    // Check if the path starts with file://
    const hasFileProtocol = filePath.startsWith('file://');

    // Try to extract file info
    let fileInfo: Record<string, string> = {
      originalPath: filePath,
      hasFileProtocol: hasFileProtocol ? 'true' : 'false'
    };

    try {
      // Try calling the native method to check if file exists
      const loaded = await Essentia.loadAudio(filePath, 44100);
      fileInfo.canLoad = loaded ? 'true' : 'false';

      // If path has file:// protocol, also try without it
      if (hasFileProtocol) {
        const pathWithoutProtocol = filePath.substring(7);
        try {
          const altLoaded = await Essentia.loadAudio(pathWithoutProtocol, 44100);
          fileInfo.canLoadWithoutProtocol = altLoaded ? 'true' : 'false';
        } catch (e) {
          fileInfo.loadErrorWithoutProtocol = e instanceof Error ? e.message : String(e);
        }
        // Unload after test
        await Essentia.unloadAudio();
      }
    } catch (e) {
      fileInfo.error = e instanceof Error ? e.message : String(e);
    }

    return fileInfo;
  }

  // Generic algorithm execution
  async executeAlgorithm(category: EssentiaCategory, algorithm: string, params: AlgorithmParams = {}): Promise<any> {
    return Essentia.executeAlgorithm(category, algorithm, params);
  }

  // Audio loading and processing
  /**
   * Loads an audio file into Essentia for processing
   * @param audioPath Path to the audio file to load
   * @param sampleRate Sample rate to use for processing (e.g., 16000, 44100)
   * @returns Promise resolving to a boolean indicating success or failure
   */
  async loadAudio(audioPath: string, sampleRate: number): Promise<boolean> {
    return Essentia.loadAudio(audioPath, sampleRate);
  }

  async unloadAudio(): Promise<boolean> {
    return Essentia.unloadAudio();
  }

  async processAudio(frameSize: number = 2048, hopSize: number = 1024): Promise<boolean> {
    return Essentia.processAudio(frameSize, hopSize);
  }

  async getResults(): Promise<any> {
    return Essentia.getResults();
  }

  // Category-specific API methods (to be expanded)
  spectral = {
    mfcc: async (params: AlgorithmParams = {}): Promise<any> => {
      return this.executeAlgorithm(EssentiaCategory.SPECTRAL, 'MFCC', params);
    },
    // Add more spectral algorithms
  };

  tonal = {
    key: async (params: AlgorithmParams = {}): Promise<any> => {
      return this.executeAlgorithm(EssentiaCategory.TONAL, 'Key', params);
    },
    // Add more tonal algorithms
  };

  rhythm = {
    beatTracking: async (params: AlgorithmParams = {}): Promise<any> => {
      return this.executeAlgorithm(EssentiaCategory.RHYTHM, 'BeatTracking', params);
    },
    // Add more rhythm algorithms
  };

  // Add other categories as needed
}

// Create and export the API instance
export const essentiaAPI = new EssentiaAPI();

// Default export for easier imports
export default {
  ...essentiaAPI,
  multiply,
  initialize,
  getVersion,
};
