import { loadCombinedWasm } from '../wasmLoader';
import { fetchAndDecodeAudio } from '../audioUtils';
import type { OfflineSpeakerDiarizationInstance } from '../wasmTypes';
import type { DiarizationFileInput } from '../../types/api';
import type { Constructor } from './mixinUtils';

export function DiarizationMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private diarization: OfflineSpeakerDiarizationInstance | null = null;

    async initDiarization(config: any): Promise<{
      success: boolean;
      sampleRate: number;
      error?: string;
    }> {
      try {
        await loadCombinedWasm();

        if (!window.SherpaOnnx.SpeakerDiarization) {
          return {
            success: false,
            sampleRate: 0,
            error: 'SpeakerDiarization module not loaded',
          };
        }

        const debug = config?.debug ? 1 : 0;
        const numThreads = 1; // WASM is single-threaded

        console.log(
          `[Diarization] Loading models (threads=${numThreads}, debug=${debug})...`
        );
        // Web-only: config.modelDir is set to '/wasm/speakers' by ModelManagement
        // (createWebDiarizationModelState in constants.ts), pointing to model files
        // pre-served by download-web-models.sh. Native Diarization uses the TurboModule.
        const modelDir = config?.modelDir || config?.segmentationModelDir || '/wasm/speakers';
        const fetchBase = config?.modelBaseUrl || modelDir;

        // Set progress callback if provided
        if (config?.onProgress && window.SherpaOnnx) {
          window.SherpaOnnx.onDownloadProgress = config.onProgress;
        }

        let loadedModel;
        try {
          loadedModel =
            await window.SherpaOnnx.SpeakerDiarization.loadModel({
              segmentation: `${fetchBase}/segmentation.onnx`,
              embedding: `${fetchBase}/embedding.onnx`,
              modelDir,
              debug,
            });
        } finally {
          if (window.SherpaOnnx) window.SherpaOnnx.onDownloadProgress = null;
        }

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
      if (!this.diarization) {
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

        // Update clustering config if params changed
        if (numClusters !== -1 || threshold !== 0.5) {
          this.diarization.setConfig({
            clustering: { numClusters, threshold },
          });
        }

        // On web, filePath is a URL — fetch and decode
        const { samples } = await fetchAndDecodeAudio(filePath);

        const segments = this.diarization.process(samples);
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
