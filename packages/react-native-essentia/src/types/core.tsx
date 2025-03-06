// packages/react-native-essentia/src/types/core.ts
export interface AlgorithmParams {
  [key: string]: string | number | boolean | number[] | string[] | undefined;
}

// Define the base interface for the native module
export interface EssentiaInterface {
  // Core functionality
  initialize(): Promise<boolean>;
  getVersion(): Promise<string>;
  setAudioData(pcmData: number[], sampleRate: number): Promise<boolean>;
  executeAlgorithm(algorithm: string, params: AlgorithmParams): Promise<any>;
  executeBatch(algorithms: FeatureConfig[]): Promise<any>;
  testConnection(): Promise<string>;
  getAlgorithmInfo(algorithm: string): Promise<any>;
  getAllAlgorithms(): Promise<any>;
  extractFeatures(features: FeatureConfig[]): Promise<any>;
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
  data?: Record<string, number | string | number[]>;
  error?: string;
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
