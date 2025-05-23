// packages/react-native-essentia/src/EssentiaAPI.ts
import { NativeModules } from 'react-native';
import { LINKING_ERROR } from './constants';
import { musicGenreClassificationPipeline } from './pipelines/musicGenreClassification';
import { speechEmotionRecognitionPipeline } from './pipelines/speechEmotionRecognition';
import type {
  AttackTimeResult,
  BarkBandsParams,
  BarkBandsResult,
  BeatsResult,
  ChordsResult,
  ChromagramParams,
  ChromaResult,
  DanceabilityResult,
  DissonanceResult,
  DynamicsResult,
  EnergyResult,
  ERBBandsParams,
  ERBBandsResult,
  HarmonicsResult,
  InharmonicityResult,
  KeyParams,
  KeyResult,
  LoudnessResult,
  MelBandsParams,
  MelBandsResult,
  MelSpectrogramParams,
  MelSpectrogramResult,
  MFCCParams,
  MFCCResult,
  NoveltyCurveResult,
  OnsetsResult,
  PitchParams,
  PitchResult,
  RhythmFeaturesResult,
  SilenceRateParams,
  SilenceResult,
  SpectralContrastParams,
  SpectralContrastResult,
  SpectralFeaturesResult,
  TempoResult,
  TonnetzParams,
  TonnetzResult,
  TuningFrequencyResult,
  ZeroCrossingRateResult,
} from './types/algorithms.types';

import type {
  AlgorithmParams,
  EssentiaInterface,
  EssentiaResult,
  FeatureConfig,
  PipelineConfig,
  PipelineResult,
} from './types/core.types';
import type {
  MusicGenreFeatures,
  SpeechEmotionFeatures,
} from './types/pipeline.types';
import { validateAlgorithmParams } from './utils/parameterValidation';

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
      // Validate inputs
      if (
        !pcmData ||
        (Array.isArray(pcmData) && pcmData.length === 0) ||
        (pcmData instanceof Float32Array && pcmData.length === 0)
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'PCM data cannot be empty',
        };
      }

      if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Sample rate must be a positive number',
        };
      }

      // Check for NaN or Infinity values in pcmData
      if (Array.isArray(pcmData)) {
        for (let i = 0; i < pcmData.length; i++) {
          if (!Number.isFinite(pcmData[i])) {
            throw {
              code: 'INVALID_PARAMETERS',
              message: `PCM data contains non-finite value at index ${i}: ${pcmData[i]}`,
            };
          }
        }
      } else {
        for (let i = 0; i < pcmData.length; i++) {
          if (!Number.isFinite(pcmData[i])) {
            throw {
              code: 'INVALID_PARAMETERS',
              message: `PCM data contains non-finite value at index ${i}: ${pcmData[i]}`,
            };
          }
        }
      }

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
      // Validate algorithm name
      if (!algorithm || !algorithm.trim()) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Algorithm name must be a non-empty string',
        };
      }

      // Validate params is an object
      if (typeof params !== 'object' || params === null) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Params must be an object',
        };
      }

      // Validate specific parameters based on algorithm type
      this.validateAlgorithmParams(algorithm, params);

      return await Essentia.executeAlgorithm(algorithm, params);
    } catch (error) {
      console.error(`Essentia algorithm error (${algorithm}):`, error);
      throw error;
    }
  }

  /**
   * Validates parameters for specific algorithms to prevent native crashes
   * @param algorithm Name of the algorithm
   * @param params Parameters to validate
   * @throws Error if parameters are invalid
   */
  private validateAlgorithmParams(
    algorithm: string,
    params: AlgorithmParams
  ): void {
    // Common numeric parameter validation
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'number') {
        // Check for NaN or Infinity
        if (!Number.isFinite(value)) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Parameter '${key}' must be a finite number, got ${value}`,
          };
        }
      }
    }

    // Algorithm-specific validations
    switch (algorithm) {
      case 'MFCC':
        if (
          params.numberBands !== undefined &&
          (typeof params.numberBands !== 'number' ||
            params.numberBands <= 0 ||
            !Number.isInteger(params.numberBands))
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'numberBands must be a positive integer',
          };
        }
        if (
          params.numberCoefficients !== undefined &&
          (typeof params.numberCoefficients !== 'number' ||
            params.numberCoefficients <= 0 ||
            !Number.isInteger(params.numberCoefficients))
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'numberCoefficients must be a positive integer',
          };
        }
        break;

      case 'MelBands':
      case 'BarkBands':
      case 'ERBBands':
        if (
          params.numberBands !== undefined &&
          (typeof params.numberBands !== 'number' ||
            params.numberBands <= 0 ||
            !Number.isInteger(params.numberBands))
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'numberBands must be a positive integer',
          };
        }
        break;

      case 'Windowing':
        if (params.type !== undefined && typeof params.type !== 'string') {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'Window type must be a string',
          };
        }
        break;

      case 'FrameCutter':
        if (
          params.frameSize !== undefined &&
          (typeof params.frameSize !== 'number' ||
            params.frameSize <= 0 ||
            !Number.isInteger(params.frameSize))
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'frameSize must be a positive integer',
          };
        }
        if (
          params.hopSize !== undefined &&
          (typeof params.hopSize !== 'number' ||
            params.hopSize <= 0 ||
            !Number.isInteger(params.hopSize))
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'hopSize must be a positive integer',
          };
        }
        break;

      case 'Spectrum':
      case 'FFT':
        if (
          params.size !== undefined &&
          (typeof params.size !== 'number' ||
            params.size <= 0 ||
            !Number.isInteger(params.size) ||
            !this.isPowerOfTwo(params.size))
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'size must be a positive integer power of 2',
          };
        }
        break;

      case 'PitchYinFFT':
      case 'PitchYin':
        if (
          params.minFrequency !== undefined &&
          (typeof params.minFrequency !== 'number' || params.minFrequency < 0)
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'minFrequency must be a non-negative number',
          };
        }
        if (
          params.maxFrequency !== undefined &&
          (typeof params.maxFrequency !== 'number' || params.maxFrequency <= 0)
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'maxFrequency must be a positive number',
          };
        }
        if (
          params.minFrequency !== undefined &&
          params.maxFrequency !== undefined &&
          params.minFrequency >= params.maxFrequency
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: 'maxFrequency must be greater than minFrequency',
          };
        }
        break;
    }
  }

  /**
   * Checks if a number is a power of two
   * @param n Number to check
   * @returns True if n is a power of two
   */
  private isPowerOfTwo(n: number): boolean {
    // Using a non-bitwise approach to avoid ESLint warning
    return n > 0 && Math.log2(n) % 1 === 0;
  }

  /**
   * Executes an audio processing pipeline with customizable preprocessing,
   * feature extraction, and post-processing steps as defined in the configuration.
   *
   * @param config Configuration object defining the pipeline steps
   * @returns A Promise that resolves to the results of the pipeline execution
   */
  async executePipeline(config: PipelineConfig): Promise<PipelineResult> {
    try {
      // Validate the pipeline configuration
      if (!config || typeof config !== 'object' || config === null) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Pipeline configuration must be an object',
        };
      }

      if (
        !config.preprocess ||
        !Array.isArray(config.preprocess) ||
        config.preprocess.length === 0
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message:
            'Pipeline configuration must include at least one preprocessing step',
        };
      }

      if (
        !config.features ||
        !Array.isArray(config.features) ||
        config.features.length === 0
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message:
            'Pipeline configuration must include at least one feature extraction step',
        };
      }

      // Validate preprocessing steps
      for (let i = 0; i < config.preprocess.length; i++) {
        const step = config.preprocess[i];
        // TypeScript safety check
        if (!step) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Preprocessing step at index ${i} is undefined`,
          };
        }

        if (!step.name || typeof step.name !== 'string' || !step.name.trim()) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Preprocessing step at index ${i} must have a valid name`,
          };
        }

        if (
          step.params !== undefined &&
          (typeof step.params !== 'object' || step.params === null)
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Preprocessing step '${step.name}' has invalid params (must be an object)`,
          };
        }

        // Validate algorithm-specific parameters
        if (step.params) {
          this.validateAlgorithmParams(step.name, step.params);
        }
      }

      // Validate feature extraction steps
      for (let i = 0; i < config.features.length; i++) {
        const feature = config.features[i];
        // TypeScript safety check
        if (!feature) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Feature at index ${i} is undefined`,
          };
        }

        if (
          !feature.name ||
          typeof feature.name !== 'string' ||
          !feature.name.trim()
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Feature at index ${i} must have a valid name`,
          };
        }

        if (
          !feature.input ||
          typeof feature.input !== 'string' ||
          !feature.input.trim()
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Feature '${feature.name}' is missing required 'input' field`,
          };
        }

        if (
          feature.params !== undefined &&
          (typeof feature.params !== 'object' || feature.params === null)
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Feature '${feature.name}' has invalid params (must be an object)`,
          };
        }

        if (
          feature.postProcess !== undefined &&
          (typeof feature.postProcess !== 'object' ||
            feature.postProcess === null)
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Feature '${feature.name}' has invalid postProcess (must be an object)`,
          };
        }

        // Validate algorithm-specific parameters
        if (feature.params) {
          this.validateAlgorithmParams(feature.name, feature.params);
        }
      }

      // Validate post-processing options if present
      if (
        config.postProcess !== undefined &&
        (typeof config.postProcess !== 'object' || config.postProcess === null)
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: `Pipeline has invalid postProcess (must be an object)`,
        };
      }

      // Check if all algorithms exist in Essentia registry
      const algorithmsResponse = await this.getAllAlgorithms();
      if (!algorithmsResponse.success) {
        throw {
          code: 'ALGORITHM_LIST_ERROR',
          message: 'Failed to retrieve the list of available algorithms',
        };
      }

      const allAlgorithms = algorithmsResponse.data;

      // Check preprocessing algorithms
      for (const step of config.preprocess) {
        if (!allAlgorithms.includes(step.name)) {
          throw {
            code: 'INVALID_ALGORITHM',
            message: `Preprocessing algorithm '${step.name}' not found in Essentia registry`,
          };
        }
      }

      const customAlgorithms = ['Tonnetz'];
      // // Check feature algorithms
      for (const feature of config.features) {
        if (
          !allAlgorithms.includes(feature.name) &&
          !customAlgorithms.includes(feature.name)
        ) {
          throw {
            code: 'INVALID_ALGORITHM',
            message: `Algorithm '${feature.name}' not found in Essentia registry`,
          };
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
      // Validate input
      if (
        !algorithms ||
        !Array.isArray(algorithms) ||
        algorithms.length === 0
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Algorithm list cannot be empty',
        };
      }

      // Validate each algorithm configuration
      for (let i = 0; i < algorithms.length; i++) {
        const config = algorithms[i];
        // TypeScript safety check
        if (!config) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Algorithm at index ${i} is undefined`,
          };
        }

        if (
          !config.name ||
          typeof config.name !== 'string' ||
          !config.name.trim()
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Algorithm at index ${i} must have a valid name`,
          };
        }

        if (
          config.params !== undefined &&
          (typeof config.params !== 'object' || config.params === null)
        ) {
          throw {
            code: 'INVALID_PARAMETERS',
            message: `Algorithm '${config.name}' has invalid params (must be an object)`,
          };
        }

        // Validate algorithm-specific parameters
        if (config.params) {
          this.validateAlgorithmParams(config.name, config.params);
        }
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

      // First, use our validation utility to create clean features
      const cleanedFeatures = features.map((feature) => {
        if (!feature.name) {
          throw new Error('Each feature must have a name');
        }

        // Create a validated copy with clean parameters
        return {
          name: feature.name,
          params: validateAlgorithmParams(feature.name, feature.params) || {},
        };
      });

      // Special handling for Key algorithm which has known issues
      if (cleanedFeatures.length === 1) {
        const singleFeature = cleanedFeatures[0];
        if (singleFeature && singleFeature.name === 'Key') {
          console.log('Using direct executeAlgorithm approach for Key');
          return await this.executeAlgorithm('Key', singleFeature.params);
        }
      }

      // For everything else, use the standard approach
      console.log(
        `Using standard extraction method with ${cleanedFeatures.length} features`
      );
      return await Essentia.extractFeatures(cleanedFeatures);
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
  async extractMFCC(params: MFCCParams = {}): Promise<MFCCResult> {
    const result = await this.executeAlgorithm('MFCC', params);
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
    params: KeyParams = {}
  ): Promise<KeyResult | EssentiaResult<any>> {
    try {
      // Use the centralized validation utility which now handles framewise removal properly
      const validatedParams = validateAlgorithmParams('Key', params);

      // Debug log the exact parameters being sent to native
      console.log(
        'Key params being sent to native:',
        JSON.stringify(validatedParams)
      );

      // IMPORTANT: Use executeAlgorithm directly instead of extractFeatures
      // This bypasses the problematic extractFeatures bridge method
      const result = await this.executeAlgorithm('Key', validatedParams);

      // Debug log the result
      console.log('Raw result from Key extraction:', JSON.stringify(result));

      if (result.success && result.data) {
        if (result.data.key_values) {
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
    } catch (error) {
      console.error('Error in extractKey:', error);
      throw error;
    }
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
    try {
      // Use the centralized validation utility
      const validatedParams = validateAlgorithmParams('PitchYinFFT', params);

      // Ensure we have a sample rate
      if (!validatedParams.sampleRate) {
        validatedParams.sampleRate = 44100; // Default sample rate
      }

      const result = await this.extractFeatures([
        {
          name: 'PitchYinFFT',
          params: validatedParams,
        },
      ]);

      if (result.data?.pitch && result.data?.pitchConfidence) {
        return {
          pitch: result.data.pitch,
          confidence: result.data.pitchConfidence,
        };
      }

      return result;
    } catch (error) {
      console.error('Error in extractPitch:', error);
      throw error;
    }
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
   * @param params Parameters for mel spectrogram computation
   * @returns A Promise that resolves to the mel spectrogram result
   */
  async computeMelSpectrogram(
    params: MelSpectrogramParams = {}
  ): Promise<MelSpectrogramResult> {
    try {
      // Destructure with defaults
      const {
        frameSize = 2048,
        hopSize = 1024,
        nMels = 40,
        fMin = 0,
        fMax = 22050,
        windowType = 'hann',
        normalize = true,
        logScale = true,
      } = params;

      // Validate inputs
      if (
        !Number.isFinite(frameSize) ||
        frameSize <= 0 ||
        !Number.isInteger(frameSize)
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Frame size must be a positive integer',
        };
      }
      if (
        !Number.isFinite(hopSize) ||
        hopSize <= 0 ||
        !Number.isInteger(hopSize)
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Hop size must be a positive integer',
        };
      }

      if (!Number.isFinite(nMels) || nMels <= 0 || !Number.isInteger(nMels)) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Number of mel bands must be a positive integer',
        };
      }

      if (!Number.isFinite(fMin) || fMin < 0) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Minimum frequency must be non-negative',
        };
      }

      if (!Number.isFinite(fMax) || fMax <= fMin) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Maximum frequency must be greater than minimum frequency',
        };
      }

      if (!windowType || typeof windowType !== 'string' || !windowType.trim()) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Window type must be a non-empty string',
        };
      }

      if (typeof normalize !== 'boolean') {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Normalize parameter must be a boolean',
        };
      }

      if (typeof logScale !== 'boolean') {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'LogScale parameter must be a boolean',
        };
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
    params: ChromagramParams = {}
  ): Promise<ChromaResult | EssentiaResult<any>> {
    const result = await this.executeAlgorithm('Chromagram', params);

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
    params: SpectralContrastParams = {}
  ): Promise<SpectralContrastResult> {
    const result = await this.executeAlgorithm(
      'SpectralContrast',
      params as AlgorithmParams
    );

    // Return properly formatted SpectralContrastResult
    if (result.success && result.data) {
      // Check if we have the required data
      if (!result.data.spectralContrast) {
        throw new Error('Spectral Contrast data missing from result');
      }

      // Determine if the result is frame-wise (2D arrays)
      const isFrameWise =
        Array.isArray(result.data.spectralContrast) &&
        result.data.spectralContrast.length > 0 &&
        Array.isArray(result.data.spectralContrast[0]);

      return {
        contrast: result.data.spectralContrast,
        valleys: result.data.spectralValley || [],
        isFrameWise,
      };
    }

    // If the result wasn't successful, throw an error
    throw new Error('Spectral Contrast extraction failed');
  }

  /**
   * Extract Tonnetz features from the loaded audio
   * Tonnetz represents tonal centroids derived from the Harmonic Pitch Class Profile (HPCP),
   * useful for harmonic analysis and music similarity tasks.
   *
   * @param params - Optional parameters for the Tonnetz algorithm
   * @returns Promise resolving to tonnetz features or error
   */
  async extractTonnetz(params: TonnetzParams = {}): Promise<TonnetzResult> {
    try {
      const framewise = params.framewise !== false; // Default to true

      // Set default values and validate parameters
      const validatedParams: AlgorithmParams = {
        frameSize: params.frameSize || 1024,
        hopSize: params.hopSize || 512,
        hpcpSize: params.hpcpSize || 12,
        referenceFrequency: params.referenceFrequency || 440.0,
        computeMean: params.computeMean ?? false,
        framewise,
      };

      // Validate frameSize
      if (
        !Number.isInteger(validatedParams.frameSize as number) ||
        (validatedParams.frameSize as number) <= 0
      ) {
        throw new Error('frameSize must be a positive integer');
      }

      // Check if frameSize is a power of 2 (for FFT efficiency)
      if (!this.isPowerOfTwo(validatedParams.frameSize as number)) {
        console.warn(
          'frameSize should be a power of 2 for efficient FFT processing'
        );
      }

      // Validate hopSize
      if (
        !Number.isInteger(validatedParams.hopSize as number) ||
        (validatedParams.hopSize as number) <= 0
      ) {
        throw new Error('hopSize must be a positive integer');
      }

      // Validate hpcpSize
      if (
        !Number.isInteger(validatedParams.hpcpSize as number) ||
        (validatedParams.hpcpSize as number) <= 0
      ) {
        throw new Error('hpcpSize must be a positive integer');
      }

      // Check if hpcpSize is a common value
      if (![12, 24, 36].includes(validatedParams.hpcpSize as number)) {
        console.warn('hpcpSize is typically 12, 24, or 36 in music analysis');
      }

      // Validate referenceFrequency
      if (
        typeof validatedParams.referenceFrequency !== 'number' ||
        validatedParams.referenceFrequency <= 0
      ) {
        throw new Error('referenceFrequency must be a positive number');
      }

      // Check if referenceFrequency is in a reasonable range
      if (
        validatedParams.referenceFrequency < 400 ||
        validatedParams.referenceFrequency > 500
      ) {
        console.warn(
          'referenceFrequency is typically between 400-500 Hz for tuning'
        );
      }

      // Validate computeMean
      if (typeof validatedParams.computeMean !== 'boolean') {
        throw new Error('computeMean must be a boolean value');
      }

      const result = await this.executeAlgorithm('Tonnetz', validatedParams);

      if (result.success && result.data) {
        // Check if we have frame-wise or single-frame results
        const isFrameWise =
          Array.isArray(result.data.tonnetz) &&
          result.data.tonnetz.length > 0 &&
          Array.isArray(result.data.tonnetz[0]);

        const tonnetzResult: TonnetzResult = {
          tonnetz: result.data.tonnetz,
          isFrameWise,
        };

        // Add mean if available
        if (result.data.tonnetz_mean) {
          tonnetzResult.mean = result.data.tonnetz_mean;
        }

        return tonnetzResult;
      }

      return result;
    } catch (error) {
      console.error('Error extracting Tonnetz features:', error);
      throw error;
    }
  }

  async computeTonnetz(hpcp: number[]): Promise<TonnetzResult> {
    const tonnetzArray = (await Essentia.computeTonnetz(hpcp)) as {
      success: boolean;
      data: { tonnetz: number[] };
    };
    const tonnetzResult: TonnetzResult = {
      tonnetz: tonnetzArray.data?.tonnetz || [],
      isFrameWise: false,
    };
    return tonnetzResult;
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
      if (
        !Number.isFinite(frameSize) ||
        frameSize <= 0 ||
        !Number.isInteger(frameSize)
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Frame size must be a positive integer',
        };
      }

      if (!this.isPowerOfTwo(frameSize)) {
        throw {
          code: 'INVALID_PARAMETERS',
          message:
            'Frame size should be a power of 2 for efficient FFT processing',
        };
      }

      if (
        !Number.isFinite(hopSize) ||
        hopSize <= 0 ||
        !Number.isInteger(hopSize)
      ) {
        throw {
          code: 'INVALID_PARAMETERS',
          message: 'Hop size must be a positive integer',
        };
      }

      return await Essentia.computeSpectrum(frameSize, hopSize);
    } catch (error) {
      console.error('Essentia computeSpectrum error:', error);
      throw error;
    }
  }

  /**
   * Extract music genre features from the loaded audio using the predefined pipeline
   * @param customConfig Optional custom pipeline configuration to override the default
   * @returns A Promise that resolves to music genre features
   */
  async extractMusicGenreFeatures(
    customConfig?: Partial<PipelineConfig>
  ): Promise<EssentiaResult<MusicGenreFeatures>> {
    try {
      // Use the default pipeline configuration, but allow customization if provided
      const config = customConfig
        ? { ...musicGenreClassificationPipeline, ...customConfig }
        : musicGenreClassificationPipeline;

      const result = await this.executePipeline(config);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: {
            code: 'INVALID_RESULT',
            message:
              result.error?.message ||
              'Invalid result from music genre classification pipeline',
          },
        };
      }

      return result as EssentiaResult<MusicGenreFeatures>;
    } catch (error) {
      console.error('Music genre classification error:', error);
      return {
        success: false,
        error: {
          code: 'CLASSIFICATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Extract speech emotion features from the loaded audio using the predefined pipeline
   * @param customConfig Optional custom pipeline configuration to override the default
   * @returns A Promise that resolves to speech emotion features
   */
  async extractSpeechEmotionFeatures(
    customConfig?: Partial<PipelineConfig>
  ): Promise<EssentiaResult<SpeechEmotionFeatures>> {
    try {
      // Use the default pipeline configuration, but allow customization if provided
      const config = customConfig
        ? { ...speechEmotionRecognitionPipeline, ...customConfig }
        : speechEmotionRecognitionPipeline;

      const result = await this.executePipeline(config);

      if (!result.success || !result.data) {
        return {
          success: false,
          error: {
            code: 'INVALID_RESULT',
            message:
              result.error?.message ||
              'Invalid result from speech emotion classification pipeline',
          },
        };
      }

      return result as EssentiaResult<SpeechEmotionFeatures>;
    } catch (error) {
      console.error('Speech emotion classification error:', error);
      return {
        success: false,
        error: {
          code: 'CLASSIFICATION_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

export default EssentiaAPI;
