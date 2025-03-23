import type { ValidateResult } from './types/interfaces';
import NativeSherpaOnnx from './NativeSherpaOnnx';

/**
 * Sherpa-onnx API wrapper for React Native
 * Minimal implementation for validation
 */
export class SherpaOnnxAPI {
  /**
   * Validate that the Sherpa-ONNX library is properly loaded
   * @returns Promise that resolves with validation result
   */
  public static async validateLibraryLoaded(): Promise<ValidateResult> {
    try {
      return await NativeSherpaOnnx.validateLibraryLoaded();
    } catch (error: any) {
      console.error('Failed to validate Sherpa-ONNX library:', error);
      return {
        loaded: false,
        status: `Error validating library: ${error?.message || 'Unknown error'}`,
      };
    }
  }
}
