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
  listAlgorithms(): Promise<any>;

  // Algorithm execution
  executeAlgorithm(category: string, algorithm: string, params: AlgorithmParams): Promise<any>;

  // Audio processing
  loadAudio(audioPath: string, sampleRate?: number): Promise<boolean>;
  unloadAudio(): Promise<boolean>;
  processAudio(frameSize: number, hopSize: number): Promise<boolean>;
  setAudioData(pcmData: number[], sampleRate: number): Promise<boolean>;

  // Feature extraction
  extractAudioFeatures(
    nMfcc: number,
    nFft: number,
    hopLength: number,
    winLength: number,
    window: string,
    nChroma: number,
    nMels: number,
    nBands: number,
    fmin: number
  ): Promise<any>;

  // Testing functions
  testMFCC(): Promise<any>;

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

export interface FeatureExtractionParams {
  nMfcc?: number;
  nFft?: number;
  hopLength?: number;
  winLength?: number;
  window?: string;
  nChroma?: number;
  nMels?: number;
  nBands?: number;
  fmin?: number;
  sampleRate?: number;
}

export interface FeatureExtractionResult {
  success: boolean;
  mfcc?: number[];
  mel?: number[];
  chroma?: number[];
  contrast?: number[];
  tonnetz?: number[];
  featureCounts?: {
    mfcc: number;
    chroma: number;
    mel: number;
    contrast: number;
    tonnetz: number;
  };
  error?: string;
}

export interface IEssentiaAPI {
  // Core functionality
  initialize(): Promise<boolean>;
  getVersion(): Promise<string>;
  listAlgorithms(): Promise<{
    success: boolean;
    totalCount?: number;
    hasMonoLoader?: boolean;
    hasAudioLoader?: boolean;
    audioAlgorithms?: string[];
    algorithms?: string[];
    error?: string;
  }>;

  // Validation
  validateIntegration(): Promise<ValidationResult>;
  debugEssentiaFile(filePath: string): Promise<Record<string, string>>;

  // Algorithm execution
  executeAlgorithm(category: EssentiaCategory, algorithm: string, params?: AlgorithmParams): Promise<any>;

  // Audio processing
  loadAudio(audioPath: string, sampleRate: number): Promise<boolean>;
  unloadAudio(): Promise<boolean>;
  processAudio(frameSize?: number, hopSize?: number): Promise<boolean>;
  setAudioData(pcmData: number[], sampleRate: number): Promise<boolean>;
  testMFCC(): Promise<any>;
  getResults(): Promise<any>;

  // Feature extraction
  extractFeatures(pcmData: number[], params?: FeatureExtractionParams): Promise<FeatureExtractionResult>;
  extractFeaturesFromBuffer(params?: FeatureExtractionParams): Promise<FeatureExtractionResult>;

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

export interface MFCCOptions {
  audioPath: string;
  sampleRate?: number;
  frameSize?: number;
  hopSize?: number;
  numCoeffs?: number;
  numBands?: number;
}

export interface MFCCExtractionOptions {
  audioPath: string;
  sampleRate?: number;
  frameSize?: number;
  hopSize?: number;
  numCoeffs?: number;
  numBands?: number;
  cleanup?: boolean;
}

// Add utility functions at the end before the exports
// This utility helps normalize file paths for better compatibility
export function normalizeFilePath(filePath: string): string {
  if (!filePath) return '';

  console.log(`Normalizing file path: ${filePath}`);

  // Handle file:// prefix for Android
  if (Platform.OS === 'android' && filePath.startsWith('file://')) {
    return filePath.substring(7);
  }

  // Ensure file:// prefix for iOS
  if (Platform.OS === 'ios' && !filePath.startsWith('file://')) {
    return `file://${filePath}`;
  }

  return filePath;
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
   * Loads an audio file into Essentia for processing with improved path handling
   * @param audioPath Path to the audio file to load
   * @param sampleRate Sample rate to use for processing (e.g., 16000, 44100)
   * @returns Promise resolving to a boolean indicating success or failure
   */
  async loadAudio(audioPath: string, sampleRate: number): Promise<boolean> {
    // Normalize the file path for better cross-platform compatibility
    const normalizedPath = normalizeFilePath(audioPath);
    console.log(`Original path: ${audioPath}`);
    console.log(`Normalized path for loading: ${normalizedPath}`);

    return Essentia.loadAudio(normalizedPath, sampleRate);
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

  /**
   * Convenience method to extract MFCC features from an audio file
   * Handles initialization, loading, processing, and cleanup in one call
   *
   * @param options Options for extracting MFCC features
   * @returns Promise resolving to the extraction result
   */
  async extractMFCCFromFile(options: MFCCExtractionOptions): Promise<FeatureExtractionResult> {
    try {
      if (!options.audioPath) {
        return {
          success: false,
          error: "No audio path provided"
        };
      }

      // Step 1: Initialize if not already
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          error: "Failed to initialize Essentia"
        };
      }

      // Step 2: Load the audio file
      const sampleRate = options.sampleRate || 44100;
      const numCoeffs = options.numCoeffs || 13;
      const numBands = options.numBands || 40;
      const frameSize = options.frameSize || 2048;
      const hopSize = options.hopSize || 1024;
      const cleanup = options.cleanup !== false; // Default to true

      // Normalize the path for better cross-platform compatibility
      const normalizedPath = normalizeFilePath(options.audioPath);

      console.log(`Loading audio file for MFCC extraction: ${normalizedPath}`);
      const audioLoaded = await this.loadAudio(normalizedPath, sampleRate);

      if (!audioLoaded) {
        return {
          success: false,
          error: "Failed to load audio file"
        };
      }

      // Step 3: Process the audio
      const processed = await this.processAudio(frameSize, hopSize);
      if (!processed) {
        if (cleanup) await this.unloadAudio();
        return {
          success: false,
          error: "Failed to process audio frames"
        };
      }

      // Step 4: Extract MFCC features
      const mfccParams: AlgorithmParams = {
        numberCoefficients: numCoeffs,
        numberBands: numBands,
      };

      const mfccResults = await this.spectral.mfcc(mfccParams);

      // Step 5: Clean up if requested
      if (cleanup) {
        await this.unloadAudio();
      }

      return {
        success: true,
        mfcc: mfccResults.mfcc
      };
    } catch (error) {
      console.error("Error extracting MFCC:", error);
      // Try to clean up
      try {
        await this.unloadAudio();
      } catch {
        // Ignore cleanup errors
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Sets PCM audio data directly for processing
   * @param pcmData The PCM audio data as an array of numbers
   * @param sampleRate Sample rate of the audio data (e.g., 16000, 44100)
   * @returns Promise resolving to a boolean indicating success or failure
   */
  async setAudioData(pcmData: number[], sampleRate: number): Promise<boolean> {
    try {
      console.log(`Setting PCM data: ${pcmData.length} samples at ${sampleRate}Hz`);
      return await Essentia.setAudioData(pcmData, sampleRate);
    } catch (error) {
      console.error('Error setting PCM data:', error);
      return false;
    }
  }

  /**
   * Tests the MFCC algorithm with dummy data
   * This is useful for basic validation of the Essentia integration
   * @returns Promise resolving to the test result
   */
  async testMFCC(): Promise<any> {
    try {
      console.log('Testing MFCC algorithm with dummy data');
      return await Essentia.testMFCC();
    } catch (error) {
      console.error('Error testing MFCC:', error);
      throw error;
    }
  }

  /**
   * Extract audio features from PCM data
   * @param pcmData The PCM audio data as an array of numbers
   * @param params Parameters for feature extraction
   * @returns Promise resolving to the extracted features
   */
  async extractFeatures(pcmData: number[], params: FeatureExtractionParams = {}): Promise<FeatureExtractionResult> {
    try {
      // Step 1: Initialize if not already
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          error: "Failed to initialize Essentia"
        };
      }

      // Step 2: Set the audio data
      const sampleRate = params.sampleRate || 16000;
      const audioSet = await this.setAudioData(pcmData, sampleRate);
      if (!audioSet) {
        return {
          success: false,
          error: "Failed to set audio data"
        };
      }

      // Step 3: Extract features
      return this.extractFeaturesFromBuffer({
        ...params,
        sampleRate
      });
    } catch (error) {
      console.error("Error extracting features:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Extract audio features from the currently loaded audio buffer
   * @param params Parameters for feature extraction
   * @returns Promise resolving to the extracted features
   */
  async extractFeaturesFromBuffer(params: FeatureExtractionParams = {}): Promise<FeatureExtractionResult> {
    try {
      // Use default parameters if not provided
      const nMfcc = params.nMfcc || 40;
      const nFft = params.nFft || 1024;
      const hopLength = params.hopLength || 160; // 10ms * 16kHz
      const winLength = params.winLength || 400; // 25ms * 16kHz
      const window = params.window || "hann";
      const nChroma = params.nChroma || 12;
      const nMels = params.nMels || 128;
      const nBands = params.nBands || 7;
      const fmin = params.fmin || 100;

      console.log(`Extracting features with parameters: nMfcc=${nMfcc}, nFft=${nFft}, hopLength=${hopLength}, winLength=${winLength}, window=${window}, nChroma=${nChroma}, nMels=${nMels}, nBands=${nBands}, fmin=${fmin}`);

      // Call the native method
      const result = await Essentia.extractAudioFeatures(
        nMfcc, nFft, hopLength, winLength, window, nChroma, nMels, nBands, fmin
      );

      return result;
    } catch (error) {
      console.error("Error extracting features from buffer:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Lists all available algorithms in the Essentia library
   * @returns Promise resolving to an object with information about available algorithms
   */
  async listAlgorithms(): Promise<{
    success: boolean;
    totalCount?: number;
    hasMonoLoader?: boolean;
    hasAudioLoader?: boolean;
    audioAlgorithms?: string[];
    algorithms?: string[];
    error?: string;
  }> {
    try {
      return await Essentia.listAlgorithms();
    } catch (error) {
      console.error('Error listing algorithms:', error);
      throw error;
    }
  }
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
