import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { extractTarBz2 } from '../../utils/archiveUtils';
import { AVAILABLE_MODELS, type ModelMetadata } from '../../utils/models';
import type { ModelManagementContextType, ModelManagementProviderProps, ModelState, ModelStatus } from './types';

const ModelManagementContext = createContext<ModelManagementContextType | undefined>(undefined);

export function ModelManagementProvider({
  children,
  storageKey = '@model_states', // Use the single, original key
  baseUrl = FileSystem.documentDirectory || '',
}: ModelManagementProviderProps) {
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>({});
  const [activeDownloads, setActiveDownloads] = useState<Record<string, FileSystem.DownloadResumable>>({});

  // Load saved model states on mount
  useEffect(() => {
    loadSavedModelStates();
  }, []); // Empty dependency array to run only once on mount

  // Original loadSavedModelStates
  const loadSavedModelStates = async () => {
    try {
      console.log('Loading saved model states from key:', storageKey);
      const savedStatesJSON = await AsyncStorage.getItem(storageKey);
      if (savedStatesJSON) {
        console.log('Found saved model states raw JSON:', savedStatesJSON);
        try {
          const parsedStates = JSON.parse(savedStatesJSON);
          console.log('Successfully parsed saved states:', parsedStates);
          // Basic validation: Check if it's an object
          if (typeof parsedStates === 'object' && parsedStates !== null) {
             // TODO: Add more robust validation here to check if the parsed state matches the expected structure
             setModelStates(parsedStates);
          } else {
             console.warn('Parsed state is not an object, starting fresh.');
             setModelStates({});
             await AsyncStorage.removeItem(storageKey);
          }
        } catch (parseError) {
           console.error('Error parsing saved model states JSON:', parseError);
           console.warn('Could not parse saved state, starting fresh.');
           setModelStates({}); // Start fresh if parsing fails
           await AsyncStorage.removeItem(storageKey); // Clear invalid state
        }
      } else {
        console.log(`No saved model states found for key \'${storageKey}\'. Initializing.`);
        // Initialize state from AVAILABLE_MODELS if no state is saved
        const initialStates: Record<string, ModelState> = {};
        AVAILABLE_MODELS.forEach(meta => {
           initialStates[meta.id] = { // Ensure structure matches ModelState
             metadata: meta,
             status: 'pending' as ModelStatus, // Use 'pending'
             progress: 0,
             localPath: undefined,
             error: undefined,
             files: undefined,
             extractedFiles: undefined,
             lastDownloaded: undefined,
           };
        });
        setModelStates(initialStates);
      }
    } catch (error) { // Catch errors during AsyncStorage.getItem or other operations
      console.error('Critical error loading model states:', error);
      setModelStates({}); // Ensure state is an object even on critical load error
    }
  };

  // Original saveModelStates
  const saveModelStates = async (states: Record<string, ModelState>) => {
    // Prevent saving empty state immediately after a failed load/clear
    if (Object.keys(states).length === 0 && Object.keys(modelStates).length > 0) {
      // Check against previous state length to avoid clearing valid empty state
      console.warn('Prevented saving empty state potentially due to load error.');
      return;
    }
    try {
      console.log('Saving model states to key:', storageKey);
      await AsyncStorage.setItem(storageKey, JSON.stringify(states));
      console.log('Successfully saved model states.');
    } catch (error) {
      console.error('Error saving model states:', error);
    }
  };

  // Original updateModelState
  const updateModelState = (modelId: string, updates: Partial<ModelState>) => {
    console.log(`Updating model state for ${modelId}:`, updates);
    setModelStates((prev) => {
      const existingState = prev[modelId];
      // Ensure metadata is present, either from existing state or AVAILABLE_MODELS
      const currentMetadata = existingState?.metadata ?? AVAILABLE_MODELS.find(m => m.id === modelId);

      if (!currentMetadata) {
        console.error(`Cannot update model ${modelId}, metadata definition not found.`);
        return prev;
      }
      // Define the base state, ensuring it always includes metadata
      const baseState: ModelState = existingState ?? {
          metadata: currentMetadata,
          status: 'pending', // Default if creating new entry
          progress: 0,
      };
      // Create new state object, merging updates over the base
      const newStates = { ...prev, [modelId]: { ...baseState, ...updates } };
      // Save the updated state
      saveModelStates(newStates);
      return newStates;
    });
  };

  // Original downloadModel
  const downloadModel = async (modelId: string) => {
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!model) {
      console.error(`Model ${modelId} not found`);
      updateModelState(modelId, { status: 'error', error: 'Model definition not found.' });
      return;
    }
    const currentState = modelStates[modelId];
    if (currentState?.status === 'downloading' || currentState?.status === 'downloaded') {
      console.log(`Model ${modelId} already ${currentState.status}.`);
      return;
    }
    const isArchive = model.url.endsWith('.tar.bz2');
    const fileName = model.url.split('/').pop() || '';
    const modelDir = `${baseUrl}models/${modelId}`;
    const filePath = `${modelDir}/${fileName}`;
    try {
      console.log(`Starting download: ${modelId}`);
      updateModelState(modelId, {
        metadata: model,
        status: 'downloading' as ModelStatus,
        progress: 0, // Use progress
        error: undefined,
      });
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
      const downloadResumable = FileSystem.createDownloadResumable(
        model.url, filePath, {},
        (dp) => updateModelState(modelId, { progress: dp.totalBytesWritten / dp.totalBytesExpectedToWrite }) // Update progress field
      );
      setActiveDownloads(prev => ({ ...prev, [modelId]: downloadResumable }));

      const downloadResult = await downloadResumable.downloadAsync();
      console.log(`Download completed for ${modelId}. Status: ${downloadResult?.status}`);
      setActiveDownloads(prev => { const newState = { ...prev }; delete newState[modelId]; return newState; });

      if (!downloadResult || downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult?.status || 'unknown'}`);
      }

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) throw new Error(`Downloaded file not found: ${filePath}`);
      console.log(`Downloaded file size: ${fileInfo.size} bytes`);

      let extractedFileNames: string[] = []; // Store names of extracted/present files
      if (isArchive) {
        console.log(`Extracting archive: ${filePath} to ${modelDir}...`);
        updateModelState(modelId, { status: 'extracting' as ModelStatus, progress: 1 }); // Indicate extraction

        const extractionResult = await extractTarBz2(filePath, modelDir);
        if (!extractionResult.success) {
          throw new Error(`Extraction failed: ${extractionResult.message || 'Unknown error'}`);
        }
        console.log(`Archive extracted successfully. Files:`, extractionResult.extractedFiles);
        extractedFileNames = extractionResult.extractedFiles || []; // Use names from result
        await FileSystem.deleteAsync(filePath, { idempotent: true });
        console.log(`Cleaned up archive file: ${filePath}`);
      } else {
        extractedFileNames = [fileName]; // Single file is considered "extracted"
      }

      // Download dependencies
      if (model.dependencies && model.dependencies.length > 0) {
        console.log(`Downloading ${model.dependencies.length} dependencies for ${modelId}...`);
        updateModelState(modelId, { status: 'downloading' as ModelStatus, progress: 0.95 }); // Indicate dependency download
        for (const dependency of model.dependencies) {
           const depFileName = dependency.url.split('/').pop() || '';
           const depPath = `${modelDir}/${depFileName}`;
           console.log(`Downloading dependency: ${dependency.name} to ${depPath}`);
           const depResumable = FileSystem.createDownloadResumable(dependency.url, depPath);
           const depKey = `${modelId}_dep_${dependency.id}`;
           setActiveDownloads(prev => ({ ...prev, [depKey]: depResumable }));
           try {
              await depResumable.downloadAsync();
              extractedFileNames.push(depFileName); // Add dependency name to list
              console.log(`Dependency ${dependency.name} downloaded.`);
           } catch (depError) {
              console.error(`Error downloading dependency ${dependency.name}:`, depError);
              throw new Error(`Failed to download dependency ${dependency.name}`);
           } finally {
              setActiveDownloads(prev => { const newState = { ...prev }; delete newState[depKey]; return newState; });
           }
        }
      }

      // Verify directory contents for final state
      const actualDirContents = await FileSystem.readDirectoryAsync(modelDir);
      const finalFileInfos = await Promise.all(
        actualDirContents.map(async (file) => {
          const itemPath = `${modelDir}/${file}`;
          const info = await FileSystem.getInfoAsync(itemPath);
          return {
              path: file,
              size: info.exists ? info.size : 0,
              lastModified: info.exists ? info.modificationTime : Date.now()
          };
        })
      );

      const finalState: Partial<ModelState> = {
        status: 'downloaded' as ModelStatus,
        progress: 1,
        localPath: modelDir,
        files: finalFileInfos, // Use verified file info
        extractedFiles: actualDirContents, // Use actual directory listing
        lastDownloaded: Date.now(),
        error: undefined,
      };
      console.log(`Final state update for ${modelId}:`, finalState);
      updateModelState(modelId, finalState);
      console.log(`Model ${modelId} successfully downloaded and processed.`);

    } catch (error) {
      console.error(`Error processing model ${modelId}:`, error);
      updateModelState(modelId, {
        status: 'error' as ModelStatus,
        progress: modelStates[modelId]?.progress || 0,
        error: error instanceof Error ? error.message : 'Unknown processing error',
      });
      try { await FileSystem.deleteAsync(modelDir, { idempotent: true }); } catch (e) { /* ignore cleanup error */ }
    }
  };

  // Original deleteModel
  const deleteModel = async (modelId: string) => {
    console.log(`Attempting to delete model ${modelId}...`);
    const state = modelStates[modelId];
    await cancelDownload(modelId); // Ensure any active download is cancelled

    if (state?.localPath) {
      try {
        const pathToDelete = state.localPath; // Assume this is the directory path
        const dirInfo = await FileSystem.getInfoAsync(pathToDelete);
        if (dirInfo.exists && dirInfo.isDirectory) {
          console.log(`Deleting directory: ${pathToDelete}`);
          await FileSystem.deleteAsync(pathToDelete, { idempotent: true });
          console.log(`Successfully deleted directory ${pathToDelete}.`);
        } else if (dirInfo.exists) {
          console.warn(`Path ${pathToDelete} exists but is not a directory. Deleting anyway.`);
          await FileSystem.deleteAsync(pathToDelete, { idempotent: true });
        } else {
          console.log(`Path ${pathToDelete} not found, nothing to delete from filesystem.`);
        }
      } catch (error) {
        console.error(`Error deleting model files for ${modelId}:`, error);
      }
    }

    setModelStates((prev) => {
      const newStates = { ...prev };
      delete newStates[modelId];
      saveModelStates(newStates);
      console.log(`Model ${modelId} removed from state.`);
      return newStates;
    });
    // No separate status update needed, just remove from state.
  };

  // Modified getModelState (with ttsParams merge)
  const getModelState = (modelId: string): ModelState | undefined => {
    const state = modelStates[modelId];
    if (!state?.metadata) return undefined; // Return early if no state or metadata

    // Check and merge ttsParams if needed
    if (state.metadata.type === 'tts' && !state.metadata.ttsParams) {
      const currentMeta = AVAILABLE_MODELS.find(m => m.id === modelId);
      if (currentMeta?.ttsParams) {
        console.log(`[getModelState] Dynamically merging ttsParams for ${modelId}`);
        // Create a new state object with merged metadata
        return {
          ...state,
          metadata: {
              ...state.metadata,
              ttsParams: currentMeta.ttsParams // Add current ttsParams
          },
        };
      } else {
         console.warn(`[getModelState] TTS model ${modelId} lacks ttsParams in both state and AVAILABLE_MODELS.`);
      }
    }
    // Return original state if no merge is needed or possible
    return state;
  };

  // Original isModelDownloaded
  const isModelDownloaded = (modelId: string): boolean => {
    const state = modelStates[modelId];
    // Add check for localPath as well for robustness
    return !!state && state.status === 'downloaded' && !!state.localPath;
  };

  // Modified getDownloadedModels (with ttsParams merge)
  const getDownloadedModels = useCallback((): ModelState[] => {
    // Filter first based on status, path, and metadata existence
    const downloaded = Object.values(modelStates).filter(state =>
        state.status === 'downloaded' && !!state.localPath && !!state.metadata
    );

    // Map over the filtered results and merge ttsParams if necessary
    return downloaded.map(state => {
      // No need to check for metadata existence again, done in filter
      if (state.metadata.type === 'tts' && !state.metadata.ttsParams) {
         const currentMeta = AVAILABLE_MODELS.find(m => m.id === state.metadata.id);
         if (currentMeta?.ttsParams) {
            console.log(`[getDownloadedModels] Dynamically merging ttsParams for ${state.metadata.id}`);
            // Return a new state object with merged metadata
            return {
               ...state,
               metadata: {
                   ...state.metadata,
                   ttsParams: currentMeta.ttsParams // Add current ttsParams
               },
            };
         } else {
            console.warn(`[getDownloadedModels] TTS model ${state.metadata.id} lacks ttsParams in both state and AVAILABLE_MODELS.`);
         }
      }
      // Return original state if no merge is needed or possible
      return state;
    });
  }, [modelStates]);

  // Original getAvailableModels (returns ModelMetadata[])
  const getAvailableModels = useCallback((): ModelMetadata[] => {
    return AVAILABLE_MODELS;
  }, []);

  // Original refreshModelStatus
  const refreshModelStatus = async (modelId: string) => {
    console.log(`Refreshing status for model ${modelId}...`);
    const state = modelStates[modelId];
    if (!state) return;
    const modelMetadata = state.metadata ?? AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!modelMetadata) { console.warn(`Metadata missing for ${modelId}`); return; }
    try {
      const modelDir = `${baseUrl}models/${modelId}`;
      const dirInfo = await FileSystem.getInfoAsync(modelDir);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        console.log(`Directory ${modelDir} not found.`);
        if (state.status === 'downloaded') {
           updateModelState(modelId, { status: 'error', error: 'Model directory not found', localPath: undefined, files: undefined, extractedFiles: undefined, progress: 0 });
        } else if (state.status !== 'error') {
           updateModelState(modelId, { status: 'pending', localPath: undefined, progress: 0 }); // Use 'pending'
        }
        return;
      }
      const filesList = await FileSystem.readDirectoryAsync(modelDir);
      const fileInfos = await Promise.all(
        filesList.map(async (file) => {
          const itemPath = `${modelDir}/${file}`;
          const info = await FileSystem.getInfoAsync(itemPath);
          return { path: file, size: info.exists ? info.size : 0, lastModified: info.exists ? info.modificationTime : Date.now() };
        })
      );
      updateModelState(modelId, {
        status: 'downloaded' as ModelStatus,
        localPath: modelDir,
        files: fileInfos,
        extractedFiles: filesList,
        progress: 1, // Use progress
        error: undefined
      });
      console.log(`Status refresh completed for ${modelId}.`);
    } catch (error) {
      console.error(`Error refreshing status for ${modelId}:`, error);
      updateModelState(modelId, {
        status: 'error' as ModelStatus,
        error: error instanceof Error ? error.message : 'Unknown error during refresh',
      });
    }
  };

  // Original clearAllModels
  const clearAllModels = async () => {
    try {
      const modelDir = `${baseUrl}models`;
      console.log(`Clearing all model files from: ${modelDir}`);
      await FileSystem.deleteAsync(modelDir, { idempotent: true });
      setModelStates({});
      await AsyncStorage.removeItem(storageKey);
      console.log('Cleared all model states and files.');
    } catch (error) {
      console.error('Error clearing all models:', error);
    }
  };

  // Original cancelDownload
  const cancelDownload = async (modelId: string) => {
    console.log(`Attempting to cancel download/extraction for ${modelId}...`);
    let cancelled = false;
    const downloadResumable = activeDownloads[modelId];
    if (downloadResumable) {
      try { await downloadResumable.cancelAsync(); console.log(`Cancelled main task ${modelId}`); cancelled = true; }
      catch (error) { console.error(`Error cancelling main task ${modelId}:`, error); }
       finally { setActiveDownloads(prev => { const newState = { ...prev }; delete newState[modelId]; return newState; }); }
    }
    const depKeys = Object.keys(activeDownloads).filter(key => key.startsWith(`${modelId}_dep_`));
    for (const key of depKeys) {
       const depResumable = activeDownloads[key];
       if(depResumable) {
          try { await depResumable.cancelAsync(); console.log(`Cancelled dep task ${key}`); cancelled = true; }
          catch(error) { console.error(`Error cancelling dep task ${key}:`, error); }
          finally { setActiveDownloads(prev => { const newState = { ...prev }; delete newState[key]; return newState; }); }
       }
    }
    const state = modelStates[modelId];
    if (cancelled || state?.status === 'extracting') {
       const errorMsg = state?.status === 'extracting' ? 'Extraction cancelled' : 'Download cancelled';
       updateModelState(modelId, { // Use 'pending'
           status: 'pending',
           progress: 0, error: errorMsg, localPath: undefined,
           files: undefined, extractedFiles: undefined,
        });
       console.log(`Reset state for ${modelId} due to cancellation.`);
    } else {
      console.log(`No active download/extraction found to cancel for ${modelId}.`);
    }
  };

  // Restore original context value structure, ensure it matches type
  const value: ModelManagementContextType = {
    modelsState: modelStates, // Use modelStates variable name
    downloadModel,
    deleteModel,
    getModelState,
    isModelDownloaded,
    getDownloadedModels,
    getAvailableModels,
    refreshModelStatus,
    clearAllModels,
    cancelDownload,
    updateModelState,
  };

  return (
    <ModelManagementContext.Provider value={value}>
      {children}
    </ModelManagementContext.Provider>
  );
}

// Original useModelManagement hook
export function useModelManagement() {
  const context = useContext(ModelManagementContext);
  if (context === undefined) {
    throw new Error('useModelManagement must be used within a ModelManagementProvider');
  }
  return context;
}
