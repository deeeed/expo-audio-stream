import type { AlgorithmParams } from './core';

// Specific parameter interfaces for each algorithm
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
}

export interface MelBandsParams extends AlgorithmParams {
  sampleRate?: number;
  numberBands?: number;
  lowFrequencyBound?: number;
  highFrequencyBound?: number;
  inputSize?: number;
}

export interface PitchParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
}

export interface BarkBandsParams extends AlgorithmParams {
  sampleRate: number;
  numberBands: number;
}

export interface ERBBandsParams extends AlgorithmParams {
  sampleRate: number;
  numberBands: number;
}

export interface KeyParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
  hopSize?: number;
}

export interface TempoParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
}

export interface BeatsParams extends AlgorithmParams {
  sampleRate: number;
  minTempo?: number;
  maxTempo?: number;
}

export interface LoudnessParams extends AlgorithmParams {
  sampleRate?: number;
  windowSize?: number;
}

export interface SpectralFeaturesParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
}

export interface RhythmParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
}

export interface EnergyParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
}

export interface OnsetParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
}

export interface DissonanceParams extends AlgorithmParams {
  sampleRate: number;
}

export interface DynamicsParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
}

export interface HPCPParams extends AlgorithmParams {
  sampleRate: number;
  size?: number;
  referenceFrequency?: number;
}

export interface ChordParams extends AlgorithmParams {
  sampleRate: number;
}

export interface DanceabilityParams extends AlgorithmParams {
  sampleRate: number;
}

export interface ZeroCrossingRateParams extends AlgorithmParams {
  sampleRate?: number;
  frameSize?: number;
}

export interface TuningFrequencyParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
}

export interface AttackTimeParams extends AlgorithmParams {
  sampleRate: number;
  startAttackThreshold?: number;
  stopAttackThreshold?: number;
}

export interface InharmonicityParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
}

// Additional parameter interfaces can be added as needed
