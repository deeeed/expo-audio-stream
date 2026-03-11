import { loadCombinedWasm } from '../wasmLoader';
import { fetchAndDecodeAudio } from '../audioUtils';
import type { SpokenLanguageIdInstance } from '../wasmTypes';

type Constructor<T = {}> = new (...args: any[]) => T;

export function LanguageIdMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private languageId: SpokenLanguageIdInstance | null = null;

    async initLanguageId(config: any): Promise<{
      success: boolean;
      error?: string;
    }> {
      try {
        await loadCombinedWasm();

        if (!window.SherpaOnnx.LanguageId) {
          return { success: false, error: 'LanguageId module not loaded' };
        }

        const debug = config?.debug ? 1 : 0;
        const numThreads = 1; // WASM is single-threaded

        console.log(`[LanguageId] Loading model (threads=${numThreads}, debug=${debug})...`);
        const loadedModel = await window.SherpaOnnx.LanguageId.loadModel({
          encoder: '/wasm/language-id/tiny-encoder.onnx',
          decoder: '/wasm/language-id/tiny-decoder.onnx',
          debug,
        });

        this.languageId = window.SherpaOnnx.LanguageId.createLanguageId(loadedModel, { numThreads, debug });
        console.log('[LanguageId] Initialized successfully');
        return { success: true };
      } catch (error) {
        console.error('[LanguageId] initLanguageId failed:', error);
        return { success: false, error: (error as Error).message };
      }
    }

    async detectLanguage(
      _sampleRate: number,
      _samples: number[]
    ): Promise<{
      success: boolean;
      language: string;
      durationMs: number;
      error?: string;
    }> {
      if (!this.languageId) {
        return { success: false, language: '', durationMs: 0, error: 'Language ID not initialized' };
      }
      try {
        const startMs = performance.now();
        const samples = new Float32Array(_samples);
        const stream = this.languageId.createStream();
        this.languageId.acceptWaveform(stream, _sampleRate, samples);
        const lang = this.languageId.compute(stream);
        const durationMs = performance.now() - startMs;
        return { success: true, language: lang, durationMs };
      } catch (error) {
        return { success: false, language: '', durationMs: 0, error: (error as Error).message };
      }
    }

    async detectLanguageFromFile(_filePath: string): Promise<{
      success: boolean;
      language: string;
      durationMs: number;
      error?: string;
    }> {
      if (!this.languageId) {
        return { success: false, language: '', durationMs: 0, error: 'Language ID not initialized' };
      }
      try {
        const startMs = performance.now();
        const { samples, sampleRate } = await fetchAndDecodeAudio(_filePath);
        const stream = this.languageId.createStream();
        this.languageId.acceptWaveform(stream, sampleRate, samples);
        const lang = this.languageId.compute(stream);
        const durationMs = performance.now() - startMs;
        return { success: true, language: lang, durationMs };
      } catch (error) {
        return { success: false, language: '', durationMs: 0, error: (error as Error).message };
      }
    }

    async releaseLanguageId(): Promise<{ released: boolean }> {
      if (this.languageId) {
        try { this.languageId.free(); } catch (_e) { /* ignore */ }
        this.languageId = null;
      }
      return { released: true };
    }
  };
}
