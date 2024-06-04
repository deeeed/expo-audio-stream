import { AudioDataEvent } from "./useAudioRecording";

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

export type EncodingType = "pcm_32bit" | "pcm_16bit" | "pcm_8bit";
export type SampleRate = 16000 | 44100 | 48000;
export interface RecordingConfig {
  sampleRate?: SampleRate;
  channels?: 1 | 2; // 1 or 2 MONO or STEREO
  encoding?: EncodingType;
  interval?: number;
  onAudioStream?: (_: AudioDataEvent) => Promise<void>;
}
