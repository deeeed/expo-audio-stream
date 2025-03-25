import { TtsService } from '../services/TtsService';
import { AsrService } from '../services/AsrService';
import { AudioTaggingService } from '../services/AudioTaggingService';

/**
 * Type of model supported by Sherpa-onnx
 */
export type ModelType =
  | 'asr'
  | 'tts'
  | 'vad'
  | 'kws'
  | 'speaker-id'
  | 'language-id'
  | 'audio-tagging'
  | 'punctuation';

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
 */
export interface TtsModelConfig {
  /**
   * Directory containing model files
   */
  modelDir: string;

  /**
   * Model type (vits, matcha, kokoro)
   */
  modelType?: string;

  /**
   * Model file name for VITS models
   */
  modelName?: string;

  /**
   * Acoustic model file name for Matcha models
   */
  acousticModelName?: string;

  /**
   * Vocoder file name for Matcha models
   */
  vocoder?: string;

  /**
   * Voices file name for Kokoro models
   */
  voices?: string;

  /**
   * Lexicon file name
   */
  lexicon?: string;

  /**
   * Data directory path
   */
  dataDir?: string;

  /**
   * Dictionary directory path
   */
  dictDir?: string;

  /**
   * Rule FSTs file paths (comma-separated)
   */
  ruleFsts?: string;

  /**
   * Rule FARs file paths (comma-separated)
   */
  ruleFars?: string;

  /**
   * Number of threads to use for processing
   */
  numThreads?: number;

  /**
   * Enable debug mode for more detailed logs
   * Default: false
   */
  debug?: boolean;

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
 * Result of TTS generation
 */
export interface TtsGenerateResult {
  /**
   * Whether generation was successful
   */
  success: boolean;

  /**
   * Sample rate of generated audio
   */
  sampleRate: number;

  /**
   * Number of samples in the generated audio
   */
  samplesLength: number;

  /**
   * Number of samples in the generated audio
   * This is the same as samplesLength, included for backwards compatibility
   */
  numSamples: number;

  /**
   * Path to the generated audio file
   */
  filePath: string;

  /**
   * Whether the audio was saved to a file successfully
   */
  saved: boolean;
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
    | 'sense_voice';
  numThreads?: number;
  decodingMethod?: 'greedy_search' | 'beam_search';
  maxActivePaths?: number;
  modelFiles: {
    encoder?: string;
    decoder?: string;
    joiner?: string;
    tokens?: string;
    model?: string;
  };
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
}

export interface SherpaOnnxStatic {
  validateLibraryLoaded(): Promise<ValidateResult>;
  initTts(config: TtsModelConfig): Promise<TtsInitResult>;
  generateTts(config: {
    text: string;
    speakerId?: number;
    speakingRate?: number;
    playAudio?: boolean;
    fileNamePrefix?: string | null;
    lengthScale?: number | null;
    noiseScale?: number | null;
    noiseScaleW?: number | null;
  }): Promise<TtsGenerateResult>;
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
  TTS: typeof TtsService;
  ASR: typeof AsrService;
  AudioTagging: typeof AudioTaggingService;
}

export declare const SherpaOnnx: SherpaOnnxStatic;

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
