import { loadCombinedWasm, detectWasmBasePath } from '../wasmLoader';
import { fetchAndDecodeAudio } from '../audioUtils';
import type { OfflineSpeakerDiarizationInstance } from '../wasmTypes';
import type { DiarizationFileInput } from '../../types/api';
import { type Constructor, withDownloadProgress } from './mixinUtils';
import { WasmWorkerManager } from '../workers/WasmWorkerManager';

export function DiarizationMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    public diarization: OfflineSpeakerDiarizationInstance | null = null;
    public diarizationWorker: WasmWorkerManager | null = null;

    async initDiarization(config: any): Promise<{
      success: boolean;
      sampleRate: number;
      error?: string;
    }> {
      try {
        const debug = config?.debug ? 1 : 0;
        const modelDir = config?.modelDir || config?.segmentationModelDir || '/wasm/speakers';
        const fetchBase = config?.modelBaseUrl || modelDir;

        // Try worker path first for non-blocking inference
        if (WasmWorkerManager.shouldUse()) {
          try {
            const mgr = new WasmWorkerManager('diarization');
            const result = await mgr.init(detectWasmBasePath(), {
              modelDir,
              fetchBase,
              debug,
              segmentationFile: `${fetchBase}/segmentation.onnx`,
              embeddingFile: `${fetchBase}/embedding.onnx`,
              numClusters: config?.numClusters ?? -1,
              threshold: config?.threshold ?? 0.5,
              minDurationOn: config?.minDurationOn,
              minDurationOff: config?.minDurationOff,
            });
            this.diarizationWorker = mgr;
            console.log(`[Diarization] Worker initialized: sampleRate=${result.sampleRate}`);
            return { success: true, sampleRate: result.sampleRate };
          } catch (e) {
            console.warn('[Diarization] Worker init failed, falling back to main thread:', e);
          }
        }

        await loadCombinedWasm();

        if (!window.SherpaOnnx.SpeakerDiarization) {
          return {
            success: false,
            sampleRate: 0,
            error: 'SpeakerDiarization module not loaded',
          };
        }

        const numThreads = 1; // WASM is single-threaded

        console.log(
          `[Diarization] Loading models (threads=${numThreads}, debug=${debug})...`
        );

        const loadedModel = await withDownloadProgress(config?.onProgress, () =>
          window.SherpaOnnx.SpeakerDiarization!.loadModel({
            segmentation: `${fetchBase}/segmentation.onnx`,
            embedding: `${fetchBase}/embedding.onnx`,
            modelDir,
            debug,
          })
        );

        this.diarization =
          window.SherpaOnnx.SpeakerDiarization.createDiarization(loadedModel, {
            numClusters: config?.numClusters ?? -1,
            threshold: config?.threshold ?? 0.5,
            minDurationOn: config?.minDurationOn,
            minDurationOff: config?.minDurationOff,
            numThreads,
            debug,
          });

        console.log(
          `[Diarization] Initialized: sampleRate=${this.diarization.sampleRate}`
        );

        return {
          success: true,
          sampleRate: this.diarization.sampleRate,
        };
      } catch (error) {
        console.error('[Diarization] initDiarization failed:', error);
        return {
          success: false,
          sampleRate: 0,
          error: (error as Error).message,
        };
      }
    }

    async processDiarizationFile({
      filePath,
      numClusters,
      threshold,
    }: DiarizationFileInput): Promise<{
      success: boolean;
      segments: Array<{ start: number; end: number; speaker: number }>;
      numSpeakers: number;
      durationMs: number;
      error?: string;
    }> {
      if (!this.diarization && !this.diarizationWorker) {
        return {
          success: false,
          segments: [],
          numSpeakers: 0,
          durationMs: 0,
          error: 'Diarization not initialized',
        };
      }
      try {
        const startMs = performance.now();

        // On web, filePath is a URL — fetch and decode
        const { samples } = await fetchAndDecodeAudio(filePath);

        // Worker path — non-blocking inference
        if (this.diarizationWorker) {
          const result = await this.diarizationWorker.process(
            { samples, numClusters, threshold },
            [samples.buffer]
          );
          const durationMs = performance.now() - startMs;
          const speakerSet = new Set(
            result.segments.map((s: { speaker: number }) => s.speaker)
          );
          return {
            success: true,
            segments: result.segments,
            numSpeakers: speakerSet.size,
            durationMs,
          };
        }

        // Main-thread fallback
        // Update clustering config if params changed
        if (numClusters !== -1 || threshold !== 0.5) {
          this.diarization!.setConfig({
            clustering: { numClusters, threshold },
          });
        }

        const segments = this.diarization!.process(samples);
        const durationMs = performance.now() - startMs;

        // Count unique speakers
        const speakerSet = new Set(segments.map((s) => s.speaker));

        return {
          success: true,
          segments,
          numSpeakers: speakerSet.size,
          durationMs,
        };
      } catch (error) {
        console.error('[Diarization] processDiarizationFile failed:', error);
        return {
          success: false,
          segments: [],
          numSpeakers: 0,
          durationMs: 0,
          error: (error as Error).message,
        };
      }
    }

    async releaseDiarization(): Promise<{ released: boolean }> {
      if (this.diarizationWorker) {
        await this.diarizationWorker.release();
        this.diarizationWorker = null;
      }
      if (this.diarization) {
        try {
          this.diarization.free();
        } catch (_) {
          console.error('[Diarization] releaseDiarization failed:', _);
        }
        this.diarization = null;
      }
      return { released: true };
    }
  };
}
