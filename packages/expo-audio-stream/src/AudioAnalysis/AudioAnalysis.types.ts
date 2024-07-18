export interface AudioStreamStatus {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
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
  minAmplitude: number;
  maxAmplitude: number;
  zcr: number;
  spectralCentroid: number;
  spectralFlatness: number;
  spectralRolloff: number;
  spectralBandwidth: number;
  chromagram: number[];
  tempo: number;
  hnr: number;
}

export interface AudioFeaturesOptions {
  energy?: boolean;
  mfcc?: boolean;
  rms?: boolean;
  zcr?: boolean;
  spectralCentroid?: boolean;
  spectralFlatness?: boolean;
  spectralRolloff?: boolean;
  spectralBandwidth?: boolean;
  chromagram?: boolean;
  tempo?: boolean;
  hnr?: boolean;
}

export interface DataPoint {
  id: number;
  amplitude: number;
  activeSpeech?: boolean;
  dB?: number;
  silent?: boolean;
  features?: AudioFeatures;
  startTime?: number;
  endTime?: number;
  // start / end position in bytes
  startPosition?: number;
  endPosition?: number;
  // number of audio samples for this point (samples size depends on bit depth)
  samples?: number;
  // Id of the speaker for this point
  speaker?: number;
}

export interface AudioAnalysisData {
  pointsPerSecond: number; // How many consolidated value per second
  durationMs: number; // Duration of the audio in milliseconds
  bitDepth: number; // Bit depth of the audio
  samples: number; // Size of the audio in bytes
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
