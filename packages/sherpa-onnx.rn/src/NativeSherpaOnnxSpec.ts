import type { TurboModule } from 'react-native';
import { TurboModuleRegistry, NativeModules, Platform } from 'react-native';
import type { NativeSherpaOnnxInterface } from './types/interfaces';

/**
 * Spec for the native sherpa-onnx module
 *
 * React Native's codegen system requires inline type definitions and
 * doesn't support imported interfaces. We have to define all types
 * directly in this file for it to work properly with codegen.
 */
export interface Spec extends TurboModule {
  // Test methods
  validateLibraryLoaded(): Promise<{
    loaded: boolean;
    status: string;
    testConfig?: {
      sampleRate: number;
      featureDim: number;
    };
  }>;

  testOnnxIntegration(): Promise<{
    status: string;
    success: boolean;
  }>;

  // Basic methods
  createRecognizer(config: {
    modelPath?: string;
    sampleRate?: number;
    numThreads?: number;
    debug?: boolean;
    featureDim?: number;
    beamSize?: number;
    beamThreshold?: number;
    language?: string;
    enableEndpoint?: boolean;
    enableNonStreaming?: boolean;
  }): Promise<{ success: boolean }>;

  // TTS methods
  initTts(config: {
    modelDir: string;
    modelType?: string;
    modelName?: string;
    acousticModelName?: string;
    vocoder?: string;
    voices?: string;
    lexicon?: string;
    dataDir?: string;
    dictDir?: string;
    ruleFsts?: string;
    ruleFars?: string;
    numThreads?: number;
    debug?: boolean;
    noiseScale?: number;
    noiseScaleW?: number;
    lengthScale?: number;
  }): Promise<{
    success: boolean;
    sampleRate: number;
    numSpeakers: number;
    error?: string;
  }>;

  generateTts(config: {
    text: string;
    speakerId: number;
    speakingRate: number;
    playAudio: boolean;
    fileNamePrefix?: string;
    lengthScale?: number;
    noiseScale?: number;
    noiseScaleW?: number;
  }): Promise<{
    filePath: string;
    success: boolean;
    sampleRate: number;
    samplesLength: number;
    numSamples: number;
    saved: boolean;
  }>;

  stopTts(): Promise<{ stopped: boolean; message?: string }>;
  releaseTts(): Promise<{ released: boolean }>;

  // ASR methods
  initAsr(config: {
    modelDir: string;
    modelType?: string;
    modelPath?: string;
    numThreads?: number;
    debug?: boolean;
  }): Promise<{
    success: boolean;
    sampleRate?: number;
    modelType?: string;
    error?: string;
  }>;

  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<{
    success: boolean;
    text?: string;
    durationMs?: number;
    sampleRate?: number;
    samplesLength?: number;
    error?: string;
    isEndpoint?: boolean;
  }>;

  recognizeFromFile(filePath: string): Promise<{
    success: boolean;
    text?: string;
    durationMs?: number;
    sampleRate?: number;
    samplesLength?: number;
    error?: string;
    isEndpoint?: boolean;
  }>;

  releaseAsr(): Promise<{ released: boolean }>;

  // Audio tagging methods
  initAudioTagging(config: {
    modelDir: string;
    modelType?: string;
    modelName?: string;
    modelFile?: string;
    labelsFile?: string;
    numThreads?: number;
    topK?: number;
    debug?: boolean;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  processAndComputeAudioTagging(filePath: string): Promise<{
    success: boolean;
    durationMs: number;
    events: Array<{
      name: string;
      index: number;
      prob: number;
      label?: string;
      confidence?: number;
      probability?: number;
    }>;
    error?: string;
  }>;

  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<{
    success: boolean;
    durationMs: number;
    events: Array<{
      name: string;
      index: number;
      prob: number;
      label?: string;
      confidence?: number;
      probability?: number;
    }>;
    error?: string;
  }>;

  releaseAudioTagging(): Promise<{ released: boolean }>;

  // Speaker ID methods
  initSpeakerId(config: {
    modelDir: string;
    modelFile?: string;
    modelType?: string;
    sampleRate?: number;
    numThreads?: number;
    provider?: string;
    debug?: boolean;
  }): Promise<{
    success: boolean;
    embeddingDim: number;
    error?: string;
  }>;

  processSpeakerIdSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<{
    success: boolean;
    samplesProcessed: number;
    error?: string;
  }>;

  computeSpeakerEmbedding(): Promise<{
    success: boolean;
    durationMs: number;
    embedding: number[];
    embeddingDim: number;
    error?: string;
  }>;

  registerSpeaker(
    name: string,
    embedding: number[]
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  removeSpeaker(name: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;

  getSpeakers(): Promise<{
    success: boolean;
    speakers: string[];
    count: number;
    error?: string;
  }>;

  identifySpeaker(
    embedding: number[],
    threshold: number
  ): Promise<{
    success: boolean;
    speakerName: string;
    identified: boolean;
    error?: string;
  }>;

  verifySpeaker(
    name: string,
    embedding: number[],
    threshold: number
  ): Promise<{
    success: boolean;
    verified: boolean;
    error?: string;
  }>;

  processSpeakerIdFile(filePath: string): Promise<{
    success: boolean;
    durationMs: number;
    embedding: number[];
    embeddingDim: number;
    sampleRate: number;
    samples: number;
    error?: string;
  }>;

  releaseSpeakerId(): Promise<{ released: boolean }>;

  // Archive methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
  }>;
}

/**
 * Get the native module, with proper handling for different architectures and platforms
 */
export function getNativeModule(): NativeSherpaOnnxInterface | null {
  // Web platform gets a null module (for now)
  if (Platform.OS === 'web') {
    return null;
  }

  // Try the new architecture first
  try {
    return TurboModuleRegistry.getEnforcing<Spec>(
      'SherpaOnnx'
    ) as NativeSherpaOnnxInterface;
  } catch (e) {
    // Fall back to old architecture if TurboModule not available
    return NativeModules.SherpaOnnx as NativeSherpaOnnxInterface;
  }
}

export default getNativeModule();
