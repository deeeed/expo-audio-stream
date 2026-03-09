import type { TurboModule } from 'react-native';
import { TurboModuleRegistry, Platform } from 'react-native';
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

  getArchitectureInfo(): Promise<{
    architecture: string;
    jsiAvailable: boolean;
    turboModulesEnabled: boolean;
    libraryLoaded: boolean;
    currentThread: string;
    threadId: number;
    moduleType: string;
    error?: string;
  }>;

  getSystemInfo(): Promise<{
    architecture: {
      type: 'new' | 'old';
      description: string;
      jsiAvailable: boolean;
      turboModulesEnabled: boolean;
      moduleType: string;
    };
    memory: {
      maxMemoryMB: number;
      totalMemoryMB: number;
      freeMemoryMB: number;
      usedMemoryMB: number;
      systemTotalMemoryMB?: number;
      systemAvailableMemoryMB?: number;
      lowMemory?: boolean;
      lowMemoryThresholdMB?: number;
    };
    cpu: {
      availableProcessors: number;
      hardware?: string;
      supportedAbis: string[];
    };
    device: {
      brand: string;
      model: string;
      device: string;
      manufacturer: string;
      sdkVersion?: number;
      androidVersion?: string;
      iosVersion?: string;
      webPlatform?: string;
    };
    gpu: {
      supportsVulkan?: boolean;
      vulkanSupported?: boolean;
      openGLESVersion?: string;
      metalVersion?: string;
      webGLVersion?: string;
    };
    libraryLoaded: boolean;
    thread: {
      currentThread: string;
      threadId: number;
    };
    error?: string;
  }>;

  // TTS methods
  initTts(config: {
    modelDir: string;
    modelType?: string;
    modelFile?: string;
    tokensFile?: string;
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
    lang?: string;
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
    streaming?: boolean;
    sampleRate?: number;
    featureDim?: number;
    decodingMethod?: string;
    maxActivePaths?: number;
    provider?: string;
    // modelFiles fields flattened for TurboModule compat
    modelFileEncoder?: string;
    modelFileDecoder?: string;
    modelFileJoiner?: string;
    modelFileTokens?: string;
    modelFileModel?: string;
    modelFilePreprocessor?: string;
    modelFileUncachedDecoder?: string;
    modelFileCachedDecoder?: string;
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

  // ASR online streaming methods
  createAsrOnlineStream(): Promise<{ success: boolean }>;
  acceptAsrOnlineWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<{ success: boolean }>;
  isAsrOnlineEndpoint(): Promise<{ isEndpoint: boolean }>;
  getAsrOnlineResult(): Promise<{
    text: string;
    tokens: string[];
    timestamps: number[];
  }>;
  resetAsrOnlineStream(): Promise<{ success: boolean }>;

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

  // KWS methods
  initKws(config: {
    modelDir: string;
    modelType?: string;
    modelFileEncoder?: string;
    modelFileDecoder?: string;
    modelFileJoiner?: string;
    modelFileTokens?: string;
    keywordsFile?: string;
    numThreads?: number;
    debug?: boolean;
    provider?: string;
    maxActivePaths?: number;
    keywordsScore?: number;
    keywordsThreshold?: number;
    numTrailingBlanks?: number;
  }): Promise<{
    success: boolean;
    error?: string;
  }>;

  acceptKwsWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<{
    success: boolean;
    detected: boolean;
    keyword: string;
    tokens?: string[];
    timestamps?: number[];
    error?: string;
  }>;

  resetKwsStream(): Promise<{ success: boolean }>;
  releaseKws(): Promise<{ released: boolean }>;

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
 * Get the native TurboModule (new architecture only).
 * Returns null on web platform.
 */
export function getNativeModule(): NativeSherpaOnnxInterface | null {
  if (Platform.OS === 'web') {
    return null;
  }
  return TurboModuleRegistry.getEnforcing<Spec>('SherpaOnnx') as NativeSherpaOnnxInterface;
}

export default getNativeModule();
