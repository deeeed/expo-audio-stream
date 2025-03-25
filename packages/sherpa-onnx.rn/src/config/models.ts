import type { ModelType } from '../types/interfaces';

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  type: ModelType;
  size: number;
  url: string;
  version: string;
  language: string;
  dependencies?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
    description: string;
  }>;
}

export const AVAILABLE_MODELS: ModelMetadata[] = [
  // ASR Models
  {
    id: 'streaming-zipformer-en-20m-mobile',
    name: 'Streaming Zipformer (Mobile)',
    description:
      'Compact streaming model for real-time English transcription, optimized for mobile devices.',
    type: 'asr',
    size: 103 * 1024 * 1024, // 103 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17-mobile.tar.bz2',
    version: '2023-02-17',
    language: 'en',
  },

  {
    id: 'streaming-zipformer-en-general',
    name: 'Streaming Zipformer (General)',
    description:
      'Versatile streaming model for real-time English transcription, larger but usable on modern mobile devices.',
    type: 'asr',
    size: 296 * 1024 * 1024, // 296 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-en-2023-06-26.tar.bz2',
    version: '2023-06-26',
    language: 'en',
  },

  {
    id: 'streaming-zipformer-bilingual-zh-en',
    name: 'Streaming Zipformer (Bilingual)',
    description:
      'Bilingual streaming model supporting Chinese and English transcription, larger size with enhanced cross-language capabilities.',
    type: 'asr',
    size: 488 * 1024 * 1024, // 488 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-streaming-zipformer-bilingual-zh-en-2023-02-20.tar.bz2',
    version: '2023-02-20',
    language: 'zh-en',
  },

  {
    id: 'whisper-tiny-en',
    name: 'Whisper Tiny (English)',
    description:
      'Small, offline English model based on Whisper, ideal for mobile testing with pre-recorded audio.',
    type: 'asr',
    size: 113 * 1024 * 1024, // 113 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.en.tar.bz2',
    version: 'tiny',
    language: 'en',
  },

  {
    id: 'whisper-small-multilingual',
    name: 'Whisper Small (Multilingual)',
    description:
      'Offline model supporting multiple languages, useful for testing multi-lingual ASR capabilities.',
    type: 'asr',
    size: 610 * 1024 * 1024, // 610 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2',
    version: 'small',
    language: 'multilingual',
  },

  {
    id: 'zipformer-en-general',
    name: 'Zipformer (Non-streaming)',
    description:
      'Standard non-streaming English zipformer model offering high accuracy for offline transcription tasks.',
    type: 'asr',
    size: 293 * 1024 * 1024, // 293 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-zipformer-en-2023-06-26.tar.bz2',
    version: '2023-06-26',
    language: 'en',
  },

  // TTS Models
  {
    id: 'vits-icefall-en-low',
    name: 'VITS Icefall (Low Quality)',
    description:
      'Tiny, low-quality English model optimized for mobile devices with minimal resource usage.',
    type: 'tts',
    size: 30.3 * 1024 * 1024, // 30.3 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-icefall-en_US-ljspeech-low.tar.bz2',
    version: 'low',
    language: 'en',
  },

  {
    id: 'vits-piper-en-medium',
    name: 'VITS Piper (Medium Quality)',
    description:
      'Compact medium-quality model for American English, balancing size and clarity for mobile apps.',
    type: 'tts',
    size: 64.1 * 1024 * 1024, // 64.1 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-ljspeech-medium.tar.bz2',
    version: 'medium',
    language: 'en',
  },

  {
    id: 'vits-piper-en-high',
    name: 'VITS Piper (High Quality)',
    description:
      'High-fidelity English model, manageable on modern mobile devices for premium voice output.',
    type: 'tts',
    size: 125 * 1024 * 1024, // 125 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-libritts-high.tar.bz2',
    version: 'high',
    language: 'en',
  },

  {
    id: 'kokoro-en',
    name: 'Kokoro (Expressive)',
    description:
      'Expressive synthesis model, larger but suitable for high-end devices needing unique voice capabilities.',
    type: 'tts',
    size: 305 * 1024 * 1024, // 305 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-en-v0_19.tar.bz2',
    version: '0.19',
    language: 'en',
  },

  {
    id: 'matcha-icefall-en',
    name: 'Matcha (Efficient)',
    description:
      'Efficient and clear synthesis model, a modern alternative to VITS, mobile-friendly with distinct parameter requirements.',
    type: 'tts',
    size: 73.2 * 1024 * 1024, // 73.2 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-en_US-ljspeech.tar.bz2',
    version: '1.0',
    language: 'en',
    dependencies: [
      {
        id: 'vocos-vocoder',
        name: 'Vocos Vocoder (22kHz)',
        type: 'vocoder',
        url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx',
        size: 5.8 * 1024 * 1024, // Approximate size
        description:
          'Universal 22kHz vocoder for Matcha TTS models (required for speech generation)',
      },
    ],
  },

  // VAD Models
  {
    id: 'silero-vad-v5',
    name: 'Silero VAD v5',
    description:
      'Latest version of the Silero VAD model, lightweight and efficient for mobile use.',
    type: 'vad',
    size: 2.21 * 1024 * 1024, // 2.21 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad_v5.onnx',
    version: '5.0',
    language: 'universal',
  },

  // Keyword Spotting Models
  {
    id: 'kws-zipformer-gigaspeech-mobile',
    name: 'KWS Zipformer (GigaSpeech)',
    description: 'Optimized for mobile, trained on GigaSpeech data.',
    type: 'kws',
    size: 14.9 * 1024 * 1024, // 14.9 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01-mobile.tar.bz2',
    version: '2024-01-01',
    language: 'en',
  },

  {
    id: 'kws-zipformer-wenetspeech',
    name: 'KWS Zipformer (Wenetspeech)',
    description:
      'General-purpose model trained on Wenetspeech data, slightly larger but still compact.',
    type: 'kws',
    size: 16.8 * 1024 * 1024, // 16.8 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-wenetspeech-3.3M-2024-01-01.tar.bz2',
    version: '2024-01-01',
    language: 'zh',
  },

  // Speaker Identification Models
  {
    id: 'speaker-id-en-voxceleb',
    name: 'Speaker ID (English)',
    description: 'Compact model for English speaker verification.',
    type: 'speaker-id',
    size: 28.2 * 1024 * 1024, // 28.2 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx',
    version: '1.0',
    language: 'en',
  },

  {
    id: 'speaker-id-zh-cn',
    name: 'Speaker ID (Chinese)',
    description:
      'Model for Chinese speaker verification, similar in size and suitable for mobile.',
    type: 'speaker-id',
    size: 27 * 1024 * 1024, // 27 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh-cn_16k-common.onnx',
    version: '1.0',
    language: 'zh',
  },

  {
    id: 'speaker-id-zh-en-advanced',
    name: 'Speaker ID (Multilingual)',
    description:
      'Advanced model supporting both Chinese and English, compact and versatile.',
    type: 'speaker-id',
    size: 27 * 1024 * 1024, // 27 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/speaker-recongition-models/3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx',
    version: '1.0',
    language: 'multilingual',
  },

  // Language Identification Models
  {
    id: 'whisper-tiny-multilingual',
    name: 'Whisper Tiny (Multilingual)',
    description:
      'Compact multi-lingual model for language identification and transcription.',
    type: 'language-id',
    size: 111 * 1024 * 1024, // 111 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.tar.bz2',
    version: 'tiny',
    language: 'multilingual',
  },

  {
    id: 'whisper-small-multilingual-lang-id',
    name: 'Whisper Small (Multilingual)',
    description: 'Larger model with better accuracy for multiple languages.',
    type: 'language-id',
    size: 610 * 1024 * 1024, // 610 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2',
    version: 'small',
    language: 'multilingual',
  },

  // Audio Tagging Models
  {
    id: 'ced-tiny-audio-tagging',
    name: 'CED Tiny (Audio Tagging)',
    description:
      'Very small model for basic audio tagging, highly mobile-optimized.',
    type: 'audio-tagging',
    size: 27.2 * 1024 * 1024, // 27.2 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/audio-tagging-models/sherpa-onnx-ced-tiny-audio-tagging-2024-04-19.tar.bz2',
    version: '2024-04-19',
    language: 'universal',
  },

  {
    id: 'ced-mini-audio-tagging',
    name: 'CED Mini (Audio Tagging)',
    description:
      'Slightly larger with better performance for audio event detection.',
    type: 'audio-tagging',
    size: 45.5 * 1024 * 1024, // 45.5 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/audio-tagging-models/sherpa-onnx-ced-mini-audio-tagging-2024-04-19.tar.bz2',
    version: '2024-04-19',
    language: 'universal',
  },

  {
    id: 'ced-base-audio-tagging',
    name: 'CED Base (Audio Tagging)',
    description:
      'Full base model for comprehensive audio tagging, less suitable for mobile but good for testing.',
    type: 'audio-tagging',
    size: 369 * 1024 * 1024, // 369 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/audio-tagging-models/sherpa-onnx-ced-base-audio-tagging-2024-04-19.tar.bz2',
    version: '2024-04-19',
    language: 'universal',
  },

  // Punctuation Models
  {
    id: 'online-punct-en',
    name: 'Online Punctuation (English)',
    description:
      'Online punctuation model for English text, lightweight and suitable for mobile.',
    type: 'punctuation',
    size: 29.2 * 1024 * 1024, // 29.2 MB
    url: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/punctuation-models/sherpa-onnx-online-punct-en-2024-08-06.tar.bz2',
    version: '2024-08-06',
    language: 'en',
  },
];

// Helper functions to filter and find models
export function getModelsByType(type: ModelType): ModelMetadata[] {
  return AVAILABLE_MODELS.filter((model) => model.type === type);
}

export function getModelById(id: string): ModelMetadata | undefined {
  return AVAILABLE_MODELS.find((model) => model.id === id);
}

export function getModelsByLanguage(language: string): ModelMetadata[] {
  return AVAILABLE_MODELS.filter(
    (model) => model.language === language || model.language === 'universal'
  );
}

export function getModelsBySize(maxSize: number): ModelMetadata[] {
  return AVAILABLE_MODELS.filter((model) => model.size <= maxSize);
}

export function getModelsByTypeAndLanguage(
  type: ModelType,
  language: string
): ModelMetadata[] {
  return AVAILABLE_MODELS.filter(
    (model) =>
      model.type === type &&
      (model.language === language || model.language === 'universal')
  );
}
