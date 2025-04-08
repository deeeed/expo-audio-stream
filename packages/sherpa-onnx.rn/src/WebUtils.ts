/**
 * Minimal web utilities for Sherpa-ONNX - handles WASM script loading only
 */
import { Platform } from 'react-native';

// Internal state - only accessed in web environments
let wasmModule: any = null;
let isLoading = false;
let onReadyCallbacks: ((loaded: boolean) => void)[] = [];

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
  debug?: boolean;
}

/**
 * Handles callbacks when WASM module is ready
 * @param loaded Whether the module was loaded successfully
 */
function notifyWasmReady(loaded: boolean): void {
  // Execute all registered callbacks
  onReadyCallbacks.forEach((callback) => {
    try {
      callback(loaded);
    } catch (error) {
      console.error('Error in WASM ready callback:', error);
    }
  });

  // Clear the callbacks
  onReadyCallbacks = [];
}

/**
 * Register a callback to be executed when the WASM module is ready
 * @param callback Function to call when WASM is ready
 * @returns True if WASM is already available (callback won't be called), false if pending
 */
export const onWasmReady = (callback: (loaded: boolean) => void): boolean => {
  if (isWasmAvailable()) {
    // WASM is already available, call immediately
    callback(true);
    return true;
  } else if (isLoading) {
    // WASM is loading, register callback
    onReadyCallbacks.push(callback);
    return false;
  } else {
    // WASM is not loading yet, register callback for when loading starts
    onReadyCallbacks.push(callback);
    return false;
  }
};

// Load the WASM module
export const loadWasmModule = async (
  options?: WasmLoadOptions
): Promise<boolean> => {
  // If not on web, return false immediately
  if (Platform.OS !== 'web') return false;

  // If already loaded, return true
  if (wasmModule) {
    console.log('WASM module already loaded');
    return true;
  }

  // If already loading, wait for it
  if (isLoading) {
    console.log('WASM module already loading, waiting...');
    return new Promise<boolean>((resolve) => {
      onReadyCallbacks.push(resolve);
    });
  }

  // Start loading
  isLoading = true;
  console.log('Starting WASM module loading process');

  try {
    // Check if module is already available in window
    if (typeof window !== 'undefined' && (window as any).SherpaOnnx) {
      console.log('SherpaOnnx already in window, using existing module');
      wasmModule = (window as any).SherpaOnnx;
      isLoading = false;
      notifyWasmReady(true);
      return true;
    }

    // Configure module paths if provided
    if (options?.modulePaths?.length) {
      console.log('Setting custom module paths:', options.modulePaths);
      (window as any).sherpaOnnxModulePaths = options.modulePaths;
    }

    return new Promise<boolean>((resolve) => {
      try {
        // This function will be called by the WASM loader script when ready
        (window as any).onSherpaOnnxReady = (loaded: boolean) => {
          console.log(
            `SherpaOnnx WASM module load result: ${loaded ? 'SUCCESS' : 'FAILED'}`
          );
          if (loaded) {
            wasmModule = (window as any).SherpaOnnx;

            // Log available methods if in debug mode
            if (options?.debug && wasmModule) {
              console.log(
                'SherpaOnnx WASM module methods:',
                Object.keys(wasmModule)
                  .filter((key) => typeof wasmModule[key] === 'function')
                  .join(', ')
              );
            }
          }

          isLoading = false;
          notifyWasmReady(loaded);
          resolve(loaded);
        };

        // Create and append the script
        const script = document.createElement('script');
        const scriptUrl =
          options?.mainScriptUrl || '/wasm/sherpa-onnx-combined.js';
        console.log(`Loading WASM script from: ${scriptUrl}`);

        script.src = scriptUrl;
        script.async = true;

        script.onerror = (event) => {
          console.error('Error loading WASM script:', event);
          isLoading = false;
          notifyWasmReady(false);
          resolve(false);
        };

        document.head.appendChild(script);

        // Set a timeout in case the script loads but doesn't call onSherpaOnnxReady
        setTimeout(() => {
          if (isLoading) {
            console.warn(
              'WASM loading timeout - onSherpaOnnxReady was not called'
            );
            isLoading = false;

            // Check if it was actually loaded but callback wasn't called
            if ((window as any).SherpaOnnx) {
              console.log(
                'SherpaOnnx found in window despite timeout, using it'
              );
              wasmModule = (window as any).SherpaOnnx;
              notifyWasmReady(true);
              resolve(true);
            } else {
              notifyWasmReady(false);
              resolve(false);
            }
          }
        }, 15000); // Increased timeout from 10s to 15s
      } catch (error) {
        console.error('Error setting up WASM script loader:', error);
        isLoading = false;
        notifyWasmReady(false);
        resolve(false);
      }
    });
  } catch (error) {
    console.error('Critical error in WASM loading process:', error);
    isLoading = false;
    notifyWasmReady(false);
    return false;
  }
};
