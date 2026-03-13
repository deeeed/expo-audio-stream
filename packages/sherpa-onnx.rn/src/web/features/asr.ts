import { loadCombinedWasm } from '../wasmLoader';
import { decodeWav } from '../audioUtils';
import type { OnlineRecognizer, OnlineStream } from '../wasmTypes';
import type {
  AsrInitResult,
  AsrModelConfig,
  AsrRecognizeResult,
} from '../../types/interfaces';
import type { WaveformInput } from '../../types/api';
import { type Constructor, withDownloadProgress } from './mixinUtils';

export function AsrMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private asrOnlineRecognizer: OnlineRecognizer | null = null;
    private asrOnlineStream: OnlineStream | null = null;

    async initAsr(config: AsrModelConfig): Promise<AsrInitResult> {
      try {
        await loadCombinedWasm();

        const debug = config.debug ? 1 : 0;
        const numThreads = 1; // WASM is single-threaded
        const sampleRate = 16000;
        // Web-only: config.modelDir is set to '/wasm/asr' by ModelManagement
        // (createWebAsrModelState in constants.ts), pointing to model files
        // pre-served by download-web-models.sh. Native ASR uses the TurboModule.
        const modelDir = config.modelDir || '/wasm/asr';
        const fetchBase = config.modelBaseUrl || modelDir;

        // Map model architecture names to ASR load types.
        // zipformer/zipformer2 models use the transducer architecture (encoder+decoder+joiner).
        const rawType = config.modelType || 'transducer';
        const asrType = ['zipformer', 'zipformer2'].includes(rawType)
          ? 'transducer'
          : rawType;

        const loadedModel = await withDownloadProgress(config.onProgress, () =>
          window.SherpaOnnx.ASR.loadModel({
            type: asrType,
            encoder: `${fetchBase}/encoder.onnx`,
            decoder: `${fetchBase}/decoder.onnx`,
            joiner: `${fetchBase}/joiner.onnx`,
            tokens: `${fetchBase}/tokens.txt`,
            modelDir,
            debug,
          })
        );

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
          return {
            success: false,
            error: 'Failed to create online recognizer — WASM config error',
          };
        }

        return { success: true, sampleRate, modelType: rawType };
      } catch (error) {
        console.error('[ASR] initAsr failed:', error);
        return { success: false, error: (error as Error).message };
      }
    }

    async recognizeFromSamples({
      sampleRate,
      samples,
    }: WaveformInput): Promise<AsrRecognizeResult> {
      if (!this.asrOnlineRecognizer) {
        return { success: false, text: '', error: 'ASR not initialized' };
      }
      try {
        const float32 = new Float32Array(samples);
        const stream = this.asrOnlineRecognizer.createStream();
        try {
          stream.acceptWaveform(sampleRate, float32);
          stream.inputFinished();
          while (this.asrOnlineRecognizer.isReady(stream)) {
            this.asrOnlineRecognizer.decode(stream);
          }
          const result = this.asrOnlineRecognizer.getResult(stream);
          return { success: true, text: result.text };
        } finally {
          stream.free();
        }
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
        try {
          stream.acceptWaveform(decoded.sampleRate, decoded.samples);
          stream.inputFinished();
          while (this.asrOnlineRecognizer.isReady(stream)) {
            this.asrOnlineRecognizer.decode(stream);
          }
          const result = this.asrOnlineRecognizer.getResult(stream);
          return { success: true, text: result.text };
        } finally {
          stream.free();
        }
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
        try {
          this.asrOnlineStream.free();
        } catch (_) {
          console.error('[ASR] releaseAsr stream failed:', _);
        }
        this.asrOnlineStream = null;
      }
      if (this.asrOnlineRecognizer) {
        try {
          this.asrOnlineRecognizer.free();
        } catch (_) {
          console.error('[ASR] releaseAsr recognizer failed:', _);
        }
        this.asrOnlineRecognizer = null;
      }
      return { released: true };
    }

    async createAsrOnlineStream(): Promise<{ success: boolean }> {
      if (!this.asrOnlineRecognizer) {
        return { success: false };
      }
      // Free previous stream if any
      if (this.asrOnlineStream) {
        try {
          this.asrOnlineStream.free();
        } catch (_) {
          /* ignore */
        }
      }
      this.asrOnlineStream = this.asrOnlineRecognizer.createStream();
      return { success: true };
    }

    async acceptAsrOnlineWaveform({
      sampleRate,
      samples,
    }: WaveformInput): Promise<{ success: boolean }> {
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
      return {
        isEndpoint: this.asrOnlineRecognizer.isEndpoint(this.asrOnlineStream),
      };
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
