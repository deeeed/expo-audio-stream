import '@expo/metro-runtime'
import { App as ExpoRouterApp } from 'expo-router/build/qualified-entry'

import { loadWasmModule, configureSherpaOnnx } from '@siteed/sherpa-onnx.rn'
import { registerRootComponent } from 'expo'
import { Platform } from 'react-native'

import { getEnabledModulePaths, getWasmBasePath } from './config/webFeatures'
import { baseLogger } from './config'

const logger = baseLogger.extend('App')

// Enable this for debugging WASM loading
const DEBUG_WASM = true

/**
 * Initialize the app, handling web-specific setup for WASM
 */
async function initializeApp() {
  // For web: Load WASM module before continuing
  if (Platform.OS === 'web') {
    logger.info('Web environment detected, loading WASM module...')

    try {
      const wasmBase = getWasmBasePath()
      logger.info(`WASM base path: ${wasmBase}`)

      // Tell the package to use local WASM files (not CDN)
      configureSherpaOnnx({ wasmBasePath: wasmBase })

      // Configure path to espeak-ng-data for TTS
      if (window) {
        // @ts-ignore
        window.sherpaOnnxConfig = {
          espeakNgDataZipUrl: `${wasmBase}models/espeak-ng-data.zip`,
          assetsBasePath: `${wasmBase}models/`,
        }
      }

      // Build module list from web feature config — only enabled features are loaded
      const modulePaths = [
        `${wasmBase}sherpa-onnx-core.js`, // always required
        ...getEnabledModulePaths(),
      ]

      const loaded = await loadWasmModule({
        debug: DEBUG_WASM,
        mainScriptUrl: `${wasmBase}sherpa-onnx-combined.js`,
        modulePaths,
      })

      logger.info(`WASM module loaded: ${loaded}`)

      if (!loaded) {
        logger.warn('WASM module failed to load. Some features may not work correctly.')
      }
    } catch (error) {
      logger.error(`Error loading WASM module: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Register the Expo Router App component (this works for both web and native)
  registerRootComponent(ExpoRouterApp)
}

// Start the initialization process
initializeApp().catch(error => {
  logger.error(`Failed to initialize app: ${error instanceof Error ? error.message : String(error)}`)
  // Still register the Expo Router App component even if initialization fails
  registerRootComponent(ExpoRouterApp)
})
