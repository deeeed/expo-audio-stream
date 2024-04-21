export interface AudioEventPayload {
  encoded?: string, 
  fileUri: string,
  from: number,
  deltaSize: number,
  totalSize: number,
  streamUuid: string,
};

export interface AudioStreamStatus {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  size: number;
  interval: number;
}

export interface RecordingOptions {
  // TODO align Android and IOS options
  sampleRate?: number;
  channelConfig?: number; // numberOfChannel
  audioFormat?: number; // bitDepth (ENCODING_PCM_16BIT --> 2)
  interval?: number;
}
