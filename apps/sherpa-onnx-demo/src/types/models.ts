import { ModelType } from '../utils/models';

export type ViewMode = 'download' | 'files';

export interface ModelTypeOption {
  type: ModelType | 'all';
  label: string;
}

export const MODEL_TYPES: ModelTypeOption[] = [
  { type: 'all', label: 'All Models' },
  { type: 'tts', label: 'TTS' },
  { type: 'asr', label: 'ASR' },
  { type: 'vad', label: 'VAD' },
  { type: 'kws', label: 'KWS' },
  { type: 'speaker-id', label: 'Speaker ID' },
  { type: 'language-id', label: 'Language ID' },
  { type: 'audio-tagging', label: 'Audio Tagging' },
  { type: 'punctuation', label: 'Punctuation' },
]; 