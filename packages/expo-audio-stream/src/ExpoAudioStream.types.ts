import {
  AudioAnalysisData,
  AudioDataEvent,
  AudioFeaturesOptions,
} from "./AudioAnalysis/AudioAnalysis.types";

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
  durationMs: number;
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

export type EncodingType = "pcm_32bit" | "pcm_16bit" | "pcm_8bit";
export type SampleRate = 16000 | 44100 | 48000;
export interface RecordingConfig {
  sampleRate?: SampleRate; // Sample rate for recording
  channels?: 1 | 2; // 1 or 2 (MONO or STEREO)
  encoding?: EncodingType; // Encoding type for the recording
  interval?: number; // Interval in milliseconds at which to emit recording data

  // Optional parameters for audio processing
  enableProcessing?: boolean; // Boolean to enable/disable audio processing (default is false)
  pointsPerSecond?: number; // Number of data points to extract per second of audio (default is 1000)
  algorithm?: string; // Algorithm to use for extraction (default is "rms")
  features?: AudioFeaturesOptions; // Feature options to extract (default is empty)

  // Optional paramters from web
  onAudioStream?: (_: AudioDataEvent) => Promise<void>; // Callback function to handle audio stream
  onProcessingResult?: (_: AudioAnalysisData) => Promise<void>; // Callback function to handle processing results
}
