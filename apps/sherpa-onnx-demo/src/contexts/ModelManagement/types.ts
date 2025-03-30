import type { ModelMetadata as UtilModelMetadata } from '../../utils/models';

// Restore original ModelStatus options if they were different
// Assuming these were the statuses before the recent changes
export type ModelStatus =
  | 'pending' // Or 'not_downloaded'
  | 'downloading'
  | 'extracting' 
  | 'downloaded'
  // | 'deleting' // Keep if it was part of the original
  | 'error';

// Restore original ModelState structure (add back potentially removed fields)
export interface ModelState {
  metadata: UtilModelMetadata; // Metadata was stored
  status: ModelStatus;
  progress?: number; // Progress was likely stored
  error?: string;
  localPath?: string;
  // Add back other fields if they existed and were stored previously
  files?: { path: string; size: number; lastModified: number }[]; 
  extractedFiles?: string[]; 
  lastDownloaded?: number; 
  // Remove fields added during the refactor if they weren't original
  // isDownloading?: boolean; 
  // downloadProgress?: number; // Use 'progress' if that was original
}

// Restore original Context Type
export interface ModelManagementContextType {
  modelsState: Record<string, ModelState>; // Keep this name
  // isInitializing: boolean; // Remove if not original
  getAvailableModels: () => UtilModelMetadata[]; // Original might have returned metadata directly
  getDownloadedModels: () => ModelState[]; 
  getModelState: (modelId: string) => ModelState | undefined;
  updateModelState: (modelId: string, updates: Partial<ModelState>) => void; // Keep
  downloadModel: (modelId: string) => Promise<void>; // Keep
  deleteModel: (modelId: string) => Promise<void>; // Keep
  // Add back functions that were part of the original context value
  isModelDownloaded: (modelId: string) => boolean; 
  refreshModelStatus: (modelId: string) => Promise<void>;
  clearAllModels: () => Promise<void>;
  cancelDownload: (modelId: string) => Promise<void>;
}

// Restore original Provider Props if needed
export interface ModelManagementProviderProps {
  children: React.ReactNode;
  storageKey?: string; 
  baseUrl?: string; 
} 