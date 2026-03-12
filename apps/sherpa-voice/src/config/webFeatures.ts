/**
 * Web feature configuration.
 *
 * Toggle features on/off and select which model to use per feature.
 * Disabled features won't load JS modules, won't inject preloaded model
 * states, and won't appear in the features list.
 *
 * This directly affects:
 *  - Which WASM JS modules are loaded at startup (main-sherpa-demo.ts)
 *  - Which models appear as "downloaded" in ModelManagement (constants.ts)
 *  - Which feature cards are visible on the Features page
 *
 * To reduce your web deployment size, disable unused features here AND remove
 * the corresponding model files from public/wasm/{feature}/.
 *
 * To swap a model, change the `modelId` here, then update
 * `web-models.config.json` to point at the new archive, and re-run
 * `./scripts/download-web-models.sh`. See packages/sherpa-onnx.rn/docs/WEB.md
 * for the full workflow.
 */

export interface WebFeatureEntry {
  enabled: boolean;
  /**
   * Model ID from AVAILABLE_MODELS / MODEL_CONFIGS.
   * See src/hooks/useModelConfig.ts for all available IDs.
   */
  modelId: string;
}

export type WebFeatureConfig = Record<string, WebFeatureEntry>;

/**
 * Current web feature configuration.
 * Set `enabled: false` to disable a feature on web.
 * Change `modelId` to use a different model for that feature.
 */
export const WEB_FEATURES = {
  /** Voice Activity Detection (~2 MB). */
  vad: { enabled: true, modelId: 'silero-vad-v5' },

  /** Speech Recognition / streaming ASR (~200 MB).
   *  Alternatives: 'streaming-zipformer-en-20m-mobile', 'streaming-zipformer-bilingual-zh-en',
   *  'streaming-zipformer-multilingual', 'whisper-tiny-en' */
  asr: { enabled: true, modelId: 'streaming-zipformer-en-general' },

  /** Text-to-Speech (~87 MB).
   *  Alternatives: 'vits-piper-en-medium', 'vits-piper-en-libritts_r-medium',
   *  'kokoro-en', 'kokoro-multi-lang-v1_1', 'matcha-icefall-en' */
  tts: { enabled: true, modelId: 'vits-icefall-en-low' },

  /** Keyword Spotting (~10 MB).
   *  Alternatives: 'kws-zipformer-wenetspeech' */
  kws: { enabled: true, modelId: 'kws-zipformer-gigaspeech' },

  /** Speaker Diarization (~15 MB). */
  diarization: { enabled: true, modelId: 'pyannote-segmentation-3-0' },

  /** Speech Enhancement / Denoising (~5 MB). */
  denoising: { enabled: true, modelId: 'gtcrn-speech-denoiser' },

  /** Audio Tagging (~10 MB).
   *  Alternatives: 'ced-mini-audio-tagging', 'ced-base-audio-tagging' */
  audioTagging: { enabled: true, modelId: 'ced-tiny-audio-tagging' },

  /** Language Identification (~40 MB).
   *  Alternatives: 'whisper-small-multilingual-lang-id' */
  languageId: { enabled: true, modelId: 'whisper-tiny-multilingual' },

  /** Speaker Identification (~7 MB).
   *  Alternatives: 'speaker-id-zh-cn', 'speaker-id-zh-en-advanced' */
  speakerId: { enabled: true, modelId: 'speaker-id-en-voxceleb' },

  /** Punctuation Restoration (~5 MB). */
  punctuation: { enabled: true, modelId: 'online-punct-en' },
} satisfies Record<string, WebFeatureEntry>;

export type WebFeatureKey = keyof typeof WEB_FEATURES;

/**
 * Map from feature key to the WASM JS module path (relative to /wasm/).
 * Used by main-sherpa-demo.ts to build the modulePaths list.
 */
export const WEB_FEATURE_MODULES: Record<WebFeatureKey, string> = {
  vad: '/wasm/sherpa-onnx-vad.js',
  asr: '/wasm/sherpa-onnx-asr.js',
  tts: '/wasm/sherpa-onnx-tts.js',
  kws: '/wasm/sherpa-onnx-kws.js',
  diarization: '/wasm/sherpa-onnx-speaker.js',
  denoising: '/wasm/sherpa-onnx-enhancement.js',
  audioTagging: '/wasm/sherpa-onnx-audio-tagging.js',
  languageId: '/wasm/sherpa-onnx-language-id.js',
  speakerId: '/wasm/sherpa-onnx-speaker-id.js',
  punctuation: '/wasm/sherpa-onnx-punctuation.js',
};

/**
 * Map from feature key to the route path used in the features index.
 * Used to filter feature cards on web.
 */
export const WEB_FEATURE_ROUTES: Record<WebFeatureKey, string> = {
  vad: '/(tabs)/features/vad',
  asr: '/(tabs)/features/asr',
  tts: '/(tabs)/features/tts',
  kws: '/(tabs)/features/kws',
  diarization: '/(tabs)/features/diarization',
  denoising: '/(tabs)/features/denoising',
  audioTagging: '/(tabs)/features/audio-tagging',
  languageId: '/(tabs)/features/language-id',
  speakerId: '/(tabs)/features/speaker-id',
  punctuation: '/(tabs)/features/punctuation',
};

/** Returns the list of enabled WASM JS module paths. */
export function getEnabledModulePaths(): string[] {
  const paths: string[] = [];
  for (const [key, entry] of Object.entries(WEB_FEATURES)) {
    if (entry.enabled) {
      paths.push(WEB_FEATURE_MODULES[key as WebFeatureKey]);
    }
  }
  return paths;
}

/** Check if a feature route is enabled on web. */
export function isWebFeatureRouteEnabled(route: string): boolean {
  for (const [key, featureRoute] of Object.entries(WEB_FEATURE_ROUTES)) {
    if (route === featureRoute) {
      return WEB_FEATURES[key as WebFeatureKey].enabled;
    }
  }
  // Route not in the map — always enabled (e.g. home, about)
  return true;
}
