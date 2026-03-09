import { AsrModelConfig, AudioTaggingModelConfig, KWSModelConfig, SpeakerIdModelConfig, TtsModelConfig, VadModelConfig } from '@siteed/sherpa-onnx.rn';
import { useMemo } from 'react';
import { ModelType } from '../utils/models';

export interface PredefinedModelConfig {
  id: string;
  modelType: ModelType;
  ttsConfig?: Partial<TtsModelConfig>;
  asrConfig?: Partial<AsrModelConfig>;
  audioTaggingConfig?: Partial<AudioTaggingModelConfig>;
  speakerIdConfig?: Partial<SpeakerIdModelConfig>;
  kwsConfig?: Partial<KWSModelConfig>;
  vadConfig?: Partial<VadModelConfig>;
}

// Map of model IDs to their predefined configurations
const MODEL_CONFIGS: Record<string, PredefinedModelConfig> = {
  'vits-icefall-en-low': {
    id: 'vits-icefall-en-low',
    modelType: 'tts',
    ttsConfig: {
      ttsModelType: 'vits',
      debug: true,
      provider: 'gpu',
      modelFile: 'model.onnx',
      tokensFile: 'tokens.txt',
      dataDir: 'espeak-ng-data',
    }
  },
  'vits-piper-en-medium': {
    id: 'vits-piper-en-medium',
    modelType: 'tts',
    ttsConfig: {
      ttsModelType: 'vits',
      modelFile: 'en_US-ljspeech-medium.onnx',
      tokensFile: 'tokens.txt',
      lexiconFile: 'lexicon.txt',
      dataDir: 'espeak-ng-data',
    }
  },
  'vits-piper-en-libritts_r-medium': {
    id: 'vits-piper-en-libritts_r-medium',
    modelType: 'tts',
    ttsConfig: {
      ttsModelType: 'vits',
      modelFile: 'en_US-libritts_r-medium.onnx',
      tokensFile: 'tokens.txt',
      dataDir: 'espeak-ng-data',
    }
  },
  'kokoro-en': {
    id: 'kokoro-en',
    modelType: 'tts',
    ttsConfig: {
      ttsModelType: 'kokoro',
      modelFile: 'model.onnx',
      tokensFile: 'tokens.txt',
      voicesFile: 'voices.bin',
      dataDir: 'espeak-ng-data',
    }
  },
  'kokoro-multi-lang-v1_1': {
    id: 'kokoro-multi-lang-v1_1',
    modelType: 'tts',
    ttsConfig: {
      ttsModelType: 'kokoro',
      modelFile: 'model.onnx',
      tokensFile: 'tokens.txt',
      voicesFile: 'voices.bin',
      dataDir: 'espeak-ng-data',
      lang: 'en',
    }
  },
  'matcha-icefall-en': {
    id: 'matcha-icefall-en',
    modelType: 'tts',
    ttsConfig: {
      ttsModelType: 'matcha',
      modelFile: "matcha-icefall-en_US-ljspeech/model-steps-3.onnx",
      tokensFile: "matcha-icefall-en_US-ljspeech/tokens.txt",
      vocoderFile: "vocos-22khz-univ.onnx",
      dataDir: "matcha-icefall-en_US-ljspeech/espeak-ng-data",
      debug: true,
      provider: 'cpu',
    }
  },
  'streaming-zipformer-en-20m-mobile': {
    id: 'streaming-zipformer-en-20m-mobile',
    modelType: 'asr',
    asrConfig: {
      modelType: 'zipformer',
      numThreads: 2,
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      streaming: true,
      debug: false,
      provider: 'cpu',
      modelFiles: {
        encoder: 'encoder-epoch-99-avg-1.int8.onnx',
        decoder: 'decoder-epoch-99-avg-1.onnx',
        joiner: 'joiner-epoch-99-avg-1.int8.onnx',
        tokens: 'tokens.txt'
      }
    }
  },
  'streaming-zipformer-en-general': {
    id: 'streaming-zipformer-en-general',
    modelType: 'asr',
    asrConfig: {
      modelType: 'zipformer2',
      numThreads: 2,
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      streaming: true,
      debug: true,
      provider: 'cpu',
      modelFiles: {
        encoder: 'encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx',
        decoder: 'decoder-epoch-99-avg-1-chunk-16-left-128.onnx',
        joiner: 'joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx',
        tokens: 'tokens.txt'
      }
    }
  },
  'streaming-zipformer-bilingual-zh-en': {
    id: 'streaming-zipformer-bilingual-zh-en',
    modelType: 'asr',
    asrConfig: {
      modelType: 'zipformer2',
      numThreads: 1,
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      streaming: true,
      debug: true,
      provider: 'cpu',
      modelFiles: {
        encoder: 'encoder.onnx',
        decoder: 'decoder.onnx',
        joiner: 'joiner.onnx',
        tokens: 'tokens.txt'
      }
    }
  },
  'streaming-zipformer-bilingual-zh-en-2023-02-20': {
    id: 'streaming-zipformer-bilingual-zh-en-2023-02-20',
    modelType: 'asr',
    asrConfig: {
      modelType: 'zipformer',
      numThreads: 2,
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      streaming: true,
      debug: true,
      provider: 'cpu',
      modelFiles: {
        encoder: 'encoder-epoch-99-avg-1.onnx',
        decoder: 'decoder-epoch-99-avg-1.onnx',
        joiner: 'joiner-epoch-99-avg-1.onnx',
        tokens: 'tokens.txt'
      }
    }
  },
  'whisper-tiny-en': {
    id: 'whisper-tiny-en',
    modelType: 'asr',
    asrConfig: {
      modelType: 'whisper',
      numThreads: 1,
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      streaming: false,
      debug: true,
      provider: 'gpu',
      modelFiles: {
        encoder: 'tiny.en-encoder.onnx',
        decoder: 'tiny.en-decoder.onnx',
        tokens: 'tiny.en-tokens.txt'
      }
    }
  },
  'whisper-small-multilingual': {
    id: 'whisper-small-multilingual',
    modelType: 'asr',
    asrConfig: {
      modelType: 'whisper',
      numThreads: 1,
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      streaming: false,
      debug: true,
      provider: 'gpu',
      modelFiles: {
        encoder: 'small-encoder.onnx',
        decoder: 'small-decoder.onnx',
        tokens: 'small-tokens.txt'
      }
    }
  },
  'zipformer-en-general': {
    id: 'zipformer-en-general',
    modelType: 'asr',
    asrConfig: {
      modelType: 'transducer',
      numThreads: 2,
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      streaming: false,
      debug: true,
      provider: 'cpu',
      modelFiles: {
        encoder: 'encoder-epoch-99-avg-1.int8.onnx',
        decoder: 'decoder-epoch-99-avg-1.int8.onnx',
        joiner: 'joiner-epoch-99-avg-1.int8.onnx',
        tokens: 'tokens.txt'
      }
    }
  },
  'streaming-zipformer-multilingual': {
    id: 'streaming-zipformer-multilingual',
    modelType: 'asr',
    asrConfig: {
      modelType: 'zipformer2',
      numThreads: 2,
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      streaming: true,
      debug: true,
      provider: 'cpu',
      modelFiles: {
        encoder: 'encoder-epoch-99-avg-1-chunk-16-left-128.int8.onnx',
        decoder: 'decoder-epoch-99-avg-1-chunk-16-left-128.onnx',
        joiner: 'joiner-epoch-99-avg-1-chunk-16-left-128.int8.onnx',
        tokens: 'tokens.txt'
      }
    }
  },
  'ced-tiny-audio-tagging': {
    id: 'ced-tiny-audio-tagging',
    modelType: 'audio-tagging',
    audioTaggingConfig: {
      modelType: 'ced',
      modelFile: 'model.int8.onnx',
      labelsFile: 'class_labels_indices.csv',
      numThreads: 2,
      topK: 5,
      debug: true,
      provider: 'cpu'
    }
  },
  'ced-mini-audio-tagging': {
    id: 'ced-mini-audio-tagging',
    modelType: 'audio-tagging',
    audioTaggingConfig: {
      modelType: 'ced',
      modelFile: 'model.int8.onnx',
      labelsFile: 'class_labels_indices.csv',
      numThreads: 2,
      topK: 5,
      debug: true,
      provider: 'cpu'
    }
  },
  'ced-base-audio-tagging': {
    id: 'ced-base-audio-tagging',
    modelType: 'audio-tagging',
    audioTaggingConfig: {
      modelType: 'ced',
      modelFile: 'model.int8.onnx',
      labelsFile: 'class_labels_indices.csv',
      numThreads: 2,
      topK: 5,
      debug: true,
      provider: 'cpu'
    }
  },
  // Speaker ID model configurations (IDs must match models.ts catalog)
  'speaker-id-en-voxceleb': {
    id: 'speaker-id-en-voxceleb',
    modelType: 'speaker-id',
    speakerIdConfig: {
      modelFile: '3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx',
      numThreads: 2,
      debug: false,
      provider: 'cpu'
    }
  },
  'speaker-id-zh-cn': {
    id: 'speaker-id-zh-cn',
    modelType: 'speaker-id',
    speakerIdConfig: {
      modelFile: '3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx',
      numThreads: 2,
      debug: false,
      provider: 'cpu'
    }
  },
  'speaker-id-zh-en-advanced': {
    id: 'speaker-id-zh-en-advanced',
    modelType: 'speaker-id',
    speakerIdConfig: {
      modelFile: '3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx',
      numThreads: 2,
      debug: false,
      provider: 'cpu'
    }
  },
  // KWS model configurations (IDs must match models.ts catalog)
  'kws-zipformer-gigaspeech': {
    id: 'kws-zipformer-gigaspeech',
    modelType: 'kws',
    kwsConfig: {
      modelType: 'zipformer2',
      modelFiles: {
        encoder: 'encoder-epoch-12-avg-2-chunk-16-left-64.onnx',
        decoder: 'decoder-epoch-12-avg-2-chunk-16-left-64.onnx',
        joiner: 'joiner-epoch-12-avg-2-chunk-16-left-64.onnx',
        tokens: 'tokens.txt',
      },
      keywordsFile: 'keywords.txt',
      numThreads: 2,
      debug: false,
      provider: 'cpu',
      maxActivePaths: 4,
      keywordsScore: 1.5,
      keywordsThreshold: 0.25,
      numTrailingBlanks: 2,
    }
  },
  'kws-zipformer-wenetspeech': {
    id: 'kws-zipformer-wenetspeech',
    modelType: 'kws',
    kwsConfig: {
      modelType: 'zipformer2',
      modelFiles: {
        encoder: 'encoder-epoch-12-avg-2-chunk-16-left-64.onnx',
        decoder: 'decoder-epoch-12-avg-2-chunk-16-left-64.onnx',
        joiner: 'joiner-epoch-12-avg-2-chunk-16-left-64.onnx',
        tokens: 'tokens.txt',
      },
      keywordsFile: 'keywords.txt',
      numThreads: 2,
      debug: false,
      provider: 'cpu',
      maxActivePaths: 4,
      keywordsScore: 1.5,
      keywordsThreshold: 0.25,
      numTrailingBlanks: 2,
    }
  },
  // VAD model configurations
  'silero-vad-v5': {
    id: 'silero-vad-v5',
    modelType: 'vad',
    vadConfig: {
      modelFile: 'silero_vad_v5.onnx',
      threshold: 0.5,
      minSilenceDuration: 0.25,
      minSpeechDuration: 0.25,
      windowSize: 512,
      maxSpeechDuration: 5.0,
      numThreads: 1,
      debug: false,
      provider: 'cpu',
    }
  }
};

/**
 * Get configuration for a specific model
 */
export function useModelConfig({ modelId }: { modelId: string | null }): PredefinedModelConfig | undefined {
  return useMemo(() => {
    if (!modelId) return undefined;
    return MODEL_CONFIGS[modelId];
  }, [modelId]);
}

/**
 * Get TTS specific configuration for a model
 */
export function useTtsModelConfig({ modelId }: { modelId: string | null }): Partial<TtsModelConfig> | undefined {
  const config = useModelConfig({ modelId });
  return config?.ttsConfig;
}

/**
 * Get ASR specific configuration for a model
 */
export function useAsrModelConfig({ modelId }: { modelId: string | null }): Partial<AsrModelConfig> | undefined {
  const config = useModelConfig({ modelId });
  return config?.asrConfig;
}

/**
 * Get Audio Tagging specific configuration for a model
 */
export function useAudioTaggingModelConfig({ modelId }: { modelId: string | null }): Partial<AudioTaggingModelConfig> | undefined {
  const config = useModelConfig({ modelId });
  return config?.audioTaggingConfig;
}

/**
 * Get Speaker ID specific configuration for a model
 */
export function useSpeakerIdModelConfig({ modelId }: { modelId: string | null }): Partial<SpeakerIdModelConfig> | undefined {
  const config = useModelConfig({ modelId });
  return config?.speakerIdConfig;
}

/**
 * Get KWS specific configuration for a model
 */
export function useKwsModelConfig({ modelId }: { modelId: string | null }): Partial<KWSModelConfig> | undefined {
  const config = useModelConfig({ modelId });
  return config?.kwsConfig;
}

/**
 * Get VAD specific configuration for a model
 */
export function useVadModelConfig({ modelId }: { modelId: string | null }): Partial<VadModelConfig> | undefined {
  const config = useModelConfig({ modelId });
  return config?.vadConfig;
}

/**
 * Get available model IDs by type
 */
export function getAvailableModelConfigIds({ modelType }: { modelType?: ModelType } = {}): string[] {
  return Object.values(MODEL_CONFIGS)
    .filter(config => !modelType || config.modelType === modelType)
    .map(config => config.id);
}

/**
 * Check if a model has a predefined configuration
 */
export function hasModelConfig({ modelId }: { modelId: string | null }): boolean {
  if (!modelId) return false;
  return !!MODEL_CONFIGS[modelId];
} 