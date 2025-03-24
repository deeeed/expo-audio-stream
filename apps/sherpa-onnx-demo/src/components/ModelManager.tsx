import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { ModelState, ModelMetadata } from '../contexts/ModelManagement/types';
import { useModelManagement } from '../contexts/ModelManagement/ModelManagementContext';
import { formatBytes } from '../utils/formatters';
import * as FileSystem from 'expo-file-system';

interface ModelCardProps {
  model: ModelMetadata;
  state?: ModelState;
  onDownload: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSelect: () => void;
  isSelected: boolean;
}

interface ModelManagerProps {
  filterType?: 'all' | 'tts' | 'asr' | 'vad' | 'kws' | 'speaker' | 'language' | 'audio-tagging' | 'punctuation';
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  state,
  onDownload,
  onDelete,
  onSelect,
  isSelected
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

  // Function to create mock files when extraction fails
  const createMockFiles = async () => {
    if (!state?.localPath) {
      return;
    }
    
    setIsLoading(true);
    console.log("Creating mock files in empty directory");
    try {
      // Create mock files
      const requiredFiles = ['model.onnx', 'voices.bin', 'tokens.txt'];
      const createdFiles = [];
      
      for (const file of requiredFiles) {
        const filePath = `${state.localPath}/${file}`;
        const content = `Mock ${file} created for model ${model.id}`;
        await FileSystem.writeAsStringAsync(filePath, content);
        createdFiles.push(file);
      }
      
      // Refresh file list
      await toggleShowFiles();
      
    } catch (error) {
      console.error("Error creating mock files:", error);
      setFileListError(`Error creating files: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      <View style={styles.cardHeader}>
        <Text style={styles.modelName}>{model.name}</Text>
        <Text style={styles.modelSize}>{formatBytes(model.size)}</Text>
      </View>
      
      <Text style={styles.modelDescription}>{model.description}</Text>
      
      <View style={styles.modelDetails}>
        <Text style={styles.detailText}>Type: {model.type}</Text>
        <Text style={styles.detailText}>Version: {model.version}</Text>
        <Text style={styles.detailText}>Language: {model.language}</Text>
      </View>

      {state?.status === 'downloading' && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.progressText}>
            Downloading... {Math.round(state.progress * 100)}%
          </Text>
        </View>
      )}

      {state?.status === 'extracting' && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.progressText}>Extracting...</Text>
        </View>
      )}

      {state?.status === 'error' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
          {state.extractedFiles && state.extractedFiles.length > 0 && (
            <View style={styles.filesContainer}>
              <Text style={styles.filesTitle}>Extracted Files:</Text>
              {state.extractedFiles.map((file: string, index: number) => (
                <Text key={index} style={styles.fileText}>• {file}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Show file list when toggled */}
      {showFiles && state?.status === 'downloaded' && (
        <View style={styles.filesContainer}>
          <Text style={styles.filesTitle}>Model Files:</Text>
          {fileListError ? (
            <Text style={styles.errorText}>{fileListError}</Text>
          ) : (
            <>
              <Text style={styles.modelPath} selectable>Path: {state?.localPath || 'Not available'}</Text>
              <Text style={styles.modelPath} selectable>Clean Path: {state?.localPath ? state.localPath.replace('file://', '') : 'Not available'}</Text>
              {fileDetails.length === 0 ? (
                <View>
                  <Text style={styles.fileText}>No files found in directory</Text>
                  <TouchableOpacity 
                    style={[styles.miniButton, styles.createFilesButton]}
                    onPress={createMockFiles}
                    disabled={isLoading}
                  >
                    <Text style={styles.miniButtonText}>Create Mock Files</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                fileDetails.map((file, index) => (
                  <View key={index} style={styles.fileItem}>
                    <Text 
                      style={[
                        styles.fileText, 
                        file.isDirectory && styles.directoryText
                      ]} 
                      selectable
                    >
                      {file.isDirectory ? '📁' : '📄'} {file.name} {file.exists ? `(${formatBytes(file.size)})` : '(Missing)'}
                    </Text>
                    {file.error && (
                      <Text style={styles.fileErrorText}>{file.error}</Text>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.cardActions}>
        {state?.status === 'downloaded' ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.selectButton]}
              onPress={onSelect}
            >
              <Text style={styles.buttonText}>
                {isSelected ? 'Selected' : 'Select'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={toggleShowFiles}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {showFiles ? 'Hide Files' : 'Show Files'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDelete}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.downloadButton]}
            onPress={handleDownload}
            disabled={isLoading || state?.status === 'downloading'}
          >
            <Text style={styles.buttonText}>Download</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export function ModelManager({ filterType = 'all' }: ModelManagerProps) {
  const {
    getAvailableModels,
    getDownloadedModels,
    getModelState,
    downloadModel,
    deleteModel,
    isModelDownloaded,
    refreshModelStatus
  } = useModelManagement();

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const availableModels = getAvailableModels();
  const downloadedModels = getDownloadedModels();

  // Filter models based on type
  const filteredAvailableModels = filterType === 'all' 
    ? availableModels 
    : availableModels.filter(model => model.type === filterType);

  const filteredDownloadedModels = filterType === 'all'
    ? downloadedModels
    : downloadedModels.filter(model => model.metadata.type === filterType);

  useEffect(() => {
    // Refresh status of all downloaded models on mount
    refreshAllModelStatuses();
  }, []);

  const refreshAllModelStatuses = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all(
        downloadedModels.map((model: ModelState) => refreshModelStatus(model.metadata.id))
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Downloaded Models</Text>
          {filteredDownloadedModels.length === 0 ? (
            <Text style={styles.emptyText}>No models downloaded yet</Text>
          ) : (
            filteredDownloadedModels.map((model: ModelState) => (
              <ModelCard
                key={model.metadata.id}
                model={model.metadata}
                state={model}
                onDownload={() => handleDownload(model.metadata.id)}
                onDelete={() => handleDelete(model.metadata.id)}
                onSelect={() => handleSelect(model.metadata.id)}
                isSelected={selectedModelId === model.metadata.id}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Models</Text>
          {filteredAvailableModels
            .filter((model: ModelMetadata) => !isModelDownloaded(model.id))
            .map((model: ModelMetadata) => (
              <ModelCard
                key={model.id}
                model={model}
                state={getModelState(model.id)}
                onDownload={() => handleDownload(model.id)}
                onDelete={() => handleDelete(model.id)}
                onSelect={() => handleSelect(model.id)}
                isSelected={selectedModelId === model.id}
              />
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardSelected: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modelSize: {
    fontSize: 14,
    color: '#666',
  },
  modelDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modelDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2196F3',
  },
  errorContainer: {
    marginBottom: 12,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
  },
  filesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  filesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  fileText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  downloadButton: {
    backgroundColor: '#2196F3',
  },
  selectButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  infoButton: {
    backgroundColor: '#4CAF50',
  },
  modelPath: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  fileItem: {
    marginVertical: 2,
  },
  miniButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  createFilesButton: {
    backgroundColor: '#4CAF50',
  },
  miniButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 13,
  },
  directoryText: {
    fontWeight: 'bold',
  },
  fileErrorText: {
    color: '#f44336',
    fontSize: 12,
    marginLeft: 4,
  },
}); 