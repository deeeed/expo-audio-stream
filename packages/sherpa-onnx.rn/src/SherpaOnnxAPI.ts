import type {
  ApiInterface,
  ArchitectureInfo,
  SystemInfo,
  WaveformInput,
  AudioTaggingFileInput,
  AudioTaggingSamplesInput,
  DiarizationFileInput,
  RegisterSpeakerInput,
  IdentifySpeakerInput,
  VerifySpeakerInput,
  ExtractTarBz2Input,
} from './types/api';
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
  VadModelConfig,
  VadInitResult,
  VadAcceptWaveformResult,
  LanguageIdModelConfig,
  LanguageIdInitResult,
  LanguageIdResult,
  PunctuationModelConfig,
  PunctuationInitResult,
  PunctuationResult,
  DiarizationModelConfig,
  DiarizationInitResult,
  DiarizationResult,
  DenoiserModelConfig,
  DenoiserInitResult,
  DenoiserResult,
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
    initDiarization: notImplementedError,
    processDiarizationFile: notImplementedError,
    releaseDiarization: notImplementedError,
    initKws: notImplementedError,
    acceptKwsWaveform: notImplementedError,
    resetKwsStream: notImplementedError,
    releaseKws: notImplementedError,
    initVad: notImplementedError,
    acceptVadWaveform: notImplementedError,
    resetVad: notImplementedError,
    releaseVad: notImplementedError,
    initLanguageId: notImplementedError,
    detectLanguage: notImplementedError,
    detectLanguageFromFile: notImplementedError,
    releaseLanguageId: notImplementedError,
    initPunctuation: notImplementedError,
    addPunctuation: notImplementedError,
    releasePunctuation: notImplementedError,
    initDenoiser: notImplementedError,
    denoiseFile: notImplementedError,
    releaseDenoiser: notImplementedError,
    extractTarBz2: notImplementedError,
  };
};

// Use the native module if available, otherwise use web implementation if on web, or a placeholder
// This ensures we never have a null module - we either have a real implementation or a placeholder
// NativeSherpaOnnx is typed with the TurboModule's positional-param interface; SherpaOnnxAPI
// adapts those to the object-param ApiInterface that callers see.
const NativeSherpaOnnx: Omit<
  ApiInterface,
  | 'extractTarBz2'
  | 'recognizeFromSamples'
  | 'acceptAsrOnlineWaveform'
  | 'processAndComputeAudioTagging'
  | 'processAndComputeAudioSamples'
  | 'processDiarizationFile'
  | 'acceptKwsWaveform'
  | 'acceptVadWaveform'
  | 'detectLanguage'
  | 'processSpeakerIdSamples'
  | 'registerSpeaker'
  | 'identifySpeaker'
  | 'verifySpeaker'
> & {
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{ success: boolean; message: string; extractedFiles?: string[] }>;
  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult>;
  acceptAsrOnlineWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<{ success: boolean }>;
  processAndComputeAudioTagging(
    filePath: string,
    topK?: number
  ): Promise<AudioTaggingResult>;
  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[],
    topK?: number
  ): Promise<AudioTaggingResult>;
  processDiarizationFile(
    filePath: string,
    numClusters: number,
    threshold: number
  ): Promise<DiarizationResult>;
  acceptKwsWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<KWSAcceptWaveformResult>;
  acceptVadWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<VadAcceptWaveformResult>;
  detectLanguage(
    sampleRate: number,
    samples: number[]
  ): Promise<LanguageIdResult>;
  processSpeakerIdSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SpeakerIdProcessResult>;
  registerSpeaker(
    name: string,
    embedding: number[]
  ): Promise<RegisterSpeakerResult>;
  identifySpeaker(
    embedding: number[],
    threshold: number
  ): Promise<IdentifySpeakerResult>;
  verifySpeaker(
    name: string,
    embedding: number[],
    threshold: number
  ): Promise<VerifySpeakerResult>;
  getArchitectureInfo(): Promise<ArchitectureInfo>;
  getSystemInfo(): Promise<SystemInfo>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} = (NativeModuleImport ||
  (Platform.OS === 'web' ? new WebSherpaOnnxImpl() : createWebPlaceholder())) as any;

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

  recognizeFromSamples({ sampleRate, samples }: WaveformInput): Promise<AsrRecognizeResult> {
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

  acceptAsrOnlineWaveform({ sampleRate, samples }: WaveformInput): Promise<{ success: boolean }> {
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

  processAndComputeAudioTagging({ filePath }: AudioTaggingFileInput): Promise<AudioTaggingResult> {
    return NativeSherpaOnnx.processAndComputeAudioTagging(filePath);
  },

  processAndComputeAudioSamples({ sampleRate, samples }: AudioTaggingSamplesInput): Promise<AudioTaggingResult> {
    return NativeSherpaOnnx.processAndComputeAudioSamples(sampleRate, samples);
  },

  releaseAudioTagging(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseAudioTagging();
  },

  // Speaker ID methods
  initSpeakerId(config: SpeakerIdModelConfig): Promise<SpeakerIdInitResult> {
    return NativeSherpaOnnx.initSpeakerId(config as any);
  },

  processSpeakerIdSamples({ sampleRate, samples }: WaveformInput): Promise<SpeakerIdProcessResult> {
    return NativeSherpaOnnx.processSpeakerIdSamples(sampleRate, samples);
  },

  computeSpeakerEmbedding(): Promise<SpeakerEmbeddingResult> {
    return NativeSherpaOnnx.computeSpeakerEmbedding();
  },

  registerSpeaker({ name, embedding }: RegisterSpeakerInput): Promise<RegisterSpeakerResult> {
    return NativeSherpaOnnx.registerSpeaker(name, embedding);
  },

  removeSpeaker(name: string): Promise<RemoveSpeakerResult> {
    return NativeSherpaOnnx.removeSpeaker(name);
  },

  getSpeakers(): Promise<GetSpeakersResult> {
    return NativeSherpaOnnx.getSpeakers();
  },

  identifySpeaker({ embedding, threshold }: IdentifySpeakerInput): Promise<IdentifySpeakerResult> {
    return NativeSherpaOnnx.identifySpeaker(embedding, threshold);
  },

  verifySpeaker({ name, embedding, threshold }: VerifySpeakerInput): Promise<VerifySpeakerResult> {
    return NativeSherpaOnnx.verifySpeaker(name, embedding, threshold);
  },

  processSpeakerIdFile(filePath: string): Promise<SpeakerIdFileProcessResult> {
    return NativeSherpaOnnx.processSpeakerIdFile(filePath);
  },

  releaseSpeakerId(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseSpeakerId();
  },

  // Diarization methods
  initDiarization(config: DiarizationModelConfig): Promise<DiarizationInitResult> {
    return NativeSherpaOnnx.initDiarization(config as any);
  },

  processDiarizationFile({ filePath, numClusters, threshold }: DiarizationFileInput): Promise<DiarizationResult> {
    return NativeSherpaOnnx.processDiarizationFile(filePath, numClusters, threshold);
  },

  releaseDiarization(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseDiarization();
  },

  // KWS methods
  initKws(config: KWSModelConfig): Promise<KWSInitResult> {
    return NativeSherpaOnnx.initKws(config as any);
  },

  acceptKwsWaveform({ sampleRate, samples }: WaveformInput): Promise<KWSAcceptWaveformResult> {
    return NativeSherpaOnnx.acceptKwsWaveform(sampleRate, samples);
  },

  resetKwsStream(): Promise<{ success: boolean }> {
    return NativeSherpaOnnx.resetKwsStream();
  },

  releaseKws(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseKws();
  },

  // VAD methods
  initVad(config: VadModelConfig): Promise<VadInitResult> {
    return NativeSherpaOnnx.initVad(config as any);
  },

  acceptVadWaveform({ sampleRate, samples }: WaveformInput): Promise<VadAcceptWaveformResult> {
    return NativeSherpaOnnx.acceptVadWaveform(sampleRate, samples);
  },

  resetVad(): Promise<{ success: boolean }> {
    return NativeSherpaOnnx.resetVad();
  },

  releaseVad(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseVad();
  },

  // Language ID methods
  initLanguageId(config: LanguageIdModelConfig): Promise<LanguageIdInitResult> {
    return NativeSherpaOnnx.initLanguageId(config as any);
  },

  detectLanguage({ sampleRate, samples }: WaveformInput): Promise<LanguageIdResult> {
    return NativeSherpaOnnx.detectLanguage(sampleRate, samples);
  },

  detectLanguageFromFile(filePath: string): Promise<LanguageIdResult> {
    return NativeSherpaOnnx.detectLanguageFromFile(filePath);
  },

  releaseLanguageId(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseLanguageId();
  },

  // Punctuation methods
  initPunctuation(config: PunctuationModelConfig): Promise<PunctuationInitResult> {
    return NativeSherpaOnnx.initPunctuation(config as any);
  },

  addPunctuation(text: string): Promise<PunctuationResult> {
    return NativeSherpaOnnx.addPunctuation(text);
  },

  releasePunctuation(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releasePunctuation();
  },

  // Denoising methods
  initDenoiser(config: DenoiserModelConfig): Promise<DenoiserInitResult> {
    return NativeSherpaOnnx.initDenoiser(config as any);
  },

  denoiseFile(filePath: string): Promise<DenoiserResult> {
    return NativeSherpaOnnx.denoiseFile(filePath);
  },

  releaseDenoiser(): Promise<{ released: boolean }> {
    return NativeSherpaOnnx.releaseDenoiser();
  },

  // Archive methods
  extractTarBz2({ sourcePath, targetDir }: ExtractTarBz2Input): Promise<{
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
