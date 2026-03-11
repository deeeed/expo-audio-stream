import { loadCombinedWasm } from '../wasmLoader';
import type { ArchitectureInfo, SystemInfo } from '../../types/api';
import type {
  TestOnnxIntegrationResult,
  ValidateResult,
} from '../../types/interfaces';

type Constructor<T = {}> = new (...args: any[]) => T;

export function DiagnosticsMixin<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    async testOnnxIntegration(): Promise<TestOnnxIntegrationResult> {
      try {
        await loadCombinedWasm();
        return {
          success: true,
          status: 'Sherpa ONNX combined WASM integration is working',
        };
      } catch (error) {
        return {
          success: false,
          status: `Sherpa ONNX WASM failed: ${(error as Error).message}`,
        };
      }
    }

    async validateLibraryLoaded(): Promise<ValidateResult> {
      try {
        await loadCombinedWasm();
        return {
          loaded: true,
          status: 'Sherpa ONNX combined WASM loaded successfully',
        };
      } catch (error) {
        return {
          loaded: false,
          status: `Sherpa ONNX WASM failed to load: ${(error as Error).message}`,
        };
      }
    }

    async getArchitectureInfo(): Promise<ArchitectureInfo> {
      return {
        architecture: 'web',
        jsiAvailable: false,
        turboModulesEnabled: false,
        libraryLoaded: !!window._sherpaOnnxCombinedLoaded,
        currentThread: 'main',
        threadId: 1,
        moduleType: 'WASM',
      };
    }

    async getSystemInfo(): Promise<SystemInfo> {
      const isLibraryLoaded = !!window._sherpaOnnxCombinedLoaded;

      const memory: SystemInfo['memory'] = {
        maxMemoryMB: 0,
        totalMemoryMB: 0,
        freeMemoryMB: 0,
        usedMemoryMB: 0,
      };
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const pm = (performance as any).memory;
        if (pm) {
          memory.maxMemoryMB = (pm.jsHeapSizeLimit || 0) / 1048576;
          memory.totalMemoryMB = (pm.totalJSHeapSize || 0) / 1048576;
          memory.usedMemoryMB = (pm.usedJSHeapSize || 0) / 1048576;
          memory.freeMemoryMB = memory.totalMemoryMB - memory.usedMemoryMB;
        }
      }

      const userAgent = navigator.userAgent;
      const platformInfo =
        (navigator as any).userAgentData?.platform ||
        (navigator as any).platform ||
        'Unknown';
      const vendor = (navigator as any).vendor || 'Unknown';
      let brand = vendor;
      if (userAgent.includes('Chrome')) brand = 'Google';
      else if (userAgent.includes('Firefox')) brand = 'Mozilla';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
        brand = 'Apple';

      const gpu: SystemInfo['gpu'] = { webGLVersion: 'WebGL' };
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        const gl =
          canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl instanceof WebGLRenderingContext) {
          const info = gl.getExtension('WEBGL_debug_renderer_info');
          if (info) {
            const renderer = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
            gpu.webGLVersion = `WebGL (${renderer})`;
          }
        }
      }

      return {
        architecture: {
          type: 'old',
          description: 'Web (WASM)',
          jsiAvailable: false,
          turboModulesEnabled: false,
          moduleType: 'WASM',
        },
        memory,
        cpu: {
          availableProcessors: navigator.hardwareConcurrency || 1,
          supportedAbis: ['wasm32'],
        },
        device: {
          brand,
          model: platformInfo,
          device: 'browser',
          manufacturer: brand,
          webPlatform: userAgent,
        },
        gpu,
        libraryLoaded: isLibraryLoaded,
        thread: { currentThread: 'main', threadId: 1 },
      };
    }

    async extractTarBz2(
      _sourcePath: string,
      _targetDir: string
    ): Promise<{
      success: boolean;
      message: string;
      extractedFiles: string[];
    }> {
      return {
        success: false,
        message: 'Archive extraction not applicable in web version',
        extractedFiles: [],
      };
    }
  };
}
