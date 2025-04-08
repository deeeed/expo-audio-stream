/**
 * Minimal web utilities for Sherpa-ONNX - handles WASM script loading only
 */
import { Platform } from 'react-native';

// Internal state - only accessed in web environments
let wasmModule: any = null;
let isLoading = false;

// Check if WASM module is available
export const isWasmAvailable = (): boolean =>
  Platform.OS === 'web' && wasmModule !== null;

// Get the WASM module
export const getWasmModule = (): any =>
  Platform.OS === 'web' ? wasmModule : null;

// Config options
export interface WasmLoadOptions {
  mainScriptUrl?: string;
  modulePaths?: string[];
}

// Load the WASM module
export const loadWasmModule = async (
  options?: WasmLoadOptions
): Promise<boolean> => {
  if (Platform.OS !== 'web') return false;
  if (wasmModule) return true;
  if (isLoading) {
    return new Promise<boolean>((resolve) => {
      const checkInterval = setInterval(() => {
        if (wasmModule || !isLoading) {
          clearInterval(checkInterval);
          resolve(wasmModule !== null);
        }
      }, 100);
    });
  }

  isLoading = true;

  try {
    if (typeof window !== 'undefined' && (window as any).SherpaOnnx) {
      wasmModule = (window as any).SherpaOnnx;
      isLoading = false;
      return true;
    }

    if (options?.modulePaths?.length) {
      (window as any).sherpaOnnxModulePaths = options.modulePaths;
    }

    return new Promise<boolean>((resolve) => {
      try {
        (window as any).onSherpaOnnxReady = (loaded: boolean) => {
          if (loaded) wasmModule = (window as any).SherpaOnnx;
          isLoading = false;
          resolve(loaded);
        };

        const script = document.createElement('script');
        script.src = options?.mainScriptUrl || '/wasm/sherpa-onnx-combined.js';
        script.async = true;
        script.onerror = () => {
          isLoading = false;
          resolve(false);
        };
        document.head.appendChild(script);

        setTimeout(() => {
          if (!wasmModule) {
            isLoading = false;
            resolve(false);
          }
        }, 10000);
      } catch (error) {
        isLoading = false;
        resolve(false);
      }
    });
  } catch (error) {
    isLoading = false;
    return false;
  }
};
