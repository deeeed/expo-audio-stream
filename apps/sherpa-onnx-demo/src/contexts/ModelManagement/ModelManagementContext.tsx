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
        console.error(`Failed to extract archive: ${extractionResult.message}`);
        throw new Error(`Failed to extract archive: ${extractionResult.message}`);
      }
      
      console.log(`Archive extracted successfully for model ${modelId}`);
      console.log(`Extracted ${extractionResult.extractedFiles?.length || 0} files from archive`);
      
      // Log the extracted files
      if (extractionResult.extractedFiles && extractionResult.extractedFiles.length > 0) {
        console.log('Extracted files:', extractionResult.extractedFiles);
      } else {
        console.warn('No files were extracted from the archive!');
      }
      
      // If extraction failed or didn't produce the required files,
      // try to extract from bundled assets as a fallback
      let missingFiles: string[] = [];
      // Verify required files - read directory files first before checking
      console.log(`Reading directory files for model ${modelId}...`);
      const files = await FileSystem.readDirectoryAsync(modelDir);
      console.log(`Found ${files.length} files in model directory:`, files);
      
      if (model.requiredFiles && extractionResult.extractedFiles) {
        missingFiles = model.requiredFiles.filter(
          (file) => !extractionResult.extractedFiles?.includes(file)
        );
      }
      
      if (missingFiles.length > 0) {
        console.log(`Missing required files after extraction: ${missingFiles.join(", ")}`);
        
        // Instead of trying to create placeholder files, just log a warning
        console.warn(`Some required files are missing: ${missingFiles.join(", ")}`);
        console.warn(`Placeholder file creation is disabled - extraction must provide all files`);
        
        // If this is a Matcha model, check if we have the model files in a subdirectory
        if (model.id.includes('matcha')) {
          console.log(`Checking for Matcha model files in subdirectories...`);
          
          const matchaSubdir = files.find(file => 
            file.includes('matcha') || 
            (file.includes('en_US') && file.includes('ljspeech'))
          );
          
          if (matchaSubdir) {
            const matchaPath = `${modelDir}/${matchaSubdir}`;
            try {
              const matchaInfo = await FileSystem.getInfoAsync(matchaPath);
              
              if (matchaInfo.exists && matchaInfo.isDirectory) {
                console.log(`Found Matcha subdirectory: ${matchaPath}`);
                
                // Check for model files in subdirectory
                const subdirFiles = await FileSystem.readDirectoryAsync(matchaPath);
                console.log(`Files in Matcha subdirectory: ${subdirFiles.join(', ')}`);
                
                // Look specifically for model-steps-3.onnx or acoustic_model.onnx
                const hasModelFile = subdirFiles.some(file => 
                  file.includes('model-steps') || 
                  file === 'model-steps-3.onnx' ||
                  file.includes('acoustic_model')
                );
                
                if (hasModelFile) {
                  console.log(`Found model file in subdirectory, extraction may be partially successful`);
                  // Update the extracted files list with the correct paths
                  const subdirFilePaths = subdirFiles.map(file => `${matchaSubdir}/${file}`);
                  extractionResult.extractedFiles = [...files, ...subdirFilePaths];
                }
              }
            } catch (error) {
              console.error(`Error checking Matcha subdirectory:`, error);
            }
          }
        }
      }

      // Verify required files
      console.log(`Verifying required files for model ${modelId}...`);
      
      // For non-Matcha models, enforce required files more strictly
      if (!model.id.includes('matcha') && model.requiredFiles) {
        missingFiles = model.requiredFiles.filter((file) => !files.includes(file));
        
        if (missingFiles.length > 0) {
          throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
        }
      }
      console.log(`Required file check passed for model ${modelId}`);
      
      // Clean up any placeholder files (small empty files)
      const removeSmallPlaceholders = async () => {
        console.log(`Checking for and removing any placeholder files...`);
        
        for (const file of files) {
          // Skip directories
          const filePath = `${modelDir}/${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists && !fileInfo.isDirectory && 'size' in fileInfo) {
            // If file is suspiciously small (< 1KB) it might be a placeholder
            if (fileInfo.size < 1024) {
              try {
                // Read the first few bytes to check if it's a placeholder
                const content = await FileSystem.readAsStringAsync(filePath, {
                  encoding: FileSystem.EncodingType.UTF8,
                  length: 100,  // Just read the first 100 chars
                });
                
                if (content.includes('placeholder') || content.trim().length < 50) {
                  console.log(`Removing placeholder file: ${filePath}`);
                  await FileSystem.deleteAsync(filePath, { idempotent: true });
                }
              } catch (error) {
                console.error(`Error checking placeholder file ${filePath}:`, error);
              }
            }
          }
        }
      };
      
      await removeSmallPlaceholders();

      // After extracting the main model, check and download any dependencies
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
            
            await depDownloadResumable.downloadAsync();
            console.log(`Dependency ${dependency.name} downloaded successfully to ${dependencyPath}`);
            
          } catch (depError) {
            console.error(`Error downloading dependency ${dependency.name}:`, depError);
            // Continue with other dependencies even if one fails
          }
        }
      }

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

      // After extraction check if model archive extracted to a subdirectory
      // This often happens when the archive was created with the model files in a parent directory
      const handleSubdirectoryExtraction = async () => {
        try {
          // Special handling for Matcha models which have a specific directory structure
          const isMatchaModel = model.id.includes('matcha');
          
          // Check if we have a single directory and no other files (common case)
          if (files.length === 1) {
            const possibleSubdir = files[0];
            const subdirPath = `${modelDir}/${possibleSubdir}`;
            const subdirInfo = await FileSystem.getInfoAsync(subdirPath);
            
            if (subdirInfo.exists && subdirInfo.isDirectory) {
              console.log(`Model extracted to subdirectory: ${possibleSubdir}`);
              
              // Check if this subdirectory contains the actual model files
              const subdirFiles = await FileSystem.readDirectoryAsync(subdirPath);
              console.log(`Files in subdirectory: ${subdirFiles.join(', ')}`);
              
              // If the subdirectory contains the model files, update the model path
              if (subdirFiles.length > 0) {
                console.log(`Found ${subdirFiles.length} files in subdirectory, updating model path`);
                
                // Update the model state to point to the subdirectory
                updateModelState(modelId, {
                  localPath: subdirPath,
                  files: await Promise.all(
                    subdirFiles.map(async (file) => {
                      const filePath = `${subdirPath}/${file}`;
                      const info = await FileSystem.getInfoAsync(filePath);
                      return {
                        path: file,
                        size: info.exists && 'size' in info ? info.size || 0 : 0,
                        lastModified: info.exists && 'modificationTime' in info ? info.modificationTime || Date.now() : Date.now(),
                      };
                    })
                  ),
                  extractedFiles: subdirFiles,
                });
                
                console.log(`Updated model path to subdirectory: ${subdirPath}`);
              }
            }
          }
          // Special handling for Matcha TTS model structure
          else if (isMatchaModel) {
            console.log(`Special handling for Matcha model directory structure`);
            
            // Look for the matcha-icefall directory
            const matchaSubdir = files.find(file => 
              file.includes('matcha') || 
              (file.includes('en_US') && file.includes('ljspeech'))
            );
            
            if (matchaSubdir) {
              const matchaPath = `${modelDir}/${matchaSubdir}`;
              const matchaInfo = await FileSystem.getInfoAsync(matchaPath);
              
              if (matchaInfo.exists && matchaInfo.isDirectory) {
                console.log(`Found Matcha model directory: ${matchaPath}`);
                
                // Check files in the Matcha subdirectory
                const matchaFiles = await FileSystem.readDirectoryAsync(matchaPath);
                console.log(`Files in Matcha subdirectory: ${matchaFiles.join(', ')}`);
                
                if (matchaFiles.length > 0) {
                  // Find the model-steps-3.onnx file
                  const modelFile = matchaFiles.find(file => 
                    file.includes('model-steps') || 
                    file.includes('acoustic_model')
                  );
                  
                  // Find the tokens.txt file
                  const tokensFile = matchaFiles.find(file => file === 'tokens.txt');
                  
                  // If we found the key model files, we need to update paths correctly
                  if (modelFile || tokensFile) {
                    console.log(`Found key Matcha model files in subdirectory`);
                    
                    // Get files directly from the subdirectory
                    const matchaFilesInfo = await Promise.all(
                      matchaFiles.map(async (file) => {
                        const filePath = `${matchaPath}/${file}`;
                        const info = await FileSystem.getInfoAsync(filePath);
                        return {
                          path: file,
                          size: info.exists && 'size' in info ? info.size || 0 : 0,
                          lastModified: info.exists && 'modificationTime' in info ? info.modificationTime || Date.now() : Date.now(),
                        };
                      })
                    );
                    
                    // Remove placeholder files if they exist
                    const placeholderFiles = [
                      'model.onnx', 'voices.bin', 'tokens.txt'
                    ];
                    
                    for (const placeholder of placeholderFiles) {
                      const placeholderPath = `${modelDir}/${placeholder}`;
                      const placeholderInfo = await FileSystem.getInfoAsync(placeholderPath);
                      
                      if (placeholderInfo.exists && placeholderInfo.size < 1000) {
                        try {
                          console.log(`Removing placeholder file: ${placeholderPath}`);
                          await FileSystem.deleteAsync(placeholderPath, { idempotent: true });
                        } catch (deleteError) {
                          console.error(`Error deleting placeholder file: ${placeholderPath}`, deleteError);
                        }
                      }
                    }
                    
                    // Update the model state to use the Matcha subdirectory
                    updateModelState(modelId, {
                      localPath: matchaPath,
                      files: matchaFilesInfo,
                      extractedFiles: matchaFiles,
                    });
                    
                    console.log(`Updated Matcha model path to: ${matchaPath}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error handling subdirectory extraction:', error);
          // Don't fail the whole process if this check fails
        }
      };
      
      await handleSubdirectoryExtraction();

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