import type { ApiInterface } from '../types/api';
import type {
  LanguageIdModelConfig,
  LanguageIdInitResult,
  LanguageIdResult,
  ValidateResult,
} from '../types/interfaces';
import { cleanFilePath } from '../utils/fileUtils';

export class LanguageIdService {
  private initialized = false;
  private api: ApiInterface;

  constructor(api: ApiInterface) {
    this.api = api;
  }

  public validateLibrary(): Promise<ValidateResult> {
    return this.api.validateLibraryLoaded();
  }

  public async init(config: LanguageIdModelConfig): Promise<LanguageIdInitResult> {
    try {
      const validateResult = await this.validateLibrary();
      if (!validateResult.loaded) {
        return {
          success: false,
          error: validateResult.status || 'Library not loaded',
        };
      }

      const nativeConfig: Record<string, unknown> = {
        modelDir: cleanFilePath(config.modelDir),
        encoderFile: config.encoderFile,
        decoderFile: config.decoderFile,
        numThreads: config.numThreads ?? 1,
        debug: config.debug ?? false,
        provider: config.provider ?? 'cpu',
      };

      const result = await this.api.initLanguageId(nativeConfig as any);

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

  public async detectLanguage(
    sampleRate: number,
    samples: number[]
  ): Promise<LanguageIdResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          language: '',
          durationMs: 0,
          error: 'Language ID is not initialized',
        };
      }

      return await this.api.detectLanguage(sampleRate, samples);
    } catch (error) {
      return {
        success: false,
        language: '',
        durationMs: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async detectLanguageFromFile(filePath: string): Promise<LanguageIdResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          language: '',
          durationMs: 0,
          error: 'Language ID is not initialized',
        };
      }

      return await this.api.detectLanguageFromFile(cleanFilePath(filePath));
    } catch (error) {
      return {
        success: false,
        language: '',
        durationMs: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async release(): Promise<{ released: boolean }> {
    try {
      const result = await this.api.releaseLanguageId();
      if (result.released) {
        this.initialized = false;
      }
      return result;
    } catch (error) {
      console.error('Error releasing Language ID resources:', error);
      return { released: false };
    }
  }
}
