import { Platform } from 'react-native';
import { getModelById, type ModelEngine, type ModelMetadata } from './models';

export function getModelEngineById(modelId: string): ModelEngine {
  return getModelById(modelId)?.engine ?? 'sherpa';
}

export function isModelAvailableInCurrentApp(
  model: ModelMetadata,
  platform: 'android' | 'ios' | 'web' = Platform.OS as 'android' | 'ios' | 'web'
): boolean {
  if (platform === 'web') {
    return model.webPreloaded === true;
  }

  if (model.platforms?.length && !model.platforms.includes(platform)) {
    return false;
  }

  return true;
}
