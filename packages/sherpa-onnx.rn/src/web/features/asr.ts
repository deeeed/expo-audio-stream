import { loadCombinedWasm } from '../wasmLoader';
import { decodeWav } from '../audioUtils';
import type {
  OfflineRecognizer,
  OnlineRecognizer,
  OnlineStream,
} from '../wasmTypes';
import type {
  AsrInitResult,
  AsrModelConfig,
  AsrRecognizeResult,
} from '../../types/interfaces';

type Constructor<T = {}> = new (...args: any[]) => T;

export function AsrMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private asrRecognizer: OfflineRecognizer | null = null;
    private asrOnlineRecognizer: OnlineRecognizer | null = null;
    private asrOnlineStream: OnlineStream | null = null;

    async initAsr(config: AsrModelConfig): Promise<AsrInitResult> {
      try {
        await loadCombinedWasm();

        const debug = config.debug ? 1 : 0;
        const numThreads = 1; // WASM is single-threaded
        const sampleRate = 16000;
        const modelDir = config.modelDir || '/wasm/asr';

        // Map model architecture names to ASR load types.
        // zipformer/zipformer2 models use the transducer architecture (encoder+decoder+joiner).
        const rawType = config.modelType || 'transducer';
        const asrType = ['zipformer', 'zipformer2'].includes(rawType) ? 'transducer' : rawType;

        const loadedModel = await window.SherpaOnnx.ASR.loadModel({
          type: asrType,
          encoder: `${modelDir}/encoder.onnx`,
          decoder: `${modelDir}/decoder.onnx`,
          joiner: `${modelDir}/joiner.onnx`,
          tokens: `${modelDir}/tokens.txt`,
          debug,
        });

        this.asrOnlineRecognizer = window.SherpaOnnx.ASR.createOnlineRecognizer(
          loadedModel,
          {
            sampleRate,
            numThreads,
            debug,
            decodingMethod: config.decodingMethod ?? 'greedy_search',
            maxActivePaths: config.maxActivePaths ?? 4,
            enableEndpoint: config.streaming ? 1 : 0,
          }
        );

        if (!this.asrOnlineRecognizer || !this.asrOnlineRecognizer.handle) {
          return { success: false, error: 'Failed to create online recognizer — WASM config error' };
        }

        return { success: true, sampleRate, modelType: rawType };
      } catch (error) {
        console.error('[ASR] initAsr failed:', error);
        return { success: false, error: (error as Error).message };
      }
    }

    async recognizeFromSamples(
      sampleRate: number,
      samples: number[]
    ): Promise<AsrRecognizeResult> {
      if (!this.asrOnlineRecognizer) {
        return { success: false, text: '', error: 'ASR not initialized' };
      }
      try {
        const float32 = new Float32Array(samples);
        const stream = this.asrOnlineRecognizer.createStream();
        stream.acceptWaveform(sampleRate, float32);
        stream.inputFinished();
        while (this.asrOnlineRecognizer.isReady(stream)) {
          this.asrOnlineRecognizer.decode(stream);
        }
        const result = this.asrOnlineRecognizer.getResult(stream);
        stream.free();
        return { success: true, text: result.text };
      } catch (error) {
        return {
          success: false,
          text: '',
          error: (error as Error).message,
        };
      }
    }

    async recognizeFromFile(filePath: string): Promise<AsrRecognizeResult> {
      if (!this.asrOnlineRecognizer) {
        return { success: false, text: '', error: 'ASR not initialized' };
      }
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const decoded = decodeWav(buffer);
        if (!decoded) {
          throw new Error(
            'Unsupported audio format — only 16-bit PCM WAV is supported on web'
          );
        }
        const stream = this.asrOnlineRecognizer.createStream();
        stream.acceptWaveform(decoded.sampleRate, decoded.samples);
        stream.inputFinished();
        while (this.asrOnlineRecognizer.isReady(stream)) {
          this.asrOnlineRecognizer.decode(stream);
        }
        const result = this.asrOnlineRecognizer.getResult(stream);
        stream.free();
        return { success: true, text: result.text };
      } catch (error) {
        return {
          success: false,
          text: '',
          error: (error as Error).message,
        };
      }
    }

    async releaseAsr(): Promise<{ released: boolean }> {
      if (this.asrOnlineStream) {
        try { this.asrOnlineStream.free(); } catch (_e) { /* ignore */ }
        this.asrOnlineStream = null;
      }
      if (this.asrOnlineRecognizer) {
        try {
          this.asrOnlineRecognizer.free();
        } catch (_e) {
          // ignore
        }
        this.asrOnlineRecognizer = null;
      }
      if (this.asrRecognizer) {
        try {
          this.asrRecognizer.free();
        } catch (_e) {
          // ignore
        }
        this.asrRecognizer = null;
      }
      return { released: true };
    }

    async createAsrOnlineStream(): Promise<{ success: boolean }> {
      if (!this.asrOnlineRecognizer) {
        return { success: false };
      }
      // Free previous stream if any
      if (this.asrOnlineStream) {
        try { this.asrOnlineStream.free(); } catch (_) { /* ignore */ }
      }
      this.asrOnlineStream = this.asrOnlineRecognizer.createStream();
      return { success: true };
    }

    async acceptAsrOnlineWaveform(
      sampleRate: number,
      samples: number[]
    ): Promise<{ success: boolean }> {
      if (!this.asrOnlineRecognizer || !this.asrOnlineStream) {
        return { success: false };
      }
      const float32 = new Float32Array(samples);
      this.asrOnlineStream.acceptWaveform(sampleRate, float32);
      while (this.asrOnlineRecognizer.isReady(this.asrOnlineStream)) {
        this.asrOnlineRecognizer.decode(this.asrOnlineStream);
      }
      return { success: true };
    }

    async isAsrOnlineEndpoint(): Promise<{ isEndpoint: boolean }> {
      if (!this.asrOnlineRecognizer || !this.asrOnlineStream) {
        return { isEndpoint: false };
      }
      return { isEndpoint: this.asrOnlineRecognizer.isEndpoint(this.asrOnlineStream) };
    }

    async getAsrOnlineResult(): Promise<{
      text: string;
      tokens: string[];
      timestamps: number[];
    }> {
      if (!this.asrOnlineRecognizer || !this.asrOnlineStream) {
        return { text: '', tokens: [], timestamps: [] };
      }
      const result = this.asrOnlineRecognizer.getResult(this.asrOnlineStream);
      return { text: result.text, tokens: result.tokens ?? [], timestamps: [] };
    }

    async resetAsrOnlineStream(): Promise<{ success: boolean }> {
      if (!this.asrOnlineRecognizer || !this.asrOnlineStream) {
        return { success: false };
      }
      this.asrOnlineRecognizer.reset(this.asrOnlineStream);
      return { success: true };
    }
  };
}
