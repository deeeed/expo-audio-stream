// packages/react-native-essentia/src/types/core.ts
export interface AlgorithmParams {
  [key: string]: string | number | boolean | number[] | string[] | undefined;
}

// Define the base interface for the native module
export interface EssentiaInterface {
  // Core functionality
  initialize(): Promise<boolean>;
  getVersion(): Promise<string>;
  setAudioData(
    pcmData: number[] | Float32Array,
    sampleRate: number
  ): Promise<boolean>;
  executeAlgorithm(
    algorithm: string,
    params: AlgorithmParams
  ): Promise<AlgorithmResult>;
  executeBatch(algorithms: FeatureConfig[]): Promise<BatchProcessingResults>;
  testConnection(): Promise<string>;
  getAlgorithmInfo(algorithm: string): Promise<AlgorithmInfo>;
  getAllAlgorithms(): Promise<{ algorithms: string[] }>;
  extractFeatures(features: FeatureConfig[]): Promise<BatchProcessingResults>;
  setThreadCount(count: number): Promise<boolean>;
  getThreadCount(): Promise<number>;

  // Cache-related functionality
  setCacheEnabled(enabled: boolean): Promise<boolean>;
  isCacheEnabled(): Promise<boolean>;
  clearCache(): Promise<boolean>;
}

// Define feature configuration interface
export interface FeatureConfig {
  name: string;
  params?: AlgorithmParams;
}

// Define the algorithm info interface
export interface AlgorithmInfo {
  name: string;
  inputs: Array<{ name: string; type: string }>;
  outputs: Array<{ name: string; type: string }>;
  parameters: Record<string, unknown>;
}

// Define result interfaces
export interface AlgorithmResult {
  success: boolean;
  data?: Record<string, number | string | number[] | string[]>;
  error?: { code: string; message: string; details?: string };
}

// For batch processing results
export interface BatchProcessingResults {
  success: boolean;
  data?: {
    // Time-domain features
    duration?: number;
    effectiveDuration?: number;
    loudness?: number;
    dynamicComplexity?: number;
    logAttackTime?: number;

    // Spectral features
    mfcc?: number[];
    bands?: number[];
    barkBands?: number[];
    melBands?: number[];
    erbBands?: number[];
    spectrum?: number[];
    spectralContrast?: number[];
    spectralCentroid?: number;
    spectralRolloff?: number;
    spectralFlux?: number;
    spectralComplexity?: number;

    // Tonal features
    key?: string;
    scale?: string;
    strength?: number;
    chords?: string[];
    hpcp?: number[];
    tuningFrequency?: number;
    tuningCents?: number;
    inharmonicity?: number;
    dissonance?: number;

    // Rhythm features
    bpm?: number;
    beats?: number[];
    ticks?: number[];
    confidence?: number;
    danceability?: number;
    onsets?: number[];

    // Other core features
    energy?: number;
    rms?: number;
    zeroCrossingRate?: number;
    pitch?: number;

    // Allow for any additional algorithm outputs
    [key: string]: number | string | boolean | number[] | string[] | undefined;
  };
  error?: { code: string; message: string; details?: string };
}

// Generic result type for algorithm operations
export interface EssentiaResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: string };
}
