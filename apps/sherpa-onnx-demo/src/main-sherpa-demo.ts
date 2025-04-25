import '@expo/metro-runtime'
import { App as ExpoRouterApp } from 'expo-router/build/qualified-entry'

import { loadWasmModule } from '@siteed/sherpa-onnx.rn'
import { registerRootComponent } from 'expo'
import { Platform } from 'react-native'

// Enable this for debugging WASM loading
const DEBUG_WASM = true

// Base URL for WASM files and models
const BASE_WASM_URL = '/wasm/'

// Create directory for models if needed - the TTS models should be located in:
// /wasm/models/vits/en_US-ryan-low.onnx
// /wasm/models/vits/tokens.txt 
// /wasm/models/espeak-ng-data.zip

/**
 * Initialize the app, handling web-specific setup for WASM
 */
async function initializeApp() {
  // For web: Load WASM module before continuing
  if (Platform.OS === 'web') {
    console.log('Web environment detected, loading WASM module...')
    
    try {
      // Configure path to espeak-ng-data for TTS
      if (window) {
        // Set global configuration used by TTS models
        // These can be accessed when loading the models
        // @ts-ignore
        window.sherpaOnnxConfig = {
          espeakNgDataZipUrl: `${BASE_WASM_URL}models/espeak-ng-data.zip`,
          assetsBasePath: `${BASE_WASM_URL}models/`,
        };
        console.log('Set global Sherpa-ONNX config for Web TTS');
      }

      const loaded = await loadWasmModule({
        debug: DEBUG_WASM,
        // Customize the path to your WASM files
        mainScriptUrl: `${BASE_WASM_URL}sherpa-onnx-combined.js`,
        modulePaths: [
          `${BASE_WASM_URL}sherpa-onnx-core.js`,
          `${BASE_WASM_URL}sherpa-onnx-vad.js`,
          `${BASE_WASM_URL}sherpa-onnx-asr.js`,
          `${BASE_WASM_URL}sherpa-onnx-tts.js`,
          `${BASE_WASM_URL}sherpa-onnx-speaker.js`,
          `${BASE_WASM_URL}sherpa-onnx-enhancement.js`,
          `${BASE_WASM_URL}sherpa-onnx-kws.js`,
        ]
      })
      
      console.log('WASM module loaded:', loaded)
      
      if (!loaded) {
        console.warn('WASM module failed to load. Some features may not work correctly.')
      }
    } catch (error) {
      console.error('Error loading WASM module:', error)
    }
  }
  
  // Register the Expo Router App component (this works for both web and native)
  registerRootComponent(ExpoRouterApp)
}

// Start the initialization process
initializeApp().catch(error => {
  console.error('Failed to initialize app:', error)
  // Still register the Expo Router App component even if initialization fails
  registerRootComponent(ExpoRouterApp)
})
