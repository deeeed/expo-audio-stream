import type { ApiInterface } from '../types/api';
import type {
  KWSModelConfig,
  KWSInitResult,
  KWSAcceptWaveformResult,
  ValidateResult,
} from '../types/interfaces';
import { cleanFilePath } from '../utils/fileUtils';

/**
 * Service for Keyword Spotting (KWS) functionality
 */
export class KWSService {
  private initialized = false;
  private api: ApiInterface;

  constructor(api: ApiInterface) {
    this.api = api;
  }

  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   */
  public validateLibrary(): Promise<ValidateResult> {
    return this.api.validateLibraryLoaded();
  }

  /**
   * Initialize KWS with the provided model configuration
   * @param config Configuration for KWS model
   * @returns Promise that resolves with initialization result
   */
  public async init(config: KWSModelConfig): Promise<KWSInitResult> {
    try {
      const validateResult = await this.validateLibrary();
      if (!validateResult.loaded) {
        return {
          success: false,
          error: validateResult.status || 'Library not loaded',
        };
      }

      // Flatten modelFiles for TurboModule compat
      const nativeConfig: Record<string, unknown> = {
        modelDir: cleanFilePath(config.modelDir),
        modelType: config.modelType || 'zipformer2',
        numThreads: config.numThreads ?? 2,
        debug: config.debug ?? false,
        provider: config.provider ?? 'cpu',
        maxActivePaths: config.maxActivePaths ?? 4,
        keywordsFile: config.keywordsFile ?? 'keywords.txt',
        keywordsScore: config.keywordsScore ?? 1.5,
        keywordsThreshold: config.keywordsThreshold ?? 0.25,
        numTrailingBlanks: config.numTrailingBlanks ?? 2,
        modelBaseUrl: config.modelBaseUrl,
      };

      // Flatten model files
      if (config.modelFiles) {
        if (config.modelFiles.encoder) nativeConfig.modelFileEncoder = config.modelFiles.encoder;
        if (config.modelFiles.decoder) nativeConfig.modelFileDecoder = config.modelFiles.decoder;
        if (config.modelFiles.joiner) nativeConfig.modelFileJoiner = config.modelFiles.joiner;
        if (config.modelFiles.tokens) nativeConfig.modelFileTokens = config.modelFiles.tokens;
      }

      const result = await this.api.initKws(nativeConfig as any);

      if (result.success) {
        this.initialized = true;
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Accept waveform samples and check for keyword detection
   * @param sampleRate Sample rate of the audio (typically 16000)
   * @param samples Audio samples as float array
   * @returns Promise with detection result
   */
  public async acceptWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<KWSAcceptWaveformResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          detected: false,
          keyword: '',
          error: 'KWS is not initialized',
        };
      }

      return await this.api.acceptKwsWaveform({ sampleRate, samples });
    } catch (error) {
      return {
        success: false,
        detected: false,
        keyword: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Reset the KWS stream
   */
  public async resetStream(): Promise<{ success: boolean }> {
    try {
      if (!this.initialized) {
        return { success: false };
      }
      return await this.api.resetKwsStream();
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Release KWS resources
   */
  public async release(): Promise<{ released: boolean }> {
    try {
      const result = await this.api.releaseKws();
      if (result.released) {
        this.initialized = false;
      }
      return result;
    } catch (error) {
      console.error('Error releasing KWS resources:', error);
      return { released: false };
    }
  }
}
