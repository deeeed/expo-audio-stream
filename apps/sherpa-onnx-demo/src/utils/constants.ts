import type { ModelMetadata } from './models';
import type { ModelState, ModelStatus } from '../contexts/ModelManagement/types';
import { WEB_FEATURES, type WebFeatureKey } from '../config/webFeatures';

// Default web model IDs — derived from webFeatures.ts config
export const DEFAULT_WEB_TTS_MODEL_ID = WEB_FEATURES.tts.modelId;
export const DEFAULT_WEB_ASR_MODEL_ID = WEB_FEATURES.asr.modelId;
export const DEFAULT_WEB_VAD_MODEL_ID = WEB_FEATURES.vad.modelId;
export const DEFAULT_WEB_KWS_MODEL_ID = WEB_FEATURES.kws.modelId;
export const DEFAULT_WEB_DENOISER_MODEL_ID = WEB_FEATURES.denoising.modelId;
export const DEFAULT_WEB_DIARIZATION_MODEL_ID = WEB_FEATURES.diarization.modelId;
export const DEFAULT_WEB_SPEAKER_ID_MODEL_ID = WEB_FEATURES.speakerId.modelId;
export const DEFAULT_WEB_AUDIO_TAGGING_MODEL_ID = WEB_FEATURES.audioTagging.modelId;
export const DEFAULT_WEB_LANGUAGE_ID_MODEL_ID = WEB_FEATURES.languageId.modelId;
export const DEFAULT_WEB_PUNCTUATION_MODEL_ID = WEB_FEATURES.punctuation.modelId;

/** Map from model ID to its feature key (built from WEB_FEATURES config) */
export const WEB_MODEL_FEATURE_MAP: Record<string, WebFeatureKey> = Object.fromEntries(
  Object.entries(WEB_FEATURES).map(([key, entry]) => [entry.modelId, key as WebFeatureKey])
) as Record<string, WebFeatureKey>;

/** Check if a web model ID's feature is enabled */
export function isWebModelEnabled(modelId: string): boolean {
  const featureKey = WEB_MODEL_FEATURE_MAP[modelId];
  if (!featureKey) return false;
  return WEB_FEATURES[featureKey].enabled;
}

function makeWebModelState(metadata: ModelMetadata, localPath: string): ModelState {
  return {
    metadata,
    status: 'downloaded' as ModelStatus,
    progress: 1,
    localPath,
    files: [{ path: localPath, size: 1, lastModified: Date.now() }],
    extractedFiles: [],
    lastDownloaded: Date.now(),
  };
}

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

export function createWebAsrModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/asr');
}

export function createWebVadModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/vad');
}

export function createWebKwsModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/kws');
}

export function createWebDenoiserModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/enhancement');
}

export function createWebDiarizationModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/speakers');
}

export function createWebSpeakerIdModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/speakers');
}

export function createWebAudioTaggingModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/audio-tagging');
}

export function createWebLanguageIdModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/language-id');
}

export function createWebPunctuationModelState(metadata: ModelMetadata): ModelState {
  return makeWebModelState(metadata, '/wasm/punctuation');
}