import type { ApiInterface } from '../types/api';
import type {
  VadModelConfig,
  VadInitResult,
  VadAcceptWaveformResult,
  ValidateResult,
} from '../types/interfaces';
import { cleanFilePath } from '../utils/fileUtils';

export class VadService {
  private initialized = false;
  private api: ApiInterface;

  constructor(api: ApiInterface) {
    this.api = api;
  }

  public validateLibrary(): Promise<ValidateResult> {
    return this.api.validateLibraryLoaded();
  }

  public async init(config: VadModelConfig): Promise<VadInitResult> {
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
        modelFile: config.modelFile ?? 'silero_vad_v5.onnx',
        threshold: config.threshold ?? 0.5,
        minSilenceDuration: config.minSilenceDuration ?? 0.25,
        minSpeechDuration: config.minSpeechDuration ?? 0.25,
        windowSize: config.windowSize ?? 512,
        maxSpeechDuration: config.maxSpeechDuration ?? 5.0,
        bufferSizeInSeconds: config.bufferSizeInSeconds ?? 30.0,
        numThreads: config.numThreads ?? 1,
        debug: config.debug ?? false,
        provider: config.provider ?? 'cpu',
        ...(config.modelBaseUrl && { modelBaseUrl: config.modelBaseUrl }),
        ...(config.onProgress && { onProgress: config.onProgress }),
      };

      const result = await this.api.initVad(nativeConfig as any);

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

  public async acceptWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<VadAcceptWaveformResult> {
    try {
      if (!this.initialized) {
        return {
          success: false,
          isSpeechDetected: false,
          segments: [],
          error: 'VAD is not initialized',
        };
      }

      return await this.api.acceptVadWaveform({ sampleRate, samples });
    } catch (error) {
      return {
        success: false,
        isSpeechDetected: false,
        segments: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async reset(): Promise<{ success: boolean }> {
    try {
      if (!this.initialized) {
        return { success: false };
      }
      return await this.api.resetVad();
    } catch {
      return { success: false };
    }
  }

  public async release(): Promise<{ released: boolean }> {
    try {
      const result = await this.api.releaseVad();
      if (result.released) {
        this.initialized = false;
      }
      return result;
    } catch (error) {
      console.error('Error releasing VAD resources:', error);
      return { released: false };
    }
  }
}
