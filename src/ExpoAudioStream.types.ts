export interface AudioEventPayload {
  encoded?: string;
  buffer?: Blob;
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

export interface AudioStreamStatus {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  size: number;
  interval: number;
  mimeType: string;
}

export interface RecordingOptions {
  // TODO align Android and IOS options
  // sampleRate?: number;
  // channelConfig?: number; // numberOfChannel
  // audioFormat?: number; // bitDepth (ENCODING_PCM_16BIT --> 2)
  interval?: number;
}
