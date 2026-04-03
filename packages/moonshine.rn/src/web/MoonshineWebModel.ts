import llamaTokenizer from 'llama-tokenizer-js';
import { detectMoonshineOnnxRuntimeWasmBasePath } from './config';
import type { WebOrtRuntime, WebOrtSession, WebOrtTensor } from './ort-types';

type WebModelShape = {
  headDim: number;
  numKVHeads: number;
  numLayers: number;
};

type LoadedSessions = {
  decoderSession: WebOrtSession;
  encoderSession: WebOrtSession;
};

type ModelPathSource = {
  kind: 'path';
  modelBasePath: string;
};

type ModelUrlSource = {
  kind: 'urls';
  decoderUrl: string;
  encoderUrl: string;
};

type WebModelSource = ModelPathSource | ModelUrlSource;

const MODEL_SHAPES: Record<'tiny' | 'base', WebModelShape> = {
  tiny: {
    numLayers: 6,
    numKVHeads: 8,
    headDim: 36,
  },
  base: {
    numLayers: 8,
    numKVHeads: 8,
    headDim: 52,
  },
};

const SESSION_CACHE = new Map<string, Promise<LoadedSessions>>();

function requireOrtRuntime(): WebOrtRuntime {
  const runtime = (globalThis as { ort?: WebOrtRuntime }).ort;
  if (!runtime?.InferenceSession || !runtime?.Tensor || !runtime?.env?.wasm) {
    throw new Error(
      'Moonshine web requires window.ort to be loaded before use. Load ort.min.js and configure its wasm path before creating a transcriber.'
    );
  }
  return runtime;
}

function argMax(values: Float32Array): number {
  let bestIndex = 0;
  let bestValue = values[0] ?? Number.NEGATIVE_INFINITY;
  for (let index = 1; index < values.length; index += 1) {
    const value = values[index] ?? Number.NEGATIVE_INFINITY;
    if (value > bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function createBoolTensor(value: boolean): WebOrtTensor {
  const runtime = requireOrtRuntime();
  return new runtime.Tensor('bool', new Uint8Array([value ? 1 : 0]), [1]);
}

function createInt64Tensor(values: number[]): WebOrtTensor {
  const runtime = requireOrtRuntime();
  return new runtime.Tensor('int64', BigInt64Array.from(values.map(BigInt)), [
    1,
    values.length,
  ]);
}

async function readTensorData(tensor: WebOrtTensor): Promise<Float32Array> {
  if (tensor.getData) {
    return (await tensor.getData()) as Float32Array;
  }
  return tensor.data as Float32Array;
}

export class MoonshineWebModel {
  private decoderSession: WebOrtSession | null = null;
  private encoderSession: WebOrtSession | null = null;
  private lastLatencyMs: number | undefined;

  public constructor(
    private readonly modelArch: 'tiny' | 'base',
    private readonly source: WebModelSource
  ) {}

  public getLatency(): number | undefined {
    return this.lastLatencyMs;
  }

  public async load(): Promise<void> {
    if (this.encoderSession && this.decoderSession) {
      return;
    }

    const runtime = requireOrtRuntime();
    runtime.env.wasm.wasmPaths = detectMoonshineOnnxRuntimeWasmBasePath();

    const sessionOptions = {
      executionProviders: ['wasm'],
    };

    let loadedSessions: LoadedSessions;
    if (this.source.kind === 'urls') {
      loadedSessions = {
        decoderSession: await runtime.InferenceSession.create(
          this.source.decoderUrl,
          sessionOptions
        ),
        encoderSession: await runtime.InferenceSession.create(
          this.source.encoderUrl,
          sessionOptions
        ),
      };
    } else {
      const quantizedBasePath = this.source.modelBasePath.endsWith('/quantized')
        ? this.source.modelBasePath
        : `${this.source.modelBasePath}/quantized`;
      const cacheKey = `${this.modelArch}::${quantizedBasePath}`;

      let sessionsPromise = SESSION_CACHE.get(cacheKey);
      if (!sessionsPromise) {
        sessionsPromise = (async () => {
          const encoderSession = await runtime.InferenceSession.create(
            `${quantizedBasePath}/encoder_model.onnx`,
            sessionOptions
          );
          const decoderSession = await runtime.InferenceSession.create(
            `${quantizedBasePath}/decoder_model_merged.onnx`,
            sessionOptions
          );
          return { decoderSession, encoderSession };
        })();
        SESSION_CACHE.set(cacheKey, sessionsPromise);
      }

      loadedSessions = await sessionsPromise;
    }

    this.encoderSession = loadedSessions.encoderSession;
    this.decoderSession = loadedSessions.decoderSession;
  }

  public async transcribe(audio: Float32Array): Promise<string> {
    await this.load();

    if (!this.encoderSession || !this.decoderSession) {
      throw new Error('Moonshine web model is not loaded');
    }

    const runtime = requireOrtRuntime();
    const shape = MODEL_SHAPES[this.modelArch];
    const startedAt = performance.now();
    const maxLength = Math.max(1, Math.trunc((audio.length / 16000) * 6));

    const encoderOutput = await this.encoderSession.run({
      input_values: new runtime.Tensor('float32', audio, [1, audio.length]),
    });

    const emptyPastKeyValues = Object.fromEntries(
      Array.from({ length: shape.numLayers }, (_, layerIndex) =>
        ['decoder', 'encoder'].flatMap((branch) =>
          ['key', 'value'].map((kind) => [
            `past_key_values.${layerIndex}.${branch}.${kind}`,
            new runtime.Tensor('float32', new Float32Array(0), [
              0,
              shape.numKVHeads,
              1,
              shape.headDim,
            ]),
          ])
        )
      ).flat()
    ) as Record<string, WebOrtTensor>;

    const tokens = [1];
    let nextInputIds = [1];
    let pastKeyValues = emptyPastKeyValues;

    for (let index = 0; index < maxLength; index += 1) {
      const decoderInput: Record<string, WebOrtTensor> = {
        input_ids: createInt64Tensor(nextInputIds),
        encoder_hidden_states: encoderOutput.last_hidden_state as WebOrtTensor,
        use_cache_branch: createBoolTensor(index > 0),
        ...pastKeyValues,
      };

      const decoderOutput = await this.decoderSession.run(decoderInput);
      const logitsTensor = decoderOutput.logits as WebOrtTensor;
      const logits = await readTensorData(logitsTensor);
      const nextToken = argMax(logits);
      tokens.push(nextToken);

      if (nextToken === 2) {
        break;
      }

      nextInputIds = [nextToken];

      const presentKeyValues = Object.entries(decoderOutput)
        .filter(([key]) => key.includes('present'))
        .map(([, value]) => value as WebOrtTensor);

      Object.keys(pastKeyValues).forEach((key, presentIndex) => {
        const tensor = presentKeyValues[presentIndex];
        if (!tensor) {
          return;
        }
        if (index === 0 || key.includes('decoder')) {
          pastKeyValues[key] = tensor;
        }
      });
    }

    this.lastLatencyMs = performance.now() - startedAt;
    return llamaTokenizer.decode(tokens.slice(0, -1));
  }
}
