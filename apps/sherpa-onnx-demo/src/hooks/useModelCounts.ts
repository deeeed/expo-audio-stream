import { useMemo } from 'react';
import type { ModelType } from '@siteed/sherpa-onnx.rn';
import { useModelManagement } from '../contexts/ModelManagement/ModelManagementContext';

export interface ModelCounts {
  byType: Record<ModelType | 'all', {
    available: number;
    downloaded: number;
  }>;
  filtered: {
    available: number;
    downloaded: number;
  };
}

export function useModelCounts(filterType: ModelType | 'all' = 'all') {
  const { getAvailableModels, getDownloadedModels } = useModelManagement();

  return useMemo(() => {
    const availableModels = getAvailableModels();
    const downloadedModels = getDownloadedModels();

    // Initialize counts for all types
    const counts: Record<ModelType | 'all', { available: number; downloaded: number }> = {
      'all': { available: 0, downloaded: 0 },
      'asr': { available: 0, downloaded: 0 },
      'tts': { available: 0, downloaded: 0 },
      'vad': { available: 0, downloaded: 0 },
      'kws': { available: 0, downloaded: 0 },
      'speaker-id': { available: 0, downloaded: 0 },
      'language-id': { available: 0, downloaded: 0 },
      'audio-tagging': { available: 0, downloaded: 0 },
      'punctuation': { available: 0, downloaded: 0 },
    };

    // Count available models in a single pass
    availableModels.forEach(model => {
      counts[model.type].available++;
      counts['all'].available++;
    });

    // Count downloaded models in a single pass
    downloadedModels.forEach(model => {
      counts[model.metadata.type].downloaded++;
      counts['all'].downloaded++;
    });

    return {
      byType: counts,
      filtered: counts[filterType],
    };
  }, [getAvailableModels, getDownloadedModels, filterType]);
} 