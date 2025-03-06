// MFCC features result
export interface MFCCResult {
  mfcc: number[];
  bands?: number[];
}

// Mel bands result
export interface MelBandsResult {
  melBands: number[];
}

// Musical key result
export interface KeyResult {
  key: string;
  scale: string;
  strength: number;
}

// Tempo result
export interface TempoResult {
  bpm: number;
}

// Beat tracking result
export interface BeatsResult {
  beats: number[];
  confidence: number;
}

// Loudness result
export interface LoudnessResult {
  loudness: number;
}

// Spectral features result
export interface SpectralFeaturesResult {
  centroid: number;
  rolloff: number;
  flux: number;
  complexity: number;
}

// Pitch detection result
export interface PitchResult {
  pitch: number;
  confidence: number;
}

// Rhythm features result
export interface RhythmFeaturesResult {
  bpm: number;
  danceability: number;
  beats: number[];
  onsets: number[];
}

// Energy analysis result
export interface EnergyResult {
  energy: number;
  rms: number;
}

// Onset detection result
export interface OnsetsResult {
  onsets: number[];
  onsetRate: number;
}

// Dissonance result
export interface DissonanceResult {
  dissonance: number;
}

// Dynamic complexity result
export interface DynamicsResult {
  dynamicComplexity: number;
  loudness: number;
}

// Harmonics result
export interface HarmonicsResult {
  hpcp: number[];
}

// Chord detection result
export interface ChordsResult {
  chords: string[];
  strength: number[];
}

// Silence detection result
export interface SilenceResult {
  silenceRate: number;
  threshold: number;
}

// Bark bands result
export interface BarkBandsResult {
  bands: number[];
}

// Danceability result
export interface DanceabilityResult {
  danceability: number;
}

// Zero crossing rate result
export interface ZeroCrossingRateResult {
  zeroCrossingRate: number;
}

// Tuning frequency result
export interface TuningFrequencyResult {
  tuningFrequency: number;
  tuningCents: number;
}

// ERB bands result
export interface ERBBandsResult {
  bands: number[];
}

// Attack time result
export interface AttackTimeResult {
  logAttackTime: number;
  attackStart: number;
  attackStop: number;
}

// Inharmonicity result
export interface InharmonicityResult {
  inharmonicity: number;
}

// Spectral contrast result
export interface SpectralContrastResult {
  contrast: number[];
  valleys: number[];
}

// Tristimulus result
export interface TristimulusResult {
  tristimulus: number[];
}

// Odd to even harmonic energy ratio result
export interface OddToEvenHarmonicEnergyRatioResult {
  oddToEvenHarmonicEnergyRatio: number;
}

// Spectrum result
export interface SpectrumResult {
  spectrum: number[];
  frequencies: number[];
}

// Novelty curve result
export interface NoveltyCurveResult {
  novelty: number[];
}

// Predominant melody result
export interface PredominantMelodyResult {
  pitch: number[];
  confidence: number[];
}

// Harmonic peaks result
export interface HarmonicPeaksResult {
  frequencies: number[];
  magnitudes: number[];
}

// Audio waveform result
export interface WaveformResult {
  waveform: number[];
}

// Combined audio feature result
export interface AudioFeaturesResult {
  // Basic features
  duration: number;
  sampleRate: number;
  channels: number;

  // Spectral features
  spectralCentroid?: number;
  spectralRolloff?: number;
  spectralFlux?: number;
  spectralContrast?: number[];

  // Tonal features
  key?: string;
  scale?: string;
  chords?: string[];
  tuningFrequency?: number;

  // Rhythm features
  bpm?: number;
  beats?: number[];
  danceability?: number;

  // Loudness and energy
  loudness?: number;
  energy?: number;
  rms?: number;

  // Additional descriptors
  onsets?: number[];
  mfcc?: number[];
  melBands?: number[];

  // Allow for additional dynamic properties
  [key: string]: number | string | number[] | string[] | undefined;
}
