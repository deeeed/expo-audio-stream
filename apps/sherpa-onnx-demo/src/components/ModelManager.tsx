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
}); 