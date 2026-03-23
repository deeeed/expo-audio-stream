import type { ApiInterface } from '../types/api';
import type {
  OnnxSessionConfig,
  OnnxSessionInfo,
  OnnxTensorData,
  OnnxInferenceResult,
  ValidateResult,
} from '../types/interfaces';
import { cleanFilePath } from '../utils/fileUtils';

export class OnnxInferenceService {
  private api: ApiInterface;
  private sessions: Set<string> = new Set();

  constructor(api: ApiInterface) {
    this.api = api;
  }

  public validateLibrary(): Promise<ValidateResult> {
    return this.api.validateLibraryLoaded();
  }

  public async createSession(config: OnnxSessionConfig): Promise<OnnxSessionInfo> {
    try {
      const nativeConfig: OnnxSessionConfig = {
        modelPath: cleanFilePath(config.modelPath),
        numThreads: config.numThreads,
      };

      const result = await this.api.createOnnxSession(nativeConfig);

      if (result.success && result.sessionId) {
        this.sessions.add(result.sessionId);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        sessionId: '',
        inputNames: [],
        outputNames: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
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
