import type { OnnxTensorData, OnnxSessionInfo, OnnxInferenceResult } from '../../types/interfaces';
import type { Constructor } from './mixinUtils';

// Minimal onnxruntime-web types (detected at runtime via window.ort)
interface OrtInferenceSession {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
  release(): Promise<void>;
}

interface OrtTensor {
  type: string;
  dims: readonly number[];
  data: Float32Array | BigInt64Array | Int32Array | Uint8Array | Float64Array;
}

interface OrtNamespace {
  InferenceSession: {
    create(path: string, options?: unknown): Promise<OrtInferenceSession>;
  };
  Tensor: {
    new (
      type: string,
      data: ArrayLike<number> | ArrayLike<bigint> | Float32Array | BigInt64Array | Int32Array | Uint8Array,
      dims: readonly number[]
    ): OrtTensor;
  };
}

declare global {
  interface Window {
    ort?: OrtNamespace;
  }
}

const BYTES_PER_ELEMENT: Record<string, number> = {
  float32: 4,
  float64: 8,
  int64: 8,
  int32: 4,
  int8: 1,
  uint8: 1,
  bool: 1,
};

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToTypedArray(
  b64: string,
  type: string
): Float32Array | BigInt64Array | Int32Array | Uint8Array | Float64Array {
  const bytes = base64ToBytes(b64);
  const ab = bytes.buffer;
  const off = bytes.byteOffset;
  const len = bytes.byteLength;
  switch (type) {
    case 'float32':
      return new Float32Array(ab, off, len / 4);
    case 'float64':
      return new Float64Array(ab, off, len / 8);
    case 'int64':
      return new BigInt64Array(ab, off, len / 8);
    case 'int32':
      return new Int32Array(ab, off, len / 4);
    default:
      return new Uint8Array(ab, off, len);
  }
}

export function OnnxInferenceMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    /** @internal */ _onnxSessions: Map<string, unknown> = new Map();
    /** @internal */ _onnxNextId = 0;

    async createOnnxSession(config: {
      modelPath: string;
      numThreads?: number;
    }): Promise<OnnxSessionInfo> {
      if (!window.ort) {
        return {
          success: false,
          sessionId: '',
          inputNames: [],
          outputNames: [],
          error: 'onnxruntime-web not loaded. Add <script src="ort.min.js"> to your page.',
        };
      }

      try {
        const options = config.numThreads
          ? { intraOpNumThreads: config.numThreads }
          : undefined;
        const session = await window.ort.InferenceSession.create(
          config.modelPath,
          options
        );
        this._onnxNextId++;
        const sessionId = `web_onnx_${this._onnxNextId}`;
        this._onnxSessions.set(sessionId, session);

        return {
          success: true,
          sessionId,
          inputNames: [...session.inputNames],
          outputNames: [...session.outputNames],
        };
      } catch (e) {
        return {
          success: false,
          sessionId: '',
          inputNames: [],
          outputNames: [],
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    async runOnnxSession(
      sessionId: string,
      inputs: Record<string, OnnxTensorData>
    ): Promise<OnnxInferenceResult> {
      if (!window.ort) {
        return { success: false, error: 'onnxruntime-web not loaded.' };
      }
      const session = this._onnxSessions.get(sessionId) as OrtInferenceSession | undefined;
      if (!session) {
        return {
          success: false,
          error: `Session not found: ${sessionId}`,
        };
      }

      try {
        // Convert OnnxTensorData to ort.Tensor
        const feeds: Record<string, OrtTensor> = {};
        for (const [name, td] of Object.entries(inputs)) {
          const typedData = base64ToTypedArray(td.data, td.type);
          feeds[name] = new window.ort!.Tensor(td.type, typedData, td.dims);
        }

        const results = await session.run(feeds);

        // Convert ort.Tensor outputs to OnnxTensorData
        const outputs: Record<string, OnnxTensorData> = {};
        for (const [name, tensor] of Object.entries(results)) {
          const data = tensor.data;
          const rawBytes = new Uint8Array(
            (data as unknown as { buffer: ArrayBuffer }).buffer ??
              (data as unknown as ArrayBuffer),
            (data as unknown as { byteOffset: number }).byteOffset ?? 0,
            (data as unknown as { byteLength: number }).byteLength ??
              data.length * (BYTES_PER_ELEMENT[tensor.type] ?? 4)
          );
          outputs[name] = {
            type: tensor.type as OnnxTensorData['type'],
            dims: [...tensor.dims],
            data: bytesToBase64(rawBytes),
          };
        }

        return { success: true, outputs };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }

    async releaseOnnxSession(
      sessionId: string
    ): Promise<{ released: boolean }> {
      const session = this._onnxSessions.get(sessionId) as OrtInferenceSession | undefined;
      if (!session) {
        return { released: false };
      }
      try {
        await session.release();
      } catch {
        // Ignore release errors
      }
      this._onnxSessions.delete(sessionId);
      return { released: true };
    }
  };
}
