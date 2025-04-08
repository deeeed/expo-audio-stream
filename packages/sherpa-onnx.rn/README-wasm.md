# Sherpa-ONNX Web WASM Support

The Sherpa-ONNX library includes support for running on the web using WebAssembly (WASM). This document describes how to use the web-specific functionality.

## Loading the WASM Module

When using Sherpa-ONNX on the web, you need to load the WASM module before using any of the library's functionality. The library provides a `loadWasmModule` function for this purpose, which can be customized with various options.

### Basic Usage

```typescript
import SherpaOnnx, { loadWasmModule } from 'sherpa-onnx.rn';

// Load the WASM module with default options
async function initializeSherpa() {
  const loaded = await loadWasmModule();
  
  if (loaded) {
    console.log('Sherpa ONNX WASM module loaded successfully');
    // Continue with your application
  } else {
    console.error('Failed to load Sherpa ONNX WASM module');
  }
}
```

### Custom Endpoints

You can customize the URLs where the WASM modules are loaded from:

```typescript
import SherpaOnnx, { loadWasmModule, type WasmLoadOptions } from 'sherpa-onnx.rn';

async function initializeWithCustomEndpoints() {
  const options: WasmLoadOptions = {
    // Option 1: Override only the main script URL
    mainScriptUrl: 'https://your-cdn.example.com/wasm/sherpa-onnx-combined.js',
    
    // Option 2: Specify individual module paths
    // If provided, these take precedence over the auto-detected paths
    modulePaths: [
      'https://your-cdn.example.com/wasm/sherpa-onnx-core.js',
      'https://your-cdn.example.com/wasm/sherpa-onnx-vad.js',
      'https://your-cdn.example.com/wasm/sherpa-onnx-asr.js',
      'https://your-cdn.example.com/wasm/sherpa-onnx-tts.js',
      'https://your-cdn.example.com/wasm/sherpa-onnx-speaker.js'
    ]
  };
  
  const loaded = await loadWasmModule(options);
  // Continue with initialization if loaded successfully
}
```

### Using the Web Namespace

You can also access the web utilities through the `Web` namespace:

```typescript
import SherpaOnnx from 'sherpa-onnx.rn';

async function initialize() {
  // Check if running in a web environment
  if (SherpaOnnx.Web.isWebEnvironment()) {
    // Load the WASM module
    const loaded = await SherpaOnnx.Web.loadWasmModule({
      mainScriptUrl: '/custom-path/sherpa-onnx-combined.js'
    });
    
    // Check if WASM is available
    const isAvailable = SherpaOnnx.Web.isWasmAvailable();
    console.log('WASM available:', isAvailable);
    
    // Get the WASM module for direct access (advanced usage)
    const wasmModule = SherpaOnnx.Web.getWasmModule();
    if (wasmModule) {
      // Use the WASM module directly
      console.log('WASM module:', wasmModule);
    }
  }
}
```

## Versioning

The library automatically adds version parameters to script URLs to ensure proper caching behavior. The default version pattern looks like:

```
/wasm/sherpa-onnx-combined.js?v=1.0.0
```

This versioning helps with:
1. Proper cache invalidation when upgrading to new versions
2. Consistent loading across your application

## Required Files

To use Sherpa-ONNX with WASM, you need to include the following files in your web application:

1. `sherpa-onnx-combined.js` - The main loader script
2. `sherpa-onnx-core.js` - Core functionality
3. `sherpa-onnx-vad.js` - Voice Activity Detection module
4. `sherpa-onnx-asr.js` - Automatic Speech Recognition module
5. `sherpa-onnx-tts.js` - Text-to-Speech module
6. `sherpa-onnx-speaker.js` - Speaker Identification module
7. `sherpa-onnx-wasm-combined.js` and `sherpa-onnx-wasm-combined.wasm` - The actual WebAssembly files

These files should be placed in your web application's public directory, typically in a `/wasm` subdirectory.

## Setting Model Base URL

You can set a base URL for model downloads:

```typescript
import SherpaOnnx from 'sherpa-onnx.rn';

// Set the base URL for model downloads
SherpaOnnx.Web.setModelBaseUrl('https://your-cdn.example.com/models');
```

## Preloading Model Files

You can preload model files to improve performance:

```typescript
import SherpaOnnx from 'sherpa-onnx.rn';

// Preload a model file
async function preloadModels() {
  const modelUrl = 'https://your-cdn.example.com/models/model.onnx';
  const success = await SherpaOnnx.Web.preloadModelFile(modelUrl);
  
  if (success) {
    console.log('Model preloaded successfully');
  } else {
    console.error('Failed to preload model');
  }
}
```

## Web Model Loader

For advanced usage, you can access the `WebModelLoader` directly:

```typescript
import SherpaOnnx from 'sherpa-onnx.rn';

// Access the WebModelLoader
const loader = SherpaOnnx.Web.WebModelLoader;

// Use the loader to prepare a TTS model
const ttsModelConfig = {
  modelDir: 'tts-models/en',
  modelFile: 'model.onnx',
  tokensFile: 'tokens.txt'
};

async function prepareModel() {
  const modelPaths = await loader.prepareTtsModel(ttsModelConfig);
  console.log('Model paths:', modelPaths);
}
``` 