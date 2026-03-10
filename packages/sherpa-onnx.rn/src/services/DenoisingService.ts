import type { ApiInterface } from '../types/api';
import type {
  DenoiserModelConfig,
  DenoiserInitResult,
  DenoiserResult,
} from '../types/interfaces';
import { cleanFilePath } from '../utils/fileUtils';

export class DenoisingService {
  private initialized = false;
  private sampleRate = 0;
  private api: ApiInterface;

  constructor(api: ApiInterface) {
    this.api = api;
  }

  public getSampleRate(): number {
    return this.sampleRate;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async init(config: DenoiserModelConfig): Promise<DenoiserInitResult> {
    try {
      const validateResult = await this.api.validateLibraryLoaded();
      if (!validateResult.loaded) {
        return {
          success: false,
          sampleRate: 0,
          error: validateResult.status || 'Library not loaded',
        };
      }

      const cleanedConfig = {
        ...config,
        modelFile: cleanFilePath(config.modelFile),
      };

      const result = await this.api.initDenoiser(cleanedConfig);
      if (result.success) {
        this.initialized = true;
        this.sampleRate = result.sampleRate;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        sampleRate: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async denoiseFile(filePath: string): Promise<DenoiserResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          outputPath: '',
          durationMs: 0,
          error: 'Denoiser is not initialized',
        };
      }
      return await this.api.denoiseFile(cleanFilePath(filePath));
    } catch (error) {
      return {
        success: false,
        outputPath: '',
        durationMs: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async release(): Promise<{ released: boolean }> {
    try {
      const result = await this.api.releaseDenoiser();
      if (result.released) {
        this.initialized = false;
        this.sampleRate = 0;
      }
      return result;
    } catch (error) {
      console.error('Error releasing Denoising resources:', error);
      return { released: false };
    }
  }
}
