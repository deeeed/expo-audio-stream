// Algorithm result interfaces for Essentia

// AfterMaxToBeforeMaxEnergyRatio result
export interface AfterMaxToBeforeMaxEnergyRatioResult {
  afterMaxToBeforeMaxEnergyRatio: number;
}

// AllPass result
export interface AllPassResult {
  signal: number[];
}

// AudioOnsetsMarker result
export interface AudioOnsetsMarkerResult {
  signal: number[];
}

// AutoCorrelation result
export interface AutoCorrelationResult {
  autoCorrelation: number[];
}

// BFCC result
export interface BFCCResult {
  bands: number[];
  bfcc: number[];
}

// BPF result
export interface BPFResult {
  y: number;
}

// BandPass and BandReject results
export interface FilteredSignalResult {
  signal: number[];
}

// BarkBands result
export interface BarkBandsResult {
  bands: number[];
}

// BeatTracker results
export interface BeatTrackerResult {
  ticks: number[];
  confidence?: number;
}

// Beatogram result
export interface BeatogramResult {
  beatogram: number[][];
}

// BeatsLoudness result
export interface BeatsLoudnessResult {
  loudness: number[];
  loudnessBandRatio: number[][];
}

// BinaryOperator result
export interface BinaryOperatorResult {
  array: number[];
}

// BpmHistogram result
export interface BpmHistogramResult {
  bpm: number;
  bpmCandidates: number[];
  bpmMagnitudes: number[];
  tempogram: any; // Array2D type, would need custom definition
  frameBpms: number[];
  ticks: number[];
  ticksMagnitude: number[];
  sinusoid: number[];
}

// BpmHistogramDescriptors result
export interface BpmHistogramDescriptorsResult {
  firstPeakBPM: number;
  firstPeakWeight: number;
  firstPeakSpread: number;
  secondPeakBPM: number;
  secondPeakWeight: number;
  secondPeakSpread: number;
  histogram: number[];
}

// BpmRubato result
export interface BpmRubatoResult {
  rubatoStart: number[];
  rubatoStop: number[];
  rubatoNumber: number;
}

// CartesianToPolar result
export interface CartesianToPolarResult {
  magnitude: number[];
  phase: number[];
}

// CentralMoments result
export interface CentralMomentsResult {
  centralMoments: number[];
}

// MFCC result
export interface MFCCResult {
  mfcc: number[];
  bands?: number[];
}

// MelBands result
export interface MelBandsResult {
  melBands: number[];
}

// Key result
export interface KeyResult {
  key: string;
  scale: string;
  strength: number;
}

// Tempo result
export interface TempoResult {
  bpm: number;
  confidence?: number;
}

// Beats result
export interface BeatsResult {
  beats: number[];
  confidence: number;
}

// Loudness result
export interface LoudnessResult {
  loudness: number;
  loudnessDB?: number;
}

// Spectral features result
export interface SpectralFeaturesResult {
  centroid: number;
  rolloff: number;
  flux: number;
  complexity: number;
}

// Pitch result
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
  beatLocations?: number[];
}

// Energy result
export interface EnergyResult {
  energy: number;
  rms: number;
}

// Onsets result
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

// Silence result
export interface SilenceResult {
  silenceRate: number;
  threshold: number;
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
  contrast: number[] | number[][];
  valleys: number[] | number[][];
  isFrameWise?: boolean;
}

// Tristimulus result
export interface TristimulusResult {
  tristimulus: number[];
}

// OddToEvenHarmonicEnergyRatio result
export interface OddToEvenHarmonicEnergyRatioResult {
  oddToEvenHarmonicEnergyRatio: number;
}

// Spectrum result
export interface SpectrumResult {
  spectrum: number[];
  frequencies?: number[];
}

// FFT result
export interface FFTResult {
  fft: { real: number[]; imag: number[] };
}

// Novelty curve result
export interface NoveltyCurveResult {
  novelty: number[];
}

// PredominantMelody result
export interface PredominantMelodyResult {
  pitch: number[];
  confidence: number[];
}

// HarmonicPeaks result
export interface HarmonicPeaksResult {
  frequencies: number[];
  magnitudes: number[];
}

// Waveform result
export interface WaveformResult {
  waveform: number[];
}

// GFCC result
export interface GFCCResult {
  gfcc: number[];
  bands?: number[];
}

// HPCP result
export interface HPCPResult {
  hpcp: number[];
}

// HFC result
export interface HFCResult {
  hfc: number;
}

// RMS result
export interface RMSResult {
  rms: number;
}

// RollOff result
export interface RollOffResult {
  rollOff: number;
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
  spectrum?: number[];
  mfcc?: number[];
  melBands?: number[];
  barkBands?: number[];
  erbBands?: number[];
  gfcc?: number[];

  // Tonal features
  key?: string;
  scale?: string;
  chords?: string[];
  tuningFrequency?: number;
  hpcp?: number[];
  inharmonicity?: number;
  dissonance?: number;

  // Rhythm features
  bpm?: number;
  beats?: number[];
  onsets?: number[];
  danceability?: number;
  ticks?: number[];

  // Loudness and energy
  loudness?: number;
  energy?: number;
  rms?: number;
  zeroCrossingRate?: number;
  dynamicComplexity?: number;

  // Additional descriptors
  pitch?: number;
  pitchConfidence?: number;
  logAttackTime?: number;

  // Allow for additional dynamic properties
  [key: string]: number | string | boolean | number[] | string[] | undefined;
}

/**
 * Result from computing a mel spectrogram
 */
export interface MelSpectrogramResult {
  success: boolean;
  data?: {
    bands: number[][];
    sampleRate: number;
    nMels: number;
    timeSteps: number;
    durationMs: number;
  };
  error?: { code: string; message: string; details?: string };
}

/**
 * Result type for Chroma feature extraction
 */
export interface ChromaResult {
  chroma: number[];
}

/**
 * Result type for Spectral Contrast feature extraction
 */
export interface SpectralContrastResult {
  contrast: number[] | number[][];
  valleys: number[] | number[][];
  isFrameWise?: boolean;
}

/**
 * Result type for Tonnetz feature extraction
 * Tonnetz features represent tonal content in a 6-dimensional space
 */
export interface TonnetzResult {
  /**
   * Tonnetz vector with 6 dimensions representing harmonic relationships:
   * [0]: Fifth relationship (perfect fifth)
   * [1]: Minor third relationship
   * [2]: Major third relationship
   * [3]: Minor triad center
   * [4]: Major triad center
   * [5]: Diminished triad center
   */
  tonnetz: number[] | number[][];

  /**
   * Whether the tonnetz data is frame-wise (multiple frames) or single-frame
   */
  isFrameWise?: boolean;

  /**
   * Mean of tonnetz vectors across all frames (only present if computeMean was true)
   */
  mean?: number[];
}

/**
 * Result type for Novelty Curve feature extraction
 */
export interface NoveltyCurveResult {
  noveltyCurve: number[];
}
