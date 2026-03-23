import type { ApiInterface } from '../types/api';
import type {
  OnnxSessionConfig,
  OnnxSessionInfo,
  OnnxTensorData,
  OnnxInferenceResult,
  ValidateResult,
} from '../types/interfaces';
import { cleanFilePath } from '../utils/fileUtils';
import {
  typedArrayToBase64,
  base64ToTypedArray,
  type TypedTensorData,
} from '../utils/tensorUtils';

export interface OnnxSessionRunFeeds {
  [name: string]: {
    type: OnnxTensorData['type'];
    data: TypedTensorData;
    dims: number[];
  };
}

export interface OnnxSessionRunOutputs {
  [name: string]: {
    type: OnnxTensorData['type'];
    data: TypedTensorData;
    dims: number[];
  };
}

export class OnnxSession {
  readonly sessionId: string;
  readonly inputNames: string[];
  readonly outputNames: string[];
  readonly inputTypes: OnnxTensorData['type'][];
  readonly outputTypes: OnnxTensorData['type'][];

  private api: ApiInterface;

  constructor(api: ApiInterface, info: OnnxSessionInfo) {
    this.api = api;
    this.sessionId = info.sessionId;
    this.inputNames = info.inputNames;
    this.outputNames = info.outputNames;
    this.inputTypes = info.inputTypes ?? [];
    this.outputTypes = info.outputTypes ?? [];
  }

  async run(feeds: OnnxSessionRunFeeds): Promise<OnnxSessionRunOutputs> {
    // Convert TypedArray feeds to OnnxTensorData (base64) for the bridge
    const inputs: Record<string, OnnxTensorData> = {};
    for (const [name, tensor] of Object.entries(feeds)) {
      inputs[name] = {
        type: tensor.type,
        dims: tensor.dims,
        data: typedArrayToBase64(tensor.data),
      };
    }

    const result = await this.api.runOnnxSession(this.sessionId, inputs);
    if (!result.success || !result.outputs) {
      throw new Error(result.error || 'ONNX inference failed');
    }

    // Convert output base64 back to TypedArrays
    const outputs: OnnxSessionRunOutputs = {};
    for (const [name, tensorData] of Object.entries(result.outputs)) {
      outputs[name] = {
        type: tensorData.type,
        data: base64ToTypedArray(tensorData.data, tensorData.type),
        dims: tensorData.dims,
      };
    }
    return outputs;
  }

  async release(): Promise<void> {
    await this.api.releaseOnnxSession(this.sessionId);
  }
}

export class OnnxInferenceService {
  private api: ApiInterface;
  private sessions: Set<string> = new Set();

  constructor(api: ApiInterface) {
    this.api = api;
  }

  public validateLibrary(): Promise<ValidateResult> {
    return this.api.validateLibraryLoaded();
  }

  public async createSession(config: OnnxSessionConfig): Promise<OnnxSession> {
    const nativeConfig: OnnxSessionConfig = {
      modelPath: cleanFilePath(config.modelPath),
      numThreads: config.numThreads,
    };

    const result = await this.api.createOnnxSession(nativeConfig);

    if (!result.success) {
      throw new Error(result.error || 'Failed to create ONNX session');
    }

    this.sessions.add(result.sessionId);
    return new OnnxSession(this.api, result);
  }

  public async run(
    sessionId: string,
    inputs: Record<string, OnnxTensorData>
  ): Promise<OnnxInferenceResult> {
    try {
      return await this.api.runOnnxSession(sessionId, inputs);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  public async releaseSession(sessionId: string): Promise<{ released: boolean }> {
    try {
      const result = await this.api.releaseOnnxSession(sessionId);
      if (result.released) {
        this.sessions.delete(sessionId);
      }
      return result;
    } catch (error) {
      console.error('Error releasing ONNX session:', error);
      return { released: false };
    }
  }

  public async releaseAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions);
    for (const sessionId of sessionIds) {
      await this.releaseSession(sessionId);
    }
  }
}
