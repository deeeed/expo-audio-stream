export interface AudioEventPayload {
  encoded?: string;
  buffer?: ArrayBuffer;
  fileUri: string;
  lastEmittedSize: number;
  position: number;
  deltaSize: number;
  totalSize: number;
  mimeType: string;
  streamUuid: string;
}

export interface AudioStreamResult {
  fileUri: string;
  webAudioUri?: string;
  duration: number;
  size: number;
  mimeType: string;
  channels?: number;
  bitDepth?: number;
  sampleRate?: number;
}

export interface StartAudioStreamResult {
  fileUri: string;
  mimeType: string;
  channels?: number;
  bitDepth?: number;
  sampleRate?: number;
}

export interface AudioStreamStatus {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  size: number;
  interval: number;
  mimeType: string;
}

export interface AudioDataEvent {
  data: string | ArrayBuffer;
  position: number;
  fileUri: string;
  eventDataSize: number;
  totalSize: number;
}

export interface AudioFeatures {
  energy: number;
  mfcc: number[];
  rms: number;
  zcr: number;
  spectralCentroid: number;
  spectralFlatness: number;
}

export interface AudioFeaturesOptions {
  energy?: boolean;
  mfcc?: boolean;
  rms?: boolean;
  zcr?: boolean;
  spectralCentroid?: boolean;
  spectralFlatness?: boolean;
}

export interface DataPoint {
  id: number;
  amplitude: number;
  activeSpeech?: boolean;
  dB?: number;
  silent?: boolean;
  features?: AudioFeatures;
  timestamp?: number;
  speaker?: number;
}

export interface AudioAnalysisData {
  pointsPerSecond: number; // How many consolidated value per second
  durationMs?: number; // Duration of the audio in milliseconds
  bitDepth: number; // Bit depth of the audio
  numberOfChannels: number; // Number of audio channels
  sampleRate: number; // Sample rate of the audio
  dataPoints: DataPoint[];
  amplitudeRange: {
    min: number;
    max: number;
  };
  speakerChanges?: {
    timestamp: number;
    speaker: number;
  }[];
}

export type EncodingType = "pcm_32bit" | "pcm_16bit" | "pcm_8bit";
export type SampleRate = 16000 | 44100 | 48000;
export interface RecordingConfig {
  sampleRate?: SampleRate; // Sample rate for recording
  channels?: 1 | 2; // 1 or 2 (MONO or STEREO)
  encoding?: EncodingType; // Encoding type for the recording
  interval?: number; // Interval in milliseconds at which to emit recording data

  // Optional parameters for audio processing
  //TODO remove maxRecentDataDuration - should be replaced by maxDataPoints to 100.
  maxRecentDataDuration?: number; // Maximum duration of recent data to keep for processing (default is 10.0 seconds)
  enableProcessing?: boolean; // Boolean to enable/disable audio processing (default is false)
  pointsPerSecond?: number; // Number of data points to extract per second of audio (default is 1000)
  algorithm?: string; // Algorithm to use for extraction (default is "rms")
  features?: AudioFeaturesOptions; // Feature options to extract (default is empty)

  onAudioStream?: (_: AudioDataEvent) => Promise<void>; // Callback function to handle audio stream
  onProcessingResult?: (_: AudioAnalysisData) => Promise<void>; // Callback function to handle processing results
}
