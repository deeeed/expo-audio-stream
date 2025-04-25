import type { AsrModelConfig, AudioTaggingModelConfig, SpeakerIdModelConfig, TtsModelConfig } from '@siteed/sherpa-onnx.rn';
import { useMemo } from 'react';
import { useModelManagement } from '../contexts/ModelManagement';
import type { ModelState } from '../contexts/ModelManagement/types';
import type { ModelMetadata, ModelType } from '../utils/models';
import { useAsrModelConfig, useAudioTaggingModelConfig, useModelConfig, useSpeakerIdModelConfig, useTtsModelConfig } from './useModelConfig';

interface UseModelWithConfigProps {
  modelId: string | null;
}

interface UseModelWithConfigResult {
  modelId: string | null;
  config: ReturnType<typeof useModelConfig>;
  modelState?: ModelState;
  isDownloaded: boolean;
  localPath?: string;
}

/**
 * Combined hook for accessing model state and configuration
 */
export function useModelWithConfig({ modelId }: UseModelWithConfigProps): UseModelWithConfigResult {
  const { getModelState, isModelDownloaded } = useModelManagement();
  const config = useModelConfig({ modelId });
  
  const modelState = useMemo(() => {
    if (!modelId) return undefined;
    return getModelState(modelId);
  }, [modelId, getModelState]);
  
  const isDownloaded = useMemo(() => {
    if (!modelId) return false;
    return isModelDownloaded(modelId);
  }, [modelId, isModelDownloaded]);
  
  return {
    modelId,
    config,
    modelState,
    isDownloaded,
    localPath: modelState?.localPath,
  };
}

interface UseModelsOptions {
  modelType?: ModelType;
}

interface UseModelsResult {
  availableModels: ModelMetadata[];
  downloadedModels: ModelState[];
}

/**
 * Hook for accessing available and downloaded models
 */
export function useModels({ modelType }: UseModelsOptions = {}): UseModelsResult {
  const { getDownloadedModels, getAvailableModels } = useModelManagement();
  
  const availableModels = useMemo(() => {
    const models = getAvailableModels();
    if (!modelType) return models;
    return models.filter(model => model.type === modelType);
  }, [getAvailableModels, modelType]);
  
  const downloadedModels = useMemo(() => {
    const models = getDownloadedModels();
    if (!modelType) return models;
    return models.filter(model => model.metadata.type === modelType);
  }, [getDownloadedModels, modelType]);
  
  return {
    availableModels,
    downloadedModels,
  };
}

/**
 * Hook specifically for TTS models
 */
export function useTtsModels(): UseModelsResult {
  return useModels({ modelType: 'tts' });
}

/**
 * Hook specifically for ASR models
 */
export function useAsrModels(): UseModelsResult {
  return useModels({ modelType: 'asr' });
}

/**
 * Hook specifically for Audio Tagging models
 */
export function useAudioTaggingModels(): UseModelsResult {
  return useModels({ modelType: 'audio-tagging' });
}

/**
 * Hook specifically for Speaker ID models
 */
export function useSpeakerIdModels(): UseModelsResult {
  return useModels({ modelType: 'speaker-id' });
}

interface UseTtsModelWithConfigResult extends UseModelWithConfigResult {
  ttsConfig?: Partial<TtsModelConfig>;
}

/**
 * Hook for TTS model with its configuration
 */
export function useTtsModelWithConfig({ modelId }: UseModelWithConfigProps): UseTtsModelWithConfigResult {
  const baseResult = useModelWithConfig({ modelId });
  const ttsConfig = useTtsModelConfig({ modelId });
  
  return {
    ...baseResult,
    ttsConfig,
  };
}

interface UseAsrModelWithConfigResult extends UseModelWithConfigResult {
  asrConfig?: Partial<AsrModelConfig>;
}

/**
 * Hook for ASR model with its configuration
 */
export function useAsrModelWithConfig({ modelId }: UseModelWithConfigProps): UseAsrModelWithConfigResult {
  const baseResult = useModelWithConfig({ modelId });
  const asrConfig = useAsrModelConfig({ modelId });
  
  return {
    ...baseResult,
    asrConfig,
  };
}

interface UseAudioTaggingModelWithConfigResult extends UseModelWithConfigResult {
  audioTaggingConfig?: Partial<AudioTaggingModelConfig>;
}

/**
 * Hook for Audio Tagging model with its configuration
 */
export function useAudioTaggingModelWithConfig({ modelId }: UseModelWithConfigProps): UseAudioTaggingModelWithConfigResult {
  const baseResult = useModelWithConfig({ modelId });
  const audioTaggingConfig = useAudioTaggingModelConfig({ modelId });
  
  return {
    ...baseResult,
    audioTaggingConfig,
  };
}

interface UseSpeakerIdModelWithConfigResult extends UseModelWithConfigResult {
  speakerIdConfig?: Partial<SpeakerIdModelConfig>;
}

/**
 * Hook for Speaker ID model with its configuration
 */
export function useSpeakerIdModelWithConfig({ modelId }: UseModelWithConfigProps): UseSpeakerIdModelWithConfigResult {
  const baseResult = useModelWithConfig({ modelId });
  const speakerIdConfig = useSpeakerIdModelConfig({ modelId });
  
  return {
    ...baseResult,
    speakerIdConfig,
  };
} 