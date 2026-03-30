import { loadCombinedWasm, detectWasmBasePath } from '../wasmLoader';
import { samplesToWav, fetchAndDecodeAudio } from '../audioUtils';
import type { OfflineSpeechDenoiserInstance } from '../wasmTypes';
import { type Constructor, withDownloadProgress } from './mixinUtils';
import { WasmWorkerManager } from '../workers/WasmWorkerManager';

export function DenoisingMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    public denoiser: OfflineSpeechDenoiserInstance | null = null;
    public denoiserWorker: WasmWorkerManager | null = null;

    async initDenoiser(config: any): Promise<{
      success: boolean;
      sampleRate: number;
      error?: string;
    }> {
      try {
        const debug = config?.debug ? 1 : 0;
        const modelDir = config?.modelDir
          || (config?.modelFile ? config.modelFile.substring(0, config.modelFile.lastIndexOf('/')) : null)
          || '/wasm/enhancement';
        const fetchBase = config?.modelBaseUrl || modelDir;

        // Try worker path first for non-blocking inference
        if (WasmWorkerManager.shouldUse()) {
          try {
            const mgr = new WasmWorkerManager('denoising');
            const result = await mgr.init(detectWasmBasePath(), {
              modelDir,
              fetchBase,
              debug,
              modelFile: `${fetchBase}/gtcrn.onnx`,
            });
            this.denoiserWorker = mgr;
            console.log(`[Denoiser] Worker initialized: sampleRate=${result.sampleRate}`);
            return { success: true, sampleRate: result.sampleRate };
          } catch (e) {
            console.warn('[Denoiser] Worker init failed, falling back to main thread:', e);
          }
        }

        await loadCombinedWasm();

        if (!window.SherpaOnnx.SpeechEnhancement) {
          return {
            success: false,
            sampleRate: 0,
            error: 'SpeechEnhancement module not loaded',
          };
        }

        const numThreads = 1; // WASM is single-threaded

        console.log(
          `[Denoiser] Loading model (threads=${numThreads}, debug=${debug})...`
        );

        const loadedModel = await withDownloadProgress(config?.onProgress, () =>
          window.SherpaOnnx.SpeechEnhancement!.loadModel({
            model: `${fetchBase}/gtcrn.onnx`,
            modelDir,
            debug,
          })
        );

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
      if (!this.denoiser && !this.denoiserWorker) {
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

        let outputSamples: Float32Array;
        let outputSampleRate: number;

        if (this.denoiserWorker) {
          // Worker path — non-blocking inference
          const result = await this.denoiserWorker.process(
            { samples, sampleRate },
            [samples.buffer]
          );
          outputSamples = new Float32Array(result.samples);
          outputSampleRate = result.sampleRate;
        } else {
          // Main-thread fallback
          const result = this.denoiser!.run(samples, sampleRate);
          outputSamples = result.samples;
          outputSampleRate = result.sampleRate;
        }

        const durationMs = performance.now() - startMs;

        // Create a downloadable WAV blob
        const wav = samplesToWav(outputSamples, outputSampleRate);
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
      if (this.denoiserWorker) {
        await this.denoiserWorker.release();
        this.denoiserWorker = null;
      }
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
