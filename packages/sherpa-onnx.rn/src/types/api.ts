import type {
  TestOnnxIntegrationResult,
  ValidateResult,
  TtsModelConfig,
  TtsInitResult,
  TtsGenerateConfig,
  TtsGenerateResult,
  AsrModelConfig,
  AsrInitResult,
  AsrRecognizeResult,
  AudioTaggingModelConfig,
  AudioTaggingInitResult,
  AudioTaggingResult,
  SpeakerIdModelConfig,
  SpeakerIdInitResult,
  SpeakerIdProcessResult,
  SpeakerEmbeddingResult,
  RegisterSpeakerResult,
  RemoveSpeakerResult,
  GetSpeakersResult,
  IdentifySpeakerResult,
  VerifySpeakerResult,
  SpeakerIdFileProcessResult,
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
} from './interfaces';

export interface ArchitectureInfo {
  architecture: string;
  jsiAvailable: boolean;
  turboModulesEnabled: boolean;
  libraryLoaded: boolean;
  currentThread: string;
  threadId: number;
  moduleType: string;
  error?: string;
}

export interface SystemInfo {
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
    sdkVersion?: number; // Optional for non-Android platforms
    androidVersion?: string; // Optional for non-Android platforms
    iosVersion?: string; // Optional for non-iOS platforms
    webPlatform?: string; // Optional for web platform
  };
  gpu: {
    supportsVulkan?: boolean; // Optional as not all platforms support
    vulkanSupported?: boolean;
    openGLESVersion?: string; // Optional as not all platforms use OpenGL
    metalVersion?: string; // Optional for iOS Metal support
    webGLVersion?: string; // Optional for web WebGL support
  };
  libraryLoaded: boolean;
  thread: {
    currentThread: string;
    threadId: number;
  };
  error?: string;
}

export interface ApiInterface {
  // Test methods
  testOnnxIntegration(): Promise<TestOnnxIntegrationResult>;
  validateLibraryLoaded(): Promise<ValidateResult>;
  getArchitectureInfo(): Promise<ArchitectureInfo>;
  getSystemInfo(): Promise<SystemInfo>;

  // TTS methods
  initTts(config: TtsModelConfig): Promise<TtsInitResult>;
  generateTts(config: TtsGenerateConfig): Promise<TtsGenerateResult>;
  stopTts(): Promise<{ stopped: boolean; message?: string }>;
  releaseTts(): Promise<{ released: boolean }>;

  // ASR methods
  initAsr(config: AsrModelConfig): Promise<AsrInitResult>;
  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult>;
  recognizeFromFile(filePath: string): Promise<AsrRecognizeResult>;
  releaseAsr(): Promise<{ released: boolean }>;

  // ASR online streaming primitives
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
  initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult>;
  processAndComputeAudioTagging(
    filePath: string,
    topK?: number
  ): Promise<AudioTaggingResult>;
  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[],
    topK?: number
  ): Promise<AudioTaggingResult>;
  releaseAudioTagging(): Promise<{ released: boolean }>;

  // Speaker ID methods
  initSpeakerId(config: SpeakerIdModelConfig): Promise<SpeakerIdInitResult>;
  processSpeakerIdSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SpeakerIdProcessResult>;
  computeSpeakerEmbedding(): Promise<SpeakerEmbeddingResult>;
  registerSpeaker(
    name: string,
    embedding: number[]
  ): Promise<RegisterSpeakerResult>;
  removeSpeaker(name: string): Promise<RemoveSpeakerResult>;
  getSpeakers(): Promise<GetSpeakersResult>;
  identifySpeaker(
    embedding: number[],
    threshold: number
  ): Promise<IdentifySpeakerResult>;
  verifySpeaker(
    name: string,
    embedding: number[],
    threshold: number
  ): Promise<VerifySpeakerResult>;
  processSpeakerIdFile(filePath: string): Promise<SpeakerIdFileProcessResult>;
  releaseSpeakerId(): Promise<{ released: boolean }>;

  // KWS methods
  initKws(config: KWSModelConfig): Promise<KWSInitResult>;
  acceptKwsWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<KWSAcceptWaveformResult>;
  resetKwsStream(): Promise<{ success: boolean }>;
  releaseKws(): Promise<{ released: boolean }>;

  // VAD methods
  initVad(config: VadModelConfig): Promise<VadInitResult>;
  acceptVadWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<VadAcceptWaveformResult>;
  resetVad(): Promise<{ success: boolean }>;
  releaseVad(): Promise<{ released: boolean }>;

  // Language ID methods
  initLanguageId(config: LanguageIdModelConfig): Promise<LanguageIdInitResult>;
  detectLanguage(
    sampleRate: number,
    samples: number[]
  ): Promise<LanguageIdResult>;
  detectLanguageFromFile(filePath: string): Promise<LanguageIdResult>;
  releaseLanguageId(): Promise<{ released: boolean }>;

  // Punctuation methods
  initPunctuation(config: PunctuationModelConfig): Promise<PunctuationInitResult>;
  addPunctuation(text: string): Promise<PunctuationResult>;
  releasePunctuation(): Promise<{ released: boolean }>;

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
