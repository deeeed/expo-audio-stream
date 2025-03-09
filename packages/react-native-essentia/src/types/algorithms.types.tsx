import type { AlgorithmParams } from './core.types';

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

export interface WindowTypeParam extends AlgorithmParams {
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

export interface MelSpectrogramParams {
  /**
   * The size of each frame in samples
   * @default 2048
   */
  frameSize?: number;

  /**
   * The hop size between frames in samples
   * @default 1024
   */
  hopSize?: number;

  /**
   * The number of mel bands
   * @default 40
   */
  nMels?: number;

  /**
   * The minimum frequency for mel bands in Hz
   * @default 0
   */
  fMin?: number;

  /**
   * The maximum frequency for mel bands in Hz
   * @default 22050
   */
  fMax?: number;

  /**
   * The type of window function to apply
   * @default "hann"
   */
  windowType?: string;

  /**
   * Whether to normalize the mel bands
   * @default true
   */
  normalize?: boolean;

  /**
   * Whether to apply log scaling to the mel bands
   * @default true
   */
  logScale?: boolean;

  /**
   * The sample rate of the audio in Hz
   */
  sampleRate?: number;
}

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

// ----- SpectralContrast -----
//  LOG  Inputs:
//  LOG    - spectrum (NSt6__ndk16vectorIfNS_9allocatorIfEEEE)
//  LOG  Outputs:
//  LOG    - spectralContrast (NSt6__ndk16vectorIfNS_9allocatorIfEEEE)
//  LOG    - spectralValley (NSt6__ndk16vectorIfNS_9allocatorIfEEEE)
//  LOG  Parameters:
//  LOG    - staticDistribution: 0.15000000596046448
//  LOG    - sampleRate: 22050
//  LOG    - numberBands: 6
//  LOG    - neighbourRatio: 0.4000000059604645
//  LOG    - highFrequencyBound: 11000
//  LOG    - lowFrequencyBound: 20
//  LOG    - frameSize: 2048
//  LOG
export interface SpectralContrastParams {
  staticDistribution?: number; // 0.15000000596046448
  sampleRate?: number; // 22050
  numberBands?: number; // 6
  neighbourRatio?: number; // 0.4000000059604645
  highFrequencyBound?: number; // 11000
  lowFrequencyBound?: number; // 20
  frameSize?: number; // 2048
}

// ----- Chromagram -----
//  LOG  Inputs:
//  LOG    - frame (NSt6__ndk16vectorIfNS_9allocatorIfEEEE)
//  LOG  Outputs:
//  LOG    - chromagram (NSt6__ndk16vectorIfNS_9allocatorIfEEEE)
//  LOG  Parameters:
//  LOG    - windowType: "hann"
//  LOG    - zeroPhase: true
//  LOG    - scale: 1
//  LOG    - threshold: 0.009999999776482582
//  LOG    - sampleRate: 44100
//  LOG    - numberBins: 84
//  LOG    - minimumKernelSize: 4
//  LOG    - normalizeType: "unit_max"
//  LOG    - minFrequency: 32.70000076293945
//  LOG    - binsPerOctave: 12
export interface ChromagramParams extends AlgorithmParams {
  windowType?: string; // "hann"
  zeroPhase?: boolean; // true
  scale?: number; // 1
  threshold?: number; // 0.009999999776482582
  sampleRate?: number; // 44100
  numberBins?: number; // 84
  minimumKernelSize?: number; // 4
  normalizeType?: string; // "unit_max"
  minFrequency?: number; // 32.70000076293945
  binsPerOctave?: number; // 12
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
  // LOG    - weighting: "warping"
  // LOG    - warpingFormula: "htkMel"
  // LOG    - type: "power"
  // LOG    - sampleRate: 44100
  // LOG    - normalize: "unit_sum"
  // LOG    - lowFrequencyBound: 0
  // LOG    - liftering: 0
  // LOG    - silenceThreshold: 1.000000013351432e-10
  // LOG    - logType: "dbamp"
  // LOG    - inputSize: 1025
  // LOG    - highFrequencyBound: 11000
  // LOG    - numberCoefficients: 13
  // LOG    - numberBands: 40
  // LOG    - dctType: 2
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

export interface TonnetzParams extends AlgorithmParams {
  frameSize?: number;
  hopSize?: number;
  hpcpSize?: number;
  referenceFrequency?: number;
  computeMean?: boolean;
  framewise?: boolean;
}

export interface NoveltyCurveParams extends AlgorithmParams {
  frameSize?: number;
  hopSize?: number;
  kernelSize?: number;
  normalize?: boolean;
  weightCurve?: string | number[];
  sampleRate?: number;
}

export interface DCRemovalParams extends AlgorithmParams {
  sampleRate?: number;
  cutoffFrequency?: number;
}

export interface HighPassParams extends AlgorithmParams {
  sampleRate: number;
  cutoffFrequency: number;
  order?: number;
}

export interface LowPassParams extends AlgorithmParams {
  sampleRate: number;
  cutoffFrequency: number;
  order?: number;
}

export interface PitchMelodiaParams extends AlgorithmParams {
  sampleRate: number;
  frameSize?: number;
  hopSize?: number;
  minFrequency?: number;
  maxFrequency?: number;
  voicingTolerance?: number;
  voiceVibrato?: boolean;
  timeContinuity?: number;
  minDuration?: number;
}

export interface PowerSpectrumParams extends AlgorithmParams {
  size?: number;
  normalize?: boolean;
}

export interface TrimmerParams extends AlgorithmParams {
  startTime?: number;
  endTime?: number;
  sampleRate: number;
}

export interface OnsetDetectionParams extends AlgorithmParams {
  method?: 'hfc' | 'complex' | 'complex_phase' | 'flux' | 'melflux' | 'rms';
  sampleRate: number;
}

export const ESSENTIA_ALGORITHMS = {
  // Standard Essentia algorithms
  AfterMaxToBeforeMaxEnergyRatio: 'AfterMaxToBeforeMaxEnergyRatio',
  AllPass: 'AllPass',
  AudioOnsetsMarker: 'AudioOnsetsMarker',
  AutoCorrelation: 'AutoCorrelation',
  BFCC: 'BFCC',
  BPF: 'BPF',
  BandPass: 'BandPass',
  BandReject: 'BandReject',
  BarkBands: 'BarkBands',
  BeatTrackerDegara: 'BeatTrackerDegara',
  BeatTrackerMultiFeature: 'BeatTrackerMultiFeature',
  Beatogram: 'Beatogram',
  BeatsLoudness: 'BeatsLoudness',
  BinaryOperator: 'BinaryOperator',
  BinaryOperatorStream: 'BinaryOperatorStream',
  BpmHistogram: 'BpmHistogram',
  BpmHistogramDescriptors: 'BpmHistogramDescriptors',
  BpmRubato: 'BpmRubato',
  CartesianToPolar: 'CartesianToPolar',
  CentralMoments: 'CentralMoments',
  Chroma: 'Chroma',
  Dissonance: 'Dissonance',
  DynamicComplexity: 'DynamicComplexity',
  Energy: 'Energy',
  ERBBands: 'ERBBands',
  FFT: 'FFT',
  Flux: 'Flux',
  FrameCutter: 'FrameCutter',
  GFCC: 'GFCC',
  HFC: 'HFC',
  HPCP: 'HPCP',
  Inharmonicity: 'Inharmonicity',
  Key: 'Key',
  LogAttackTime: 'LogAttackTime',
  Loudness: 'Loudness',
  MFCC: 'MFCC',
  MelBands: 'MelBands',
  NoveltyCurve: 'NoveltyCurve',
  OnsetRate: 'OnsetRate',
  PitchYin: 'PitchYin',
  PitchYinFFT: 'PitchYinFFT',
  PercivalBpmEstimator: 'PercivalBpmEstimator',
  RMS: 'RMS',
  RollOff: 'RollOff',
  SilenceRate: 'SilenceRate',
  Spectrum: 'Spectrum',
  SpectralCentroidTime: 'SpectralCentroidTime',
  SpectralComplexity: 'SpectralComplexity',
  SpectralContrast: 'SpectralContrast',
  TuningFrequency: 'TuningFrequency',
  Windowing: 'Windowing',
  ZeroCrossingRate: 'ZeroCrossingRate',

  // Custom algorithms
  Tonnetz: 'Tonnetz',

  // Additional algorithms to add
  Centroid: 'Centroid',
  ChordsDescriptors: 'ChordsDescriptors',
  ChordsDetection: 'ChordsDetection',
  ChordsDetectionBeats: 'ChordsDetectionBeats',
  Chromagram: 'Chromagram',
  ClickDetector: 'ClickDetector',
  Clipper: 'Clipper',
  ConstantQ: 'ConstantQ',
  Crest: 'Crest',
  CrossCorrelation: 'CrossCorrelation',
  CubicSpline: 'CubicSpline',
  DCRemoval: 'DCRemoval',
  DCT: 'DCT',
  Danceability: 'Danceability',
  Decrease: 'Decrease',
  Derivative: 'Derivative',
  DerivativeSFX: 'DerivativeSFX',
  DiscontinuityDetector: 'DiscontinuityDetector',
  DistributionShape: 'DistributionShape',
  Duration: 'Duration',
  EffectiveDuration: 'EffectiveDuration',
  EnergyBand: 'EnergyBand',
  EnergyBandRatio: 'EnergyBandRatio',
  Entropy: 'Entropy',
  Envelope: 'Envelope',
  EqualLoudness: 'EqualLoudness',
  Extractor: 'Extractor',
  FFTC: 'FFTC',
  FadeDetection: 'FadeDetection',
  FalseStereoDetector: 'FalseStereoDetector',
  Flatness: 'Flatness',
  FlatnessDB: 'FlatnessDB',
  FlatnessSFX: 'FlatnessSFX',
  FrameToReal: 'FrameToReal',
  FrequencyBands: 'FrequencyBands',
  GapsDetector: 'GapsDetector',
  GeometricMean: 'GeometricMean',
  HarmonicBpm: 'HarmonicBpm',
  HarmonicMask: 'HarmonicMask',
  HarmonicModelAnal: 'HarmonicModelAnal',
  HarmonicPeaks: 'HarmonicPeaks',
  HighPass: 'HighPass',
  HighResolutionFeatures: 'HighResolutionFeatures',
  Histogram: 'Histogram',
  HprModelAnal: 'HprModelAnal',
  HpsModelAnal: 'HpsModelAnal',
  HumDetector: 'HumDetector',
  IDCT: 'IDCT',
  IFFT: 'IFFT',
  IFFTC: 'IFFTC',
  IIR: 'IIR',
  InstantPower: 'InstantPower',
  Intensity: 'Intensity',
  KeyExtractor: 'KeyExtractor',
  LPC: 'LPC',
  Larm: 'Larm',
  Leq: 'Leq',
  LevelExtractor: 'LevelExtractor',
  LogSpectrum: 'LogSpectrum',
  LoopBpmConfidence: 'LoopBpmConfidence',
  LoopBpmEstimator: 'LoopBpmEstimator',
  LoudnessEBUR128: 'LoudnessEBUR128',
  LoudnessVickers: 'LoudnessVickers',
  LowLevelSpectralEqloudExtractor: 'LowLevelSpectralEqloudExtractor',
  LowLevelSpectralExtractor: 'LowLevelSpectralExtractor',
  LowPass: 'LowPass',
  Magnitude: 'Magnitude',
  MaxFilter: 'MaxFilter',
  MaxMagFreq: 'MaxMagFreq',
  MaxToTotal: 'MaxToTotal',
  Mean: 'Mean',
  Median: 'Median',
  MedianFilter: 'MedianFilter',
  Meter: 'Meter',
  MinToTotal: 'MinToTotal',
  MonoMixer: 'MonoMixer',
  MovingAverage: 'MovingAverage',
  MultiPitchKlapuri: 'MultiPitchKlapuri',
  MultiPitchMelodia: 'MultiPitchMelodia',
  Multiplexer: 'Multiplexer',
  NNLSChroma: 'NNLSChroma',
  NSGConstantQ: 'NSGConstantQ',
  NSGIConstantQ: 'NSGIConstantQ',
  NoiseAdder: 'NoiseAdder',
  NoiseBurstDetector: 'NoiseBurstDetector',
  NoveltyCurveFixedBpmEstimator: 'NoveltyCurveFixedBpmEstimator',
  OddToEvenHarmonicEnergyRatio: 'OddToEvenHarmonicEnergyRatio',
  OnsetDetection: 'OnsetDetection',
  OnsetDetectionGlobal: 'OnsetDetectionGlobal',
  Onsets: 'Onsets',
  OverlapAdd: 'OverlapAdd',
  PCA: 'PCA',
  Panning: 'Panning',
  PeakDetection: 'PeakDetection',
  PercivalEnhanceHarmonics: 'PercivalEnhanceHarmonics',
  PercivalEvaluatePulseTrains: 'PercivalEvaluatePulseTrains',
  PitchContourSegmentation: 'PitchContourSegmentation',
  PitchContours: 'PitchContours',
  PitchContoursMelody: 'PitchContoursMelody',
  PitchContoursMonoMelody: 'PitchContoursMonoMelody',
  PitchContoursMultiMelody: 'PitchContoursMultiMelody',
  PitchFilter: 'PitchFilter',
  PitchMelodia: 'PitchMelodia',
  PitchSalience: 'PitchSalience',
  PitchSalienceFunction: 'PitchSalienceFunction',
  PitchSalienceFunctionPeaks: 'PitchSalienceFunctionPeaks',
  PitchYinProbabilistic: 'PitchYinProbabilistic',
  PitchYinProbabilities: 'PitchYinProbabilities',
  PitchYinProbabilitiesHMM: 'PitchYinProbabilitiesHMM',
  PolarToCartesian: 'PolarToCartesian',
  PoolAggregator: 'PoolAggregator',
  PowerMean: 'PowerMean',
  PowerSpectrum: 'PowerSpectrum',
  PredominantPitchMelodia: 'PredominantPitchMelodia',
  RawMoments: 'RawMoments',
  ReplayGain: 'ReplayGain',
  ResampleFFT: 'ResampleFFT',
  RhythmDescriptors: 'RhythmDescriptors',
  RhythmExtractor: 'RhythmExtractor',
  RhythmExtractor2013: 'RhythmExtractor2013',
  RhythmTransform: 'RhythmTransform',
  SBic: 'SBic',
  SNR: 'SNR',
  SaturationDetector: 'SaturationDetector',
  Scale: 'Scale',
  SineModelAnal: 'SineModelAnal',
  SineModelSynth: 'SineModelSynth',
  SineSubtraction: 'SineSubtraction',
  SingleBeatLoudness: 'SingleBeatLoudness',
  SingleGaussian: 'SingleGaussian',
  Slicer: 'Slicer',
  SpectralPeaks: 'SpectralPeaks',
  SpectralWhitening: 'SpectralWhitening',
  SpectrumCQ: 'SpectrumCQ',
  SpectrumToCent: 'SpectrumToCent',
  Spline: 'Spline',
  SprModelAnal: 'SprModelAnal',
  SprModelSynth: 'SprModelSynth',
  SpsModelAnal: 'SpsModelAnal',
  SpsModelSynth: 'SpsModelSynth',
  StartStopCut: 'StartStopCut',
  StartStopSilence: 'StartStopSilence',
  StereoDemuxer: 'StereoDemuxer',
  StereoMuxer: 'StereoMuxer',
  StereoTrimmer: 'StereoTrimmer',
  StochasticModelAnal: 'StochasticModelAnal',
  StochasticModelSynth: 'StochasticModelSynth',
  StrongDecay: 'StrongDecay',
  StrongPeak: 'StrongPeak',
  SuperFluxExtractor: 'SuperFluxExtractor',
  SuperFluxNovelty: 'SuperFluxNovelty',
  SuperFluxPeaks: 'SuperFluxPeaks',
  TCToTotal: 'TCToTotal',
  TempoScaleBands: 'TempoScaleBands',
  TempoTap: 'TempoTap',
  TempoTapDegara: 'TempoTapDegara',
  TempoTapMaxAgreement: 'TempoTapMaxAgreement',
  TempoTapTicks: 'TempoTapTicks',
  TonalExtractor: 'TonalExtractor',
  TonicIndianArtMusic: 'TonicIndianArtMusic',
  TriangularBands: 'TriangularBands',
  TriangularBarkBands: 'TriangularBarkBands',
  Trimmer: 'Trimmer',
  Tristimulus: 'Tristimulus',
  TruePeakDetector: 'TruePeakDetector',
  TuningFrequencyExtractor: 'TuningFrequencyExtractor',
  UnaryOperator: 'UnaryOperator',
  UnaryOperatorStream: 'UnaryOperatorStream',
  Variance: 'Variance',
  Vibrato: 'Vibrato',
  Viterbi: 'Viterbi',
  WarpedAutoCorrelation: 'WarpedAutoCorrelation',
  Welch: 'Welch',
} as const;

/**
 * Type for all Essentia algorithm names
 */
export type EssentiaAlgorithm =
  (typeof ESSENTIA_ALGORITHMS)[keyof typeof ESSENTIA_ALGORITHMS];

/**
 * Type to map algorithms to their parameter types
 */
export type AlgorithmParamMap = {
  [ESSENTIA_ALGORITHMS.AfterMaxToBeforeMaxEnergyRatio]: AlgorithmParams;
  [ESSENTIA_ALGORITHMS.AllPass]: AllPassParams;
  [ESSENTIA_ALGORITHMS.AudioOnsetsMarker]: AudioOnsetsMarkerParams;
  [ESSENTIA_ALGORITHMS.AutoCorrelation]: AutoCorrelationParams;
  [ESSENTIA_ALGORITHMS.BFCC]: BFCCParams;
  [ESSENTIA_ALGORITHMS.BPF]: BPFParams;
  [ESSENTIA_ALGORITHMS.BandPass]: BandPassParams;
  [ESSENTIA_ALGORITHMS.BandReject]: BandRejectParams;
  [ESSENTIA_ALGORITHMS.BarkBands]: BarkBandsParams;
  [ESSENTIA_ALGORITHMS.BeatTrackerDegara]: BeatTrackerParams;
  [ESSENTIA_ALGORITHMS.BeatTrackerMultiFeature]: BeatTrackerParams;
  [ESSENTIA_ALGORITHMS.MFCC]: MFCCParams;
  [ESSENTIA_ALGORITHMS.MelBands]: MelBandsParams;
  [ESSENTIA_ALGORITHMS.Key]: KeyParams;
  [ESSENTIA_ALGORITHMS.Spectrum]: SpectrumParams;
  [ESSENTIA_ALGORITHMS.FFT]: FFTParams;
  [ESSENTIA_ALGORITHMS.Windowing]: WindowTypeParam;
  [ESSENTIA_ALGORITHMS.Tonnetz]: TonnetzParams;
  [ESSENTIA_ALGORITHMS.NoveltyCurve]: NoveltyCurveParams;
  // Add mappings for all other algorithms

  // Additional parameter interfaces
  [ESSENTIA_ALGORITHMS.DCRemoval]: DCRemovalParams;
  [ESSENTIA_ALGORITHMS.HighPass]: HighPassParams;
  [ESSENTIA_ALGORITHMS.LowPass]: LowPassParams;
  [ESSENTIA_ALGORITHMS.PitchMelodia]: PitchMelodiaParams;
  [ESSENTIA_ALGORITHMS.PowerSpectrum]: PowerSpectrumParams;
  [ESSENTIA_ALGORITHMS.Trimmer]: TrimmerParams;
  [ESSENTIA_ALGORITHMS.OnsetDetection]: OnsetDetectionParams;

  // Default for algorithms without specific param types
  [key: string]: AlgorithmParams;
};

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
