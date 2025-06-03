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

  // Debug: Check what modules are available
  const sherpaModules = Object.keys(NativeModules).filter(k => k.includes('Sherpa'));
  console.log('[SherpaOnnx] Available Sherpa modules:', sherpaModules);
  
  // Debug: Check all available modules 
  const allModules = Object.keys(NativeModules);
  console.log('[SherpaOnnx] Total available modules:', allModules.length);
  console.log('[SherpaOnnx] First 10 modules:', allModules.slice(0, 10));
  
  // Check if our module is registered under any name
  const onnxModules = allModules.filter(k => k.toLowerCase().includes('onnx') || k.toLowerCase().includes('sherpa'));
  console.log('[SherpaOnnx] ONNX-related modules:', onnxModules);

  // Try the new architecture first
  try {
    const turboModule = TurboModuleRegistry.getEnforcing<Spec>(
      'SherpaOnnx'
    ) as NativeSherpaOnnxInterface;
    console.log('[SherpaOnnx] Loaded via TurboModule');
    return turboModule;
  } catch (e) {
    console.warn('[SherpaOnnx] TurboModule failed:', e);
    
    // Try alternative TurboModule names
    const possibleTurboNames = ['SherpaOnnxRnModule', 'NativeSherpaOnnx', 'SherpaOnnxSpec'];
    for (const name of possibleTurboNames) {
      try {
        const turboModule = TurboModuleRegistry.getEnforcing<Spec>(name) as NativeSherpaOnnxInterface;
        console.log(`[SherpaOnnx] Loaded via TurboModule with name: ${name}`);
        return turboModule;
      } catch (e2) {
        console.warn(`[SherpaOnnx] TurboModule name ${name} failed:`, e2);
      }
    }
    
    // Fall back to old architecture if TurboModule not available
    const bridgeModule = NativeModules.SherpaOnnx as NativeSherpaOnnxInterface;
    if (bridgeModule) {
      console.log('[SherpaOnnx] Loaded via Bridge');
      return bridgeModule;
    }
    
    // Try alternative Bridge module names
    const possibleBridgeNames = ['SherpaOnnxRnModule', 'NativeSherpaOnnx'];
    for (const name of possibleBridgeNames) {
      const module = NativeModules[name] as NativeSherpaOnnxInterface;
      if (module) {
        console.log(`[SherpaOnnx] Loaded via Bridge with name: ${name}`);
        return module;
      }
    }
    
    console.error('[SherpaOnnx] No native module found with any name!');
    return null;
  }
}

export default getNativeModule();
