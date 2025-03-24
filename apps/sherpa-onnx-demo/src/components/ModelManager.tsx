import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList
} from 'react-native';
import { ModelState, ModelMetadata } from '../contexts/ModelManagement/types';
import { useModelManagement } from '../contexts/ModelManagement/ModelManagementContext';
import { formatBytes } from '../utils/formatters';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

interface ModelCardProps {
  model: ModelMetadata;
  state?: ModelState;
  onDownload: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSelect: () => void;
  isSelected: boolean;
  onBrowseFiles?: (modelPath: string) => void;
}

interface ModelManagerProps {
  filterType?: 'all' | 'tts' | 'asr' | 'vad' | 'kws' | 'speaker' | 'language' | 'audio-tagging' | 'punctuation';
  onBrowseFiles?: (modelPath: string) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  state,
  onDownload,
  onDelete,
  onSelect,
  isSelected,
  onBrowseFiles
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [fileDetails, setFileDetails] = useState<Array<{
    name: string;
    size: number;
    exists: boolean;
    uri?: string;
    isDirectory?: boolean;
    error?: string;
  }>>([]);
  const [fileListError, setFileListError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      await onDownload();
    } catch (error) {
      Alert.alert('Download Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await onDelete();
    } catch (error) {
      Alert.alert('Delete Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Toggle showing files for a model
   */
  const toggleShowFiles = async () => {
    // If we have the onBrowseFiles prop, use it to navigate to file explorer
    if (onBrowseFiles && state?.localPath) {
      onBrowseFiles(state.localPath);
      return;
    }

    setIsLoading(true);
    setFileListError('');
    try {
      if (!state?.localPath) {
        console.warn('Cannot show files: Model local path is not available');
        setFileListError('Cannot show files: Model local path is not available');
        setFileDetails([]);
        setIsLoading(false);
        return;
      }
      
      // Log the current state
      console.log(`Checking files for model ${model.id}:`);
      console.log(`Local path: ${state.localPath}`);
      console.log(`Model status: ${state.status}`);
      
      // Clean up the path
      const cleanPath = state.localPath.replace('file://', '');
      console.log(`Clean path: ${cleanPath}`);

      const dirInfo = await FileSystem.getInfoAsync(state.localPath);
      console.log(`Directory info:`, dirInfo);

      if (!dirInfo.exists) {
        console.warn(`Directory does not exist: ${state.localPath}`);
        setFileListError(`Directory does not exist: ${state.localPath}`);
        setFileDetails([]);
        setIsLoading(false);
        return;
      }

      if (!dirInfo.isDirectory) {
        console.warn(`Path exists but is not a directory: ${state.localPath}`);
        setFileListError(`Path exists but is not a directory: ${state.localPath}`);
        setFileDetails([]);
        setIsLoading(false);
        return;
      }

      // Define file detail type
      type FileDetail = {
        name: string;
        exists: boolean;
        size: number;
        uri?: string;
        isDirectory?: boolean;
        error?: string;
      };

      // Function to scan a directory and its subdirectories
      const scanDirectory = async (dirPath: string, prefix = ''): Promise<FileDetail[]> => {
        const files = await FileSystem.readDirectoryAsync(dirPath);
        console.log(`Found ${files.length} items in ${prefix || 'root directory'}:`, files);
        
        let fileList: FileDetail[] = [];
        
        for (const file of files) {
          try {
            const filePath = `${dirPath}/${file}`;
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            const displayName = prefix ? `${prefix}/${file}` : file;
            
            fileList.push({
              name: displayName,
              exists: fileInfo.exists,
              size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
              uri: fileInfo.uri,
              isDirectory: fileInfo.isDirectory || false,
            });
            
            console.log(`File details for ${displayName}:`, fileInfo);
            
            // If this is a directory, recursively scan it
            if (fileInfo.exists && fileInfo.isDirectory) {
              const subdirFiles = await scanDirectory(filePath, displayName);
              fileList = [...fileList, ...subdirFiles];
            }
          } catch (fileError) {
            console.error(`Error getting info for file ${file}:`, fileError);
            fileList.push({
              name: prefix ? `${prefix}/${file}` : file,
              exists: false,
              size: 0,
              error: String(fileError),
            });
          }
        }
        
        return fileList;
      };

      // Scan the main directory and all subdirectories
      const allFiles = await scanDirectory(state.localPath);
      setFileDetails(allFiles);
      setShowFiles(prev => !prev);
    } catch (error) {
      console.error('Error toggling file view:', error);
      setFileListError(`Error listing files: ${error instanceof Error ? error.message : String(error)}`);
      setFileDetails([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Log progress updates when status is downloading 
  useEffect(() => {
    if (state?.status === 'downloading') {
      console.log(`[ModelCard] ${model.name} - progress: ${Math.round((state.progress || 0) * 100)}%`);
    }
  }, [state?.progress, state?.status]);

  return (
    <View style={[cardStyles.card, isSelected && cardStyles.cardSelected]}>
      <View style={cardStyles.cardHeader}>
        <Text style={cardStyles.modelName}>{model.name}</Text>
        <Text style={cardStyles.modelSize}>{formatBytes(model.size)}</Text>
      </View>
      
      <Text style={cardStyles.modelDescription}>{model.description}</Text>
      
      <View style={cardStyles.modelDetails}>
        <Text style={cardStyles.detailText}>Type: {model.type}</Text>
        <Text style={cardStyles.detailText}>Version: {model.version}</Text>
        <Text style={cardStyles.detailText}>Language: {model.language}</Text>
      </View>

      {/* Download Progress */}
      {state?.status === 'downloading' && (
        <View style={cardStyles.progressContainer}>
          <View style={cardStyles.progressRow}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={cardStyles.progressText}>
              Downloading...
            </Text>
            <Text style={cardStyles.progressPercent}>
              {Math.round((state.progress || 0) * 100)}%
            </Text>
          </View>
          <View style={cardStyles.progressBarContainer}>
            <View style={cardStyles.progressBarOuter}>
              <View 
                style={[
                  cardStyles.progressBarInner, 
                  { width: `${Math.round((state.progress || 0) * 100)}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Extraction Progress */}
      {state?.status === 'extracting' && (
        <View style={cardStyles.progressContainer}>
          <View style={cardStyles.progressRow}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={cardStyles.progressText}>
              Extracting model files...
            </Text>
          </View>
          <View style={cardStyles.progressBarContainer}>
            <View style={cardStyles.progressBarOuter}>
              <View style={[cardStyles.progressBarInner, cardStyles.progressBarIndeterminate]} />
            </View>
          </View>
        </View>
      )}

      {state?.status === 'error' && (
        <View style={cardStyles.errorContainer}>
          <Text style={cardStyles.errorText}>{state.error}</Text>
          {state.extractedFiles && state.extractedFiles.length > 0 && (
            <View style={cardStyles.filesContainer}>
              <Text style={cardStyles.filesTitle}>Extracted Files:</Text>
              {state.extractedFiles.map((file: string, index: number) => (
                <Text key={index} style={cardStyles.fileText}>• {file}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Show file list when toggled */}
      {showFiles && state?.status === 'downloaded' && (
        <View style={cardStyles.filesContainer}>
          <Text style={cardStyles.filesTitle}>Model Files:</Text>
          {fileListError ? (
            <Text style={cardStyles.errorText}>{fileListError}</Text>
          ) : (
            <>
              <Text style={cardStyles.modelPath} selectable>Path: {state?.localPath || 'Not available'}</Text>
              <Text style={cardStyles.modelPath} selectable>Clean Path: {state?.localPath ? state.localPath.replace('file://', '') : 'Not available'}</Text>
              {fileDetails.length === 0 ? (
                <View>
                  <Text style={cardStyles.fileText}>No files found in directory</Text>
                </View>
              ) : (
                fileDetails.map((file, index) => (
                  <View key={index} style={cardStyles.fileItem}>
                    <Text 
                      style={[
                        cardStyles.fileText, 
                        file.isDirectory && cardStyles.directoryText
                      ]} 
                      selectable
                    >
                      {file.isDirectory ? '📁' : '📄'} {file.name} {file.exists ? `(${formatBytes(file.size)})` : '(Missing)'}
                    </Text>
                    {file.error && (
                      <Text style={cardStyles.fileErrorText}>{file.error}</Text>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </View>
      )}

      <View style={cardStyles.cardActions}>
        {state?.status === 'downloaded' ? (
          <>
            <TouchableOpacity
              style={[cardStyles.button, cardStyles.selectButton]}
              onPress={onSelect}
            >
              <Text style={cardStyles.buttonText}>
                {isSelected ? 'Selected' : 'Select'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[cardStyles.button, cardStyles.infoButton]}
              onPress={toggleShowFiles}
              disabled={isLoading}
            >
              <Text style={cardStyles.buttonText}>
                {showFiles ? 'Hide Files' : 'Show Files'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[cardStyles.button, cardStyles.deleteButton]}
              onPress={handleDelete}
              disabled={isLoading}
            >
              <Text style={cardStyles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[cardStyles.button, cardStyles.downloadButton]}
            onPress={handleDownload}
            disabled={isLoading || state?.status === 'downloading'}
          >
            <Text style={cardStyles.buttonText}>Download</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export function ModelManager({ filterType = 'all', onBrowseFiles }: ModelManagerProps) {
  const {
    getAvailableModels,
    getDownloadedModels,
    getModelState,
    downloadModel,
    deleteModel,
    isModelDownloaded,
    refreshModelStatus,
    models: modelStates
  } = useModelManagement();

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progressUpdateCounter, setProgressUpdateCounter] = useState(0);

  const availableModels = getAvailableModels();
  const downloadedModels = getDownloadedModels();

  // Filter models based on type
  const filteredAvailableModels = filterType === 'all' 
    ? availableModels 
    : availableModels.filter(model => model.type === filterType);

  const filteredDownloadedModels = filterType === 'all'
    ? downloadedModels
    : downloadedModels.filter(model => model.metadata.type === filterType);

  // Force component to rerender when any model is downloading
  useEffect(() => {
    // Check if any model is currently downloading
    const anyModelDownloading = Object.values(modelStates).some(
      model => model.status === 'downloading'
    );

    if (anyModelDownloading) {
      // Set up an interval to periodically increment the counter to force rerenders
      const intervalId = setInterval(() => {
        setProgressUpdateCounter(prev => prev + 1);
      }, 500); // Check every half second
      return () => clearInterval(intervalId);
    }
  }, [modelStates]);

  useEffect(() => {
    // Refresh status of all downloaded models on mount
    refreshAllModelStatuses();
    setIsLoading(false);
  }, []);

  const refreshAllModelStatuses = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(
        downloadedModels.map(model => refreshModelStatus(model.metadata.id))
      );
    } catch (error) {
      console.error('Error refreshing model statuses:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownload = async (modelId: string) => {
    try {
      console.log(`Starting download for model: ${modelId}`);
      await downloadModel(modelId);
      console.log(`Download completed for model: ${modelId}`);
    } catch (error) {
      console.error(`Download error for model ${modelId}:`, error);
      Alert.alert('Download Error', (error as Error).message);
    }
  };

  const handleDelete = async (modelId: string) => {
    try {
      console.log(`Starting deletion for model: ${modelId}`);
      await deleteModel(modelId);
      console.log(`Deletion completed for model: ${modelId}`);
    } catch (error) {
      console.error(`Delete error for model ${modelId}:`, error);
      Alert.alert('Delete Error', (error as Error).message);
    }
  };

  const handleSelect = (modelId: string) => {
    console.log(`Selected model: ${modelId}`);
    setSelectedModelId(modelId);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Downloaded Models Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Downloaded Models</Text>
        {filteredDownloadedModels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No downloaded models</Text>
          </View>
        ) : (
          filteredDownloadedModels.map(model => {
            // Get the most current state for this model from context
            const currentState = modelStates[model.metadata.id];
            return (
              <ModelCard
                key={model.metadata.id}
                model={model.metadata}
                state={currentState || model}
                onDownload={() => handleDownload(model.metadata.id)}
                onDelete={() => handleDelete(model.metadata.id)}
                onSelect={() => handleSelect(model.metadata.id)}
                isSelected={selectedModelId === model.metadata.id}
                onBrowseFiles={onBrowseFiles}
              />
            );
          })
        )}
      </View>

      {/* Available Models Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Models</Text>
        {filteredAvailableModels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No models available for the selected type</Text>
          </View>
        ) : (
          filteredAvailableModels.map(model => {
            // Get the current state for this model (if it exists) from context
            const currentState = modelStates[model.id];
            return (
              <ModelCard
                key={model.id}
                model={model}
                state={currentState}
                onDownload={() => handleDownload(model.id)}
                onDelete={() => handleDelete(model.id)}
                onSelect={() => handleSelect(model.id)}
                isSelected={selectedModelId === model.id}
                onBrowseFiles={onBrowseFiles}
              />
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

// Styles for the ModelCard component
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  modelSize: {
    fontSize: 14,
    color: '#666',
  },
  modelDescription: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
  },
  modelDetails: {
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  progressContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2196F3',
  },
  progressPercent: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarOuter: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  progressBarIndeterminate: {
    width: '30%',
    backgroundColor: '#2196F3',
  },
  errorContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fff0f0',
    borderRadius: 4,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  filesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  filesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  fileText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  modelPath: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  miniButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  createFilesButton: {
    backgroundColor: '#4CAF50',
  },
  miniButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  fileItem: {
    marginBottom: 8,
  },
  directoryText: {
    color: '#ff8f00',
    fontWeight: '500',
  },
  fileErrorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginLeft: 24,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  selectButton: {
    backgroundColor: '#2196F3',
  },
  infoButton: {
    backgroundColor: '#ff9800',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

// Styles for the main component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
}); 