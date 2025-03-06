export interface MusicGenreFeatures {
  MFCC: { mean: number[]; variance: number[] };
  MelBands: { mean: number[]; variance: number[] };
  SpectralCentroid: { mean: number };
  concatenatedFeatures: number[];
}
