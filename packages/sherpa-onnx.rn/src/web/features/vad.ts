import { loadCombinedWasm } from '../wasmLoader';
import type { VoiceActivityDetector } from '../wasmTypes';
import type { VadModelConfig } from '../../types/interfaces';
import type { WaveformInput } from '../../types/api';
import type { Constructor } from './mixinUtils';

export function VadMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private vad: VoiceActivityDetector | null = null;

    async initVad(
      config: VadModelConfig
    ): Promise<{ success: boolean; error?: string }> {
      try {
        await loadCombinedWasm();

        const debug = config.debug ? 1 : 0;
        const modelFile = config.modelFile ?? 'silero_vad.onnx';

        // Web-only: config.modelDir is set to '/wasm/vad' by ModelManagement
        // (createWebVadModelState in constants.ts), pointing to model files
        // pre-served by download-web-models.sh. Native VAD uses the TurboModule.
        const fetchBase = config.modelBaseUrl || config.modelDir;
        console.log(`[VAD] Loading silero_vad model (debug=${debug})...`);

        // Set progress callback if provided
        if (config.onProgress && window.SherpaOnnx) {
          window.SherpaOnnx.onDownloadProgress = config.onProgress;
        }

        let loadedModel;
        try {
          loadedModel = await window.SherpaOnnx.VAD.loadModel({
            model: `${fetchBase}/${modelFile}`,
            modelDir: 'vad-models',
            fileName: modelFile,
            debug,
          });
        } finally {
          if (window.SherpaOnnx) window.SherpaOnnx.onDownloadProgress = null;
        }

        this.vad = window.SherpaOnnx.VAD.createVoiceActivityDetector(
          loadedModel,
          {
            threshold: config.threshold ?? 0.5,
            minSilenceDuration: config.minSilenceDuration ?? 0.3,
            minSpeechDuration: config.minSpeechDuration ?? 0.1,
            windowSize: config.windowSize ?? 512,
            maxSpeechDuration: config.maxSpeechDuration ?? 30.0,
            sampleRate: 16000,
            numThreads: 1, // WASM is single-threaded
            bufferSizeInSeconds: config.bufferSizeInSeconds ?? 5.0,
            debug,
          }
        );

        console.log('[VAD] Initialized');
        return { success: true };
      } catch (error) {
        console.error('[VAD] initVad failed:', error);
        return { success: false, error: (error as Error).message };
      }
    }

    async acceptVadWaveform({ sampleRate, samples }: WaveformInput): Promise<{
      success: boolean;
      isSpeechDetected: boolean;
      segments: any[];
      error?: string;
    }> {
      if (!this.vad) {
        return {
          success: false,
          isSpeechDetected: false,
          segments: [],
          error: 'VAD not initialized',
        };
      }
      try {
        const float32 = new Float32Array(samples);
        this.vad.acceptWaveform(float32);
        const isSpeechDetected = this.vad.detected();

        // Extract completed speech segments
        const segments: any[] = [];
        while (!this.vad.isEmpty()) {
          const seg = this.vad.front();
          this.vad.pop();
          const startTime = seg.start / (sampleRate || 16000);
          const endTime = startTime + seg.n / (sampleRate || 16000);
          segments.push({
            startTime,
            endTime,
            samples: seg.samples,
          });
        }

        return { success: true, isSpeechDetected, segments };
      } catch (error) {
        return {
          success: false,
          isSpeechDetected: false,
          segments: [],
          error: (error as Error).message,
        };
      }
    }

    async resetVad(): Promise<{ success: boolean }> {
      if (this.vad) {
        try {
          this.vad.reset();
        } catch (_) {
          console.error('[VAD] resetVad failed:', _);
        }
      }
      return { success: true };
    }

    async releaseVad(): Promise<{ released: boolean }> {
      if (this.vad) {
        try {
          this.vad.free();
        } catch (_) {
          console.error('[VAD] releaseVad failed:', _);
        }
        this.vad = null;
      }
      return { released: true };
    }
  };
}
