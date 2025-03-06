export interface MusicGenreFeatures {
  MFCC: { mean: number[]; variance: number[] };
  MelBands: { mean: number[]; variance: number[] };
  SpectralCentroid: { mean: number };
  concatenatedFeatures: number[];
}

export interface SpeechEmotionFeatures {
  MFCC: { mean: number[]; variance: number[] };
  PitchYinFFT: { mean: [number, number] }; // [pitch_mean, confidence_mean]
  RollOff: { mean: number };
  concatenatedFeatures: number[];
}
