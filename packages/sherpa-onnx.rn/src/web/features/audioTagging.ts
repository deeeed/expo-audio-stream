import { loadCombinedWasm } from '../wasmLoader';
import { fetchAndDecodeAudio } from '../audioUtils';
import type { AudioTaggingInstance } from '../wasmTypes';
import type {
  AudioTaggingInitResult,
  AudioTaggingModelConfig,
  AudioTaggingResult,
} from '../../types/interfaces';
import type {
  AudioTaggingFileInput,
  AudioTaggingSamplesInput,
} from '../../types/api';
import type { Constructor } from './mixinUtils';

export function AudioTaggingMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private audioTagger: AudioTaggingInstance | null = null;

    async initAudioTagging(
      config: AudioTaggingModelConfig
    ): Promise<AudioTaggingInitResult> {
      try {
        await loadCombinedWasm();

        if (!window.SherpaOnnx.AudioTagging) {
          return { success: false, error: 'AudioTagging module not loaded' };
        }

        const debug = config.debug ? 1 : 0;
        const numThreads = 1; // WASM is single-threaded

        console.log(
          `[AudioTagging] Loading model (threads=${numThreads}, debug=${debug})...`
        );
        // Web-only: config.modelDir is set to '/wasm/audio-tagging' by ModelManagement
        // (createWebAudioTaggingModelState in constants.ts), pointing to model files
        // pre-served by download-web-models.sh. Native AudioTagging uses the TurboModule.
        const modelDir = config.modelDir || '/wasm/audio-tagging';
        const loadedModel = await window.SherpaOnnx.AudioTagging.loadModel({
          ced: `${modelDir}/model.onnx`,
          labels: `${modelDir}/labels.txt`,
          debug,
        });

        this.audioTagger = window.SherpaOnnx.AudioTagging.createAudioTagging(
          loadedModel,
          { topK: config.topK || 5, numThreads, debug }
        );

        console.log('[AudioTagging] Initialized successfully');
        return { success: true };
      } catch (error) {
        console.error('[AudioTagging] initAudioTagging failed:', error);
        return { success: false, error: (error as Error).message };
      }
    }

    async processAndComputeAudioTagging({
      filePath,
    }: AudioTaggingFileInput): Promise<AudioTaggingResult> {
      if (!this.audioTagger) {
        return {
          success: false,
          durationMs: 0,
          events: [],
          error: 'Audio tagging not initialized',
        };
      }
      try {
        const startMs = performance.now();
        const { samples, sampleRate } = await fetchAndDecodeAudio(filePath);

        const stream = this.audioTagger.createStream();
        this.audioTagger.acceptWaveform(stream, sampleRate, samples);
        const events = this.audioTagger.compute(stream, -1);
        this.audioTagger.destroyStream?.(stream);
        const durationMs = performance.now() - startMs;

        return {
          success: true,
          durationMs,
          events: events.map((e) => ({
            name: e.name,
            prob: e.prob,
            index: e.index,
          })),
        };
      } catch (error) {
        console.error(
          '[AudioTagging] processAndComputeAudioTagging failed:',
          error
        );
        return {
          success: false,
          durationMs: 0,
          events: [],
          error: (error as Error).message,
        };
      }
    }

    async processAndComputeAudioSamples({
      sampleRate,
      samples: rawSamples,
    }: AudioTaggingSamplesInput): Promise<AudioTaggingResult> {
      if (!this.audioTagger) {
        return {
          success: false,
          durationMs: 0,
          events: [],
          error: 'Audio tagging not initialized',
        };
      }
      try {
        const startMs = performance.now();
        const samples = new Float32Array(rawSamples);

        const stream = this.audioTagger.createStream();
        this.audioTagger.acceptWaveform(stream, sampleRate, samples);
        const events = this.audioTagger.compute(stream, -1);
        this.audioTagger.destroyStream?.(stream);
        const durationMs = performance.now() - startMs;

        return {
          success: true,
          durationMs,
          events: events.map((e) => ({
            name: e.name,
            prob: e.prob,
            index: e.index,
          })),
        };
      } catch (error) {
        console.error(
          '[AudioTagging] processAndComputeAudioSamples failed:',
          error
        );
        return {
          success: false,
          durationMs: 0,
          events: [],
          error: (error as Error).message,
        };
      }
    }

    async releaseAudioTagging(): Promise<{ released: boolean }> {
      if (this.audioTagger) {
        try {
          this.audioTagger.free();
        } catch (_) {
          console.error('[AudioTagging] releaseAudioTagging failed:', _);
        }
        this.audioTagger = null;
      }
      return { released: true };
    }
  };
}
