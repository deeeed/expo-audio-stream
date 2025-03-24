import { Asset } from 'expo-asset';

export type ModelStatus = 'pending' | 'downloading' | 'downloaded' | 'error' | 'extracting';

export interface ModelFile {
  path: string;
  size: number;
  lastModified: number;
}

export interface ModelMetadata {
  id: string;
  name: string;
  description: string;
  type: 'asr' | 'tts' | 'vad' | 'kws' | 'speaker-id' | 'language-id' | 'audio-tagging' | 'punctuation';
  size: number;
  url: string;
  version: string;
  language: string;
  requiredFiles?: string[];
  parameters?: Record<string, unknown>;
}

export interface ModelState {
  metadata: ModelMetadata;
  status: ModelStatus;
  progress: number;
  error?: string;
  localPath?: string;
  files?: ModelFile[];
  lastDownloaded?: number;
  extractedFiles?: string[];
}

export interface ModelManagementContextType {
  models: Record<string, ModelState>;
  downloadModel: (modelId: string) => Promise<void>;
  deleteModel: (modelId: string) => Promise<void>;
  getModelState: (modelId: string) => ModelState | undefined;
  isModelDownloaded: (modelId: string) => boolean;
  getDownloadedModels: () => ModelState[];
  getAvailableModels: () => ModelMetadata[];
  refreshModelStatus: (modelId: string) => Promise<void>;
  clearAllModels: () => Promise<void>;
}

export interface ModelManagementProviderProps {
  children: React.ReactNode;
  storageKey?: string;
  baseUrl?: string;
} 