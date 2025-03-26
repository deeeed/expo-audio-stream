import type { ModelType } from '@siteed/sherpa-onnx.rn';

export type ViewMode = 'download' | 'files';

export interface ModelTypeOption {
  type: ModelType | 'all';
  label: string;
}

export const MODEL_TYPES: ModelTypeOption[] = [
  { type: 'all', label: 'All Models' },
  { type: 'tts', label: 'TTS' },
  { type: 'asr', label: 'Speech-to-Text' },
  { type: 'vad', label: 'Voice Activity' },
  { type: 'kws', label: 'Keyword Spotting' },
  { type: 'speaker-id', label: 'Speaker ID' },
  { type: 'language-id', label: 'Language ID' },
  { type: 'audio-tagging', label: 'Audio Tagging' },
  { type: 'punctuation', label: 'Punctuation' },
]; 