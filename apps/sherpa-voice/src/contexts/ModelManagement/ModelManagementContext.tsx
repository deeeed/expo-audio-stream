import AsyncStorage from '@react-native-async-storage/async-storage';
import { AsrModelConfig, AudioTaggingModelConfig, SpeakerIdModelConfig, TtsModelConfig } from '@siteed/sherpa-onnx.rn';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { extractTarBz2 } from '../../utils/archiveUtils';
import {
  DEFAULT_WEB_ASR_MODEL_ID,
  DEFAULT_WEB_AUDIO_TAGGING_MODEL_ID,
  DEFAULT_WEB_DENOISER_MODEL_ID,
  DEFAULT_WEB_DIARIZATION_MODEL_ID,
  DEFAULT_WEB_KWS_MODEL_ID,
  DEFAULT_WEB_LANGUAGE_ID_MODEL_ID,
  DEFAULT_WEB_PUNCTUATION_MODEL_ID,
  DEFAULT_WEB_SPEAKER_ID_MODEL_ID,
  DEFAULT_WEB_TTS_MODEL_ID,
  DEFAULT_WEB_VAD_MODEL_ID,
  createWebAsrModelState,
  createWebAudioTaggingModelState,
  createWebDenoiserModelState,
  createWebDiarizationModelState,
  createWebKwsModelState,
  createWebLanguageIdModelState,
  createWebPunctuationModelState,
  createWebSpeakerIdModelState,
  createWebTtsModelState,
  createWebVadModelState,
  isWebModelEnabled,
} from '../../utils/constants';
import { AVAILABLE_MODELS, ModelType, type ModelMetadata } from '../../utils/models';
import type { ModelManagementContextType, ModelManagementProviderProps, ModelState, ModelStatus } from './types';
import { baseLogger } from '../../config';

const logger = baseLogger.extend('ModelManagement');

const ModelManagementContext = createContext<ModelManagementContextType | undefined>(undefined);

function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  }) as T;
}

// Get persistent storage directory based on platform
const getPersistentStorageDirectory = (): string => {
  // documentDirectory is the Expo-recommended persistent storage location.
  // - iOS: backed up to iCloud, persists across restarts
  // - Android: internal storage, persists across restarts (cleared on uninstall)
  // Note: expo-file-system v55 removed externalStorageDirectory. On modern Android (10+),
  // scoped external storage is also wiped on uninstall, so documentDirectory is equivalent.
  return FileSystem.documentDirectory || '';
};

// Helper functions for path handling
const getModelDirectoryPath = (modelId: string): string => {
  return `${getPersistentStorageDirectory()}models/${modelId}`;
};

// Convert absolute path to current path
const migrateModelPath = async (oldPath: string, modelId: string): Promise<string> => {
  // First check if old path still exists
  const oldPathInfo = await FileSystem.getInfoAsync(oldPath);
  if (oldPathInfo.exists) {
    return oldPath;
  }

  // Create a consistent path with current container
  const newPath = getModelDirectoryPath(modelId);

  // Verify the new path exists
  const newPathInfo = await FileSystem.getInfoAsync(newPath);
  return newPathInfo.exists ? newPath : oldPath;
};

export interface PredefinedModelConfig {
  id: string;
  modelType: ModelType;
  ttsConfig?: Partial<TtsModelConfig>;
  asrConfig?: Partial<AsrModelConfig>;
  audioTaggingConfig?: Partial<AudioTaggingModelConfig>;
  speakerIdConfig?: Partial<SpeakerIdModelConfig>;
}

const WEB_PRELOADED_IDS = new Set([
  DEFAULT_WEB_TTS_MODEL_ID,
  DEFAULT_WEB_ASR_MODEL_ID,
  DEFAULT_WEB_VAD_MODEL_ID,
  DEFAULT_WEB_KWS_MODEL_ID,
  DEFAULT_WEB_DENOISER_MODEL_ID,
  DEFAULT_WEB_DIARIZATION_MODEL_ID,
  DEFAULT_WEB_SPEAKER_ID_MODEL_ID,
  DEFAULT_WEB_AUDIO_TAGGING_MODEL_ID,
  DEFAULT_WEB_LANGUAGE_ID_MODEL_ID,
  DEFAULT_WEB_PUNCTUATION_MODEL_ID,
]);

export function ModelManagementProvider({
  children,
  storageKey = '@model_states',
  baseUrl = getPersistentStorageDirectory(),
}: ModelManagementProviderProps) {
  const [modelStates, setModelStates] = useState<Record<string, ModelState>>({});
  const [activeDownloads, setActiveDownloads] = useState<Record<string, FileSystem.DownloadResumable>>({});

  const [/* ttsModels */, /* setTtsModels */] = useState<TtsModelConfig[]>();

  // Original loadSavedModelStates
  const loadSavedModelStates = useCallback(async () => {
    try {
      logger.info(`Loading saved model states from key: ${storageKey}`);
      const savedStatesJSON = await AsyncStorage.getItem(storageKey);
      if (savedStatesJSON) {
        try {
          const parsedStates = JSON.parse(savedStatesJSON);
          logger.info(`Successfully parsed saved states: ${Object.keys(parsedStates).length} entries`);
          // Basic validation: Check if it's an object
          if (typeof parsedStates === 'object' && parsedStates !== null) {
            // Handle migration of absolute paths to relative paths for iOS
            const migratedStates = await migrateStoredPaths(parsedStates);
            // Remove stale entries whose IDs are no longer in the catalog
            const catalogIds = new Set(AVAILABLE_MODELS.map(m => m.id));
            const reconciledStates: Record<string, ModelState> = {};
            for (const [id, state] of Object.entries(migratedStates)) {
              if (catalogIds.has(id)) {
                reconciledStates[id] = state as ModelState;
              } else {
                logger.info(`Removing stale model state: ${id} (not in catalog)`);
              }
            }
            // Add new catalog entries not yet in saved state
            for (const meta of AVAILABLE_MODELS) {
              if (!reconciledStates[meta.id]) {
                const modelDir = getModelDirectoryPath(meta.id);
                let isOnDisk = false;
                try {
                  const info = await FileSystem.getInfoAsync(modelDir);
                  if (info.exists && info.isDirectory) {
                    const contents = await FileSystem.readDirectoryAsync(modelDir);
                    isOnDisk = contents.length > 0;
                  }
                } catch (fsErr) {
                  logger.warn(`Filesystem check failed for new catalog entry ${meta.id} at ${modelDir}: ${fsErr instanceof Error ? fsErr.message : String(fsErr)}`);
                }
                reconciledStates[meta.id] = {
                  metadata: meta,
                  status: isOnDisk ? 'downloaded' as ModelStatus : 'pending' as ModelStatus,
                  progress: isOnDisk ? 100 : 0,
                  localPath: isOnDisk ? modelDir : undefined,
                  error: undefined,
                  files: undefined,
                  extractedFiles: undefined,
                  lastDownloaded: undefined,
                };
              }
            }
            // Reset any stale in-progress states (app was killed mid-download)
            let hadStaleDownloads = false;
            for (const [id, state] of Object.entries(reconciledStates)) {
              if (state.status === 'downloading' || state.status === 'extracting') {
                logger.warn(`Resetting stale ${state.status} state for ${id} to pending`);
                reconciledStates[id] = { ...state, status: 'pending', progress: 0, bytesWritten: undefined, totalBytes: undefined, downloadSpeedBytesPerSec: undefined };
                hadStaleDownloads = true;
              }
            }
            if (hadStaleDownloads) {
              await AsyncStorage.setItem(storageKey, JSON.stringify(reconciledStates));
            }
            setModelStates(reconciledStates);
          } else {
            logger.warn('Parsed state is not an object, starting fresh.');
            setModelStates({});
            await AsyncStorage.removeItem(storageKey);
          }
        } catch (parseError) {
          logger.error(`Error parsing saved model states JSON: ${parseError}`);
          logger.warn('Could not parse saved state, starting fresh.');
          setModelStates({}); // Start fresh if parsing fails
          await AsyncStorage.removeItem(storageKey); // Clear invalid state
        }
      } else {
        logger.info(`No saved model states found for key '${storageKey}'. Initializing with filesystem check.`);
        // Initialize state from AVAILABLE_MODELS, checking filesystem for existing downloads
        const initialStates: Record<string, ModelState> = {};
        for (const meta of AVAILABLE_MODELS) {
          const modelDir = getModelDirectoryPath(meta.id);
          let isOnDisk = false;
          try {
            const info = await FileSystem.getInfoAsync(modelDir);
            if (info.exists && info.isDirectory) {
              const contents = await FileSystem.readDirectoryAsync(modelDir);
              // Consider downloaded if directory has files (not just empty)
              isOnDisk = contents.length > 0;
            }
          } catch (fsErr) {
            logger.warn(`Filesystem check failed for ${meta.id} at ${modelDir}: ${fsErr instanceof Error ? fsErr.message : String(fsErr)}`);
          }

          if (isOnDisk) {
            logger.info(`Found existing model on disk: ${meta.id}`);
            initialStates[meta.id] = {
              metadata: meta,
              status: 'downloaded' as ModelStatus,
              progress: 100,
              localPath: modelDir,
              error: undefined,
              files: undefined,
              extractedFiles: undefined,
              lastDownloaded: undefined,
            };
          } else {
            initialStates[meta.id] = {
              metadata: meta,
              status: 'pending' as ModelStatus,
              progress: 0,
              localPath: undefined,
              error: undefined,
              files: undefined,
              extractedFiles: undefined,
              lastDownloaded: undefined,
            };
          }
        }
        setModelStates(initialStates);
        // Persist the reconciled state
        await AsyncStorage.setItem(storageKey, JSON.stringify(initialStates));
      }
    } catch (error) { // Catch errors during AsyncStorage.getItem or other operations
      logger.error(`Critical error loading model states: ${error}`);
      setModelStates({}); // Ensure state is an object even on critical load error
    }
  }, [storageKey]); // Include storageKey dependency

  // Load saved model states on mount
  useEffect(() => {
    logger.info(`Platform: ${Platform.OS}, documentDirectory: ${FileSystem.documentDirectory}`);
    loadSavedModelStates();
  }, [loadSavedModelStates]); // Include loadSavedModelStates dependency

  // Helper function to migrate from absolute paths to relative paths
  const migrateStoredPaths = async (states: Record<string, ModelState>): Promise<Record<string, ModelState>> => {
    const migratedStates: Record<string, ModelState> = {};

    for (const [modelId, state] of Object.entries(states)) {
      // Create a copy of the state to modify
      const newState = { ...state };

      // Check if we have a localPath that needs migration
      if (state.localPath) {
        const migratedPath = await migrateModelPath(state.localPath, modelId);
        if (migratedPath !== state.localPath) {
          logger.info(`Migrated path for ${modelId}: ${state.localPath} → ${migratedPath}`);
        }
        newState.localPath = migratedPath;
      }

      migratedStates[modelId] = newState;
    }

    return migratedStates;
  };

  // Original saveModelStates
  const saveModelStates = useCallback(async (states: Record<string, ModelState>) => {
    // Prevent saving empty state immediately after a failed load/clear
    if (Object.keys(states).length === 0 && Object.keys(modelStates).length > 0) {
      // Check against previous state length to avoid clearing valid empty state
      logger.warn('Prevented saving empty state potentially due to load error.');
      return;
    }
    try {
      logger.info(`Saving model states to key: ${storageKey}`);
      await AsyncStorage.setItem(storageKey, JSON.stringify(states));
      logger.info('Successfully saved model states.');
    } catch (error) {
      logger.error(`Error saving model states: ${error}`);
    }
  }, [storageKey, modelStates]); // Include dependencies

  // Original updateModelState
  const updateModelState = useCallback((modelId: string, updates: Partial<ModelState>, persist = true) => {
    setModelStates((prev) => {
      const existingState = prev[modelId];
      const currentMetadata = existingState?.metadata ?? AVAILABLE_MODELS.find(m => m.id === modelId);

      if (!currentMetadata) {
        logger.error(`[updateModelState] Cannot update ${modelId}, metadata not found.`);
        return prev;
      }
      const baseState: ModelState = existingState ?? {
        metadata: currentMetadata,
        status: 'pending',
        progress: 0,
      };
      const newState = { ...baseState, ...updates };
      const newStates = { ...prev, [modelId]: newState };
      if (persist) saveModelStates(newStates);
      return newStates;
    });
  }, [saveModelStates]); // Include saveModelStates dependency

  // Add this function to check for web TTS models
  const isTtsModelOnWeb = (modelId: string, metadata: ModelMetadata): boolean => {
    return Platform.OS === 'web' && metadata.type === 'tts';
  };

  // Modify getModelState to handle web preloaded models
  const getModelState = useCallback((modelId: string): ModelState | undefined => {
    if (Platform.OS === 'web') {
      // Only return preloaded state for features that are enabled in webFeatures config
      if (!isWebModelEnabled(modelId)) {
        return modelStates[modelId];
      }
      const webPreloaded: Record<string, () => ModelState | undefined> = {
        [DEFAULT_WEB_TTS_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_TTS_MODEL_ID);
          return m ? createWebTtsModelState(m) : undefined;
        },
        [DEFAULT_WEB_ASR_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_ASR_MODEL_ID);
          return m ? createWebAsrModelState(m) : undefined;
        },
        [DEFAULT_WEB_VAD_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_VAD_MODEL_ID);
          return m ? createWebVadModelState(m) : undefined;
        },
        [DEFAULT_WEB_KWS_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_KWS_MODEL_ID);
          return m ? createWebKwsModelState(m) : undefined;
        },
        [DEFAULT_WEB_DENOISER_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_DENOISER_MODEL_ID);
          return m ? createWebDenoiserModelState(m) : undefined;
        },
        [DEFAULT_WEB_DIARIZATION_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_DIARIZATION_MODEL_ID);
          return m ? createWebDiarizationModelState(m) : undefined;
        },
        [DEFAULT_WEB_SPEAKER_ID_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_SPEAKER_ID_MODEL_ID);
          return m ? createWebSpeakerIdModelState(m) : undefined;
        },
        [DEFAULT_WEB_AUDIO_TAGGING_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_AUDIO_TAGGING_MODEL_ID);
          return m ? createWebAudioTaggingModelState(m) : undefined;
        },
        [DEFAULT_WEB_LANGUAGE_ID_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_LANGUAGE_ID_MODEL_ID);
          return m ? createWebLanguageIdModelState(m) : undefined;
        },
        [DEFAULT_WEB_PUNCTUATION_MODEL_ID]: () => {
          const m = AVAILABLE_MODELS.find(x => x.id === DEFAULT_WEB_PUNCTUATION_MODEL_ID);
          return m ? createWebPunctuationModelState(m) : undefined;
        },
      };
      if (modelId in webPreloaded) {
        return webPreloaded[modelId]();
      }
    }

    return modelStates[modelId];
  }, [modelStates]);

  // Similarly modify isModelDownloaded
  const isModelDownloaded = (modelId: string): boolean => {
    if (Platform.OS === 'web' && WEB_PRELOADED_IDS.has(modelId) && isWebModelEnabled(modelId)) {
      return true;
    }
    const state = modelStates[modelId];
    return !!state && state.status === 'downloaded' && !!state.localPath;
  };

  // Modify getDownloadedModels for web platform
  const getDownloadedModels = useCallback((): ModelState[] => {
    // On web platform, provide all preloaded WASM models
    if (Platform.OS === 'web') {
      const states: ModelState[] = [];
      const factories: [string, (m: ModelMetadata) => ModelState][] = [
        [DEFAULT_WEB_TTS_MODEL_ID, createWebTtsModelState],
        [DEFAULT_WEB_ASR_MODEL_ID, createWebAsrModelState],
        [DEFAULT_WEB_VAD_MODEL_ID, createWebVadModelState],
        [DEFAULT_WEB_KWS_MODEL_ID, createWebKwsModelState],
        [DEFAULT_WEB_DENOISER_MODEL_ID, createWebDenoiserModelState],
        [DEFAULT_WEB_DIARIZATION_MODEL_ID, createWebDiarizationModelState],
        [DEFAULT_WEB_SPEAKER_ID_MODEL_ID, createWebSpeakerIdModelState],
        [DEFAULT_WEB_AUDIO_TAGGING_MODEL_ID, createWebAudioTaggingModelState],
        [DEFAULT_WEB_LANGUAGE_ID_MODEL_ID, createWebLanguageIdModelState],
        [DEFAULT_WEB_PUNCTUATION_MODEL_ID, createWebPunctuationModelState],
      ];
      for (const [id, factory] of factories) {
        if (!isWebModelEnabled(id)) continue;
        const m = AVAILABLE_MODELS.find(x => x.id === id);
        if (m) states.push(factory(m));
      }
      return states;
    }

    // For non-web platforms, get models from state that are marked as downloaded
    return Object.values(modelStates).filter(state =>
      state.status === 'downloaded' && !!state.localPath && !!state.metadata
    );
  }, [modelStates]);

  // Helper function to download a single dependency
  const downloadDependency = useCallback(async (
    modelId: string,
    dependency: any,
    modelDir: string,
    extractedFileNames: string[]
  ): Promise<void> => {
    const depFileName = dependency.url.split('/').pop() || '';
    const depPath = `${modelDir}/${depFileName}`;
    logger.info(`Downloading dependency: ${dependency.name} to ${depPath}`);

    const depResumable = FileSystem.createDownloadResumable(dependency.url, depPath);
    const depKey = `${modelId}_dep_${dependency.id}`;

    setActiveDownloads(prev => ({ ...prev, [depKey]: depResumable }));

    try {
      await depResumable.downloadAsync();

      extractedFileNames.push(depFileName);
      logger.info(`Dependency ${dependency.name} downloaded.`);
    } catch (depError) {
      logger.error(`Error downloading dependency ${dependency.name}: ${depError}`);
      throw new Error(`Failed to download dependency ${dependency.name}`);
    } finally {
      setActiveDownloads(prev => {
        const newState = { ...prev };
        delete newState[depKey];
        return newState;
      });
    }
  }, [setActiveDownloads]);

  // Helper function to start the download process separately
  const startDownloadProcess = useCallback((
    modelId: string,
    model: ModelMetadata,
    downloadResumable: FileSystem.DownloadResumable,
    modelDir: string,
    filePath: string,
    isArchive: boolean,
    fileName: string
  ) => {
    // Ensure the model directory exists before starting download
    FileSystem.getInfoAsync(modelDir)
      .then(dirInfo => {
        if (!dirInfo.exists) {
          logger.info(`Model directory does not exist yet, creating: ${modelDir}`);
          return FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
        } else {
          return Promise.resolve();
        }
      })
      .then(() => downloadResumable.downloadAsync())
      .then(async (downloadResult) => {
        logger.info(`Download completed for ${modelId}. Status: ${downloadResult?.status}`);

        // Remove from active downloads
        setActiveDownloads(prev => {
          const newState = { ...prev };
          delete newState[modelId];
          return newState;
        });

        if (!downloadResult) {
          // null result means the download was cancelled — not an error
          updateModelState(modelId, { status: 'pending', progress: 0, bytesWritten: undefined, totalBytes: undefined, downloadSpeedBytesPerSec: undefined });
          return;
        }
        if (downloadResult.status !== 200) {
          logger.error(`Download failed: ${model.url} returned HTTP ${downloadResult.status}`);
          throw new Error(`Download failed with status ${downloadResult.status} for ${model.url}`);
        }

        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists) throw new Error(`Downloaded file not found: ${filePath}`);
        logger.info(`Downloaded file size: ${fileInfo.size} bytes`);

        let extractedFileNames: string[] = [];

        if (isArchive) {
          logger.info(`Extracting archive: ${filePath} to ${modelDir}...`);

          // Update state to extracting
          updateModelState(modelId, { status: 'extracting' as ModelStatus, progress: 1 });

          const extractionResult = await extractTarBz2(filePath, modelDir);
          if (!extractionResult.success) {
            throw new Error(`Extraction failed: ${extractionResult.message || 'Unknown error'}`);
          }

          logger.info(`Archive extracted successfully for ${modelId}.`);
          extractedFileNames = extractionResult.extractedFiles || [];

          await FileSystem.deleteAsync(filePath, { idempotent: true });
          logger.info(`Cleaned up archive file: ${filePath}`);
        } else {
          extractedFileNames = [fileName];
        }

        // Handle dependencies if any
        if (model.dependencies && model.dependencies.length > 0) {
          logger.info(`Downloading ${model.dependencies.length} dependencies for ${modelId}...`);
          updateModelState(modelId, { status: 'downloading' as ModelStatus, progress: 0.95 });

          // Process dependencies one by one
          for (const dependency of model.dependencies) {
            await downloadDependency(modelId, dependency, modelDir, extractedFileNames);
          }
        }

        // Final verification and state update
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
          files: finalFileInfos,
          extractedFiles: actualDirContents,
          lastDownloaded: Date.now(),
          error: undefined,
        };

        logger.info(`Final state update for ${modelId}: ${actualDirContents.length} files`);
        updateModelState(modelId, finalState);
        logger.info(`Model ${modelId} successfully downloaded and processed.`);
      })
      .catch(error => {
        logger.error(`Error processing model ${modelId}: ${error}`);
        updateModelState(modelId, {
          status: 'error' as ModelStatus,
          progress: modelStates[modelId]?.progress || 0,
          error: error instanceof Error ? error.message : 'Unknown processing error',
        });

        // Cleanup on error
        FileSystem.deleteAsync(modelDir, { idempotent: true }).catch(e => {
          logger.warn(`Error cleaning up model dir after failure: ${e}`);
        });
      });
  }, [updateModelState, modelStates, setActiveDownloads, downloadDependency]);

  // Original downloadModel
  const downloadModel = useCallback(async (modelId: string): Promise<void> => {
    // Block downloads on web platform
    if (Platform.OS === 'web') {
      logger.info('[downloadModel] Downloads not supported on web platform');
      throw new Error('Model downloads are not available on the web platform');
    }

    logger.info(`[downloadModel] Starting download for model: ${modelId}`);
    const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!model) {
      logger.error(`Model ${modelId} not found in catalog`);
      updateModelState(modelId, { status: 'error', error: 'Model definition not found.' });
      return;
    }

    // For web TTS models, simulate immediate download completion
    if (isTtsModelOnWeb(modelId, model)) {
      logger.info(`Web TTS model ${modelId} - simulating download`);
      updateModelState(modelId, createWebTtsModelState(model));
      return;
    }

    const currentState = modelStates[modelId];
    if (currentState?.status === 'downloading' || currentState?.status === 'downloaded') {
      logger.info(`Model ${modelId} already ${currentState.status}.`);
      return;
    }

    const isArchive = model.url.endsWith('.tar.bz2');
    const fileName = model.url.split('/').pop() || '';

    // Use the helper function for consistent paths
    const modelDir = getModelDirectoryPath(modelId);
    const filePath = `${modelDir}/${fileName}`;

    try {
      logger.info(`Starting download: ${modelId} from ${model.url}`);

      // Update initial state immediately
      updateModelState(modelId, {
        metadata: model,
        status: 'downloading' as ModelStatus,
        progress: 0,
        error: undefined,
      });

      // Create directory for model - do this immediately
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });

      // Average speed since download start — always correct for ETA regardless of callback frequency
      const downloadStartTime = Date.now();

      // Throttled progress callback: max 4 UI updates/sec, no AsyncStorage write during download
      const progressCallback = throttle((dp: FileSystem.DownloadProgressData) => {
        const elapsedSec = (Date.now() - downloadStartTime) / 1000;
        const speed = elapsedSec > 0.5 ? dp.totalBytesWritten / elapsedSec : 0;
        const newProgress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
        updateModelState(modelId, {
          progress: newProgress,
          bytesWritten: dp.totalBytesWritten,
          totalBytes: dp.totalBytesExpectedToWrite,
          downloadSpeedBytesPerSec: speed,
        }, false);
      }, 250);

      // Create the download resumable object
      const downloadResumable = FileSystem.createDownloadResumable(
        model.url,
        filePath,
        {},
        progressCallback
      );

      // Store in active downloads
      setActiveDownloads(prev => ({ ...prev, [modelId]: downloadResumable }));

      startDownloadProcess(modelId, model, downloadResumable, modelDir, filePath, isArchive, fileName);

      // Return immediately
      return;
    } catch (initError) {
      logger.error(`Error initializing download for ${modelId}: ${initError}`);
      updateModelState(modelId, {
        status: 'error' as ModelStatus,
        progress: 0,
        error: initError instanceof Error ? initError.message : 'Failed to start download',
      });
    }
  }, [modelStates, updateModelState, startDownloadProcess]);


  // Original cancelDownload
  const cancelDownload = useCallback(async (modelId: string) => {
    logger.info(`Attempting to cancel download/extraction for ${modelId}...`);
    let cancelled = false;
    const downloadResumable = activeDownloads[modelId];
    if (downloadResumable) {
      try { await downloadResumable.cancelAsync(); logger.info(`Cancelled main task ${modelId}`); cancelled = true; }
      catch (error) { logger.error(`Error cancelling main task ${modelId}: ${error}`); }
      finally { setActiveDownloads(prev => { const newState = { ...prev }; delete newState[modelId]; return newState; }); }
    }
    const depKeys = Object.keys(activeDownloads).filter(key => key.startsWith(`${modelId}_dep_`));
    for (const key of depKeys) {
      const depResumable = activeDownloads[key];
      if (depResumable) {
        try { await depResumable.cancelAsync(); logger.info(`Cancelled dep task ${key}`); cancelled = true; }
        catch (error) { logger.error(`Error cancelling dep task ${key}: ${error}`); }
        finally { setActiveDownloads(prev => { const newState = { ...prev }; delete newState[key]; return newState; }); }
      }
    }
    const state = modelStates[modelId];
    // Also reset stale 'downloading' state that survives app reloads (activeDownloads is in-memory only)
    if (cancelled || state?.status === 'extracting' || state?.status === 'downloading' || state?.status === 'error') {
      updateModelState(modelId, {
        status: 'pending',
        progress: 0,
        bytesWritten: undefined,
        totalBytes: undefined,
        downloadSpeedBytesPerSec: undefined,
        error: undefined,
        localPath: undefined,
        files: undefined,
        extractedFiles: undefined,
      });
      logger.info(`Reset state for ${modelId} to pending.`);
    } else {
      logger.info(`No active download/extraction found to cancel for ${modelId}.`);
    }
  }, [activeDownloads, modelStates, updateModelState]); // Include dependencies

  // Original deleteModel
  const deleteModel = useCallback(async (modelId: string): Promise<void> => {
    // Block deletion on web platform
    if (Platform.OS === 'web') {
      logger.info('[deleteModel] Model deletion not supported on web platform');
      throw new Error('Model deletion is not available on the web platform');
    }

    logger.info(`[deleteModel] Deleting model: ${modelId}`);
    const state = modelStates[modelId];
    await cancelDownload(modelId); // Ensure any active download is cancelled

    if (state?.localPath) {
      try {
        const pathToDelete = state.localPath; // Assume this is the directory path
        const dirInfo = await FileSystem.getInfoAsync(pathToDelete);
        if (dirInfo.exists && dirInfo.isDirectory) {
          logger.info(`Deleting directory: ${pathToDelete}`);
          await FileSystem.deleteAsync(pathToDelete, { idempotent: true });
          logger.info(`Successfully deleted directory ${pathToDelete}.`);
        } else if (dirInfo.exists) {
          logger.warn(`Path ${pathToDelete} exists but is not a directory. Deleting anyway.`);
          await FileSystem.deleteAsync(pathToDelete, { idempotent: true });
        } else {
          logger.info(`Path ${pathToDelete} not found, nothing to delete from filesystem.`);
        }
      } catch (error) {
        logger.error(`Error deleting model files for ${modelId}: ${error}`);
      }
    }

    setModelStates((prev) => {
      const newStates = { ...prev };
      delete newStates[modelId];
      saveModelStates(newStates);
      logger.info(`Model ${modelId} removed from state.`);
      return newStates;
    });
    // No separate status update needed, just remove from state.
  }, [cancelDownload, modelStates, saveModelStates]);

  // Original getAvailableModels (returns ModelMetadata[])
  const getAvailableModels = useCallback((): ModelMetadata[] => {
    if (Platform.OS === 'web') {
      return AVAILABLE_MODELS.filter(m => m.webPreloaded === true);
    }
    return AVAILABLE_MODELS;
  }, []);

  // Original refreshModelStatus - simplified
  const refreshModelStatus = async (modelId: string) => {
    logger.info(`Refreshing status for model ${modelId}...`);
    const state = modelStates[modelId];
    if (!state) return;

    const modelMetadata = state.metadata ?? AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!modelMetadata) {
      logger.warn(`Metadata missing for ${modelId}`);
      return;
    }

    try {
      // Use a consistent path format through the helper function
      const modelDir = getModelDirectoryPath(modelId);
      logger.info(`Checking model at: ${modelDir}`);

      // Check if the stored path exists
      if (state.localPath && state.localPath !== modelDir) {
        logger.info(`Migrating from stored path ${state.localPath} to standard path ${modelDir}`);
      }

      // Check the directory
      const dirInfo = await FileSystem.getInfoAsync(modelDir);

      if (!dirInfo.exists || !dirInfo.isDirectory) {
        logger.warn(`Directory ${modelDir} not found for model ${modelId}.`);

        if (state.status === 'downloaded') {
          updateModelState(modelId, {
            status: 'error',
            error: 'Model directory not found',
            localPath: modelDir,
            files: undefined,
            extractedFiles: undefined,
            progress: 0
          });
        } else if (state.status !== 'error') {
          updateModelState(modelId, {
            status: 'pending',
            localPath: undefined,
            progress: 0
          });
        }
        return;
      }

      // Directory exists, check contents
      const filesList = await FileSystem.readDirectoryAsync(modelDir);

      const fileInfos = await Promise.all(
        filesList.map(async (file) => {
          const itemPath = `${modelDir}/${file}`;
          const info = await FileSystem.getInfoAsync(itemPath);
          return {
            path: file,
            size: info.exists ? info.size : 0,
            lastModified: info.exists ? info.modificationTime : Date.now()
          };
        })
      );

      // Update state with consistent path
      updateModelState(modelId, {
        status: 'downloaded' as ModelStatus,
        localPath: modelDir, // Use the consistently constructed path
        files: fileInfos,
        extractedFiles: filesList,
        progress: 1,
        error: undefined
      });

      logger.info(`Status refresh completed for ${modelId}: ${filesList.length} files found.`);
    } catch (error) {
      logger.error(`Error refreshing status for ${modelId}: ${error}`);
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
      logger.info(`Clearing all model files from: ${modelDir}`);
      await FileSystem.deleteAsync(modelDir, { idempotent: true });
      setModelStates({});
      await AsyncStorage.removeItem(storageKey);
      logger.info('Cleared all model states and files.');
    } catch (error) {
      logger.error(`Error clearing all models: ${error}`);
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
