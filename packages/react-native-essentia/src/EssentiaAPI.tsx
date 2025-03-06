// packages/react-native-essentia/src/EssentiaAPI.ts
import { NativeModules } from 'react-native';
import { LINKING_ERROR } from './constants';
import type {
  AlgorithmParams,
  EssentiaInterface,
  EssentiaResult,
  FeatureConfig,
  PipelineConfig,
  PipelineResult,
} from './types/core.types';
import type {
  BarkBandsParams,
  ERBBandsParams,
  MelBandsParams,
  MFCCParams,
  PitchParams,
  SilenceRateParams,
} from './types/params.types';
import type {
  AttackTimeResult,
  BarkBandsResult,
  BeatsResult,
  ChordsResult,
  ChromaResult,
  DanceabilityResult,
  DissonanceResult,
  DynamicsResult,
  EnergyResult,
  ERBBandsResult,
  HarmonicsResult,
  InharmonicityResult,
  KeyResult,
  LoudnessResult,
  MelBandsResult,
  MelSpectrogramResult,
  MFCCResult,
  NoveltyCurveResult,
  OnsetsResult,
  PitchResult,
  RhythmFeaturesResult,
  SilenceResult,
  SpectralContrastResult,
  SpectralFeaturesResult,
  TempoResult,
  TonnetzResult,
  TuningFrequencyResult,
  ZeroCrossingRateResult,
} from './types/results.types';

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
  // JavaScript-side caching
  private algorithmInfoCache: Map<string, any> = new Map();
  private allAlgorithmsCache: any = null;
  private isCacheEnabledValue: boolean = true;

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
   * @param pcmData Array of audio samples
   * @param sampleRate Sampling rate in Hz (e.g., 44100)
   * @returns A Promise that resolves to true on success or rejects with an error if data cannot be set
   */
  async setAudioData(
    pcmData: number[] | Float32Array,
    sampleRate: number
  ): Promise<boolean> {
    try {
      // Convert Float32Array to regular array if needed
      const data =
        pcmData instanceof Float32Array ? Array.from(pcmData) : pcmData;
      return await Essentia.setAudioData(data, sampleRate);
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
   * Executes an audio processing pipeline with customizable preprocessing,
   * feature extraction, and post-processing steps as defined in the configuration.
   *
   * @param config Configuration object defining the pipeline steps
   * @returns A Promise that resolves to the results of the pipeline execution
   * @example
   * ```typescript
   * // Example: Extract MFCC and mel bands using frame-based processing
   * const result = await essentiaAPI.executePipeline({
   *   preprocess: [
   *     { name: "FrameCutter", params: { frameSize: 2048, hopSize: 1024 } },
   *     { name: "Windowing", params: { type: "hann" } },
   *     { name: "Spectrum", params: { size: 2048 } }
   *   ],
   *   features: [
   *     {
   *       name: "MFCC",
   *       input: "Spectrum",
   *       params: { numberCoefficients: 13 },
   *       postProcess: { mean: true }
   *     },
   *     {
   *       name: "MelBands",
   *       input: "Spectrum",
   *       params: { numberBands: 40 },
   *       postProcess: { mean: true }
   *     }
   *   ],
   *   postProcess: { concatenate: true }
   * });
   * ```
   */
  async executePipeline(config: PipelineConfig): Promise<PipelineResult> {
    try {
      // Validate the pipeline configuration
      if (
        !config.preprocess ||
        !Array.isArray(config.preprocess) ||
        config.preprocess.length === 0
      ) {
        throw new Error(
          'Pipeline configuration must include at least one preprocessing step'
        );
      }

      if (
        !config.features ||
        !Array.isArray(config.features) ||
        config.features.length === 0
      ) {
        throw new Error(
          'Pipeline configuration must include at least one feature extraction step'
        );
      }

      // Validate that each feature has an input field
      for (const feature of config.features) {
        if (!feature.input) {
          throw new Error(
            `Feature '${feature.name}' is missing required 'input' field`
          );
        }
      }

      const pipelineJson = JSON.stringify(config);
      return await Essentia.executePipeline(pipelineJson);
    } catch (error) {
      console.error('Essentia executePipeline error:', error);
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
   * Uses both JavaScript and native caching for optimal performance.
   * @param algorithm Name of the Essentia algorithm to get information about
   * @returns A Promise that resolves to an object containing algorithm information
   */
  async getAlgorithmInfo(algorithm: string): Promise<any> {
    try {
      // Check JavaScript-side cache first if enabled
      if (this.isCacheEnabledValue && this.algorithmInfoCache.has(algorithm)) {
        return this.algorithmInfoCache.get(algorithm);
      }

      // If not in JS cache, get from native (which may use its own cache)
      const result = await Essentia.getAlgorithmInfo(algorithm);

      // Store in JS cache if enabled
      if (this.isCacheEnabledValue) {
        this.algorithmInfoCache.set(algorithm, result);
      }

      return result;
    } catch (error) {
      console.error(`Essentia getAlgorithmInfo error (${algorithm}):`, error);
      throw error;
    }
  }

  /**
   * Gets a list of all available Essentia algorithms.
   * Uses both JavaScript and native caching for optimal performance.
   * @returns A Promise that resolves to an array of algorithm names
   */
  async getAllAlgorithms(): Promise<any> {
    try {
      // Check JavaScript-side cache first if enabled
      if (this.isCacheEnabledValue && this.allAlgorithmsCache) {
        return this.allAlgorithmsCache;
      }

      // If not in JS cache, get from native (which may use its own cache)
      const result = await Essentia.getAllAlgorithms();

      // Store in JS cache if enabled
      if (this.isCacheEnabledValue) {
        this.allAlgorithmsCache = result;
      }

      return result;
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
        // Only add framewise for algorithms that explicitly support it
        if (
          ['Chroma', 'SpectralCentroid', 'SpectralContrast'].includes(
            feature.name
          ) &&
          !feature.params?.hasOwnProperty('framewise')
        ) {
          feature.params = { ...feature.params, framewise: true };
        }
      });
      return await Essentia.extractFeatures(JSON.stringify(features));
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
    const framewise = params.framewise !== false; // Default to true
    const result = await this.extractFeatures([
      {
        name: 'MelBands',
        params: {
          ...params,
          framewise,
        },
      },
    ]);

    if (result.success && result.data) {
      // Handle both frame-wise and single-frame results
      const isFrameWise =
        Array.isArray(result.data.mel_bands) &&
        result.data.mel_bands.length > 0 &&
        Array.isArray(result.data.mel_bands[0]);

      return {
        melBands: result.data.mel_bands,
        isFrameWise,
      } as MelBandsResult;
    }

    return result;
  }

  /**
   * Convenience method to extract musical key.
   * @param params Parameters for key detection
   * @returns A Promise that resolves to the detected key information
   */
  async extractKey(
    params: AlgorithmParams = {}
  ): Promise<KeyResult | EssentiaResult<any>> {
    const framewise = params.framewise !== false; // Default to true
    const result = await this.extractFeatures([
      {
        name: 'Key',
        params: {
          ...params,
          framewise,
        },
      },
    ]);

    if (result.success && result.data) {
      if (framewise && result.data.key_values) {
        // Frame-wise results
        return {
          key: result.data.key_values,
          scale: result.data.scale_values,
          strength: result.data.strength_values,
          isFrameWise: true,
        } as KeyResult;
      } else if (result.data.key) {
        // Single result
        return {
          key: result.data.key,
          scale: result.data.scale,
          strength: result.data.strength,
          isFrameWise: false,
        } as KeyResult;
      }
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

  /**
   * Enable or disable algorithm information caching.
   * Controls both JavaScript and native caching.
   * @param enabled True to enable caching, false to disable
   * @returns A Promise that resolves to true on success
   */
  async setCacheEnabled(enabled: boolean): Promise<boolean> {
    try {
      // Update JS-side caching
      this.isCacheEnabledValue = enabled;

      // If disabling, clear JS cache
      if (!enabled) {
        this.clearJSCache();
      }

      // Update native-side caching
      return await Essentia.setCacheEnabled(enabled);
    } catch (error) {
      console.error('Essentia setCacheEnabled error:', error);
      throw error;
    }
  }

  /**
   * Check if algorithm information caching is enabled.
   * @returns A Promise that resolves to true if caching is enabled
   */
  async isCacheEnabled(): Promise<boolean> {
    try {
      // Get native cache setting
      const nativeCacheEnabled = await Essentia.isCacheEnabled();

      // Synchronize JS and native settings if they differ
      if (nativeCacheEnabled !== this.isCacheEnabledValue) {
        await this.setCacheEnabled(nativeCacheEnabled);
      }

      return this.isCacheEnabledValue;
    } catch (error) {
      console.error('Essentia isCacheEnabled error:', error);
      throw error;
    }
  }

  /**
   * Clear the algorithm information cache.
   * Clears both JavaScript and native caches.
   * @returns A Promise that resolves to true on success
   */
  async clearCache(): Promise<boolean> {
    try {
      // Clear JS cache
      this.clearJSCache();

      // Clear native cache
      return await Essentia.clearCache();
    } catch (error) {
      console.error('Essentia clearCache error:', error);
      throw error;
    }
  }

  /**
   * Internal method to clear JavaScript-side cache
   */
  private clearJSCache(): void {
    this.algorithmInfoCache.clear();
    this.allAlgorithmsCache = null;
  }

  /**
   * Computes a mel spectrogram directly from loaded audio data.
   * This is optimized for efficient computation by processing all frames in C++.
   *
   * @param frameSize Size of each frame in samples (should be power of 2 for efficient FFT)
   * @param hopSize Hop size between frames in samples
   * @param nMels Number of mel bands
   * @param fMin Minimum frequency for mel bands
   * @param fMax Maximum frequency for mel bands
   * @param windowType Type of window to apply ("hann", "hamming", etc.)
   * @param normalize Whether to normalize the mel bands
   * @param logScale Whether to use log scale for the mel bands
   * @returns A Promise that resolves to the mel spectrogram result
   */
  async computeMelSpectrogram(
    frameSize: number,
    hopSize: number,
    nMels: number,
    fMin: number,
    fMax: number,
    windowType: string,
    normalize: boolean,
    logScale: boolean
  ): Promise<MelSpectrogramResult> {
    try {
      // Validate inputs
      if (frameSize <= 0 || hopSize <= 0 || nMels <= 0) {
        throw new Error('Frame size, hop size, and nMels must be positive');
      }

      if (fMin < 0 || fMax <= fMin) {
        throw new Error(
          'fMin must be non-negative and fMax must be greater than fMin'
        );
      }

      return await Essentia.computeMelSpectrogram(
        frameSize,
        hopSize,
        nMels,
        fMin,
        fMax,
        windowType,
        normalize,
        logScale
      );
    } catch (error) {
      console.error('Essentia computeMelSpectrogram error:', error);
      throw error;
    }
  }

  /**
   * Extract Chroma features from the loaded audio with optional frame-wise processing
   * @param params Parameters for Chroma algorithm
   * @returns A Promise that resolves to chroma features
   */
  async extractChroma(
    params: AlgorithmParams = {}
  ): Promise<ChromaResult | EssentiaResult<any>> {
    const framewise = params.framewise !== false; // Default to true
    const result = await this.extractFeatures([
      {
        name: 'Chroma',
        params: {
          ...params,
          framewise,
        },
      },
    ]);

    if (result.success && result.data) {
      // Check if we have frame-wise or single-frame results
      if (
        Array.isArray(result.data.chroma) &&
        result.data.chroma.length > 0 &&
        Array.isArray(result.data.chroma[0])
      ) {
        // Frame-wise results
        return {
          chroma: result.data.chroma,
          isFrameWise: true,
        } as ChromaResult;
      } else if (Array.isArray(result.data.chroma)) {
        // Single-frame result
        return {
          chroma: result.data.chroma,
          isFrameWise: false,
        } as ChromaResult;
      }
    }

    return result;
  }

  /**
   * Extract Spectral Contrast features with optional frame-wise processing
   * @param params Parameters for Spectral Contrast algorithm
   * @returns A Promise that resolves to spectral contrast features
   */
  async extractSpectralContrast(
    params: AlgorithmParams = {}
  ): Promise<SpectralContrastResult | EssentiaResult<any>> {
    const framewise = params.framewise !== false; // Default to true
    const result = await this.extractFeatures([
      {
        name: 'SpectralContrast',
        params: {
          ...params,
          framewise,
        },
      },
    ]);

    if (result.success && result.data) {
      // Handle both frame-wise and single-frame results
      const isFrameWise =
        Array.isArray(result.data.spectral_contrast) &&
        result.data.spectral_contrast.length > 0 &&
        Array.isArray(result.data.spectral_contrast[0]);

      return {
        contrast: result.data.spectral_contrast,
        valleys: result.data.spectral_valley,
        isFrameWise,
      } as SpectralContrastResult;
    }

    return result;
  }

  /**
   * Extract Tonnetz features from the loaded audio
   * Tonnetz represents tonal centroids derived from the Harmonic Pitch Class Profile (HPCP),
   * useful for harmonic analysis and music similarity tasks.
   *
   * @param params - Optional parameters for the Tonnetz algorithm
   * @returns Promise resolving to tonnetz features or error
   */
  async extractTonnetz(
    params: AlgorithmParams = {}
  ): Promise<TonnetzResult | EssentiaResult<any>> {
    if (!this.isCacheEnabledValue) {
      await this.clearCache();
    }

    const result = await this.extractFeatures([{ name: 'Tonnetz', params }]);

    if (result.success && result.data?.tonnetz) {
      return {
        tonnetz: result.data.tonnetz as number[],
      } as TonnetzResult;
    }

    return result;
  }

  /**
   * Extract Novelty Curve from the loaded audio
   * Novelty Curves are useful for audio segmentation and onset detection in classification tasks.
   *
   * @param params - Optional parameters for the NoveltyCurve algorithm
   * @returns Promise resolving to novelty curve features or error
   */
  async extractNoveltyCurve(
    params: AlgorithmParams = {}
  ): Promise<NoveltyCurveResult | EssentiaResult<any>> {
    if (!this.isCacheEnabledValue) {
      await this.clearCache();
    }

    const result = await this.extractFeatures([
      { name: 'NoveltyCurve', params },
    ]);

    if (result.success && result.data?.noveltyCurve) {
      return {
        noveltyCurve: result.data.noveltyCurve as number[],
      } as NoveltyCurveResult;
    }

    return result;
  }

  /**
   * Computes the spectrum with specified frame size and hop size.
   * This ensures spectrum has appropriate resolution for subsequent algorithms,
   * particularly when using high number of mel bands.
   *
   * @param frameSize Size of each frame in samples (should be power of 2 for efficient FFT)
   * @param hopSize Hop size between frames in samples
   * @returns A Promise that resolves to true on success
   */
  async computeSpectrum(
    frameSize: number = 1024,
    hopSize: number = Math.floor(frameSize / 2)
  ): Promise<boolean> {
    try {
      // Validate inputs
      if (frameSize <= 0 || hopSize <= 0) {
        throw new Error('Frame size and hop size must be positive');
      }

      return await Essentia.computeSpectrum(frameSize, hopSize);
    } catch (error) {
      console.error('Essentia computeSpectrum error:', error);
      throw error;
    }
  }
}

export default EssentiaAPI;
