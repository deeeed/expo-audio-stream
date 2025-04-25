import { Ionicons } from '@expo/vector-icons';

import * as FileSystem from 'expo-file-system';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useModelManagement } from '../contexts/ModelManagement/ModelManagementContext';
import { ModelState } from '../contexts/ModelManagement/types';
import { formatBytes } from '../utils/formatters';
import { ModelType, type ModelMetadata, type DependencyMetadata } from '../utils/models';

interface ModelCardProps {
  model: ModelMetadata;
  state?: ModelState;
  onDownload: () => Promise<void>;
  onDelete: () => Promise<void>;
  onSelect: () => void;
  isSelected: boolean;
  onBrowseFiles?: (modelPath: string) => void;
  onCancelDownload?: (modelId: string) => Promise<void>;
}

interface ModelManagerProps {
  filterType: ModelType | 'all';
  onModelSelect: (modelPath: string) => void;
  onBackToDownloads: () => void;
}

const ModelCard: React.FC<ModelCardProps> = React.memo(({
  model,
  state,
  onDownload,
  onDelete,
  onSelect,
  isSelected,
  onBrowseFiles,
  onCancelDownload
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [fileDetails, setFileDetails] = useState<Array<{
    id: string;
    name: string;
    size: number;
    exists: boolean;
    uri?: string;
    isDirectory?: boolean;
    error?: string;
  }>>([]);
  const [fileListError, setFileListError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  const isDownloaded = state?.status === 'downloaded';
  const isDownloading = state?.status === 'downloading';
  const isExtracting = state?.status === 'extracting';
  const hasError = state?.status === 'error';
  const hasDependencies = model.dependencies && model.dependencies.length > 0;

  // Animate progress changes
  useEffect(() => {
    if (isDownloading && state?.progress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: state.progress,
        duration: 300,
        useNativeDriver: false
      }).start();
    } else if (isExtracting) {
      // Reset to 0 for indeterminate animation
      progressAnim.setValue(0);
    }
  }, [state?.progress, isDownloading, isExtracting, progressAnim]);

  const handleDownload = async () => {
    // Disable downloads on web platform
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'Model downloads are not available on the web platform. Models are compiled into the web build.'
      );
      return;
    }
    
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
    // Disable file browsing on web platform
    if (Platform.OS === 'web') {
      Alert.alert(
        'Not Available on Web',
        'File browsing is not available on the web platform. Model file access requires a native device.'
      );
      return;
    }

    // If we have the onBrowseFiles prop, use it to navigate to file explorer
    if (onBrowseFiles && state?.localPath) {
      console.log(`Attempting to browse files at: ${state.localPath}`);
      
      // Check if the path exists before attempting to browse
      const pathInfo = await FileSystem.getInfoAsync(state.localPath);
      
      if (!pathInfo.exists) {
        console.warn(`Path does not exist: ${state.localPath}`);
        
        // For iOS, try to reconstruct the path
        if (Platform.OS === 'ios') {
          // Try to rebuild the path with current document directory
          const documentsPath = FileSystem.documentDirectory || '';
          const modelId = model.id;
          const fallbackPath = `${documentsPath}models/${modelId}`;
          
          console.log(`Trying fallback path: ${fallbackPath}`);
          
          const fallbackPathInfo = await FileSystem.getInfoAsync(fallbackPath);
          if (fallbackPathInfo.exists) {
            console.log(`Fallback path exists, using it`);
            onBrowseFiles(fallbackPath);
            return;
          }
        }
        
        // If all attempts fail, show an error
        Alert.alert(
          'Path Not Found',
          `The model files cannot be found at the saved location. This can happen after an app update or reinstall. Try downloading the model again.`
        );
        return;
      }
      
      // Path exists, proceed with browsing
      onBrowseFiles(state.localPath);
      return;
    }

    setIsLoading(true);
    setFileListError('');
    try {
      if (!state) {
        console.warn('Cannot show files: State is not available');
        setFileListError('Cannot show files: State is not available');
        setFileDetails([]);
        setIsLoading(false);
        return;
      }
      
      if (!state.localPath) {
        console.warn('Cannot show files: Model local path is not available');
        setFileListError('Cannot show files: Model local path is not available');
        
        // Add more detailed error info
        console.error(`Model: ${model.id}`);
        console.error(`State: ${JSON.stringify(state, null, 2)}`);
        
        setFileDetails([]);
        setIsLoading(false);
        return;
      }
      
      console.log(`=== Model Files: ${model.id} ===`);
      console.log(`Local path: ${state.localPath}`);
      console.log(`Model status: ${state.status}`);
      console.log(`Is archive: ${model.url.endsWith('.tar.bz2')}`);
      console.log(`Extracted files: ${state.extractedFiles?.join(', ') || 'none'}`);
      
      // Check if the path exists
      const fileInfo = await FileSystem.getInfoAsync(state.localPath);
      console.log(`Path info:`, fileInfo);

      if (!fileInfo.exists) {
        console.warn(`Path does not exist: ${state.localPath}`);
        setFileListError(`Path does not exist: ${state.localPath}`);
        setFileDetails([]);
        setIsLoading(false);
        return;
      }

      // If it's a single file (not a directory), show just that file
      if (!fileInfo.isDirectory) {
        console.log(`Path is a single file`);
        // Get the filename from the path
        const fileName = state.localPath.split('/').pop() || 'Unknown file';
        
        setFileDetails([{
          id: `${model.id}_file_${fileName}`,
          name: fileName,
          exists: true,
          size: fileInfo.size || 0,
          uri: fileInfo.uri,
          isDirectory: false,
        }]);
        
        setShowFiles(prev => !prev);
        setIsLoading(false);
        return;
      }

      // For directories, get the contents
      console.log(`Scanning directory: ${state.localPath}`);
      const dirContents = await FileSystem.readDirectoryAsync(state.localPath);
      console.log(`Found ${dirContents.length} items in directory`);
      
      // Get details for each file
      const details = await Promise.all(
        dirContents.map(async (file, index) => {
          const filePath = `${state.localPath}/${file}`;
          const info = await FileSystem.getInfoAsync(filePath);
          return {
            id: `${model.id}_file_${index}`, // Unique ID for each file
            name: file,
            exists: info.exists,
            size: info.exists ? (info.size || 0) : 0,
            uri: info.uri,
            isDirectory: info.isDirectory || false,
          };
        })
      );
      
      setFileDetails(details);
      setShowFiles(prev => !prev);
    } catch (error) {
      console.error('Error toggling file view:', error);
      setFileListError(`Error listing files: ${error instanceof Error ? error.message : String(error)}`);
      setFileDetails([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
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
        {hasDependencies && (
          <View style={cardStyles.dependencyBadge}>
            <Text style={cardStyles.dependencyBadgeText}>Has Dependencies</Text>
          </View>
        )}
        <Text style={cardStyles.modelSize}>{formatBytes(model.size)}</Text>
      </View>
      
      <Text style={cardStyles.modelDescription}>{model.description}</Text>
      
      <View style={cardStyles.modelDetails}>
        <Text style={cardStyles.detailText}>Type: {model.type}</Text>
        <Text style={cardStyles.detailText}>Version: {model.version}</Text>
        <Text style={cardStyles.detailText}>Language: {model.language}</Text>
      </View>

      {/* Download Progress - use animated version */}
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
            {onCancelDownload && (
              <TouchableOpacity 
                style={cardStyles.cancelButton}
                onPress={async () => {
                  try {
                    setIsLoading(true);
                    await onCancelDownload(model.id);
                  } catch (error) {
                    Alert.alert('Cancel Error', (error as Error).message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                <Ionicons name="close-circle" size={18} color="#ff4444" />
                <Text style={cardStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={cardStyles.progressBarContainer}>
            <Animated.View 
              style={[
                cardStyles.progressBarInner, 
                { width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }) }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Extraction Progress - also use animated version for indeterminate progress */}
      {state?.status === 'extracting' && (
        <View style={cardStyles.progressContainer}>
          <View style={cardStyles.progressRow}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={cardStyles.progressText}>
              Extracting model files...
            </Text>
            {onCancelDownload && (
              <TouchableOpacity 
                style={cardStyles.cancelButton}
                onPress={async () => {
                  try {
                    setIsLoading(true);
                    await onCancelDownload(model.id);
                  } catch (error) {
                    Alert.alert('Cancel Error', (error as Error).message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                <Ionicons name="close-circle" size={18} color="#ff4444" />
                <Text style={cardStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={cardStyles.progressBarContainer}>
            <View style={[cardStyles.progressBarInner, cardStyles.progressBarIndeterminate]} />
          </View>
        </View>
      )}

      {state?.status === 'error' && (
        <View style={cardStyles.errorContainer}>
          <Text style={cardStyles.errorText}>{state.error}</Text>
          {state.extractedFiles && state.extractedFiles.length > 0 && (
            <View style={cardStyles.filesContainer}>
              <Text style={cardStyles.filesTitle}>Partially Extracted Files:</Text>
              {state.extractedFiles.map((file: string, index: number) => (
                <Text key={index} style={cardStyles.fileText}>• {file}</Text>
              ))}
              <TouchableOpacity
                style={[cardStyles.button, cardStyles.deleteButton, { alignSelf: 'flex-start', marginTop: 8 }]}
                onPress={handleDelete}
                disabled={isLoading}
              >
                <Text style={cardStyles.buttonText}>Clean Up Files</Text>
              </TouchableOpacity>
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
              {fileDetails.length === 0 ? (
                <View>
                  <Text style={cardStyles.fileText}>No files found</Text>
                </View>
              ) : (
                fileDetails.map((file, index) => (
                  <View key={file.id || `file_${model.id}_${index}`} style={cardStyles.fileItem}>
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

      {/* Show dependencies if expanded and has dependencies */}
      {isExpanded && hasDependencies && (
        <View style={cardStyles.dependenciesContainer}>
          <Text style={cardStyles.dependenciesTitle}>Dependencies:</Text>
          {model.dependencies?.map((dependency: DependencyMetadata) => (
            <View key={dependency.id} style={cardStyles.dependencyItem}>
              <Text style={cardStyles.dependencyName}>{dependency.name}</Text>
              <Text style={cardStyles.dependencyDescription}>{dependency.description}</Text>
              <Text style={cardStyles.dependencySize}>{formatBytes(dependency.size)}</Text>
            </View>
          ))}
          <Text style={cardStyles.dependencyNote}>
            These files will be downloaded automatically when you download the model.
          </Text>
        </View>
      )}

      {/* Add expand button if the model has dependencies */}
      {hasDependencies && (
        <TouchableOpacity onPress={toggleExpand} style={cardStyles.expandButton}>
          <Text style={cardStyles.expandButtonText}>
            {isExpanded ? 'Hide Dependencies' : 'Show Dependencies'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={cardStyles.cardActions}>
        {isDownloaded ? (
          <>
            {/* Show Files button - disabled on web */}
            <TouchableOpacity
              style={[
                cardStyles.button, 
                cardStyles.infoButton,
                Platform.OS === 'web' && cardStyles.buttonDisabled
              ]}
              onPress={toggleShowFiles}
              disabled={isLoading || Platform.OS === 'web'}
            >
              <Text style={cardStyles.buttonText}>
                {showFiles ? 'Hide Files' : 'Show Files'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                cardStyles.button, 
                cardStyles.deleteButton,
                Platform.OS === 'web' && cardStyles.buttonDisabled
              ]}
              onPress={handleDelete}
              disabled={isLoading || Platform.OS === 'web'}
            >
              <Text style={cardStyles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : isExtracting ? (
          <TouchableOpacity
            style={[
              cardStyles.button, 
              cardStyles.deleteButton,
              Platform.OS === 'web' && cardStyles.buttonDisabled
            ]}
            onPress={handleDelete}
            disabled={isLoading || Platform.OS === 'web'}
          >
            <Text style={cardStyles.buttonText}>Abort & Delete</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              cardStyles.button, 
              cardStyles.downloadButton,
              Platform.OS === 'web' && cardStyles.buttonDisabled
            ]}
            onPress={handleDownload}
            disabled={isLoading || isDownloading || isExtracting || Platform.OS === 'web'}
          >
            <Text style={cardStyles.buttonText}>Download</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// Define types for the unified list data
type SectionId = 'downloaded' | 'available';
type HeaderItem = {
  type: 'header';
  id: SectionId;
  title: string;
  count: number;
  isExpanded: boolean;
};
type ModelItem = {
  type: 'model';
  id: string; // Use model id directly for key
  modelData: ModelMetadata | ModelState;
};
type EmptyItem = {
  type: 'empty';
  id: string; // e.g., 'empty-downloaded'
  message: string;
}
type ListItem = HeaderItem | ModelItem | EmptyItem;

export function ModelManager({ filterType, onModelSelect, onBackToDownloads }: ModelManagerProps) {
  const {
    getAvailableModels,
    getDownloadedModels,
    modelsState,
    downloadModel,
    deleteModel,
    cancelDownload
  } = useModelManagement();

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<SectionId | null>('downloaded'); // Start with downloaded expanded

  // Memoized model lists (as before)
  const availableModels = useMemo(() => getAvailableModels(), []);
  const downloadedModels = useMemo(() => getDownloadedModels(), [modelsState]);

  const filteredAvailableModels = useMemo(() =>
    filterType === 'all'
      ? availableModels
      : availableModels.filter((model) => model.type === filterType),
    [availableModels, filterType]
  );

  const filteredDownloadedModels = useMemo(() =>
    filterType === 'all'
      ? downloadedModels
      : downloadedModels.filter((modelState) => modelState.metadata.type === filterType),
    [downloadedModels, filterType]
  );

  // Memoized handlers (as before)
  const handleDownload = useCallback(async (modelId: string) => {
      try { await downloadModel(modelId); } catch (e) { Alert.alert('Download Error', (e as Error).message); }
  }, [downloadModel]);
  const handleCancelDownload = useCallback(async (modelId: string) => {
      try { await cancelDownload(modelId); } catch (e) { Alert.alert('Cancel Error', (e as Error).message); }
  }, [cancelDownload]);
  const handleDelete = useCallback(async (modelId: string) => {
      try { await deleteModel(modelId); } catch (e) { Alert.alert('Delete Error', (e as Error).message); }
  }, [deleteModel]);
  const handleSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
  }, []);

  // Function to toggle section expansion
  const toggleSection = (sectionId: SectionId) => {
      setExpandedSection(prev => prev === sectionId ? null : sectionId);
  };

  // Create the unified list data based on expanded state
  const listData = useMemo((): ListItem[] => {
      const data: ListItem[] = [];

      // Downloaded Section
      const downloadedExpanded = expandedSection === 'downloaded';
      data.push({
          type: 'header',
          id: 'downloaded',
          title: 'Downloaded Models',
          count: filteredDownloadedModels.length,
          isExpanded: downloadedExpanded,
      });
      if (downloadedExpanded) {
          if (filteredDownloadedModels.length === 0) {
              data.push({ type: 'empty', id: 'empty-downloaded', message: 'No downloaded models' });
          } else {
              filteredDownloadedModels.forEach(modelState => {
                  data.push({ type: 'model', id: modelState.metadata.id, modelData: modelState });
              });
          }
      }

      // Available Section
      const availableExpanded = expandedSection === 'available';
      data.push({
          type: 'header',
          id: 'available',
          title: 'Available Models',
          count: filteredAvailableModels.length,
          isExpanded: availableExpanded,
      });
      if (availableExpanded) {
          if (filteredAvailableModels.length === 0) {
              data.push({ type: 'empty', id: 'empty-available', message: 'No models available for the selected type' });
          } else {
              filteredAvailableModels.forEach(model => {
                  data.push({ type: 'model', id: model.id, modelData: model });
              });
          }
      }

      return data;
  }, [expandedSection, filteredDownloadedModels, filteredAvailableModels]);

  // Render function for FlatList items
  const renderListItem = useCallback(({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
          return (
              <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(item.id)}
              >
                  <Text style={styles.sectionTitle}>{item.title}</Text>
                  <Text style={styles.sectionCount}>({item.count})</Text>
                  {/* Optional: Add expand/collapse icon based on item.isExpanded */}
              </TouchableOpacity>
          );
      }

      if (item.type === 'empty') {
         return (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{item.message}</Text>
            </View>
         );
      }

      if (item.type === 'model') {
          // Use a type guard or assertion for clarity
          const isStateItem = 'metadata' in item.modelData;
          const modelMetadata: ModelMetadata = isStateItem 
              ? (item.modelData as ModelState).metadata 
              : item.modelData as ModelMetadata;
              
          // Ensure we get the LATEST state from the context map inside the render function
          const modelState = modelsState[modelMetadata.id]; 

          // console.log(`Rendering ModelCard for ${modelMetadata.id}, State:`, modelState?.status, modelState?.progress); // Optional: Log state passed to card

          return (
              <ModelCard
                  // No key prop needed here
                  model={modelMetadata}
                  state={modelState} // Pass the potentially updated state from context
                  onDownload={() => handleDownload(modelMetadata.id)}
                  onDelete={() => handleDelete(modelMetadata.id)}
                  onSelect={() => handleSelect(modelMetadata.id)}
                  isSelected={selectedModelId === modelMetadata.id}
                  onBrowseFiles={onModelSelect}
                  onCancelDownload={handleCancelDownload}
              />
          );
      }

      return null; // Should not happen
  }, [modelsState, selectedModelId, handleDownload, handleDelete, handleSelect, onModelSelect, handleCancelDownload, toggleSection]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  // Initial load effect
  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Render the single FlatList
  return (
    <FlatList
      style={styles.container} // Apply container style to FlatList
      data={listData}
      renderItem={renderListItem}
      keyExtractor={keyExtractor}
      // Correct extraData: include things renderListItem depends on that aren't in `item`
      extraData={{ modelsState, selectedModelId }} // Pass modelsState here so FlatList knows items might need re-rendering when it changes
      // Performance tuning props
      windowSize={11} // Default is 21, adjust based on testing
      maxToRenderPerBatch={10} // Default is 10
      initialNumToRender={10} // Default is 10
      removeClippedSubviews={Platform.OS === 'android'} // Can improve performance on Android
    />
  );
}

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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff', // White background for headers
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0', // Separator line
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f9f9f9', // Slightly different background for empty message
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});

// Styles for the ModelCard component
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16, // Add horizontal margin to cards
    marginVertical: 8, // Add vertical margin to cards
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
    backgroundColor: '#f0f0f0',
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
  dependencyBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  dependencyBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dependenciesContainer: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  dependenciesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dependencyItem: {
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  dependencyName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dependencyDescription: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  dependencySize: {
    fontSize: 12,
    color: '#2196F3',
  },
  dependencyNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 8,
  },
  expandButton: {
    backgroundColor: '#e0e0e0',
    padding: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
  },
  expandButtonText: {
    fontSize: 12,
    color: '#444',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ffeeee',
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
    backgroundColor: '#cccccc',
  },
}); 