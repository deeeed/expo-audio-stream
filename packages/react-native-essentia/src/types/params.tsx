import type { AlgorithmParams } from './core';

// Common parameter interfaces
export interface SampleRateParam {
  sampleRate?: number;
}

export interface FrameSizeParam {
  frameSize?: number;
}

export interface HopSizeParam {
  hopSize?: number;
}

export interface WindowTypeParam {
  windowType?:
    | 'hamming'
    | 'hann'
    | 'triangular'
    | 'square'
    | 'blackmanharris62'
    | 'blackmanharris70'
    | 'blackmanharris74'
    | 'blackmanharris92';
}

// Algorithm-specific parameter interfaces

// AfterMaxToBeforeMaxEnergyRatio has no specific parameters

export interface AllPassParams extends AlgorithmParams {
  sampleRate: number;
  order?: number;
  cutoffFrequency?: number;
  bandwidth?: number;
}

export interface AudioOnsetsMarkerParams extends AlgorithmParams {
  type?: string;
  sampleRate: number;
  onsets?: number[];
}

export interface AutoCorrelationParams extends AlgorithmParams {
  normalization?: 'standard' | 'unbiased' | 'none';
  generalized?: boolean;
  frequencyDomainCompression?: number;
}

export interface BFCCParams extends AlgorithmParams {
  weighting?: string;
  sampleRate?: number;
  normalize?: string;
  lowFrequencyBound?: number;
  liftering?: number;
  type?: string;
  logType?: string;
  inputSize?: number;
  highFrequencyBound?: number;
  numberCoefficients?: number;
  numberBands?: number;
  dctType?: number;
}

export interface BPFParams extends AlgorithmParams {
  xPoints?: number[];
  yPoints?: number[];
}

export interface BandPassParams extends AlgorithmParams {
  sampleRate: number;
  cutoffFrequency?: number;
  bandwidth?: number;
}

export interface BandRejectParams extends AlgorithmParams {
  sampleRate: number;
  cutoffFrequency?: number;
  bandwidth?: number;
}

export interface BarkBandsParams extends AlgorithmParams {
  sampleRate: number;
  numberBands?: number;
}

export interface BeatTrackerParams extends AlgorithmParams {
  minTempo?: number;
  maxTempo?: number;
}

export interface BeatogramParams extends AlgorithmParams {
  size?: number;
}

export interface BeatsLoudnessParams extends AlgorithmParams {
  frequencyBands?: number[];
  beatWindowDuration?: number;
  sampleRate: number;
  beats?: number[];
  beatDuration?: number;
}

export interface BinaryOperatorParams extends AlgorithmParams {
  type?: 'add' | 'subtract' | 'multiply' | 'divide';
}

export interface BpmHistogramParams extends AlgorithmParams {
  zeroPadding?: number;
  minBpm?: number;
  maxBpm?: number;
  weightByMagnitude?: boolean;
  tempoChange?: number;
  overlap?: number;
  maxPeaks?: number;
  windowType?: string;
  constantTempo?: boolean;
  frameSize?: number;
  frameRate?: number;
  bpm?: number;
}

export interface BpmRubatoParams extends AlgorithmParams {
  tolerance?: number;
  shortRegionsMergingTime?: number;
  longRegionsPruningTime?: number;
}

export interface CentralMomentsParams extends AlgorithmParams {
  range?: number;
  mode?: string;
}

// Specific parameter interfaces for convenience methods

export interface SilenceRateParams extends AlgorithmParams {
  threshold: number;
  sampleRate?: number;
}

export interface MFCCParams extends AlgorithmParams {
  sampleRate?: number;
  numberCoefficients?: number;
  numberBands?: number;
  lowFrequencyBound?: number;
  highFrequencyBound?: number;
  inputSize?: number;
  weighting?: string;
  normalize?: string;
  liftering?: number;
  type?: string;
  logType?: string;
  dctType?: number;
}

export interface MelBandsParams extends AlgorithmParams {
  sampleRate?: number;
  numberBands?: number;
  lowFrequencyBound?: number;
  highFrequencyBound?: number;
  inputSize?: number;
  normalize?: string;
  type?: string;
  log?: boolean;
  warping?: boolean;
}

export interface PitchParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
  minFrequency?: number;
  maxFrequency?: number;
  algorithm?: 'yin' | 'yinFFT' | 'melodia';
  tolerance?: number;
  interpolate?: boolean;
}

export interface ERBBandsParams extends AlgorithmParams {
  sampleRate: number;
  numberBands?: number;
  lowFrequencyBound?: number;
  highFrequencyBound?: number;
  width?: number;
  type?: string;
}

export interface KeyParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
  hopSize?: number;
  profileType?:
    | 'diatonic'
    | 'temperley'
    | 'weichai'
    | 'tonictriad'
    | 'temperley2005'
    | 'edmm'
    | 'edma';
  usePolyphony?: boolean;
  useThreeChords?: boolean;
  numHarmonics?: number;
  slope?: number;
  pcpSize?: number;
}

export interface TempoParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
  hopSize?: number;
  minTempo?: number;
  maxTempo?: number;
  useOnsets?: boolean;
  useBands?: boolean;
  bpm?: number;
}

export interface BeatsParams extends AlgorithmParams {
  sampleRate: number;
  minTempo?: number;
  maxTempo?: number;
  method?: 'degara' | 'multifeature' | 'tempotap';
}

export interface LoudnessParams extends AlgorithmParams {
  sampleRate?: number;
  windowSize?: number;
  hopSize?: number;
  type?: 'EBU' | 'Vickers';
  momentary?: boolean;
  integrated?: boolean;
}

export interface SpectralFeaturesParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
  windowType?: string;
  magnitude?: boolean;
  phase?: boolean;
}

export interface RhythmParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
  method?: 'degara' | 'multifeature' | '2013';
  minTempo?: number;
  maxTempo?: number;
}

export interface EnergyParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
  hopSize?: number;
  windowType?: string;
}

export interface OnsetParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
  method?: 'hfc' | 'complex' | 'complex_phase' | 'flux' | 'melflux' | 'rms';
  threshold?: number;
  minInterOnsetInterval?: number;
}

export interface DissonanceParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
}

export interface DynamicsParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
  threshold?: number;
}

export interface HPCPParams extends AlgorithmParams {
  sampleRate: number;
  size?: number;
  referenceFrequency?: number;
  bandPreset?: boolean;
  weightType?: string;
  nonLinear?: boolean;
  windowSize?: number;
  harmonics?: number;
}

export interface ChordParams extends AlgorithmParams {
  sampleRate: number;
  hopSize?: number;
  frameSize?: number;
  windowType?: string;
  tuningFrequency?: number;
  useThreeChords?: boolean;
}

export interface DanceabilityParams extends AlgorithmParams {
  sampleRate: number;
  maxTau?: number;
  minTau?: number;
  tauMultiplier?: number;
}

export interface ZeroCrossingRateParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
  hopSize?: number;
  threshold?: number;
}

export interface TuningFrequencyParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
  resolution?: number;
}

export interface AttackTimeParams extends AlgorithmParams {
  sampleRate: number;
  startAttackThreshold?: number;
  stopAttackThreshold?: number;
  maximumAttackTime?: number;
  minimumAttackTime?: number;
}

export interface InharmonicityParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
  threshold?: number;
}

export interface SpectrumParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
  hopSize?: number;
  windowType?: string;
  normalized?: boolean;
}

export interface FFTParams extends AlgorithmParams {
  size?: number;
  negativeFrequencies?: boolean;
}

export interface TriangularBandsParams extends AlgorithmParams {
  sampleRate: number;
  numberBands?: number;
  lowFrequencyBound?: number;
  highFrequencyBound?: number;
  log?: boolean;
  type?: string;
  normalize?: string;
}

export interface GFCCParams extends AlgorithmParams {
  sampleRate?: number;
  numberBands?: number;
  numberCoefficients?: number;
  lowFrequencyBound?: number;
  highFrequencyBound?: number;
  type?: string;
}

export interface HFCParams extends AlgorithmParams {
  sampleRate?: number;
  type?: 'Masri' | 'Jensen' | 'Brossier';
}

export interface RMSParams extends AlgorithmParams {
  frameSize?: number;
  hopSize?: number;
}

export interface RollOffParams extends AlgorithmParams {
  sampleRate?: number;
  rolloffPercentage?: number;
}
