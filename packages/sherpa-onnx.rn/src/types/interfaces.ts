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
 * Result from Sherpa-onnx STT processing
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
 * Options for speech-to-text processing
 */
export interface SttOptions {
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
   * Path to the generated audio file
   */
  filePath: string;
  
  /**
   * Whether the audio was saved to a file successfully
   */
  saved: boolean;
}

/**
 * Result of validating that the Sherpa ONNX library is properly loaded
 */
export interface ValidateResult {
  /**
   * True if the library is loaded successfully
   */
  loaded: boolean;
  /**
   * Status message
   */
  status: string;
}
