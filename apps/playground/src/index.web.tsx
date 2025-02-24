import '@expo/metro-runtime'
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web'
import { version as SkiaVersion } from 'canvaskit-wasm/package.json'
import { version as OrtVersion } from 'onnxruntime-web/package.json'
import { renderRootComponent } from 'expo-router/build/renderRootComponent'
import Constants from 'expo-constants'

import { AppRoot } from './AppRoot'
import { initWorker } from './utils/indexedDB'
import { InferenceSession, Tensor } from 'onnxruntime-react-native'

// Proper type definition for ONNX Runtime
interface OrtEnv {
  wasm: {
    wasmPaths: string;
    wasmSimd: boolean;
    wasmThreaded: boolean;
  }
}

interface OnnxRuntime {
  env: OrtEnv;
  InferenceSession: {
    create(path: string): Promise<InferenceSession>;
  };
  Tensor: { new(type: string, data: Float32Array | BigInt64Array, dims: number[]): Tensor };
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
  return LoadSkiaWeb({
    locateFile: (path) => {
      const url = `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${skiaVersion}/bin/full/${path}`
      console.log(`__DEV__=${__DEV__} Loading Skia: ${url}`)
      return url
    },
  })
}

function loadOnnxRuntime({ ortVersion }: Pick<InitConfig, 'ortVersion'>): Promise<OnnxRuntime> {
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
          wasmThreaded: false  // Disable threaded WASM to avoid loading issues
        }
      }
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
    const config: InitConfig = {
      baseUrl: Constants.expoConfig?.experiments?.baseUrl ?? '',
      skiaVersion: SkiaVersion,
      ortVersion: OrtVersion,
    }

    await loadSkia({ skiaVersion: config.skiaVersion })
    renderRootComponent(AppRoot)
    
    console.log(`__DEV__=${__DEV__} Loading ONNX Runtime`)
    await loadOnnxRuntime({ ortVersion: config.ortVersion })
    console.log(`__DEV__=${__DEV__} ONNX Runtime loaded`)

    initWorker({ 
      audioStorageWorkerUrl: `${config.baseUrl}/audioStorage.worker.js`
    })
  } catch (error) {
    console.error('Initialization failed:', error)
    // You might want to show a user-friendly error UI here
    throw error
  }
}

// Start initialization
initializeApp()