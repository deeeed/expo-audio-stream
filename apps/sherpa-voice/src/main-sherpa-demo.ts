import '@expo/metro-runtime'
import { App as ExpoRouterApp } from 'expo-router/build/qualified-entry'

import { loadWasmModule, configureSherpaOnnx } from '@siteed/sherpa-onnx.rn'
import { registerRootComponent } from 'expo'
import { Platform } from 'react-native'

import { getEnabledModulePaths, getWasmBasePath } from './config/webFeatures'
import { baseLogger } from './config'

const logger = baseLogger.extend('App')

if (Platform.OS === 'web') {
  const wasmBase = getWasmBasePath()
  configureSherpaOnnx({ wasmBasePath: wasmBase })

  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.sherpaOnnxConfig = {
      espeakNgDataZipUrl: `${wasmBase}models/espeak-ng-data.zip`,
      assetsBasePath: `${wasmBase}models/`,
    }
  }

  const modulePaths = [
    `${wasmBase}sherpa-onnx-core.js`,
    ...getEnabledModulePaths(),
  ]

  // Fire-and-forget: WASM loads in the background while the UI renders immediately
  loadWasmModule({
    debug: true,
    mainScriptUrl: `${wasmBase}sherpa-onnx-combined.js`,
    modulePaths,
    onProgress: (event) => {
      if (event.phase === 'module') {
        logger.info(`[WASM] ${event.phase}: ${event.module} (${event.loaded}/${event.total})`)
      } else {
        logger.info(`[WASM] ${event.phase} (${event.loaded}/${event.total})`)
      }
    },
  }).then((loaded) => {
    logger.info(`[WASM] ready: ${loaded}`)
  }).catch((error) => {
    logger.error(`[WASM] error: ${error instanceof Error ? error.message : String(error)}`)
  })
}

// Register immediately — no waiting for WASM
registerRootComponent(ExpoRouterApp)
