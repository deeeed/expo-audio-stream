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
   * Voice ID to use
   */
  voiceId?: string;
  /**
   * Speaking rate (0.5 to 2.0)
   */
  speakingRate?: number;
  /**
   * Voice pitch (-20.0 to 20.0)
   */
  pitch?: number;
  /**
   * Volume gain (0.0 to 2.0)
   */
  volumeGainDb?: number;
} 