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
  sampleRate?: number;
  channelConfig?: number;
  audioFormat?: number;
  interval?: number;
}
