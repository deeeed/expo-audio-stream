import type { ApiInterface, ArchitectureInfo, SystemInfo } from './types/api';
import type {
  AsrInitResult,
  AsrModelConfig,
  AsrRecognizeResult,
  AudioTaggingInitResult,
  AudioTaggingModelConfig,
  AudioTaggingResult,
  GetSpeakersResult,
  IdentifySpeakerResult,
  RegisterSpeakerResult,
  RemoveSpeakerResult,
  SpeakerEmbeddingResult,
  SpeakerIdFileProcessResult,
  SpeakerIdInitResult,
  SpeakerIdModelConfig,
  SpeakerIdProcessResult,
  TestOnnxIntegrationResult,
  TtsGenerateConfig,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
  ValidateResult,
  VerifySpeakerResult,
  KWSModelConfig,
  KWSInitResult,
  KWSAcceptWaveformResult,
} from './types/interfaces';

// Import the native module and potentially substitute with web implementation
import { Platform } from 'react-native';
import NativeModuleImport from './NativeSherpaOnnxSpec';
import { WebSherpaOnnxImpl } from './WebSherpaOnnxImpl';

// Create a web placeholder implementation for WASM support in the future
const createWebPlaceholder = (): ApiInterface => {
  const notImplementedError = (): never => {
    throw new Error(
      'Web implementation not yet available - will support WASM in the future'
    );
  };

  return {
    // Return basic error-throwing implementations for each method
    testOnnxIntegration: notImplementedError,
    validateLibraryLoaded: notImplementedError,
    getArchitectureInfo: notImplementedError,
    getSystemInfo: notImplementedError,
    initTts: notImplementedError,
    generateTts: notImplementedError,
    stopTts: notImplementedError,
    releaseTts: notImplementedError,
    initAsr: notImplementedError,
    recognizeFromSamples: notImplementedError,
    recognizeFromFile: notImplementedError,
    releaseAsr: notImplementedError,
    createAsrOnlineStream: notImplementedError,
    acceptAsrOnlineWaveform: notImplementedError,
    isAsrOnlineEndpoint: notImplementedError,
    getAsrOnlineResult: notImplementedError,
    resetAsrOnlineStream: notImplementedError,
    initAudioTagging: notImplementedError,
    processAndComputeAudioTagging: notImplementedError,
    processAndComputeAudioSamples: notImplementedError,
    releaseAudioTagging: notImplementedError,
    initSpeakerId: notImplementedError,
    processSpeakerIdSamples: notImplementedError,
    computeSpeakerEmbedding: notImplementedError,
    registerSpeaker: notImplementedError,
    removeSpeaker: notImplementedError,
    getSpeakers: notImplementedError,
    identifySpeaker: notImplementedError,
    verifySpeaker: notImplementedError,
    processSpeakerIdFile: notImplementedError,
    releaseSpeakerId: notImplementedError,
    initKws: notImplementedError,
    acceptKwsWaveform: notImplementedError,
    resetKwsStream: notImplementedError,
    releaseKws: notImplementedError,
    extractTarBz2: notImplementedError,
  };
};

// Use the native module if available, otherwise use web implementation if on web, or a placeholder
// This ensures we never have a null module - we either have a real implementation or a placeholder
const NativeSherpaOnnx: Omit<ApiInterface, 'extractTarBz2'> & {
  extractTarBz2: (
    sourcePath: string,
    targetDir: string
  ) => Promise<{
    success: boolean;
    message: string;
    extractedFiles?: string[];
  }>;
  processAndComputeAudioTagging: (
    filePath: string,
    topK?: number
  ) => Promise<AudioTaggingResult>;
  processAndComputeAudioSamples: (
    sampleRate: number,
    samples: number[],
    topK?: number
  ) => Promise<AudioTaggingResult>;
  getArchitectureInfo: () => Promise<ArchitectureInfo>;
  getSystemInfo: () => Promise<SystemInfo>;
} =
  NativeModuleImport ||
  (Platform.OS === 'web' ? new WebSherpaOnnxImpl() : createWebPlaceholder());

// Log a warning if we're using the placeholder on a non-web platform
if (!NativeModuleImport && Platform.OS !== 'web') {
  console.warn(
    'SherpaOnnx native module not available on this platform, using fallback implementation'
  );
}

/**
 * Implementation of the SherpaOnnx API
 * This provides type-safe access to the native methods
 */
export const SherpaOnnxAPI: ApiInterface = {
  testOnnxIntegration(): Promise<TestOnnxIntegrationResult> {
    return NativeSherpaOnnx.testOnnxIntegration();
  },

  validateLibraryLoaded(): Promise<ValidateResult> {
    return NativeSherpaOnnx.validateLibraryLoaded();
  },

  getArchitectureInfo(): Promise<ArchitectureInfo> {
    return NativeSherpaOnnx.getArchitectureInfo();
  },
  
  getSystemInfo(): Promise<SystemInfo> {
    return NativeSherpaOnnx.getSystemInfo();
  },

  /**
   * Initialize the TTS engine with the provided model configuration
   * @param config Configuration for the TTS model
   * @returns Promise that resolves with initialization result
   */
  initTts(config: TtsModelConfig): Promise<TtsInitResult> {
    return NativeSherpaOnnx.initTts(config);
  },

  generateTts(config: TtsGenerateConfig): Promise<TtsGenerateResult> {
    return NativeSherpaOnnx.generateTts(config);
  },

  stopTts(): Promise<{ stopped: boolean; message?: string }> {
    return NativeSherpaOnnx.stopTts();
  },

  releaseTts(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseTts();
  },

  // ASR methods
  initAsr(config: AsrModelConfig): Promise<AsrInitResult> {
    // Flatten modelFiles into top-level keys for TurboModule compatibility
    const nativeConfig: Record<string, unknown> = {
      modelDir: config.modelDir,
      modelType: config.modelType,
      numThreads: config.numThreads,
      debug: config.debug,
      streaming: config.streaming,
      decodingMethod: config.decodingMethod,
      maxActivePaths: config.maxActivePaths,
      provider: config.provider,
    };
    if (config.modelFiles) {
      nativeConfig.modelFileEncoder = config.modelFiles.encoder;
      nativeConfig.modelFileDecoder = config.modelFiles.decoder;
      nativeConfig.modelFileJoiner = config.modelFiles.joiner;
      nativeConfig.modelFileTokens = config.modelFiles.tokens;
      nativeConfig.modelFileModel = config.modelFiles.model;
      nativeConfig.modelFilePreprocessor = config.modelFiles.preprocessor;
      nativeConfig.modelFileUncachedDecoder = config.modelFiles.uncachedDecoder;
      nativeConfig.modelFileCachedDecoder = config.modelFiles.cachedDecoder;
    }
    return NativeSherpaOnnx.initAsr(nativeConfig as any);
  },

  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult> {
    return NativeSherpaOnnx.recognizeFromSamples(sampleRate, samples);
  },

  recognizeFromFile(filePath: string): Promise<AsrRecognizeResult> {
    return NativeSherpaOnnx.recognizeFromFile(filePath);
  },

  releaseAsr(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseAsr();
  },

  // ASR online streaming primitives
  createAsrOnlineStream(): Promise<{ success: boolean }> {
    return NativeSherpaOnnx.createAsrOnlineStream();
  },

  acceptAsrOnlineWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<{ success: boolean }> {
    return NativeSherpaOnnx.acceptAsrOnlineWaveform(sampleRate, samples);
  },

  isAsrOnlineEndpoint(): Promise<{ isEndpoint: boolean }> {
    return NativeSherpaOnnx.isAsrOnlineEndpoint();
  },

  getAsrOnlineResult(): Promise<{
    text: string;
    tokens: string[];
    timestamps: number[];
  }> {
    return NativeSherpaOnnx.getAsrOnlineResult();
  },

  resetAsrOnlineStream(): Promise<{ success: boolean }> {
    return NativeSherpaOnnx.resetAsrOnlineStream();
  },

  // Audio tagging methods
  initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    return NativeSherpaOnnx.initAudioTagging(config as any);
  },

  processAndComputeAudioTagging(
    filePath: string,
    _topK?: number
  ): Promise<AudioTaggingResult> {
    return NativeSherpaOnnx.processAndComputeAudioTagging(filePath);
  },

  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[],
    _topK?: number
  ): Promise<AudioTaggingResult> {
    return NativeSherpaOnnx.processAndComputeAudioSamples(sampleRate, samples);
  },

  releaseAudioTagging(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseAudioTagging();
  },

  // Speaker ID methods
  initSpeakerId(config: SpeakerIdModelConfig): Promise<SpeakerIdInitResult> {
    return NativeSherpaOnnx.initSpeakerId(config as any);
  },

  processSpeakerIdSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SpeakerIdProcessResult> {
    return NativeSherpaOnnx.processSpeakerIdSamples(sampleRate, samples);
  },

  computeSpeakerEmbedding(): Promise<SpeakerEmbeddingResult> {
    return NativeSherpaOnnx.computeSpeakerEmbedding();
  },

  registerSpeaker(
    name: string,
    embedding: number[]
  ): Promise<RegisterSpeakerResult> {
    return NativeSherpaOnnx.registerSpeaker(name, embedding);
  },

  removeSpeaker(name: string): Promise<RemoveSpeakerResult> {
    return NativeSherpaOnnx.removeSpeaker(name);
  },

  getSpeakers(): Promise<GetSpeakersResult> {
    return NativeSherpaOnnx.getSpeakers();
  },

  identifySpeaker(
    embedding: number[],
    threshold: number
  ): Promise<IdentifySpeakerResult> {
    return NativeSherpaOnnx.identifySpeaker(embedding, threshold);
  },

  verifySpeaker(
    name: string,
    embedding: number[],
    threshold: number
  ): Promise<VerifySpeakerResult> {
    return NativeSherpaOnnx.verifySpeaker(name, embedding, threshold);
  },

  processSpeakerIdFile(filePath: string): Promise<SpeakerIdFileProcessResult> {
    return NativeSherpaOnnx.processSpeakerIdFile(filePath);
  },

  releaseSpeakerId(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseSpeakerId();
  },

  // KWS methods
  initKws(config: KWSModelConfig): Promise<KWSInitResult> {
    return NativeSherpaOnnx.initKws(config as any);
  },

  acceptKwsWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<KWSAcceptWaveformResult> {
    return NativeSherpaOnnx.acceptKwsWaveform(sampleRate, samples);
  },

  resetKwsStream(): Promise<{ success: boolean }> {
    return NativeSherpaOnnx.resetKwsStream();
  },

  releaseKws(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseKws();
  },

  // Archive methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
  }> {
    return NativeSherpaOnnx.extractTarBz2(sourcePath, targetDir).then(
      (result) => ({
        ...result,
        extractedFiles: result.extractedFiles || [],
      })
    );
  },
};
