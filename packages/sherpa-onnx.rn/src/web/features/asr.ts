import { loadCombinedWasm } from '../wasmLoader';
import { decodeWav } from '../audioUtils';
import type {
  OnlineRecognizer,
  OnlineStream,
  OfflineRecognizer,
} from '../wasmTypes';
import type {
  AsrInitResult,
  AsrModelConfig,
  AsrRecognizeResult,
} from '../../types/interfaces';
import type { WaveformInput } from '../../types/api';
import { type Constructor, withDownloadProgress } from './mixinUtils';

/**
 * Model types that only support offline (non-streaming) recognition on web.
 * These have dedicated fields in the WASM offline recognizer config struct
 * (_initOfflineRecognizerConfig in sherpa-onnx-asr.js) but NOT in the online
 * config struct.
 */
const OFFLINE_ONLY_TYPES: ReadonlySet<string> = new Set([
  'whisper',
  'moonshine',
  'sense_voice',
  'fire_red_asr',
  'dolphin',
  'tdnn',
  'telespeech_ctc',
]);

/**
 * Normalize user-facing model type to the WASM loadModel type for online path.
 */
function toOnlineLoadType(rawType: string): string {
  switch (rawType) {
    case 'zipformer':
    case 'zipformer2':
    case 'nemo_transducer':
      return 'transducer';
    case 'nemo_ctc':
    case 'wenet_ctc':
    case 'zipformer2_ctc':
      return 'ctc';
    default:
      return rawType;
  }
}

/** Ensure a directory exists in the Emscripten virtual FS. */
function ensureDir(dir: string): void {
  try {
    if (!window.Module.FS.analyzePath(dir).exists) {
      window.Module.FS.mkdir(dir);
    }
  } catch {
    // Already exists
  }
}

/** Load a file from URL to the Emscripten virtual FS. Returns the FS path. */
async function loadFile(
  url: string,
  fsPath: string,
  debug: number
): Promise<string> {
  const result = await window.SherpaOnnx.FileSystem.safeLoadFile(
    url,
    fsPath,
    debug
  );
  if (!result) {
    throw new Error(`Failed to load model file: ${url}`);
  }
  return result.path;
}

/** Resolve a model file URL from config.modelFiles or a default name. */
function furl(
  fetchBase: string,
  mf: AsrModelConfig['modelFiles'] | undefined,
  key: keyof NonNullable<AsrModelConfig['modelFiles']>,
  defaultName: string
): string {
  return `${fetchBase}/${mf?.[key] || defaultName}`;
}

export function AsrMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    public asrOnlineRecognizer: OnlineRecognizer | null = null;
    public asrOnlineStream: OnlineStream | null = null;
    public asrOfflineRecognizer: OfflineRecognizer | null = null;

    async initAsr(config: AsrModelConfig): Promise<AsrInitResult> {
      try {
        await loadCombinedWasm();

        const debug = config.debug ? 1 : 0;
        const numThreads = 1;
        const sampleRate = 16000;
        const modelDir = config.modelDir || '/wasm/asr';
        const fetchBase = config.modelBaseUrl || modelDir;
        const rawType = config.modelType || 'transducer';

        // Offline if type is offline-only or user explicitly set streaming: false
        const useOffline =
          OFFLINE_ONLY_TYPES.has(rawType) || config.streaming === false;

        if (useOffline) {
          return await this._initOfflineAsr(config, {
            debug,
            numThreads,
            sampleRate,
            modelDir,
            fetchBase,
            rawType,
          });
        }
        return await this._initOnlineAsr(config, {
          debug,
          numThreads,
          sampleRate,
          modelDir,
          fetchBase,
          rawType,
        });
      } catch (error) {
        console.error('[ASR] initAsr failed:', error);
        return { success: false, error: (error as Error).message };
      }
    }

    /**
     * Online (streaming) ASR — uses WASM loadModel + createOnlineRecognizer.
     */
    async _initOnlineAsr(
      config: AsrModelConfig,
      opts: {
        debug: number;
        numThreads: number;
        sampleRate: number;
        modelDir: string;
        fetchBase: string;
        rawType: string;
      }
    ): Promise<AsrInitResult> {
      const { debug, numThreads, sampleRate, modelDir, fetchBase, rawType } =
        opts;
      const asrType = toOnlineLoadType(rawType);
      const mf = config.modelFiles;

      const loadedModel = await withDownloadProgress(config.onProgress, () =>
        window.SherpaOnnx.ASR.loadModel({
          type: asrType,
          encoder: furl(fetchBase, mf, 'encoder', 'encoder.onnx'),
          decoder: furl(fetchBase, mf, 'decoder', 'decoder.onnx'),
          joiner: furl(fetchBase, mf, 'joiner', 'joiner.onnx'),
          tokens: furl(fetchBase, mf, 'tokens', 'tokens.txt'),
          model: furl(fetchBase, mf, 'model', 'model.onnx'),
          modelDir,
          debug,
        })
      );

      this.asrOnlineRecognizer =
        window.SherpaOnnx.ASR.createOnlineRecognizer(loadedModel, {
          sampleRate,
          numThreads,
          debug,
          decodingMethod: config.decodingMethod ?? 'greedy_search',
          maxActivePaths: config.maxActivePaths ?? 4,
          enableEndpoint: config.streaming ? 1 : 0,
        });

      if (!this.asrOnlineRecognizer || !this.asrOnlineRecognizer.handle) {
        return {
          success: false,
          error: 'Failed to create online recognizer — WASM config error',
        };
      }

      return { success: true, sampleRate, modelType: rawType };
    }

    /**
     * Offline (non-streaming) ASR.
     * Loads model files to the Emscripten virtual FS and creates the
     * recognizer directly via the WASM OfflineRecognizer constructor,
     * which supports all model types (whisper, moonshine, sense_voice, etc.).
     */
    async _initOfflineAsr(
      config: AsrModelConfig,
      opts: {
        debug: number;
        numThreads: number;
        sampleRate: number;
        modelDir: string;
        fetchBase: string;
        rawType: string;
      }
    ): Promise<AsrInitResult> {
      const { debug, numThreads, sampleRate, modelDir, fetchBase, rawType } =
        opts;
      const mf = config.modelFiles;

      ensureDir(modelDir);

      const offlineConfig = await withDownloadProgress(
        config.onProgress,
        async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mc: Record<string, any> = {
            numThreads,
            debug,
            provider: 'cpu',
          };

          // All model types need tokens
          mc.tokens = await loadFile(
            furl(fetchBase, mf, 'tokens', 'tokens.txt'),
            `${modelDir}/tokens.txt`,
            debug
          );

          // Load type-specific model files and populate config fields
          // matching _initOfflineRecognizerConfig struct in sherpa-onnx-asr.js
          switch (rawType) {
            case 'whisper': {
              const [enc, dec] = await Promise.all([
                loadFile(
                  furl(fetchBase, mf, 'encoder', 'encoder.onnx'),
                  `${modelDir}/encoder.onnx`,
                  debug
                ),
                loadFile(
                  furl(fetchBase, mf, 'decoder', 'decoder.onnx'),
                  `${modelDir}/decoder.onnx`,
                  debug
                ),
              ]);
              mc.whisper = {
                encoder: enc,
                decoder: dec,
                language: '',
                task: 'transcribe',
              };
              break;
            }
            case 'moonshine': {
              const [prep, enc, uncDec, cDec] = await Promise.all([
                loadFile(
                  furl(fetchBase, mf, 'preprocessor', 'preprocessor.onnx'),
                  `${modelDir}/preprocessor.onnx`,
                  debug
                ),
                loadFile(
                  furl(fetchBase, mf, 'encoder', 'encoder.onnx'),
                  `${modelDir}/encoder.onnx`,
                  debug
                ),
                loadFile(
                  furl(fetchBase, mf, 'uncachedDecoder', 'uncached_decoder.onnx'),
                  `${modelDir}/uncached_decoder.onnx`,
                  debug
                ),
                loadFile(
                  furl(fetchBase, mf, 'cachedDecoder', 'cached_decoder.onnx'),
                  `${modelDir}/cached_decoder.onnx`,
                  debug
                ),
              ]);
              mc.moonshine = {
                preprocessor: prep,
                encoder: enc,
                uncachedDecoder: uncDec,
                cachedDecoder: cDec,
              };
              break;
            }
            case 'sense_voice': {
              const model = await loadFile(
                furl(fetchBase, mf, 'model', 'model.onnx'),
                `${modelDir}/model.onnx`,
                debug
              );
              mc.senseVoice = { model, language: '', useItn: false };
              break;
            }
            case 'fire_red_asr': {
              const [enc, dec] = await Promise.all([
                loadFile(
                  furl(fetchBase, mf, 'encoder', 'encoder.onnx'),
                  `${modelDir}/encoder.onnx`,
                  debug
                ),
                loadFile(
                  furl(fetchBase, mf, 'decoder', 'decoder.onnx'),
                  `${modelDir}/decoder.onnx`,
                  debug
                ),
              ]);
              mc.fireRedAsr = { encoder: enc, decoder: dec };
              break;
            }
            case 'dolphin': {
              const model = await loadFile(
                furl(fetchBase, mf, 'model', 'model.onnx'),
                `${modelDir}/model.onnx`,
                debug
              );
              mc.dolphin = { model };
              break;
            }
            case 'tdnn': {
              const model = await loadFile(
                furl(fetchBase, mf, 'model', 'model.onnx'),
                `${modelDir}/model.onnx`,
                debug
              );
              mc.tdnn = { model };
              break;
            }
            case 'telespeech_ctc': {
              mc.telespeechCtc = await loadFile(
                furl(fetchBase, mf, 'model', 'model.onnx'),
                `${modelDir}/model.onnx`,
                debug
              );
              break;
            }
            // Transducer variants (offline mode)
            case 'transducer':
            case 'zipformer':
            case 'zipformer2':
            case 'nemo_transducer': {
              const [enc, dec, join] = await Promise.all([
                loadFile(
                  furl(fetchBase, mf, 'encoder', 'encoder.onnx'),
                  `${modelDir}/encoder.onnx`,
                  debug
                ),
                loadFile(
                  furl(fetchBase, mf, 'decoder', 'decoder.onnx'),
                  `${modelDir}/decoder.onnx`,
                  debug
                ),
                loadFile(
                  furl(fetchBase, mf, 'joiner', 'joiner.onnx'),
                  `${modelDir}/joiner.onnx`,
                  debug
                ),
              ]);
              mc.transducer = { encoder: enc, decoder: dec, joiner: join };
              break;
            }
            // Paraformer (offline uses single model file, not encoder+decoder)
            case 'paraformer': {
              mc.paraformer = {
                model: await loadFile(
                  furl(fetchBase, mf, 'model', 'model.onnx'),
                  `${modelDir}/model.onnx`,
                  debug
                ),
              };
              break;
            }
            // CTC variants
            case 'nemo_ctc':
            case 'wenet_ctc':
            case 'zipformer2_ctc': {
              mc.nemoCtc = {
                model: await loadFile(
                  furl(fetchBase, mf, 'model', 'model.onnx'),
                  `${modelDir}/model.onnx`,
                  debug
                ),
              };
              break;
            }
            default:
              throw new Error(
                `Unsupported offline model type on web: ${rawType}`
              );
          }

          return {
            featConfig: { sampleRate, featureDim: 80 },
            modelConfig: mc,
            lmConfig: { model: '', scale: 0 },
            decodingMethod: config.decodingMethod ?? 'greedy_search',
            maxActivePaths: config.maxActivePaths ?? 4,
          };
        }
      );

      // Create offline recognizer directly via the WASM constructor.
      // This bypasses createOfflineRecognizer() which only handles
      // transducer/paraformer/ctc — _initOfflineRecognizerConfig handles all types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognizer = new (window as any).OfflineRecognizer(
        offlineConfig,
        window.Module
      );

      // Track resource for cleanup (matches createOfflineRecognizer behavior)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window.SherpaOnnx as any).trackResource) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.SherpaOnnx as any).trackResource('asr', recognizer);
      }

      if (!recognizer || !recognizer.handle) {
        return {
          success: false,
          error: 'Failed to create offline recognizer — WASM config error',
        };
      }

      this.asrOfflineRecognizer = recognizer;
      return { success: true, sampleRate, modelType: rawType };
    }

    async recognizeFromSamples({
      sampleRate,
      samples,
    }: WaveformInput): Promise<AsrRecognizeResult> {
      if (this.asrOfflineRecognizer) {
        return this._recognizeOffline(sampleRate, new Float32Array(samples));
      }
      if (!this.asrOnlineRecognizer) {
        return { success: false, text: '', error: 'ASR not initialized' };
      }
      return this._recognizeOnline(sampleRate, new Float32Array(samples));
    }

    async recognizeFromFile(filePath: string): Promise<AsrRecognizeResult> {
      if (!this.asrOfflineRecognizer && !this.asrOnlineRecognizer) {
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
        if (this.asrOfflineRecognizer) {
          return this._recognizeOffline(decoded.sampleRate, decoded.samples);
        }
        return this._recognizeOnline(decoded.sampleRate, decoded.samples);
      } catch (error) {
        return {
          success: false,
          text: '',
          error: (error as Error).message,
        };
      }
    }

    _recognizeOffline(
      sampleRate: number,
      float32: Float32Array
    ): AsrRecognizeResult {
      try {
        const stream = this.asrOfflineRecognizer!.createStream();
        try {
          stream.acceptWaveform(sampleRate, float32);
          this.asrOfflineRecognizer!.decode(stream);
          const result = stream.getResult();
          return { success: true, text: result.text };
        } finally {
          stream.free();
        }
      } catch (error) {
        return { success: false, text: '', error: (error as Error).message };
      }
    }

    _recognizeOnline(
      sampleRate: number,
      float32: Float32Array
    ): AsrRecognizeResult {
      try {
        const stream = this.asrOnlineRecognizer!.createStream();
        try {
          stream.acceptWaveform(sampleRate, float32);
          stream.inputFinished();
          while (this.asrOnlineRecognizer!.isReady(stream)) {
            this.asrOnlineRecognizer!.decode(stream);
          }
          const result = this.asrOnlineRecognizer!.getResult(stream);
          return { success: true, text: result.text };
        } finally {
          stream.free();
        }
      } catch (error) {
        return { success: false, text: '', error: (error as Error).message };
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
      if (this.asrOfflineRecognizer) {
        try {
          this.asrOfflineRecognizer.free();
        } catch (_) {
          console.error('[ASR] releaseAsr offline recognizer failed:', _);
        }
        this.asrOfflineRecognizer = null;
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
