import { loadCombinedWasm } from '../wasmLoader';
import type { KwsSpotter, KwsStream } from '../wasmTypes';
import type { WaveformInput } from '../../types/api';

type Constructor<T = {}> = new (...args: any[]) => T;

export function KwsMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private kwsSpotter: KwsSpotter | null = null;
    private kwsStream: KwsStream | null = null;

    async initKws(config: any): Promise<{ success: boolean; error?: string }> {
      try {
        await loadCombinedWasm();

        const debug = config?.debug ? 1 : 0;
        const numThreads = 1; // WASM is single-threaded
        const M = window.Module;

        const keywordsFile = config?.keywordsFile || 'keywords.txt';
        const modelDir = config?.modelDir || '/wasm/kws';

        // Ensure WASM FS directories exist
        const dirParts = modelDir.split('/').filter((p: string) => p);
        let currentDir = '';
        for (const part of dirParts) {
          currentDir += '/' + part;
          try { M.FS.mkdir(currentDir); } catch (_e) { /* exists */ }
        }
        try { M.FS.mkdir(modelDir + '/test_wavs'); } catch (_e) { /* exists */ }

        // Load model files into WASM FS (fetch from public URL, write to same path)
        const files = [
          { url: `${modelDir}/encoder.onnx`, dest: `${modelDir}/encoder.onnx` },
          { url: `${modelDir}/decoder.onnx`, dest: `${modelDir}/decoder.onnx` },
          { url: `${modelDir}/joiner.onnx`, dest: `${modelDir}/joiner.onnx` },
          { url: `${modelDir}/tokens.txt`, dest: `${modelDir}/tokens.txt` },
          { url: `${modelDir}/${keywordsFile}`, dest: `${modelDir}/keywords.txt` },
        ];

        for (const f of files) {
          try {
            if (M.FS.analyzePath(f.dest).exists) continue;
          } catch (_e) { /* not found */ }
          const resp = await fetch(f.url);
          if (!resp.ok) throw new Error(`Failed to fetch ${f.url}: HTTP ${resp.status}`);
          const data = await resp.arrayBuffer();
          M.FS.writeFile(f.dest, new Uint8Array(data));
        }

        // Build config — all string fields must be set (not undefined/null)
        // to avoid NULL pointer issues in the WASM C struct
        const configObj = {
          featConfig: { samplingRate: 16000, featureDim: 80 },
          modelConfig: {
            transducer: {
              encoder: `${modelDir}/encoder.onnx`,
              decoder: `${modelDir}/decoder.onnx`,
              joiner: `${modelDir}/joiner.onnx`,
            },
            tokens: `${modelDir}/tokens.txt`,
            provider: 'cpu',
            modelType: '',
            numThreads,
            debug,
            modelingUnit: '',
            bpeVocab: '',
          },
          maxActivePaths: config?.maxActivePaths ?? 4,
          numTrailingBlanks: config?.numTrailingBlanks ?? 1,
          keywordsScore: config?.keywordsScore ?? 1.0,
          keywordsThreshold: config?.keywordsThreshold ?? 0.25,
          keywordsFile: `${modelDir}/keywords.txt`,
        };

        // Create KWS via global createKws/Kws (from sherpa-onnx-kws.js)
        const createKwsFn = (window as any).createKws;
        const KwsCtor = (window as any).Kws;
        if (typeof createKwsFn === 'function') {
          this.kwsSpotter = createKwsFn(M, configObj) as KwsSpotter;
        } else if (typeof KwsCtor === 'function') {
          this.kwsSpotter = new KwsCtor(configObj, M) as KwsSpotter;
        } else {
          return { success: false, error: 'Neither createKws nor Kws available on window' };
        }

        if (!this.kwsSpotter?.handle) {
          return { success: false, error: 'KWS spotter creation failed (null handle)' };
        }

        this.kwsStream = this.kwsSpotter.createStream();
        if (!this.kwsStream?.handle) {
          return { success: false, error: 'KWS stream creation failed (null handle)' };
        }

        return { success: true };
      } catch (error) {
        console.error('[KWS] initKws failed:', error);
        return { success: false, error: (error as Error).message };
      }
    }

    async acceptKwsWaveform({ sampleRate, samples }: WaveformInput): Promise<{
      success: boolean;
      detected: boolean;
      keyword: string;
      error?: string;
    }> {
      if (!this.kwsSpotter || !this.kwsStream) {
        return {
          success: false,
          detected: false,
          keyword: '',
          error: 'KWS not initialized',
        };
      }
      try {
        const float32 = new Float32Array(samples);

        this.kwsStream.acceptWaveform(sampleRate, float32);

        let detectedKeyword = '';
        while (this.kwsSpotter.isReady(this.kwsStream)) {
          this.kwsSpotter.decode(this.kwsStream);
          const result = this.kwsSpotter.getResult(this.kwsStream);
          if (result.keyword && result.keyword.trim() !== '') {
            detectedKeyword = result.keyword;
            this.kwsSpotter.reset(this.kwsStream);
            break;
          }
        }

        return {
          success: true,
          detected: detectedKeyword !== '',
          keyword: detectedKeyword,
        };
      } catch (error) {
        return {
          success: false,
          detected: false,
          keyword: '',
          error: (error as Error).message,
        };
      }
    }

    async resetKwsStream(): Promise<{ success: boolean }> {
      if (this.kwsSpotter && this.kwsStream) {
        try {
          this.kwsStream.free();
          this.kwsStream = this.kwsSpotter.createStream();
        } catch (_) {
          console.error('[KWS] resetKwsStream failed:', _);
        }
      }
      return { success: true };
    }

    async releaseKws(): Promise<{ released: boolean }> {
      if (this.kwsStream) {
        try {
          this.kwsStream.free();
        } catch (_) {
          console.error('[KWS] releaseKws stream failed:', _);
        }
        this.kwsStream = null;
      }
      if (this.kwsSpotter) {
        try {
          this.kwsSpotter.free();
        } catch (_) {
          console.error('[KWS] releaseKws spotter failed:', _);
        }
        this.kwsSpotter = null;
      }
      return { released: true };
    }
  };
}
