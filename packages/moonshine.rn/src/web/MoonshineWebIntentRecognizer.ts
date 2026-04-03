import { detectMoonshineOnnxRuntimeWasmBasePath } from './config';
import { MoonshineWebBinTokenizer } from './MoonshineWebBinTokenizer';

type WebOrtTensor = {
  data: unknown;
  dims: number[];
  getData?: () => Promise<unknown>;
};

type WebOrtSession = {
  run(feeds: Record<string, WebOrtTensor>): Promise<Record<string, WebOrtTensor>>;
};

type WebOrtRuntime = {
  env: {
    wasm: {
      wasmPaths: string;
    };
  };
  InferenceSession: {
    create(
      path: string,
      options?: {
        executionProviders?: string[];
        externalData?: Array<
          | string
          | {
              data: ArrayBuffer | Uint8Array;
              path: string;
            }
        >;
      }
    ): Promise<WebOrtSession>;
  };
  Tensor: new (
    type: string,
    data: Float32Array | Uint8Array | BigInt64Array,
    dims: number[]
  ) => WebOrtTensor;
};

type LoadedIntentModel = {
  session: WebOrtSession;
  tokenizer: MoonshineWebBinTokenizer;
};

const BOS_TOKEN_ID = 2;
const EOS_TOKEN_ID = 1;
const MAX_SEQUENCE_LENGTH = 2048;
const MODEL_CACHE = new Map<string, Promise<LoadedIntentModel>>();

function requireOrtRuntime(): WebOrtRuntime {
  const runtime = (globalThis as { ort?: WebOrtRuntime }).ort;
  if (!runtime?.InferenceSession || !runtime?.Tensor || !runtime?.env?.wasm) {
    throw new Error(
      'Moonshine web requires window.ort to be loaded before use. Load ort.min.js and configure its wasm path before creating an intent recognizer.'
    );
  }
  return runtime;
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

function normalizeEmbedding(values: Float32Array): Float32Array {
  let sumSquares = 0;
  for (const value of values) {
    sumSquares += value * value;
  }
  const norm = Math.sqrt(sumSquares);
  if (norm <= 0) {
    return values;
  }
  const normalized = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    normalized[index] = values[index]! / norm;
  }
  return normalized;
}

function cosineSimilarity(
  left: Float32Array,
  right: Float32Array
): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }
  let dotProduct = 0;
  for (let index = 0; index < left.length; index += 1) {
    dotProduct += (left[index] ?? 0) * (right[index] ?? 0);
  }
  return dotProduct;
}

function resolveIntentModelFileName(modelVariant?: string): string {
  const variant = modelVariant?.trim() || 'q4';
  switch (variant) {
    case 'fp32':
      return 'model.onnx';
    case 'fp16':
      return 'model_fp16.onnx';
    case 'q8':
    case 'quantized':
      return 'model_quantized.onnx';
    case 'q4':
      return 'model_q4.onnx';
    case 'q4f16':
      return 'model_q4f16.onnx';
    default:
      throw new Error(`Unsupported Moonshine web intent model variant: ${variant}`);
  }
}

function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value[end - 1] === '/') {
    end -= 1;
  }
  return value.slice(0, end);
}

function joinPath(basePath: string, fileName: string): string {
  const trimmed = trimTrailingSlashes(basePath);
  return `${trimmed}/${fileName}`;
}

async function fetchRequiredBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Moonshine web asset: ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export class MoonshineWebIntentRecognizerModel {
  private session: WebOrtSession | null = null;
  private tokenizer: MoonshineWebBinTokenizer | null = null;

  public constructor(
    private readonly modelPath: string,
    private readonly modelVariant: string
  ) {}

  public async getEmbedding(text: string): Promise<Float32Array> {
    await this.load();

    if (!this.session || !this.tokenizer) {
      throw new Error('Moonshine web intent model is not loaded');
    }

    const tokenIds = this.tokenize(text);
    const attentionMask = new Array(tokenIds.length).fill(1);
    const output = await this.session.run({
      attention_mask: createInt64Tensor(attentionMask),
      input_ids: createInt64Tensor(tokenIds),
    });
    const embeddingTensor = output.sentence_embedding as WebOrtTensor | undefined;
    if (!embeddingTensor) {
      throw new Error('Moonshine web intent model did not return sentence_embedding');
    }

    return normalizeEmbedding(await readTensorData(embeddingTensor));
  }

  public async load(): Promise<void> {
    if (this.session && this.tokenizer) {
      return;
    }

    const runtime = requireOrtRuntime();
    runtime.env.wasm.wasmPaths = detectMoonshineOnnxRuntimeWasmBasePath();

    const modelUrl = joinPath(
      this.modelPath,
      resolveIntentModelFileName(this.modelVariant)
    );
    const modelFileName = modelUrl.split('/').pop();
    if (!modelFileName) {
      throw new Error(`Invalid Moonshine web intent model URL: ${modelUrl}`);
    }
    const externalDataFileName = `${modelFileName}_data`;
    const externalDataUrl = joinPath(this.modelPath, externalDataFileName);
    const tokenizerUrl = joinPath(this.modelPath, 'tokenizer.bin');
    const cacheKey = `${modelUrl}::${externalDataFileName}::${tokenizerUrl}`;

    let loadPromise = MODEL_CACHE.get(cacheKey);
    if (!loadPromise) {
      loadPromise = (async () => {
        const [tokenizer, externalDataBytes] = await Promise.all([
          MoonshineWebBinTokenizer.fromUrl(tokenizerUrl),
          fetchRequiredBytes(externalDataUrl),
        ]);
        const session = await runtime.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
          externalData: [
            {
              data: externalDataBytes,
              path: externalDataFileName,
            },
          ],
        });
        return { session, tokenizer };
      })();
      MODEL_CACHE.set(cacheKey, loadPromise);
    }

    const loaded = await loadPromise;
    this.session = loaded.session;
    this.tokenizer = loaded.tokenizer;
  }

  public similarity(
    left: Float32Array,
    right: Float32Array
  ): number {
    return cosineSimilarity(left, right);
  }

  private tokenize(text: string): number[] {
    const rawTokens = this.tokenizer?.textToTokens(text) ?? [];
    const tokens = [BOS_TOKEN_ID, ...rawTokens, EOS_TOKEN_ID];
    if (tokens.length > MAX_SEQUENCE_LENGTH) {
      tokens.length = MAX_SEQUENCE_LENGTH;
      tokens[tokens.length - 1] = EOS_TOKEN_ID;
    }
    return tokens;
  }
}
