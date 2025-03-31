import { TtsService } from '../services/TtsService';
import { AsrService } from '../services/AsrService';
import { AudioTaggingService } from '../services/AudioTaggingService';
import { ArchiveService } from '../services/ArchiveService';
import { SpeakerIdService } from '../services/SpeakerIdService';

/**
 * Provider type for model inference
 * Used by TTS, ASR and other models
 */
export type ModelProvider = 'cpu' | 'gpu';

/**
 * Configuration options for Sherpa-onnx
 */
export interface SherpaOnnxConfig {
  /**
   * Path to model files
   */
  modelPath: string;
  /**
   * Language for the model (e.g., 'en', 'fr', 'zh')
   */
  language?: string;
  /**
   * Sampling rate for audio processing
   */
  sampleRate?: number;
  /**
   * Number of channels for audio processing
   */
  channels?: number;
}

/**
 * Result from Sherpa-onnx ASR processing
 */
export interface SherpaOnnxResult {
  /**
   * Recognized text
   */
  text: string;
  /**
   * Confidence score (0-1)
   */
  confidence?: number;
  /**
   * Language detected
   */
  language?: string;
  /**
   * Segment timing information
   */
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export type TtsModelType = 'vits' | 'kokoro' | 'matcha';

/**
 * Options for automatic speech recognition processing
 */
export interface AsrOptions {
  /**
   * Maximum audio length in seconds
   */
  maxAudioLength?: number;
  /**
   * Enable interim results
   */
  interimResults?: boolean;
  /**
   * Enable punctuation insertion
   */
  enablePunctuation?: boolean;
  /**
   * Enable automatic language detection
   */
  enableLanguageDetection?: boolean;
}

/**
 * Configuration for TTS model
 * This interface aligns with the Kotlin OfflineTtsModelConfig and OfflineTtsConfig classes
 */
export interface TtsModelConfig {
  /**
   * Directory containing model files
   */
  modelDir: string;

  /**
   * Model type (vits, matcha, kokoro)
   */
  ttsModelType: TtsModelType;

  /**
   * Primary model file name (e.g., model.onnx, en_US-ljspeech-low.onnx)
   * This will be used differently based on model type:
   * - For VITS: Used as 'model' parameter
   * - For Kokoro: Used as 'model' parameter
   * - For Matcha: Used as 'acousticModel' parameter
   */
  modelFile: string;

  /**
   * Tokens file name (e.g., tokens.txt)
   * Required for all model types
   */
  tokensFile: string;

  /**
   * Voices file name for Kokoro models (e.g., voices.bin)
   */
  voicesFile?: string;

  /**
   * Vocoder file name for Matcha models (e.g., vocos-22khz-univ.onnx)
   */
  vocoderFile?: string;

  /**
   * Lexicon file name (e.g., lexicon.txt)
   * Used by VITS and Matcha models
   */
  lexiconFile?: string;

  /**
   * Data directory path (usually points to espeak-ng-data)
   */
  dataDir?: string;

  /**
   * Dictionary directory path
   */
  dictDir?: string;

  /**
   * Rule FSTs file paths (comma-separated)
   */
  ruleFstsFile?: string;

  /**
   * Rule FARs file paths (comma-separated)
   */
  ruleFarsFile?: string;

  /**
   * Number of threads to use for processing
   * Default: 1
   */
  numThreads?: number;

  /**
   * Enable debug mode for more detailed logs
   * Default: false
   */
  debug?: boolean;

  /**
   * Provider for model inference (e.g., "cpu", "gpu")
   * Default: "cpu"
   */
  provider?: ModelProvider;

  /**
   * Noise scale for controlling voice variation
   * - For VITS models: default is 0.667
   * - For Matcha models: default is 1.0
   */
  noiseScale?: number;

  /**
   * Noise scale W for controlling phoneme duration variation (VITS models only)
   * Default: 0.8
   */
  noiseScaleW?: number;

  /**
   * Length scale for controlling speech speed
   * Default: 1.0
   */
  lengthScale?: number;

  /**
   * Maximum number of sentences to process at once
   * Default: 1
   */
  maxNumSentences?: number;

  /**
   * Silence scale for controlling pause duration
   * Default: 0.2
   */
  silenceScale?: number;
}

/**
 * Result of TTS initialization
 */
export interface TtsInitResult {
  /**
   * Whether initialization was successful
   */
  success: boolean;

  /**
   * Sample rate of generated audio
   */
  sampleRate: number;

  /**
   * Number of available speakers
   */
  numSpeakers: number;

  /**
   * Error message if initialization failed
   */
  error?: string;
}

/**
 * Configuration for text-to-speech generation
 */
export interface TtsGenerateConfig {
  /** The text to convert to speech */
  text: string;
  /** The speaker ID to use (0-based index) */
  speakerId: number;
  /** The speaking rate (1.0 is normal speed) */
  speakingRate: number;
  /** Whether to play the audio immediately */
  playAudio: boolean;
  /** Optional prefix for the generated audio file */
  fileNamePrefix?: string;
  /** Optional length scale for VITS model (affects speech duration) */
  lengthScale?: number;
  /** Optional noise scale for VITS model (affects speech quality) */
  noiseScale?: number;
  /** Optional noise scale W for VITS model (affects speech quality) */
  noiseScaleW?: number;
}

/**
 * Options for text-to-speech processing
 */
export interface TtsOptions {
  /**
   * Speaker ID to use (default: 0)
   */
  speakerId?: number;

  /**
   * Speaking rate (0.5 to 2.0, default: 1.0)
   */
  speakingRate?: number;

  /**
   * Whether to play audio as it's generated
   */
  playAudio?: boolean;

  /**
   * Custom file name prefix for the generated audio file
   * Default: "generated_audio_"
   */
  fileNamePrefix?: string;

  /**
   * Length scale override for this specific generation
   * Allows fine-tuning the speaking speed (0.5 to 2.0, default: model setting)
   */
  lengthScale?: number;

  /**
   * Noise scale override for this specific generation
   * Controls voice variation (default: model setting)
   */
  noiseScale?: number;

  /**
   * Noise scale W override for this specific generation (VITS models only)
   * Controls randomness in phoneme duration (default: model setting)
   */
  noiseScaleW?: number;
}

/**
 * Result of TTS generation
 */
export interface TtsGenerateResult {
  /** Whether generation was successful */
  success: boolean;
  /** The path to the generated audio file */
  filePath?: string;
}

/**
 * Result of library validation
 */
export interface ValidateResult {
  /**
   * Whether the library is loaded
   */
  loaded: boolean;

  /**
   * Status message
   */
  status: string;
}

/**
 * Result of listing all assets in the application bundle
 */
export interface AssetListResult {
  /**
   * Array of asset paths
   */
  assets: string[];

  /**
   * Total number of assets found
   */
  count: number;
}

/**
 * Audio Tagging Model Configuration
 */
export interface AudioTaggingModelConfig {
  /**
   * Directory containing model files
   */
  modelDir: string;

  /**
   * Model file name (e.g., "model.onnx" or "model.int8.onnx")
   * Default: "model.onnx"
   */
  modelName?: string;

  /**
   * Model file to use, automatically constructed from modelDir and modelName
   * This is used internally and doesn't need to be specified by client code
   */
  modelFile?: string;

  /**
   * Model type (zipformer or ced)
   * Must be specified to correctly initialize the model
   * Default: "zipformer"
   */
  modelType: 'zipformer' | 'ced';

  /**
   * Path to labels file
   * Default: "labels.txt" in modelDir
   */
  labelsFile?: string;

  /**
   * Number of threads for processing
   * Default: 1
   */
  numThreads?: number;

  /**
   * Top K results to return from classification
   * Default: 3
   */
  topK?: number;

  /**
   * Enable debug mode for more detailed logs
   * Default: false
   */
  debug?: boolean;

  /**
   * Provider for model inference (e.g., "cpu", "gpu")
   * Default: "cpu"
   */
  provider?: ModelProvider;
}

/**
 * Result of AudioTagging initialization
 */
export interface AudioTaggingInitResult {
  /**
   * Whether initialization was successful
   */
  success: boolean;

  /**
   * Error message if initialization failed
   */
  error?: string;
}

/**
 * Result of audio sample processing
 */
export interface AudioProcessResult {
  /**
   * Whether processing was successful
   */
  success: boolean;

  /**
   * Number of samples that were processed
   */
  processedSamples: number;

  /**
   * Error message if processing failed
   */
  error?: string;
}

/**
 * Detected audio event
 */
export interface AudioEvent {
  /**
   * Name/label of the detected audio event
   */
  name: string;

  /**
   * Index of the event in the labels file
   */
  index: number;

  /**
   * Probability score (0-1)
   */
  prob: number;

  /**
   * @deprecated Use name instead
   */
  label?: string;

  /**
   * @deprecated Use prob instead
   */
  confidence?: number;

  /**
   * Probability alias for compatibility
   */
  probability?: number;
}

/**
 * Result of audio tagging computation
 */
export interface AudioTaggingResult {
  /**
   * Whether computation was successful
   */
  success: boolean;

  /**
   * Processing time in milliseconds
   */
  durationMs: number;

  /**
   * Array of detected audio events
   */
  events: AudioEvent[];

  /**
   * Error message if computation failed
   */
  error?: string;
}

/**
 * Options for processing audio for tagging
 */
export interface AudioTaggingProcessOptions {
  /**
   * Path to audio file to process
   * Use this for processing an entire audio file from disk
   */
  filePath?: string;

  /**
   * Raw audio samples
   * Use this when you have PCM samples in memory
   */
  samples?: number[];

  /**
   * Sample rate of the audio (required when using samples)
   */
  sampleRate?: number;
}

/**
 * Result of processing audio for tagging
 */
export interface AudioTaggingProcessResult {
  /**
   * Whether processing was successful
   */
  success: boolean;

  /**
   * Type of audio processed
   */
  inputType: 'file' | 'samples';

  /**
   * Message describing the result
   */
  message?: string;

  /**
   * Sample rate of the processed audio
   */
  sampleRate?: number;

  /**
   * Number of samples that were processed
   */
  samplesProcessed?: number;

  /**
   * Error message if processing failed
   */
  error?: string;
}

/**
 * Result of processing an audio file
 * @deprecated Use AudioTaggingProcessResult instead
 */
export interface AudioFileProcessResult {
  /**
   * Whether processing was successful
   */
  success: boolean;

  /**
   * Message describing the result
   */
  message?: string;

  /**
   * Sample rate of the processed audio
   */
  sampleRate: number;

  /**
   * Number of samples that were processed
   */
  samples: number;

  /**
   * Error message if processing failed
   */
  error?: string;
}

/**
 * Configuration for ASR model
 */
export interface AsrModelConfig {
  /**
   * Directory containing the ASR model files
   */
  modelDir: string;
  modelType:
    | 'transducer'
    | 'nemo_transducer'
    | 'paraformer'
    | 'nemo_ctc'
    | 'whisper'
    | 'tdnn'
    | 'zipformer2_ctc'
    | 'wenet_ctc'
    | 'telespeech_ctc'
    | 'fire_red_asr'
    | 'moonshine'
    | 'sense_voice'
    | 'zipformer'
    | 'lstm'
    | 'zipformer2';
  numThreads?: number;
  decodingMethod?: 'greedy_search' | 'beam_search';
  maxActivePaths?: number;
  modelFiles: {
    encoder?: string;
    decoder?: string;
    joiner?: string;
    tokens?: string;
    model?: string;
    preprocessor?: string;
    uncachedDecoder?: string;
    cachedDecoder?: string;
  };
  /**
   * Whether to use streaming (online) recognition
   * Default: false
   */
  streaming?: boolean;

  /**
   * Enable debug mode for detailed logs
   * Default: false
   */
  debug?: boolean;

  /**
   * Provider for model inference (e.g., "cpu", "gpu")
   * Default: "cpu"
   */
  provider?: ModelProvider;
}

/**
 * Result of ASR initialization
 */
export interface AsrInitResult {
  /**
   * Whether initialization was successful
   */
  success: boolean;

  /**
   * Sample rate of the ASR model
   */
  sampleRate?: number;

  /**
   * Type of the model that was initialized
   */
  modelType?: string;

  /**
   * Error message if initialization failed
   */
  error?: string;
}

/**
 * Result of ASR recognition
 */
export interface AsrRecognizeResult {
  /**
   * Whether recognition was successful
   */
  success: boolean;

  /**
   * Recognized text
   */
  text?: string;

  /**
   * Duration of the recognition process in milliseconds
   */
  durationMs?: number;

  /**
   * Sample rate of the processed audio
   */
  sampleRate?: number;

  /**
   * Length of the audio samples processed
   */
  samplesLength?: number;

  /**
   * Error message if recognition failed
   */
  error?: string;

  /**
   * Whether an endpoint was detected (streaming mode only)
   */
  isEndpoint?: boolean;
}

export interface SherpaOnnxStatic {
  validateLibraryLoaded(): Promise<ValidateResult>;
  initTts(config: TtsModelConfig): Promise<TtsInitResult>;
  generateTts(config: TtsGenerateConfig): Promise<TtsGenerateResult>;
  stopTts(): Promise<{ stopped: boolean; message?: string }>;
  releaseTts(): Promise<{ released: boolean }>;
  initAsr(config: AsrModelConfig): Promise<AsrInitResult>;
  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult>;
  recognizeFromFile(filePath: string): Promise<AsrRecognizeResult>;
  releaseAsr(): Promise<{ released: boolean }>;
  initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult>;
  processAndComputeAudioTagging(filePath: string): Promise<AudioTaggingResult>;
  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AudioTaggingResult>;
  releaseAudioTagging(): Promise<{ released: boolean }>;
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
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
  }>;

  // Service instances
  TTS: TtsService;
  ASR: AsrService;
  AudioTagging: AudioTaggingService;
  SpeakerId: SpeakerIdService;
  Archive: ArchiveService;
}

export declare const SherpaOnnx: SherpaOnnxStatic;

// ----------------------------------------------------------------------------------
// Speaker Identification Interfaces
// ----------------------------------------------------------------------------------

/**
 * Configuration for Speaker Identification model
 */
export interface SpeakerIdModelConfig {
  /**
   * Directory containing model files
   */
  modelDir: string;

  /**
   * Model file name (e.g., "model.onnx")
   * Default: "model.onnx"
   */
  modelFile?: string;

  /**
   * Number of threads for processing
   * Default: 1
   */
  numThreads?: number;

  /**
   * Provider for model inference (e.g., "cpu")
   * Default: "cpu"
   */
  provider?: ModelProvider;

  /**
   * Enable debug mode for more detailed logs
   * Default: false
   */
  debug?: boolean;
}

/**
 * Result of Speaker ID initialization
 */
export interface SpeakerIdInitResult {
  /**
   * Whether initialization was successful
   */
  success: boolean;

  /**
   * Dimension of the speaker embedding
   */
  embeddingDim: number;

  /**
   * Error message if initialization failed
   */
  error?: string;
}

/**
 * Result of audio sample processing for Speaker ID
 */
export interface SpeakerIdProcessResult {
  /**
   * Whether processing was successful
   */
  success: boolean;

  /**
   * Number of samples that were processed
   */
  samplesProcessed: number;

  /**
   * Error message if processing failed
   */
  error?: string;
}

/**
 * Result of speaker embedding computation
 */
export interface SpeakerEmbeddingResult {
  /**
   * Whether computation was successful
   */
  success: boolean;

  /**
   * Processing time in milliseconds
   */
  durationMs: number;

  /**
   * Speaker embedding vector
   */
  embedding: number[];

  /**
   * Dimension of the embedding
   */
  embeddingDim: number;

  /**
   * Error message if computation failed
   */
  error?: string;
}

/**
 * Result of speaker registration
 */
export interface RegisterSpeakerResult {
  /**
   * Whether registration was successful
   */
  success: boolean;

  /**
   * Message describing the result
   */
  message?: string;

  /**
   * Error message if registration failed
   */
  error?: string;
}

/**
 * Result of speaker removal
 */
export interface RemoveSpeakerResult {
  /**
   * Whether removal was successful
   */
  success: boolean;

  /**
   * Message describing the result
   */
  message?: string;

  /**
   * Error message if removal failed
   */
  error?: string;
}

/**
 * Result of getting all speakers
 */
export interface GetSpeakersResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Array of speaker names
   */
  speakers: string[];

  /**
   * Total number of speakers
   */
  count: number;

  /**
   * Error message if operation failed
   */
  error?: string;
}

/**
 * Result of speaker identification
 */
export interface IdentifySpeakerResult {
  /**
   * Whether identification was successful
   */
  success: boolean;

  /**
   * Name of the identified speaker (empty if no match)
   */
  speakerName: string;

  /**
   * Whether a speaker was identified
   */
  identified: boolean;

  /**
   * Error message if identification failed
   */
  error?: string;
}

/**
 * Result of speaker verification
 */
export interface VerifySpeakerResult {
  /**
   * Whether verification was successful
   */
  success: boolean;

  /**
   * Whether the speaker was verified (matches the provided embedding)
   */
  verified: boolean;

  /**
   * Error message if verification failed
   */
  error?: string;
}

/**
 * Result of processing an audio file for speaker identification
 */
export interface SpeakerIdFileProcessResult {
  /**
   * Whether processing was successful
   */
  success: boolean;

  /**
   * Processing time in milliseconds
   */
  durationMs: number;

  /**
   * Speaker embedding vector
   */
  embedding: number[];

  /**
   * Dimension of the embedding
   */
  embeddingDim: number;

  /**
   * Sample rate of the processed audio
   */
  sampleRate: number;

  /**
   * Number of samples that were processed
   */
  samples: number;

  /**
   * Error message if processing failed
   */
  error?: string;
}

/**
 * Options for speaker identification
 */
export interface SpeakerIdOptions {
  /**
   * Minimum threshold for speaker similarity (0-1)
   * Default: 0.5
   */
  threshold?: number;

  /**
   * Minimum duration of audio required for reliable identification (in seconds)
   * Default: 3
   */
  minDuration?: number;
}

// Native module interface - what we expect from the native side
export interface NativeSherpaOnnxInterface {
  // Test methods
  testOnnxIntegration(): Promise<TestOnnxIntegrationResult>;
  validateLibraryLoaded(): Promise<ValidateResult>;

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

  // Audio tagging methods
  initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult>;
  processAndComputeAudioTagging(filePath: string): Promise<AudioTaggingResult>;
  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[]
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

  // Archive methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
  }>;
}

// Public API interface - what we expose to users
export interface SherpaOnnxInterface {
  // Test methods
  testOnnxIntegration(): Promise<TestOnnxIntegrationResult>;
  validateLibraryLoaded(): Promise<ValidateResult>;

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

  // Audio tagging methods
  initAudioTagging(
    config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult>;
  processAndComputeAudioTagging(filePath: string): Promise<AudioTaggingResult>;
  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[]
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

  // Archive methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
  }>;

  // Service instances
  TTS: TtsService;
  ASR: AsrService;
  AudioTagging: AudioTaggingService;
  SpeakerId: SpeakerIdService;
  Archive: ArchiveService;
}

// Result types
export interface TestOnnxIntegrationResult {
  status: string;
  success: boolean;
}
