import { loadCombinedWasm } from '../wasmLoader';
import { samplesToWav, playAudioSamples } from '../audioUtils';
import type { OfflineTtsInstance } from '../wasmTypes';
import type {
  TtsGenerateConfig,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
} from '../../types/interfaces';

type Constructor<T = {}> = new (...args: any[]) => T;

export function TtsMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    private tts: OfflineTtsInstance | null = null;
    private ttsSampleRate = 0;
    private ttsNumSpeakers = 0;

    async initTts(config: TtsModelConfig): Promise<TtsInitResult> {
      try {
        await loadCombinedWasm();

        const debug = config.debug ? 1 : 0;
        const numThreads = 1; // WASM is single-threaded

        console.log(
          `[TTS] Loading ${config.ttsModelType || 'vits'} model (threads=${numThreads}, debug=${debug})...`
        );
        const loadedModel = await window.SherpaOnnx.TTS.loadModel({
          type: config.ttsModelType || 'vits',
          model: '/wasm/tts/model.onnx',
          tokens: '/wasm/tts/tokens.txt',
          espeakDataZip: '/wasm/tts/espeak-ng-data.zip',
          debug,
        });

        this.tts = window.SherpaOnnx.TTS.createOfflineTts(loadedModel, {
          numThreads,
          debug,
        });
        this.ttsSampleRate = this.tts.sampleRate;
        this.ttsNumSpeakers = this.tts.numSpeakers;

        console.log(
          `[TTS] Initialized: sampleRate=${this.ttsSampleRate}, numSpeakers=${this.ttsNumSpeakers}`
        );

        return {
          success: true,
          sampleRate: this.ttsSampleRate,
          numSpeakers: this.ttsNumSpeakers,
        };
      } catch (error) {
        console.error('[TTS] initTts failed:', error);
        return {
          success: false,
          sampleRate: 0,
          numSpeakers: 0,
          error: (error as Error).message,
        };
      }
    }

    async generateTts(config: TtsGenerateConfig): Promise<TtsGenerateResult> {
      if (!this.tts) {
        return { success: false };
      }
      try {
        const audio = this.tts.generate({
          text: config.text,
          sid: config.speakerId,
          speed: config.speakingRate,
        });
        const samples = new Float32Array(audio.samples);
        const result: TtsGenerateResult = { success: true };

        if (config.playAudio) {
          await playAudioSamples(samples, audio.sampleRate);
        }
        if (config.fileNamePrefix) {
          const wav = samplesToWav(samples, audio.sampleRate);
          result.filePath = URL.createObjectURL(wav);
        }
        return result;
      } catch (error) {
        console.error('[TTS] generateTts failed:', error);
        return { success: false };
      }
    }

    async stopTts(): Promise<{ stopped: boolean; message?: string }> {
      return { stopped: true };
    }

    async releaseTts(): Promise<{ released: boolean }> {
      if (this.tts) {
        try {
          this.tts.free();
        } catch (_) {
          console.error('[TTS] releaseTts failed:', _);
        }
        this.tts = null;
      }
      return { released: true };
    }
  };
}
