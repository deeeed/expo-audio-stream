# Sherpa ONNX Demo Model Management System

## Overview

This document outlines the implementation plan for separating the model management functionality from the `@siteed/sherpa-onnx.rn` wrapper into the demo application. The current implementation has tight coupling between model discovery/loading logic and the TTS/ASR functionality, leading to complex, error-prone code with redundant file discovery logic.

## Goals

1. **Separation of concerns**: Move all model management logic from the wrapper library to the demo app
2. **Simplify usage**: Components should focus on their core functionality (TTS, ASR, etc.) not model discovery
3. **Support pre-bundled models**: Allow including models with the app using Expo Assets
4. **Type safety**: Reuse existing types from the core library
5. **Unified approach**: Handle all model types (TTS, ASR, Audio Tagging, Speaker ID) consistently
6. **Web compatibility**: Ensure implementation works across all platforms including web

## Integration with Existing Structure

This implementation will integrate with the existing project structure:

```
apps/sherpa-onnx-demo/
  ├── assets/                           # Pre-bundled models in app root (for expo-asset)
  │   └── models/
  │       ├── tts/                      # Bundled TTS models
  │       ├── asr/                      # Bundled ASR models
  │       └── ...                       # Other model types
  └── src/
      ├── contexts/
      │   └── ModelManagement/          # Existing model management context
      │       ├── ModelManagementContext.tsx  # Update existing context
      │       ├── types.ts              # Extend existing types
      │       └── index.ts              # Re-export hooks and context
      ├── hooks/                        # Existing hooks directory
      │   ├── useModelCounts.ts         # Existing hook 
      │   ├── useModelRegistry.ts       # New hook for model registry
      │   └── useAssetLoader.ts         # New hook for loading bundled assets
      ├── utils/                        # Existing utils directory
      │   ├── models.ts                 # Extend with model configurations
      │   ├── platformStorage.ts        # New platform-specific storage adapter
      │   └── archiveUtils.ts           # Existing archive utilities
      └── components/
          └── ModelManager.tsx          # Existing component to update
```

## Implementation Approach

We'll use a functional approach with React hooks and context, enhancing the existing context implementation:

1. **Extend existing ModelManagementContext** with additional functionality
2. **Add new hooks** in the existing hooks directory for specific functionality
3. **Create platform-specific adapters** for file operations to ensure web compatibility
4. **Update the existing ModelManager component** to use the enhanced context

## Type System

### Type Reuse

We will directly import all model configuration types from the library to ensure compatibility:

```typescript
import type {
  TtsModelConfig,
  AsrModelConfig, 
  AudioTaggingModelConfig,
  SpeakerIdModelConfig
} from '@siteed/sherpa-onnx.rn';
```

### Extend Existing Types

We'll extend the existing types in `src/contexts/ModelManagement/types.ts`:

```typescript
// src/contexts/ModelManagement/types.ts

import type {
  TtsModelConfig,
  AsrModelConfig,
  AudioTaggingModelConfig,
  SpeakerIdModelConfig
} from '@siteed/sherpa-onnx.rn';

// Existing types...

// Add or extend types for model management
export type ModelType = 'tts' | 'asr' | 'audio-tagging' | 'speaker-id';

export interface ModelMetadata {
  id: string;              // Unique identifier
  name: string;            // Display name
  description: string;     // User-friendly description
  version: string;         // Model version
  type: ModelType;         // Model type (tts, asr, etc.)
  size: number;            // Size in bytes
  bundled?: boolean;       // Is bundled with app
  remoteUrl?: string;      // Download URL if not bundled
  assetPath?: string;      // Path in assets for bundled models
  languages?: string[];    // Supported languages
  author?: string;         // Creator
  license?: string;        // License information
  webCompatible?: boolean; // Whether this model works on web platform
}

// Union type with models' native config + metadata
export type ModelConfig = 
  | (TtsModelConfig & ModelMetadata)
  | (AsrModelConfig & ModelMetadata)
  | (AudioTaggingModelConfig & ModelMetadata)
  | (SpeakerIdModelConfig & ModelMetadata);

// Model download/extraction status
export type ModelStatus = 
  | 'not_downloaded'    // Model needs to be downloaded
  | 'downloading'       // Download in progress
  | 'downloaded'        // Downloaded but not extracted
  | 'extracting'        // Extraction in progress
  | 'ready'             // Ready to use
  | 'error';            // Error state

// Track current state of a model
export interface ModelState {
  id: string;
  status: ModelStatus;
  progress?: number;     // Download progress (0-100)
  localPath?: string;    // Path to extracted model files
  error?: string;        // Error message if status is 'error'
  timestamp?: number;    // Last update timestamp
}

// Context state for model management
export interface ModelContextState {
  models: Record<string, ModelConfig>;
  modelStates: Record<string, ModelState>;
  isInitialized: boolean;
}
```

## Platform Storage Adapter

Create a platform-specific adapter for file operations in the existing utils directory:

```typescript
// src/utils/platformStorage.ts

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Interface for platform storage operations
export interface StorageAdapter {
  // File operations
  exists: (path: string) => Promise<boolean>;
  readDirectory: (path: string) => Promise<string[]>;
  makeDirectory: (path: string, options?: { intermediates: boolean }) => Promise<void>;
  copyFile: (source: string, destination: string) => Promise<void>;
  moveFile: (source: string, destination: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  
  // Download operations
  downloadFile: (url: string, destination: string) => Promise<{ status: number }>;
  
  // Extraction operations
  extractZip: (source: string, destination: string) => Promise<void>;
  
  // Path utilities
  getDownloadsDirectory: () => string;
  getModelsDirectory: (type: string, id: string) => string;
}

// Native implementation using expo-file-system
class NativeStorageAdapter implements StorageAdapter {
  async exists(path: string): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  }
  
  async readDirectory(path: string): Promise<string[]> {
    return await FileSystem.readDirectoryAsync(path);
  }
  
  async makeDirectory(path: string, options = { intermediates: false }): Promise<void> {
    await FileSystem.makeDirectoryAsync(path, options);
  }
  
  async copyFile(source: string, destination: string): Promise<void> {
    await FileSystem.copyAsync({ from: source, to: destination });
  }
  
  async moveFile(source: string, destination: string): Promise<void> {
    await FileSystem.moveAsync({ from: source, to: destination });
  }
  
  async deleteFile(path: string): Promise<void> {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
  
  async downloadFile(url: string, destination: string): Promise<{ status: number }> {
    return await FileSystem.downloadAsync(url, destination, {
      md5: false,
      headers: { 'Accept': '*/*' }
    });
  }
  
  async extractZip(source: string, destination: string): Promise<void> {
    await FileSystem.unzipAsync(source, destination);
  }
  
  getDownloadsDirectory(): string {
    return `${FileSystem.documentDirectory}downloads`;
  }
  
  getModelsDirectory(type: string, id: string): string {
    return `${FileSystem.documentDirectory}models/${type}/${id}`;
  }
}

// Web implementation using IndexedDB
class WebStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private dbName = 'sherpa_onnx_models';
  private initialized = false;
  
  constructor() {
    this.initDatabase();
  }
  
  private async initDatabase(): Promise<void> {
    if (this.initialized) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' });
        }
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.initialized = true;
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error opening IndexedDB:', event);
        reject(new Error('Failed to open IndexedDB'));
      };
    });
  }
  
  // Implement required methods for web storage
  async exists(path: string): Promise<boolean> {
    await this.initDatabase();
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(false);
        return;
      }
      
      const transaction = this.db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(path);
      
      request.onsuccess = () => {
        resolve(!!request.result);
      };
      
      request.onerror = () => {
        resolve(false);
      };
    });
  }
  
  // Other web implementation methods...
  
  getDownloadsDirectory(): string {
    return 'downloads';  // Virtual path for web
  }
  
  getModelsDirectory(type: string, id: string): string {
    return `models/${type}/${id}`;  // Virtual path for web
  }
}

// Export the appropriate adapter based on platform
export const storage: StorageAdapter = Platform.OS === 'web' 
  ? new WebStorageAdapter() 
  : new NativeStorageAdapter();
```

## Model Registry Hook

Add a new hook to the existing hooks directory:

```typescript
// src/hooks/useModelRegistry.ts

import { useState, useCallback } from 'react';
import { ModelConfig, ModelState, ModelType } from '../contexts/ModelManagement/types';
import { ttsModels, asrModels, audioTaggingModels, speakerIdModels } from '../utils/models';

export function useModelRegistry() {
  // State for models and their statuses
  const [models, setModels] = useState<Record<string, ModelConfig>>({});
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize registry with predefined models
  const initializeRegistry = useCallback(() => {
    if (isInitialized) return;
    
    const allModels = [...ttsModels, ...asrModels, ...audioTaggingModels, ...speakerIdModels];
    const modelsMap: Record<string, ModelConfig> = {};
    const statesMap: Record<string, ModelState> = {};
    
    // Register all models and initialize their states
    allModels.forEach(model => {
      modelsMap[model.id] = model;
      statesMap[model.id] = {
        id: model.id,
        status: model.bundled ? 'ready' : 'not_downloaded',
        timestamp: Date.now()
      };
    });
    
    setModels(modelsMap);
    setModelStates(statesMap);
    setIsInitialized(true);
  }, [isInitialized]);
  
  // Get a specific model
  const getModel = useCallback((id: string): ModelConfig | undefined => {
    return models[id];
  }, [models]);
  
  // Get all models
  const getAllModels = useCallback((): ModelConfig[] => {
    return Object.values(models);
  }, [models]);
  
  // Get models by type
  const getModelsByType = useCallback((type: ModelType): ModelConfig[] => {
    return Object.values(models).filter(model => model.type === type);
  }, [models]);
  
  // Get model state
  const getModelState = useCallback((id: string): ModelState | undefined => {
    return modelStates[id];
  }, [modelStates]);
  
  // Update model state
  const updateModelState = useCallback((id: string, state: Partial<ModelState>) => {
    setModelStates(prev => {
      if (!prev[id]) return prev;
      
      return {
        ...prev,
        [id]: {
          ...prev[id],
          ...state,
          timestamp: Date.now()
        }
      };
    });
  }, []);
  
  return {
    models,
    modelStates,
    isInitialized,
    initializeRegistry,
    getModel,
    getAllModels,
    getModelsByType,
    getModelState,
    updateModelState
  };
}
```

## Asset Loading Hook

Add a new hook for asset loading:

```typescript
// src/hooks/useAssetLoader.ts

import { useCallback } from 'react';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { ModelConfig } from '../contexts/ModelManagement/types';
import { storage } from '../utils/platformStorage';
import { SherpaOnnxAPI } from '@siteed/sherpa-onnx.rn';

export function useAssetLoader() {
  // Load a bundled model from assets
  const loadBundledModel = useCallback(async (config: ModelConfig): Promise<string> => {
    if (!config.bundled || !config.assetPath) {
      throw new Error(`Model ${config.id} is not bundled or has no asset path`);
    }

    try {
      // Platform-specific asset loading
      if (Platform.OS === 'web') {
        return await loadBundledModelWeb(config);
      } else {
        return await loadBundledModelNative(config);
      }
    } catch (error) {
      console.error('Error loading bundled model:', error);
      throw new Error(`Failed to load bundled model ${config.id}: ${error.message}`);
    }
  }, []);
  
  // Native implementation of bundled model loading
  const loadBundledModelNative = useCallback(async (config: ModelConfig): Promise<string> => {
    // Get asset reference from app root assets directory
    const asset = Asset.fromModule(require(`../../assets/models/${config.type}/${config.assetPath}`));
    
    // Download the asset if needed
    await asset.downloadAsync();
    
    // Define extraction directory
    const targetDir = storage.getModelsDirectory(config.type, config.id);
    
    // Check if already extracted to avoid redundant work
    const exists = await storage.exists(targetDir);
    if (exists) {
      return targetDir;
    }
    
    // Create directory if needed
    await storage.makeDirectory(targetDir, { intermediates: true });
    
    // Extract based on file type
    if (asset.uri.endsWith('.tar.bz2')) {
      // Use the native module to extract tar.bz2
      const result = await SherpaOnnxAPI.extractTarBz2(asset.uri, targetDir);
      if (!result.success) {
        throw new Error(`Failed to extract bundled model: ${result.message}`);
      }
    } 
    else if (asset.uri.endsWith('.zip')) {
      // Extract using platform storage adapter
      await storage.extractZip(asset.uri, targetDir);
    }
    else {
      // For individual files, copy directly
      await storage.copyFile(asset.uri, `${targetDir}/${asset.name}`);
    }
    
    return targetDir;
  }, []);
  
  // Web implementation of bundled model loading
  const loadBundledModelWeb = useCallback(async (config: ModelConfig): Promise<string> => {
    // Web-specific implementation
    const targetDir = storage.getModelsDirectory(config.type, config.id);
    
    // Check if already extracted
    const exists = await storage.exists(targetDir);
    if (exists) {
      return targetDir;
    }
    
    // Placeholder implementation
    console.warn('Web model loading is not fully implemented yet');
    return targetDir;
  }, []);
  
  return {
    loadBundledModel
  };
}
```

## Update Existing Model Management Context

Enhance the existing ModelManagementContext with the new functionality:

```typescript
// src/contexts/ModelManagement/ModelManagementContext.tsx

import React, { createContext, useEffect, useState, useContext } from 'react';
import { ModelConfig, ModelContextState, ModelState, ModelType } from './types';
import { useModelRegistry } from '../../hooks/useModelRegistry';
import { useAssetLoader } from '../../hooks/useAssetLoader';
import { storage } from '../../utils/platformStorage';
import { SherpaOnnxAPI } from '@siteed/sherpa-onnx.rn';

// Default context state
const defaultContextState: ModelContextState = {
  models: {},
  modelStates: {},
  isInitialized: false
};

// Context interface
interface ModelManagementContextValue {
  state: ModelContextState;
  downloadModel: (id: string) => Promise<boolean>;
  deleteModel: (id: string) => Promise<boolean>;
  getModelState: (id: string) => ModelState | undefined;
  getAvailableModels: (type?: ModelType) => ModelConfig[];
  getDownloadedModels: (type?: ModelType) => ModelConfig[];
  getInitConfig: (id: string) => Promise<ModelConfig>;
  // Include any existing context methods here
}

// Create context or extend existing one
const ModelManagementContext = createContext<ModelManagementContextValue>({
  state: defaultContextState,
  downloadModel: async () => false,
  deleteModel: async () => false,
  getModelState: () => undefined,
  getAvailableModels: () => [],
  getDownloadedModels: () => [],
  getInitConfig: async () => { throw new Error('Not initialized'); }
  // Initialize any existing methods with appropriate defaults
});

// Provider component - update existing provider
export function ModelManagementProvider({ children }: { children: React.ReactNode }) {
  // Use hooks for registry and asset loading
  const registry = useModelRegistry();
  const { loadBundledModel } = useAssetLoader();
  const [isFullyInitialized, setIsFullyInitialized] = useState(false);
  
  // Context state
  const state: ModelContextState = {
    models: registry.models,
    modelStates: registry.modelStates,
    isInitialized: isFullyInitialized
  };
  
  // Initialize registry and bundled models
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      // Initialize registry first
      registry.initializeRegistry();
      
      // Then initialize bundled models if registry is ready
      if (registry.isInitialized) {
        const bundledModels = Object.values(registry.models).filter(model => model.bundled);
        
        for (const model of bundledModels) {
          try {
            // Update model status to extracting
            registry.updateModelState(model.id, { status: 'extracting' });
            
            // Extract bundled model
            const localPath = await loadBundledModel(model);
            
            // Update model state
            registry.updateModelState(model.id, {
              status: 'ready',
              localPath
            });
            
            console.log(`Bundled model ${model.id} ready at ${localPath}`);
          } catch (error) {
            console.error(`Failed to initialize bundled model ${model.id}:`, error);
            registry.updateModelState(model.id, {
              status: 'error',
              error: error.message
            });
          }
        }
        
        if (mounted) {
          setIsFullyInitialized(true);
        }
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
    };
  }, [registry.isInitialized, registry, loadBundledModel]);
  
  // Download a model
  const downloadModel = async (id: string): Promise<boolean> => {
    const model = registry.getModel(id);
    if (!model || !model.remoteUrl) {
      return false;
    }
    
    try {
      // Update model status to downloading
      registry.updateModelState(id, {
        status: 'downloading',
        progress: 0
      });
      
      // Create directory for the model
      const downloadDir = storage.getDownloadsDirectory();
      const modelDir = storage.getModelsDirectory(model.type, id);
      
      await storage.makeDirectory(downloadDir, { intermediates: true });
      await storage.makeDirectory(modelDir, { intermediates: true });
      
      // Download file
      const fileName = model.remoteUrl.split('/').pop() || 'model.zip';
      const downloadPath = `${downloadDir}/${fileName}`;
      
      const download = await storage.downloadFile(model.remoteUrl, downloadPath);
      
      if (download.status !== 200) {
        throw new Error(`Download failed with status ${download.status}`);
      }
      
      // Update model status to downloaded
      registry.updateModelState(id, {
        status: 'downloaded',
        progress: 100
      });
      
      // Update model status to extracting
      registry.updateModelState(id, {
        status: 'extracting'
      });
      
      // Extract based on file type
      if (downloadPath.endsWith('.tar.bz2')) {
        const result = await SherpaOnnxAPI.extractTarBz2(downloadPath, modelDir);
        if (!result.success) {
          throw new Error(`Extraction failed: ${result.message}`);
        }
      } else if (downloadPath.endsWith('.zip')) {
        await storage.extractZip(downloadPath, modelDir);
      } else {
        // Just move the file if it's not an archive
        await storage.moveFile(downloadPath, `${modelDir}/${fileName}`);
      }
      
      // Clean up download file
      await storage.deleteFile(downloadPath);
      
      // Update model state as ready
      registry.updateModelState(id, {
        status: 'ready',
        localPath: modelDir
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to download model ${id}:`, error);
      registry.updateModelState(id, {
        status: 'error',
        error: error.message
      });
      return false;
    }
  };
  
  // Delete a model
  const deleteModel = async (id: string): Promise<boolean> => {
    const state = registry.getModelState(id);
    if (!state?.localPath) {
      return false;
    }
    
    try {
      await storage.deleteFile(state.localPath);
      
      registry.updateModelState(id, {
        status: 'not_downloaded',
        localPath: undefined
      });
      
      return true;
    } catch (error) {
      console.error(`Failed to delete model ${id}:`, error);
      return false;
    }
  };
  
  // Get model state
  const getModelState = (id: string): ModelState | undefined => {
    return registry.getModelState(id);
  };
  
  // Get available models
  const getAvailableModels = (type?: ModelType): ModelConfig[] => {
    if (type) {
      return registry.getModelsByType(type);
    }
    return registry.getAllModels();
  };
  
  // Get downloaded models
  const getDownloadedModels = (type?: ModelType): ModelConfig[] => {
    const allModels = type 
      ? registry.getModelsByType(type)
      : registry.getAllModels();
      
    return allModels.filter(model => {
      const state = registry.getModelState(model.id);
      return state && state.status === 'ready';
    });
  };
  
  // Get initialization config for a model
  const getInitConfig = async (id: string): Promise<ModelConfig> => {
    const model = registry.getModel(id);
    const state = registry.getModelState(id);
    
    if (!model) {
      throw new Error(`Model ${id} not found`);
    }
    
    if (!state || state.status !== 'ready' || !state.localPath) {
      throw new Error(`Model ${id} is not ready`);
    }
    
    // Clone model config to avoid modifying the original
    const config = { ...model };
    
    // Update model directory path for initialization
    if (config.type === 'tts') {
      (config as any).modelDir = state.localPath;
    } else if (config.type === 'asr') {
      // Update ASR paths with proper local path
      const asrConfig = config as any;
      asrConfig.modelDir = state.localPath;
    }
    
    return config;
  };
  
  // Create context value with both new and existing functionality
  const contextValue = {
    state,
    downloadModel,
    deleteModel,
    getModelState,
    getAvailableModels,
    getDownloadedModels,
    getInitConfig,
    // Include any existing methods here
  };
  
  return (
    <ModelManagementContext.Provider value={contextValue}>
      {children}
    </ModelManagementContext.Provider>
  );
}

// Custom hook for using the model context - reuse existing hook if available
export function useModelManagement() {
  return useContext(ModelManagementContext);
}
```

## Update Model Definitions in utils/models.ts

Extend the existing models.ts file with predefined model configurations:

```typescript
// src/utils/models.ts

import type {
  TtsModelConfig,
  AsrModelConfig,
  AudioTaggingModelConfig,
  SpeakerIdModelConfig
} from '@siteed/sherpa-onnx.rn';
import { ModelMetadata } from '../contexts/ModelManagement/types';

// Define TTS models with their complete configurations
export const ttsModels: (TtsModelConfig & ModelMetadata)[] = [
  {
    // Metadata
    id: 'vits-ljspeech',
    name: 'VITS English (LJSpeech)',
    description: 'English TTS model based on LJSpeech dataset',
    version: '1.0.0',
    type: 'tts',
    size: 25600000,
    languages: ['en-US'],
    author: 'k2-fsa',
    license: 'Apache-2.0',
    bundled: false,
    remoteUrl: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/vits/vits-ljspeech.tar.bz2',
    
    // TTS model config (matching SherpaOnnxAPI.TtsModelConfig)
    modelType: 'vits',
    modelDir: '', // This will be set at runtime when downloaded
    modelName: 'model.onnx',
    dataDir: 'espeak-ng-data',
    numThreads: 2,
    debug: false,
    lexicon: 'lexicon.txt',
    noiseScale: 0.667,
    noiseScaleW: 0.8,
    lengthScale: 1.0
  },
  
  // Example of a bundled model with asset path
  {
    id: 'vits-piper-en',
    name: 'Piper English (Bundled)',
    description: 'Lightweight English TTS bundled with the app',
    version: '1.0.0',
    type: 'tts',
    size: 15400000,
    languages: ['en-US'],
    bundled: true,
    assetPath: 'vits-piper-en',
    
    modelType: 'vits',
    modelDir: '', // This will be set at runtime from asset
    modelName: 'en_US-lessac-medium.onnx',
    numThreads: 2,
    debug: false,
    lexicon: 'en_US-lessac-medium.lex'
  }
];

// Define ASR models
export const asrModels: (AsrModelConfig & ModelMetadata)[] = [
  // ASR model configurations
];

// Define Audio Tagging models
export const audioTaggingModels: (AudioTaggingModelConfig & ModelMetadata)[] = [
  // Audio tagging model configurations
];

// Define Speaker ID models
export const speakerIdModels: (SpeakerIdModelConfig & ModelMetadata)[] = [
  // Speaker ID model configurations
];

// Re-export existing model utility functions
```

## Usage with Existing Components

Update existing components to use the enhanced context:

```typescript
// In src/app/(tabs)/tts.tsx or other components
import { useModelManagement } from '../../contexts/ModelManagement';
import { TTS } from '@siteed/sherpa-onnx.rn';
import { useState } from 'react';

export default function TtsScreen() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [ttsInitialized, setTtsInitialized] = useState(false);
  const [initResult, setInitResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  
  const {
    getDownloadedModels,
    getModelState,
    getInitConfig
  } = useModelManagement();

  // Get only downloaded TTS models
  const availableModels = getDownloadedModels('tts');
  
  const handleInitTts = async () => {
    if (!selectedModelId) {
      setErrorMessage('Please select a model first');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Initializing TTS...');

    try {
      // Get the complete initialization configuration
      const modelConfig = await getInitConfig(selectedModelId);
      
      // Simple initialization with ready-to-use config
      const result = await TTS.initialize(modelConfig);
      setInitResult(result);
      setTtsInitialized(result.success);

      if (result.success) {
        setStatusMessage(`TTS initialized successfully! Sample rate: ${result.sampleRate}Hz`);
      } else {
        setErrorMessage(`TTS initialization failed: ${result.error}`);
      }
    } catch (error) {
      console.error('TTS init error:', error);
      setErrorMessage(`TTS init error: ${error.message}`);
      setTtsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Rest of the component...
}
```

## API Cleanup

The following steps should be taken to clean up the existing model management code:

1. **Remove model discovery logic** from TTS, ASR, and other components:
   - Remove `findModelFileRecursive`, `findEspeakData` and similar functions from components
   - Delete complex file validation and discovery code

2. **Remove redundant model configuration** code from component files:
   - Delete model-specific configuration logic like handling VITS, Matcha, and Kokoro models
   - Remove file format detection and extraction
   - Delete directory traversal code for finding model files

3. **Clean up outdated model state management**:
   - Move model download tracking to the central context
   - Remove duplicated state management across components
   - Centralize model status tracking

4. **Update API wrapper**:
   - Make sure the `@siteed/sherpa-onnx.rn` package doesn't contain model discovery code
   - Check that it only handles model initialization with complete configs
   - Remove any model data preparation that shouldn't be in the API

## Implementation Steps

1. **Enhance existing type definitions**
   - Update the types in the ModelManagement context
   - Add new model metadata types and model configuration types

2. **Add platform-specific storage adapter**
   - Create platformStorage.ts in the utils directory
   - Implement native and web adapters

3. **Add model registry and asset loading hooks**
   - Create new hooks in the hooks directory
   - Ensure they work with the existing project structure

4. **Update the existing model context**
   - Enhance the ModelManagementContext with new functionality
   - Preserve existing functions while adding new capabilities

5. **Define model configurations**
   - Add predefined model definitions to models.ts
   - Include configurations for all model types

6. **Update existing components**
   - Refactor TTS, ASR, and other screens to use the enhanced context
   - Remove model discovery code and use the new API

7. **Clean up existing code**
   - Remove model discovery code from all components
   - Delete redundant model management logic
