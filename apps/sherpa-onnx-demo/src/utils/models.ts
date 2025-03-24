import type { ModelMetadata } from '@siteed/sherpa-onnx.rn/src/config/models';
import type { ModelState as ContextModelState } from '../contexts/ModelManagement/types';

/**
 * Interface representing the state of a downloaded model
 */
export interface ModelState {
  localPath: string;
  downloadProgress?: number;
  isDownloading?: boolean;
  metadata?: ModelMetadata;
  error?: string;
}

// Access the actual model states (in a real implementation this would use context)
let modelStatesCache: Record<string, ContextModelState> = {};

// This function would be called by the context to update the cache
export function updateModelStatesCache(states: Record<string, ContextModelState>) {
  modelStatesCache = states;
}

/**
 * Helper function to get model state from the model ID
 * Returns a simplified model state with just the properties needed for TTS initialization
 */
export function getModelState(modelId: string): ModelState | undefined {
  const state = modelStatesCache[modelId];
  
  if (!state || state.status !== 'downloaded' || !state.localPath) {
    return undefined;
  }
  
  return {
    localPath: state.localPath,
    metadata: state.metadata,
  };
} 