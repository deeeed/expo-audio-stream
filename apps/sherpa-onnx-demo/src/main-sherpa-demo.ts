import '@expo/metro-runtime'
import { App as ExpoRouterApp } from 'expo-router/build/qualified-entry'

import { loadWasmModule } from '@siteed/sherpa-onnx.rn'
import { registerRootComponent } from 'expo'
import { Platform } from 'react-native'

/**
 * Initialize the app, handling web-specific setup for WASM
 */
async function initializeApp() {
  // For web: Load WASM module before continuing
  if (Platform.OS === 'web') {
    console.log('Web environment detected, loading WASM module...')
    
    try {
      const loaded = await loadWasmModule()
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
