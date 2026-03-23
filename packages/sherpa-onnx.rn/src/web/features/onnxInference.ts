import type { OnnxTensorData, OnnxSessionInfo, OnnxInferenceResult } from '../../types/interfaces';
import type { Constructor } from './mixinUtils';
import { base64ToTypedArray, typedArrayToBase64 } from '../../utils/tensorUtils';

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
          outputs[name] = {
            type: tensor.type as OnnxTensorData['type'],
            dims: [...tensor.dims],
            data: typedArrayToBase64(tensor.data),
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
