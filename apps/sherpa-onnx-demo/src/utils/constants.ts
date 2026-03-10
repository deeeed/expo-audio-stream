import type { ModelMetadata } from './models';
import type { ModelState, ModelStatus } from '../contexts/ModelManagement/types';

// Default web model IDs for preloaded WASM models
export const DEFAULT_WEB_TTS_MODEL_ID = 'vits-icefall-en-low';
export const DEFAULT_WEB_ASR_MODEL_ID = 'streaming-zipformer-en-general';
export const DEFAULT_WEB_VAD_MODEL_ID = 'silero-vad-v5';
export const DEFAULT_WEB_KWS_MODEL_ID = 'kws-zipformer-gigaspeech';
export const DEFAULT_WEB_DENOISER_MODEL_ID = 'gtcrn-speech-denoiser';
export const DEFAULT_WEB_DIARIZATION_MODEL_ID = 'pyannote-segmentation-3-0';
export const DEFAULT_WEB_SPEAKER_ID_MODEL_ID = 'speaker-id-en-voxceleb';
export const DEFAULT_WEB_AUDIO_TAGGING_MODEL_ID = 'ced-tiny-audio-tagging';
export const DEFAULT_WEB_LANGUAGE_ID_MODEL_ID = 'whisper-tiny-multilingual';
export const DEFAULT_WEB_PUNCTUATION_MODEL_ID = 'online-punct-en';

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