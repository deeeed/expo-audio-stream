import '@expo/metro-runtime'
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'
import Constants from 'expo-constants'
import { renderRootComponent } from 'expo-router/build/renderRootComponent'

import { AppRoot } from './AppRoot'
import { initWorker } from './utils/indexedDB'

// Import types directly from onnxruntime-common
import type { InferenceSession, Tensor } from 'onnxruntime-common'

// Retrieve versions from Constants
const SkiaVersion = Constants.expoConfig?.extra?.CANVASKIT_VERSION as string | undefined
const OrtVersion = Constants.expoConfig?.extra?.ORT_VERSION as string | undefined

// Add checks for missing versions
if (!SkiaVersion) {
  console.warn('CanvasKit version not found in Constants.extra. Check app.config.ts.')
  // Potentially throw an error or use a default fallback version
}
if (!OrtVersion) {
  console.warn('ONNX Runtime Web version not found in Constants.extra. Check app.config.ts.')
  // Potentially throw an error or use a default fallback version
}

console.log(`SkiaVersion (from Constants): ${SkiaVersion}`)
console.log(`OrtVersion (from Constants): ${OrtVersion}`)

// Proper type definition for ONNX Runtime Web (adjust if necessary based on library)
interface OrtEnv {
  wasm: {
    wasmPaths: string;
    wasmSimd: boolean;
    wasmThreaded: boolean;
  }
}

interface OnnxRuntime {
  env: OrtEnv;
  // Use the imported types
  InferenceSession: {
    create(path: string): Promise<InferenceSession>;
  };
  Tensor: {
    // Use the imported types
    new (type: string, data: Float32Array | BigInt64Array, dims: number[]): Tensor;
  };
}

declare global {
  interface Window {
    ort: OnnxRuntime
  }
}

interface InitConfig {
  baseUrl: string
  skiaVersion: string
  ortVersion: string
}

// Separate initialization functions for better organization
function loadSkia({ skiaVersion }: Pick<InitConfig, 'skiaVersion'>): Promise<void> {
  // Ensure skiaVersion is available before proceeding
  if (!skiaVersion) {
    return Promise.reject(new Error('Skia version is missing for loading.'))
  }
  return LoadSkiaWeb({
    locateFile: (path) => {
      const url = `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${skiaVersion}/bin/full/${path}`
      console.log(`__DEV__=${__DEV__} Loading Skia: ${url}`)
      return url
    },
  })
}

function loadOnnxRuntime({ ortVersion }: Pick<InitConfig, 'ortVersion'>): Promise<OnnxRuntime> {
  // Ensure ortVersion is available before proceeding
  if (!ortVersion) {
    return Promise.reject(new Error('ONNX Runtime version is missing for loading.'))
  }
  if (window.ort) return Promise.resolve(window.ort)

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const ortBaseUrl = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ortVersion}/dist`

    // Configure ONNX Runtime before loading the script
    window.ort = {
      env: {
        wasm: {
          wasmPaths: ortBaseUrl,
          wasmSimd: true,
          wasmThreaded: false,  // Disable threaded WASM to avoid loading issues
        },
      },
    } as OnnxRuntime

    script.src = `${ortBaseUrl}/ort.min.js`
    script.onload = () => {
      // No need to set wasmPaths again since we pre-configured it
      resolve(window.ort)
    }
    script.onerror = (error) => reject(new Error(`Failed to load ONNX Runtime: ${error}`))
    document.head.appendChild(script)
  })
}

// Main initialization function
async function initializeApp(): Promise<void> {
  try {
    // Ensure versions are defined before proceeding
    if (!SkiaVersion || !OrtVersion) {
      throw new Error(
        'Required versions (Skia/ORT) not found in Constants.extra. Check app.config.ts and ensure packages are installed.'
      )
    }

    const config: InitConfig = {
      baseUrl: Constants.expoConfig?.experiments?.baseUrl ?? '',
      skiaVersion: SkiaVersion, // Now guaranteed to be string
      ortVersion: OrtVersion,   // Now guaranteed to be string
    }

    await loadSkia({ skiaVersion: config.skiaVersion })
    renderRootComponent(AppRoot)

    console.log(`__DEV__=${__DEV__} Loading ONNX Runtime`)
    await loadOnnxRuntime({ ortVersion: config.ortVersion })
    console.log(`__DEV__=${__DEV__} ONNX Runtime loaded`)

    initWorker({
      audioStorageWorkerUrl: `${config.baseUrl}/audioStorage.worker.js`,
    })
  } catch (error) {
    console.error('Initialization failed:', error)
    // You might want to show a user-friendly error UI here
    throw error
  }
}

// Start initialization
initializeApp()