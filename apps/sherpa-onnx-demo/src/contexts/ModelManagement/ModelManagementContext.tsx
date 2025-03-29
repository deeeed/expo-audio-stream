import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { extractTarBz2 } from '../../utils/archiveUtils';
import { AVAILABLE_MODELS } from '../../utils/models';
import type { ModelManagementContextType, ModelManagementProviderProps, ModelMetadata, ModelState, ModelStatus } from './types';

const ModelManagementContext = createContext<ModelManagementContextType | undefined>(undefined);

export function ModelManagementProvider({
  children,
  storageKey = '@model_states',
  baseUrl = FileSystem.documentDirectory || '',
}: ModelManagementProviderProps) {
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>({});
  const [activeDownloads, setActiveDownloads] = useState<Record<string, FileSystem.DownloadResumable>>({});

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

    // Determine if it's an archive or single file model
    const isArchive = model.url.endsWith('.tar.bz2');
    const fileName = model.url.split('/').pop() || '';
    const modelDir = `${baseUrl}models/${modelId}`;
    
    // For archives, we'll store the archive in the model dir and extract there
    // For single files, we'll store the file directly in the model dir
    const filePath = `${modelDir}/${fileName}`;

    try {
      console.log(`Starting download for model ${modelId} (${isArchive ? 'archive' : 'single file'})...`);
      
      // Update state to downloading
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

      // Download the file
      console.log(`Downloading file for model ${modelId} to ${filePath}...`);
      const downloadResumable = FileSystem.createDownloadResumable(
        model.url,
        filePath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress for ${modelId}: ${progress * 100}%`);
          updateModelState(modelId, { progress });
        }
      );

      // Store the download resumable for possible cancellation
      setActiveDownloads(prev => ({
        ...prev,
        [modelId]: downloadResumable
      }));

      await downloadResumable.downloadAsync();
      console.log(`Download completed for model ${modelId}`);

      // Remove from active downloads after completion
      setActiveDownloads(prev => {
        const newDownloads = { ...prev };
        delete newDownloads[modelId];
        return newDownloads;
      });

      // Verify the file exists and get its info
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error(`Downloaded file not found at ${filePath}`);
      }
      
      console.log(`Downloaded file size: ${fileInfo.size} bytes`);

      // For archives, we need to extract them
      let extractedFiles: string[] = [];
      
      if (isArchive) {
        console.log(`Extracting archive for model ${modelId}...`);
        updateModelState(modelId, {
          status: 'extracting' as ModelStatus,
        });
        
        // Extract the archive
        const extractionResult = await extractTarBz2(filePath, modelDir);
        
        if (!extractionResult.success) {
          console.error(`Failed to extract archive: ${extractionResult.message}`);
          throw new Error(`Failed to extract archive: ${extractionResult.message}`);
        }
        
        console.log(`Archive extracted successfully for model ${modelId}`);
        extractedFiles = extractionResult.extractedFiles || [];
        
        console.log(`Extracted ${extractedFiles.length} files from archive`);
        if (extractedFiles.length > 0) {
          console.log('Extracted files:', extractedFiles);
        } else {
          console.warn('No files were extracted from the archive!');
        }
      } else {
        // For single files, just add the file to the extracted files list
        extractedFiles = [fileName];
        console.log(`Single file model downloaded: ${fileName}`);
      }

      // After extraction, check for and download any dependencies
      if (model.dependencies && model.dependencies.length > 0) {
        console.log(`Model ${modelId} has ${model.dependencies.length} dependencies to download...`);
        
        for (const dependency of model.dependencies) {
          const dependencyFileName = dependency.url.split('/').pop() || '';
          const dependencyPath = `${modelDir}/${dependencyFileName}`;
          
          console.log(`Downloading dependency ${dependency.name} (${dependency.id})...`);
          updateModelState(modelId, {
            status: 'downloading' as ModelStatus,
            progress: 0.9, // Show progress as almost complete
            error: undefined,
          });
          
          try {
            const depDownloadResumable = FileSystem.createDownloadResumable(
              dependency.url,
              dependencyPath,
              {},
              (downloadProgress) => {
                // Calculate combined progress (90% main model, 10% for dependencies)
                const depProgress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                const combinedProgress = 0.9 + (depProgress * 0.1);
                console.log(`Dependency download progress: ${depProgress * 100}%`);
                updateModelState(modelId, { progress: combinedProgress });
              }
            );

            // Store the dependency download resumable
            setActiveDownloads(prev => ({
              ...prev,
              [`${modelId}_dep_${dependency.id}`]: depDownloadResumable
            }));
            
            await depDownloadResumable.downloadAsync();
            console.log(`Dependency ${dependency.name} downloaded successfully to ${dependencyPath}`);
            
            // Add the dependency file to the extracted files list
            extractedFiles.push(dependencyFileName);
            
            // Remove from active downloads
            setActiveDownloads(prev => {
              const newDownloads = { ...prev };
              delete newDownloads[`${modelId}_dep_${dependency.id}`];
              return newDownloads;
            });
            
          } catch (depError) {
            console.error(`Error downloading dependency ${dependency.name}:`, depError);
            // Continue with other dependencies even if one fails
          }
        }
      }

      // Get file information for all files in the model directory
      const dirContents = await FileSystem.readDirectoryAsync(modelDir);
      const fileInfos = await Promise.all(
        dirContents.map(async (file) => {
          const itemPath = `${modelDir}/${file}`;
          const info = await FileSystem.getInfoAsync(itemPath);
          return {
            path: file,
            size: info.exists ? (info.size || 0) : 0,
            lastModified: info.exists ? (info.modificationTime || Date.now()) : Date.now(),
          };
        })
      );

      // Update the final state
      const finalState = {
        status: 'downloaded' as ModelStatus,
        progress: 1,
        localPath: isArchive ? modelDir : filePath,  // For archives, store the directory; for single files, store the file path
        files: fileInfos,
        lastDownloaded: Date.now(),
        extractedFiles: extractedFiles,
      };
      
      console.log(`Final state for model ${modelId}:`, finalState);
      updateModelState(modelId, finalState);
      
      console.log(`Model ${modelId} successfully processed and ready to use.`);
      console.log(`Model stored at: ${isArchive ? modelDir : filePath}`);
      console.log(`State updated with localPath: ${isArchive ? modelDir : filePath}`);
      
      // Force a refresh to ensure the state is correctly updated
      setTimeout(() => {
        refreshModelStatus(modelId).catch(e => 
          console.error(`Error during post-download refresh: ${e}`)
        );
      }, 500);

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
    
    // If model is in the extracting state, mark it as cancelled first
    if (state?.status === 'extracting') {
      console.log(`Model ${modelId} is currently being extracted, marking as cancelled first`);
      updateModelState(modelId, {
        status: 'error' as ModelStatus,
        error: 'Extraction cancelled by user',
      });
    }
    
    // Cancel any active downloads for this model
    if (state?.status === 'downloading') {
      try {
        // Get the main download resumable
        const downloadResumable = activeDownloads[modelId];
        
        if (downloadResumable) {
          try {
            // Cancel the download
            await downloadResumable.cancelAsync();
            console.log(`Successfully cancelled main download for model ${modelId}`);
          } catch (error) {
            console.error(`Error cancelling main download for model ${modelId}:`, error);
          }
          
          // Remove from active downloads
          setActiveDownloads(prev => {
            const newDownloads = { ...prev };
            delete newDownloads[modelId];
            return newDownloads;
          });
        }
        
        // Cancel any dependency downloads
        for (const key of Object.keys(activeDownloads)) {
          if (key.startsWith(`${modelId}_dep_`)) {
            try {
              await activeDownloads[key].cancelAsync();
              console.log(`Successfully cancelled dependency download ${key}`);
            } catch (error) {
              console.error(`Error cancelling dependency download ${key}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Error cancelling downloads for model ${modelId}:`, error);
      }
    }
    
    if (!state?.localPath) {
      console.log(`No local path found for model ${modelId}, nothing to delete`);
    } else {
      try {
        // Get the model metadata
        const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
        if (!model) {
          throw new Error(`Model ${modelId} not found in available models`);
        }

        const isArchive = model.url.endsWith('.tar.bz2');
        const path = state.localPath;
        
        // Check if the path exists
        const fileInfo = await FileSystem.getInfoAsync(path);
        console.log(`Checking path: ${path}, exists: ${fileInfo.exists}, isDirectory: ${fileInfo.isDirectory || false}`);

        if (fileInfo.exists) {
          // Delete the path
          await FileSystem.deleteAsync(path, { idempotent: true });
          console.log(`Successfully deleted ${isArchive ? 'directory' : 'file'} at ${path}`);
          
          // If this is a single file, also check if we need to delete the parent directory
          if (!isArchive && !fileInfo.isDirectory) {
            const parentDir = path.substring(0, path.lastIndexOf('/'));
            const parentInfo = await FileSystem.getInfoAsync(parentDir);
            
            if (parentInfo.exists && parentInfo.isDirectory) {
              // Check if the parent directory is now empty
              const parentContents = await FileSystem.readDirectoryAsync(parentDir);
              if (parentContents.length === 0) {
                await FileSystem.deleteAsync(parentDir, { idempotent: true });
                console.log(`Successfully deleted empty parent directory at ${parentDir}`);
              }
            }
          }
        } else {
          console.log(`Path not found: ${path}, nothing to delete`);
        }
      } catch (error) {
        console.error(`Error deleting model ${modelId}:`, error);
        throw error;
      }
    }

    // Immediately remove the model from the state
    setModelStates((prev) => {
      const newStates = { ...prev };
      delete newStates[modelId];
      // Save the updated states
      saveModelStates(newStates);
      console.log(`Model ${modelId} removed from state, UI will update`);
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
    return AVAILABLE_MODELS;
  };

  const refreshModelStatus = async (modelId: string) => {
    console.log(`Refreshing status for model ${modelId}...`);
    const state = modelStates[modelId];
    if (!state) {
      console.log(`No state found for model ${modelId}, skipping refresh`);
      return;
    }

    try {
      // Get the model metadata
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!model) {
        console.warn(`Model ${modelId} not found in available models, skipping refresh`);
        return;
      }
      
      const isArchive = model.url.endsWith('.tar.bz2');
      
      // For single file models, store the full file path
      const modelDir = `${baseUrl}models/${modelId}`;
      const fileName = model.url.split('/').pop() || '';
      const filePath = `${modelDir}/${fileName}`;
      
      // Check if the directory or file exists
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      let fileInfo = { exists: false, size: 0, modificationTime: 0 };
      
      if (!isArchive) {
        const result = await FileSystem.getInfoAsync(filePath);
        if (result.exists) {
          fileInfo = {
            exists: true,
            size: result.size || 0,
            modificationTime: result.modificationTime || Date.now()
          };
        }
      }
      
      // Log for debugging
      console.log(`Model ${modelId} refresh: Dir exists: ${dirInfo.exists}, File exists: ${fileInfo.exists}`);
      
      if (!dirInfo.exists && !fileInfo.exists) {
        console.log(`Neither directory nor file exists for model ${modelId}`);
        updateModelState(modelId, {
          status: 'error' as ModelStatus,
          error: 'Model files not found',
        });
        return;
      }
      
      // If single file model, just check the file
      if (!isArchive && fileInfo.exists) {
        console.log(`Single file model ${modelId} found at ${filePath}`);
        updateModelState(modelId, {
          status: 'downloaded' as ModelStatus,
          localPath: filePath,
          files: [{
            path: fileName,
            size: fileInfo.size,
            lastModified: fileInfo.modificationTime,
          }],
          extractedFiles: [fileName],
          lastDownloaded: state.lastDownloaded || Date.now(),
        });
        console.log(`Status refresh completed for model ${modelId} (single file)`);
        return;
      }
      
      // For archive models, check the directory
      if (dirInfo.exists && dirInfo.isDirectory) {
        const files = await FileSystem.readDirectoryAsync(modelDir);
        
        // Get file information
        const fileInfos = await Promise.all(
          files.map(async (file) => {
            const itemPath = `${modelDir}/${file}`;
            const info = await FileSystem.getInfoAsync(itemPath);
            return {
              path: file,
              size: info.exists ? (info.size || 0) : 0,
              lastModified: info.exists ? (info.modificationTime || Date.now()) : Date.now(),
            };
          })
        );

        updateModelState(modelId, {
          status: 'downloaded' as ModelStatus,
          localPath: isArchive ? modelDir : filePath,
          files: fileInfos,
          extractedFiles: files,
          lastDownloaded: state.lastDownloaded || Date.now(),
        });
        console.log(`Status refresh completed for model ${modelId} (archive)`);
      }
    } catch (error) {
      console.error(`Error refreshing status for model ${modelId}:`, error);
      updateModelState(modelId, {
        status: 'error' as ModelStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
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

  const cancelDownload = async (modelId: string) => {
    console.log(`Cancelling download for model ${modelId}...`);
    
    // Get the current model state
    const currentState = modelStates[modelId];
    
    // Cancel based on current status
    if (currentState?.status === 'downloading') {
      // Get the main download resumable
      const downloadResumable = activeDownloads[modelId];
      
      if (downloadResumable) {
        try {
          // Cancel the download
          await downloadResumable.cancelAsync();
          console.log(`Successfully cancelled main download for model ${modelId}`);
        } catch (error) {
          console.error(`Error cancelling main download for model ${modelId}:`, error);
        }
        
        // Remove from active downloads
        setActiveDownloads(prev => {
          const newDownloads = { ...prev };
          delete newDownloads[modelId];
          return newDownloads;
        });
      }
      
      // Cancel any dependency downloads
      for (const key of Object.keys(activeDownloads)) {
        if (key.startsWith(`${modelId}_dep_`)) {
          try {
            await activeDownloads[key].cancelAsync();
            console.log(`Successfully cancelled dependency download ${key}`);
          } catch (error) {
            console.error(`Error cancelling dependency download ${key}:`, error);
          }
        }
      }
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
        cancelDownload,
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
