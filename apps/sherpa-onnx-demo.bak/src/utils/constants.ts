import type { ModelMetadata } from './models';
import type { ModelState, ModelStatus } from '../contexts/ModelManagement/types';

// Default web TTS model ID to use when on the web platform
export const DEFAULT_WEB_TTS_MODEL_ID = 'vits-icefall-en-low';

// Create a default model state for the web platform
export function createWebTtsModelState(metadata: ModelMetadata): ModelState {
  return {
    metadata,
    status: 'downloaded' as ModelStatus,
    progress: 1,
    localPath: '/wasm/tts',
    files: [{ path: 'sherpa-onnx-tts.js', size: 1, lastModified: Date.now() }],
    extractedFiles: ['sherpa-onnx-tts.js', 'sherpa-onnx-wasm-main-tts.js', 'sherpa-onnx-wasm-main-tts.wasm'],
    lastDownloaded: Date.now()
  };
} 