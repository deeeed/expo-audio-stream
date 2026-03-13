import { loadCombinedWasm } from '../wasmLoader';
import { samplesToWav, fetchAndDecodeAudio } from '../audioUtils';
import type { OfflineSpeechDenoiserInstance } from '../wasmTypes';
import type { Constructor } from './mixinUtils';

export function DenoisingMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private denoiser: OfflineSpeechDenoiserInstance | null = null;

    async initDenoiser(config: any): Promise<{
      success: boolean;
      sampleRate: number;
      error?: string;
    }> {
      try {
        await loadCombinedWasm();

        if (!window.SherpaOnnx.SpeechEnhancement) {
          return {
            success: false,
            sampleRate: 0,
            error: 'SpeechEnhancement module not loaded',
          };
        }

        const debug = config?.debug ? 1 : 0;
        const numThreads = 1; // WASM is single-threaded

        console.log(
          `[Denoiser] Loading model (threads=${numThreads}, debug=${debug})...`
        );
        // Web-only: config.modelDir is set to '/wasm/enhancement' by ModelManagement
        // (createWebDenoiserModelState in constants.ts), pointing to model files
        // pre-served by download-web-models.sh. Native Denoising uses the TurboModule.
        // modelDir from ModelManagement, or extract dir from modelFile path
        const modelDir = config?.modelDir
          || (config?.modelFile ? config.modelFile.substring(0, config.modelFile.lastIndexOf('/')) : null)
          || '/wasm/enhancement';
        const fetchBase = config?.modelBaseUrl || modelDir;

        // Set progress callback if provided
        if (config?.onProgress && window.SherpaOnnx) {
          window.SherpaOnnx.onDownloadProgress = config.onProgress;
        }

        let loadedModel;
        try {
          loadedModel = await window.SherpaOnnx.SpeechEnhancement.loadModel(
            {
              model: `${fetchBase}/gtcrn.onnx`,
              modelDir,
              debug,
            }
          );
        } finally {
          if (window.SherpaOnnx) window.SherpaOnnx.onDownloadProgress = null;
        }

        this.denoiser = window.SherpaOnnx.SpeechEnhancement.createDenoiser(
          loadedModel,
          { numThreads, debug }
        );

        console.log(
          `[Denoiser] Initialized: sampleRate=${this.denoiser.sampleRate}`
        );

        return {
          success: true,
          sampleRate: this.denoiser.sampleRate,
        };
      } catch (error) {
        console.error('[Denoiser] initDenoiser failed:', error);
        return {
          success: false,
          sampleRate: 0,
          error: (error as Error).message,
        };
      }
    }

    async denoiseFile(filePath: string): Promise<{
      success: boolean;
      outputPath: string;
      durationMs: number;
      error?: string;
    }> {
      if (!this.denoiser) {
        return {
          success: false,
          outputPath: '',
          durationMs: 0,
          error: 'Denoiser not initialized',
        };
      }
      try {
        const startMs = performance.now();

        // On web, filePath is a URL — fetch the audio and decode it
        const { samples, sampleRate } = await fetchAndDecodeAudio(filePath);

        const result = this.denoiser.run(samples, sampleRate);
        const durationMs = performance.now() - startMs;

        // Create a downloadable WAV blob
        const wav = samplesToWav(result.samples, result.sampleRate);
        const outputPath = URL.createObjectURL(wav);

        return {
          success: true,
          outputPath,
          durationMs,
        };
      } catch (error) {
        console.error('[Denoiser] denoiseFile failed:', error);
        return {
          success: false,
          outputPath: '',
          durationMs: 0,
          error: (error as Error).message,
        };
      }
    }

    async releaseDenoiser(): Promise<{ released: boolean }> {
      if (this.denoiser) {
        try {
          this.denoiser.free();
        } catch (_) {
          console.error('[Denoiser] releaseDenoiser failed:', _);
        }
        this.denoiser = null;
      }
      return { released: true };
    }
  };
}
