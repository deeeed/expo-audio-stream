import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVAILABLE_MODELS, type ModelMetadata } from '@siteed/sherpa-onnx.rn/src/config/models';
import * as FileSystem from 'expo-file-system';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { extractModelFromAssets, extractTarBz2 } from '../../utils/archiveUtils';
import type { ModelManagementContextType, ModelManagementProviderProps, ModelState, ModelStatus } from './types';

const ModelManagementContext = createContext<ModelManagementContextType | undefined>(undefined);

export function ModelManagementProvider({
  children,
  storageKey = '@model_states',
  baseUrl = FileSystem.documentDirectory || '',
}: ModelManagementProviderProps) {
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>({});

  // Load saved model states on mount
  useEffect(() => {
    loadSavedModelStates();
  }, []);

  const loadSavedModelStates = async () => {
    try {
      console.log('Loading saved model states...');
      const savedStates = await AsyncStorage.getItem(storageKey);
      if (savedStates) {
        console.log('Found saved model states:', savedStates);
        setModelStates(JSON.parse(savedStates));
      } else {
        console.log('No saved model states found');
      }
    } catch (error) {
      console.error('Error loading model states:', error);
    }
  };

  const saveModelStates = async (states: Record<string, ModelState>) => {
    try {
      console.log('Saving model states...');
      await AsyncStorage.setItem(storageKey, JSON.stringify(states));
      console.log('Successfully saved model states');
    } catch (error) {
      console.error('Error saving model states:', error);
    }
  };

  const updateModelState = (modelId: string, updates: Partial<ModelState>) => {
    console.log(`Updating model state for ${modelId}:`, updates);
    setModelStates((prev) => {
      const newStates = {
        ...prev,
        [modelId]: {
          ...prev[modelId],
          ...updates,
        },
      };
      saveModelStates(newStates);
      return newStates;
    });
  };

  const downloadModel = async (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in available models`);
    }

    const modelDir = `${baseUrl}models/${modelId}`;
    const archivePath = `${modelDir}/${modelId}.tar.bz2`;

    try {
      console.log(`Starting download for model ${modelId}...`);
      updateModelState(modelId, {
        metadata: model,
        status: 'downloading' as ModelStatus,
        progress: 0,
        error: undefined,
      });

      // Create model directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (!dirInfo.exists) {
        console.log(`Creating directory for model ${modelId}...`);
        await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      }

      // Download the archive
      console.log(`Downloading archive for model ${modelId}...`);
      const downloadResumable = FileSystem.createDownloadResumable(
        model.url,
        archivePath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress for ${modelId}: ${progress * 100}%`);
          updateModelState(modelId, { progress });
        }
      );

      await downloadResumable.downloadAsync();
      console.log(`Download completed for model ${modelId}`);

      // Extract the archive
      console.log(`Extracting archive for model ${modelId}...`);
      updateModelState(modelId, {
        status: 'extracting' as ModelStatus,
      });
      
      // Use our new utility to extract the archive
      const extractionResult = await extractTarBz2(archivePath, modelDir);
      
      if (!extractionResult.success) {
        throw new Error(`Failed to extract archive: ${extractionResult.message}`);
      }
      
      console.log(`Archive extracted successfully for model ${modelId}`);
      
      // If extraction failed or didn't produce the required files,
      // try to extract from bundled assets as a fallback
      let missingFiles: string[] = [];
      if (model.requiredFiles && extractionResult.extractedFiles) {
        missingFiles = model.requiredFiles.filter(
          (file) => !extractionResult.extractedFiles?.includes(file)
        );
      }
      
      if (missingFiles.length > 0) {
        console.log(`Missing required files after extraction: ${missingFiles.join(", ")}`);
        console.log(`Trying to extract from bundled assets as fallback...`);
        
        const assetExtractionResult = await extractModelFromAssets(
          model.type,
          modelId,
          modelDir
        );
        
        if (assetExtractionResult.success) {
          console.log(`Successfully extracted model files from assets`);
          // Update the extracted files list to include both sources
          if (extractionResult.extractedFiles && assetExtractionResult.extractedFiles) {
            extractionResult.extractedFiles = [
              ...new Set([
                ...extractionResult.extractedFiles,
                ...assetExtractionResult.extractedFiles
              ])
            ];
          } else if (assetExtractionResult.extractedFiles) {
            extractionResult.extractedFiles = assetExtractionResult.extractedFiles;
          }
        } else {
          console.warn(`Failed to extract from assets: ${assetExtractionResult.message}`);
        }
      }

      // Verify required files
      console.log(`Verifying required files for model ${modelId}...`);
      const files = await FileSystem.readDirectoryAsync(modelDir);
      missingFiles = [];
      if (model.requiredFiles) {
        missingFiles = model.requiredFiles.filter((file) => !files.includes(file));
      }
      
      if (missingFiles.length > 0) {
        throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
      }
      console.log(`All required files present for model ${modelId}`);

      // Get file information
      const fileInfos = await Promise.all(
        files.map(async (file) => {
          const filePath = `${modelDir}/${file}`;
          const info = await FileSystem.getInfoAsync(filePath);
          if (!info.exists) {
            throw new Error(`File ${file} not found`);
          }
          return {
            path: file,
            size: info.size || 0,
            lastModified: info.modificationTime || Date.now(),
          };
        })
      );

      // Update state
      updateModelState(modelId, {
        status: 'downloaded' as ModelStatus,
        progress: 1,
        localPath: modelDir,
        files: fileInfos,
        lastDownloaded: Date.now(),
        extractedFiles: extractionResult.extractedFiles,
      });

      // Clean up archive
      console.log(`Cleaning up archive for model ${modelId}...`);
      await FileSystem.deleteAsync(archivePath);
      console.log(`Cleanup completed for model ${modelId}`);
    } catch (error) {
      console.error(`Error downloading model ${modelId}:`, error);
      updateModelState(modelId, {
        status: 'error' as ModelStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };

  const deleteModel = async (modelId: string) => {
    console.log(`Starting deletion of model ${modelId}...`);
    const state = modelStates[modelId];
    if (state?.localPath) {
      try {
        await FileSystem.deleteAsync(state.localPath, { idempotent: true });
        console.log(`Successfully deleted model ${modelId}`);
      } catch (error) {
        console.error(`Error deleting model ${modelId}:`, error);
        throw error;
      }
    }

    setModelStates((prev) => {
      const newStates = { ...prev };
      delete newStates[modelId];
      saveModelStates(newStates);
      return newStates;
    });
  };

  const getModelState = (modelId: string): ModelState | undefined => {
    return modelStates[modelId];
  };

  const isModelDownloaded = (modelId: string): boolean => {
    return modelStates[modelId]?.status === 'downloaded';
  };

  const getDownloadedModels = (): ModelState[] => {
    return Object.values(modelStates).filter((state) => state.status === 'downloaded');
  };

  const getAvailableModels = (): ModelMetadata[] => {
    // Convert AVAILABLE_MODELS to our local ModelMetadata type
    return AVAILABLE_MODELS.map(model => ({
      ...model,
      // Ensure requiredFiles is defined (defaults to empty array if undefined)
      requiredFiles: model.requiredFiles || []
    }));
  };

  const refreshModelStatus = async (modelId: string) => {
    console.log(`Refreshing status for model ${modelId}...`);
    const state = modelStates[modelId];
    if (state?.localPath) {
      try {
        const dirInfo = await FileSystem.getInfoAsync(state.localPath);
        if (!dirInfo.exists) {
          updateModelState(modelId, {
            status: 'error' as ModelStatus,
            error: 'Model directory not found',
          });
          return;
        }

        const files = await FileSystem.readDirectoryAsync(state.localPath);
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        if (model) {
          const missingFiles = model.requiredFiles?.filter((file) => !files.includes(file)) || [] ;
          if (missingFiles.length > 0) {
            updateModelState(modelId, {
              status: 'error' as ModelStatus,
              error: `Missing required files: ${missingFiles.join(', ')}`,
            });
            return;
          }
        }

        // Get file information
        const fileInfos = await Promise.all(
          files.map(async (file) => {
            const filePath = `${state.localPath}/${file}`;
            const info = await FileSystem.getInfoAsync(filePath);
            if (!info.exists) {
              throw new Error(`File ${file} not found`);
            }
            return {
              path: file,
              size: info.size || 0,
              lastModified: info.modificationTime || Date.now(),
            };
          })
        );

        updateModelState(modelId, {
          status: 'downloaded' as ModelStatus,
          files: fileInfos,
          lastDownloaded: state.lastDownloaded,
        });
        console.log(`Status refresh completed for model ${modelId}`);
      } catch (error) {
        console.error(`Error refreshing status for model ${modelId}:`, error);
        updateModelState(modelId, {
          status: 'error' as ModelStatus,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  };

  const refreshAllModelStatuses = async () => {
    console.log('Refreshing status for all models...');
    const promises = Object.keys(modelStates).map(refreshModelStatus);
    await Promise.all(promises);
    console.log('Status refresh completed for all models');
  };

  const clearAllModels = async () => {
    try {
      const modelDir = `${baseUrl}models`;
      await FileSystem.deleteAsync(modelDir, { idempotent: true });
      setModelStates({});
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing all models:', error);
      throw error;
    }
  };

  return (
    <ModelManagementContext.Provider
      value={{
        models: modelStates,
        downloadModel,
        deleteModel,
        getModelState,
        isModelDownloaded,
        getDownloadedModels,
        getAvailableModels,
        refreshModelStatus,
        clearAllModels,
      }}
    >
      {children}
    </ModelManagementContext.Provider>
  );
}

export function useModelManagement() {
  const context = useContext(ModelManagementContext);
  if (context === undefined) {
    throw new Error('useModelManagement must be used within a ModelManagementProvider');
  }
  return context;
} 