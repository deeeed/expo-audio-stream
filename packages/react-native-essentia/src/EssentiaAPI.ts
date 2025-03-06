import { NativeModules } from 'react-native';
import { LINKING_ERROR } from './constants';
import type {
  AlgorithmParams,
  AttackTimeResult,
  BarkBandsParams,
  BarkBandsResult,
  BeatsResult,
  ChordsResult,
  DanceabilityResult,
  DissonanceResult,
  DynamicsResult,
  ERBBandsParams,
  ERBBandsResult,
  EnergyResult,
  EssentiaInterface,
  EssentiaResult,
  FeatureConfig,
  HarmonicsResult,
  InharmonicityResult,
  KeyResult,
  LoudnessResult,
  MFCCParams,
  MFCCResult,
  MelBandsParams,
  MelBandsResult,
  OnsetsResult,
  PitchParams,
  PitchResult,
  RhythmFeaturesResult,
  SilenceRateParams,
  SilenceResult,
  SpectralFeaturesResult,
  TempoResult,
  TuningFrequencyResult,
  ZeroCrossingRateResult,
} from './types';

// Get the native module
const Essentia = NativeModules.Essentia
  ? NativeModules.Essentia
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Implement the API class
class EssentiaAPI implements EssentiaInterface {
  /**
   * Initializes the Essentia library, preparing it for use.
   * @returns A Promise that resolves to true on success or rejects with an error if initialization fails
   */
  async initialize(): Promise<boolean> {
    try {
      return await Essentia.initialize();
    } catch (error) {
      console.error('Essentia initialization error:', error);
      throw error;
    }
  }

  /**
   * Gets the version of the Essentia library
   * @returns A Promise that resolves to the version string
   */
  async getVersion(): Promise<string> {
    try {
      return await Essentia.getVersion();
    } catch (error) {
      console.error('Essentia getVersion error:', error);
      throw error;
    }
  }

  /**
   * Sets the raw audio data (PCM samples) and sample rate for subsequent algorithm processing.
   * @param pcmData Float32Array of audio samples
   * @param sampleRate Sampling rate in Hz (e.g., 44100)
   * @returns A Promise that resolves to true on success or rejects with an error if data cannot be set
   */
  async setAudioData(
    pcmData: Float32Array,
    sampleRate: number
  ): Promise<boolean> {
    try {
      // Convert Float32Array to regular array for React Native bridge
      const pcmArray = Array.from(pcmData);
      return await Essentia.setAudioData(pcmArray, sampleRate);
    } catch (error) {
      console.error('Essentia setAudioData error:', error);
      throw error;
    }
  }

  /**
   * Executes a specified Essentia algorithm on the set audio data, using provided parameters.
   * @param algorithm Name of the Essentia algorithm (e.g., "MFCC", "Spectrum", "Key")
   * @param params An object containing key-value pairs for algorithm configuration
   * @returns A Promise that resolves to an object containing the algorithm's output
   */
  async executeAlgorithm(
    algorithm: string,
    params: AlgorithmParams = {}
  ): Promise<any> {
    try {
      return await Essentia.executeAlgorithm(algorithm, params);
    } catch (error) {
      console.error(`Essentia algorithm error (${algorithm}):`, error);
      throw error;
    }
  }

  /**
   * Executes multiple algorithms as a batch, optimizing by reusing intermediate results.
   * @param algorithms Array of algorithm configurations to execute
   * @returns A Promise that resolves to an object containing all algorithms' outputs
   */
  async executeBatch(algorithms: FeatureConfig[]): Promise<any> {
    try {
      if (!algorithms || algorithms.length === 0) {
        throw new Error('Algorithm list cannot be empty');
      }
      return await Essentia.executeBatch(algorithms);
    } catch (error) {
      console.error('Essentia batch execution error:', error);
      throw error;
    }
  }

  async testConnection(): Promise<string> {
    try {
      return await Essentia.testConnection();
    } catch (error) {
      console.error('Essentia testConnection error:', error);
      throw error;
    }
  }

  /**
   * Gets information about an Essentia algorithm, including its inputs, outputs, and parameters.
   * @param algorithm Name of the Essentia algorithm to get information about
   * @returns A Promise that resolves to an object containing algorithm information
   */
  async getAlgorithmInfo(algorithm: string): Promise<any> {
    try {
      return await Essentia.getAlgorithmInfo(algorithm);
    } catch (error) {
      console.error(`Essentia getAlgorithmInfo error (${algorithm}):`, error);
      throw error;
    }
  }

  /**
   * Gets a list of all available Essentia algorithms.
   * @returns A Promise that resolves to an array of algorithm names
   */
  async getAllAlgorithms(): Promise<any> {
    try {
      return await Essentia.getAllAlgorithms();
    } catch (error) {
      console.error('Essentia getAllAlgorithms error:', error);
      throw error;
    }
  }

  /**
   * Extracts multiple audio features in a single batch operation.
   * @param features Array of feature configurations, each with a name and optional parameters
   * @returns A Promise that resolves to an object containing all extracted features
   */
  async extractFeatures(features: FeatureConfig[]): Promise<any> {
    try {
      if (!features || features.length === 0) {
        throw new Error('Feature list cannot be empty');
      }
      // Validate feature configurations
      features.forEach((feature) => {
        if (!feature.name) {
          throw new Error('Each feature must have a name');
        }
      });
      return await Essentia.extractFeatures(features);
    } catch (error) {
      console.error('Essentia feature extraction error:', error);
      throw error;
    }
  }

  /**
   * Convenience method to extract MFCC features.
   * @param params Parameters for MFCC extraction
   * @returns A Promise that resolves to the MFCC features
   */
  async extractMFCC(
    params: MFCCParams = {}
  ): Promise<MFCCResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'MFCC',
        params,
      },
    ]);
    return result.data?.mfcc
      ? { mfcc: result.data.mfcc, bands: result.data.mfcc_bands }
      : result;
  }

  /**
   * Convenience method to extract Mel spectrogram.
   * @param params Parameters for Mel extraction
   * @returns A Promise that resolves to the Mel bands
   */
  async extractMelBands(
    params: MelBandsParams = {}
  ): Promise<MelBandsResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'MelBands',
        params,
      },
    ]);
    return result.data?.mel_bands
      ? { melBands: result.data.mel_bands }
      : result;
  }

  /**
   * Convenience method to extract musical key.
   * @param params Parameters for key detection
   * @returns A Promise that resolves to the detected key information
   */
  async extractKey(
    params: AlgorithmParams = {}
  ): Promise<KeyResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'Key',
        params,
      },
    ]);
    if (result.data?.key && result.data?.scale && result.data?.strength) {
      return {
        key: result.data.key,
        scale: result.data.scale,
        strength: result.data.strength,
      };
    }

    return result;
  }

  /**
   * Extracts tempo information from the loaded audio
   * @param params Parameters for tempo extraction
   * @returns A Promise that resolves to the tempo information (BPM)
   */
  async extractTempo(
    params: AlgorithmParams = {}
  ): Promise<TempoResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'PercivalBpmEstimator',
        params,
      },
    ]);
    return result.data?.bpm ? { bpm: result.data.bpm } : result;
  }

  /**
   * Detects beats in the loaded audio
   * @param params Parameters for beat tracking
   * @returns A Promise that resolves to beat positions (in seconds) and confidence
   */
  async extractBeats(
    params: AlgorithmParams = {}
  ): Promise<BeatsResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'BeatTrackerMultiFeature',
        params,
      },
    ]);
    if (result.data?.ticks && Array.isArray(result.data.ticks)) {
      return {
        beats: result.data.ticks,
        confidence: result.data.confidence || 0,
      };
    }

    return result;
  }

  /**
   * Analyzes loudness of the loaded audio
   * @param params Parameters for loudness analysis
   * @returns A Promise that resolves to loudness values
   */
  async extractLoudness(
    params: AlgorithmParams = {}
  ): Promise<LoudnessResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'Loudness',
        params,
      },
    ]);
    return result.data?.loudness ? { loudness: result.data.loudness } : result;
  }

  /**
   * Extracts spectral features (centroid, rolloff, flux, etc.)
   * @param params Parameters for spectral analysis
   * @returns A Promise that resolves to spectral features
   */
  async extractSpectralFeatures(
    params: AlgorithmParams = {}
  ): Promise<SpectralFeaturesResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      { name: 'SpectralCentroidTime', params },
      { name: 'RollOff', params },
      { name: 'Flux', params },
      { name: 'SpectralComplexity', params },
    ]);
    if (result.success && result.data) {
      return {
        centroid: result.data.centroid,
        rolloff: result.data.rolloff,
        flux: result.data.flux,
        complexity: result.data.spectralComplexity,
      };
    }

    return result;
  }

  /**
   * Detects the predominant pitch/melody from the loaded audio
   * @param params Parameters for pitch detection
   * @returns A Promise that resolves to pitch information
   */
  async extractPitch(
    params: PitchParams = { sampleRate: 44100 }
  ): Promise<PitchResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'PitchYinFFT',
        params,
      },
    ]);
    if (result.data?.pitch && result.data?.pitchConfidence) {
      return {
        pitch: result.data.pitch,
        confidence: result.data.pitchConfidence,
      };
    }

    return result;
  }

  /**
   * Extracts rhythm features from the loaded audio
   * @param params Parameters for rhythm analysis
   * @returns A Promise that resolves to rhythm descriptors
   */
  async extractRhythmFeatures(
    params: AlgorithmParams = {}
  ): Promise<RhythmFeaturesResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'RhythmDescriptors',
        params,
      },
    ]);
    if (result.success && result.data) {
      return {
        bpm: result.data.bpm,
        danceability: result.data.danceability,
        beats: result.data.beats,
        onsets: result.data.onsets,
      };
    }

    return result;
  }

  /**
   * Analyzes signal energy and RMS (Root Mean Square)
   * @param params Parameters for energy analysis
   * @returns A Promise that resolves to energy and RMS values
   */
  async extractEnergy(
    params: AlgorithmParams = {}
  ): Promise<EnergyResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      { name: 'Energy', params },
      { name: 'RMS', params },
    ]);
    if (result.success && result.data) {
      return {
        energy: result.data.energy,
        rms: result.data.rms,
      };
    }

    return result;
  }

  /**
   * Extracts onset information (where new notes or sounds begin)
   * @param params Parameters for onset detection
   * @returns A Promise that resolves to onset times and features
   */
  async extractOnsets(
    params: AlgorithmParams = {}
  ): Promise<OnsetsResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'OnsetRate',
        params,
      },
    ]);
    if (result.data?.onsets && Array.isArray(result.data.onsets)) {
      return {
        onsets: result.data.onsets,
        onsetRate: result.data.onsetRate || 0,
      };
    }

    return result;
  }

  /**
   * Detects dissonance (roughness of sound) in the audio
   * @param params Parameters for dissonance analysis
   * @returns A Promise that resolves to dissonance value
   */
  async extractDissonance(
    params: AlgorithmParams = {}
  ): Promise<DissonanceResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'Dissonance',
        params,
      },
    ]);
    return result.data?.dissonance
      ? { dissonance: result.data.dissonance }
      : result;
  }

  /**
   * Analyzes dynamic properties of the audio
   * @param params Parameters for dynamic analysis
   * @returns A Promise that resolves to dynamic complexity measures
   */
  async extractDynamics(
    params: AlgorithmParams = {}
  ): Promise<DynamicsResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'DynamicComplexity',
        params,
      },
    ]);
    if (
      result.data?.dynamicComplexity !== undefined &&
      result.data?.loudness !== undefined
    ) {
      return {
        dynamicComplexity: result.data.dynamicComplexity,
        loudness: result.data.loudness,
      };
    }

    return result;
  }

  /**
   * Extracts harmonics-related features using HPCP (Harmonic Pitch Class Profile)
   * @param params Parameters for harmonic analysis
   * @returns A Promise that resolves to harmonic profile data
   */
  async extractHarmonics(
    params: AlgorithmParams = {}
  ): Promise<HarmonicsResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'HPCP',
        params: {
          sampleRate: params.sampleRate || 44100,
          ...params,
        },
      },
    ]);
    return result.data?.hpcp ? { hpcp: result.data.hpcp } : result;
  }

  /**
   * Detects chords in the audio
   * @param params Parameters for chord detection
   * @returns A Promise that resolves to detected chords
   */
  async extractChords(
    params: AlgorithmParams = {}
  ): Promise<ChordsResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'ChordsDetection',
        params,
      },
    ]);
    if (result.data?.chords && Array.isArray(result.data.chords)) {
      return {
        chords: result.data.chords,
        strength: result.data.strength || [],
      };
    }

    return result;
  }

  /**
   * Detects silence regions in the audio
   * @param params Parameters for silence detection
   * @returns A Promise that resolves to silence rate information
   */
  async detectSilence(
    params: SilenceRateParams = { threshold: -60 }
  ): Promise<SilenceResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'SilenceRate',
        params,
      },
    ]);
    if (result.data?.silenceRate !== undefined) {
      return {
        silenceRate: result.data.silenceRate,
        threshold: params.threshold,
      };
    }

    return result;
  }

  /**
   * Extracts Bark frequency bands from the audio
   * @param params Parameters for Bark bands extraction
   * @returns A Promise that resolves to Bark bands
   */
  async extractBarkBands(
    params: BarkBandsParams = { sampleRate: 44100, numberBands: 27 }
  ): Promise<BarkBandsResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'BarkBands',
        params,
      },
    ]);
    return result.data?.bands ? { bands: result.data.bands } : result;
  }

  /**
   * Analyzes the danceability of the audio
   * @param params Parameters for danceability analysis
   * @returns A Promise that resolves to danceability score
   */
  async extractDanceability(
    params: AlgorithmParams = {}
  ): Promise<DanceabilityResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'Danceability',
        params,
      },
    ]);
    return result.data?.danceability
      ? { danceability: result.data.danceability }
      : result;
  }

  /**
   * Extracts zero crossing rate which correlates with signal noisiness
   * @param params Parameters for ZCR analysis
   * @returns A Promise that resolves to zero crossing rate
   */
  async extractZeroCrossingRate(
    params: AlgorithmParams = {}
  ): Promise<ZeroCrossingRateResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'ZeroCrossingRate',
        params,
      },
    ]);
    return result.data?.zeroCrossingRate
      ? { zeroCrossingRate: result.data.zeroCrossingRate }
      : result;
  }

  /**
   * Analyzes the tuning frequency of the audio
   * @param params Parameters for tuning analysis
   * @returns A Promise that resolves to tuning frequency
   */
  async extractTuningFrequency(
    params: AlgorithmParams = {}
  ): Promise<TuningFrequencyResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'TuningFrequency',
        params,
      },
    ]);
    if (result.data?.tuningFrequency !== undefined) {
      return {
        tuningFrequency: result.data.tuningFrequency,
        tuningCents: result.data.tuningCents,
      };
    }

    return result;
  }

  /**
   * Extracts multibands spectrum features using ERB bands
   * @param params Parameters for ERBBands extraction
   * @returns A Promise that resolves to ERB bands
   */
  async extractERBBands(
    params: ERBBandsParams = { sampleRate: 44100, numberBands: 40 }
  ): Promise<ERBBandsResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'ERBBands',
        params,
      },
    ]);
    return result.data?.bands ? { bands: result.data.bands } : result;
  }

  /**
   * Detects sound attacks/onsets and analyzes their log attack time
   * @param params Parameters for attack time analysis
   * @returns A Promise that resolves to log attack time
   */
  async extractAttackTime(
    params: AlgorithmParams = {}
  ): Promise<AttackTimeResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'LogAttackTime',
        params,
      },
    ]);
    if (result.data?.logAttackTime !== undefined) {
      return {
        logAttackTime: result.data.logAttackTime,
        attackStart: result.data.attackStart,
        attackStop: result.data.attackStop,
      };
    }

    return result;
  }

  /**
   * Analyzes inharmonicity, which measures deviation from harmonic spectrum
   * @param params Parameters for inharmonicity analysis
   * @returns A Promise that resolves to inharmonicity value
   */
  async extractInharmonicity(
    params: AlgorithmParams = {}
  ): Promise<InharmonicityResult | EssentiaResult<any>> {
    const result = await this.extractFeatures([
      {
        name: 'Inharmonicity',
        params,
      },
    ]);
    return result.data?.inharmonicity
      ? { inharmonicity: result.data.inharmonicity }
      : result;
  }

  /**
   * Sets the number of threads used by the native thread pool.
   * Higher values may improve performance on high-end devices,
   * while lower values may be better for low-end devices.
   *
   * @param count Number of threads (minimum 1)
   * @returns A Promise that resolves to true on success
   */
  async setThreadCount(count: number): Promise<boolean> {
    try {
      if (!Number.isInteger(count) || count < 1) {
        throw new Error('Thread count must be a positive integer');
      }
      return await Essentia.setThreadCount(count);
    } catch (error) {
      console.error('Essentia setThreadCount error:', error);
      throw error;
    }
  }

  /**
   * Gets the current thread count used by the native thread pool.
   * @returns A Promise that resolves to the current thread count
   */
  async getThreadCount(): Promise<number> {
    try {
      return await Essentia.getThreadCount();
    } catch (error) {
      console.error('Essentia getThreadCount error:', error);
      throw error;
    }
  }
}

export default EssentiaAPI;
