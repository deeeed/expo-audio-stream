/**
 * This app demonstrates using multiple WebAssembly modules in a React Native application.
 * Each WASM module (TTS, ASR, Audio Tagging) is isolated in its own namespace 
 * within the global SherpaWasm object to avoid conflicts.
 * 
 * The namespace-based approach has these benefits:
 * 1. Prevents conflicts between modules sharing the same global variables
 * 2. Allows modules to be loaded and unloaded independently 
 * 3. Simplifies component cleanup (no need to reset globals)
 * 4. Provides a cleaner API for accessing module functions
 * 
 * The implementation is in packages/sherpa-onnx.rn/src/WebSherpaOnnxImpl.ts
 */

// ... existing code 