import type { ModelType } from '@siteed/sherpa-onnx.rn';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileExplorer } from '../../components/FileExplorer';
import { ModelManager } from '../../components/ModelManager';
import { ModelTypeSelector } from '../../components/ModelTypeSelector';
import { ViewModeSelector } from '../../components/ViewModeSelector';
import { useModelManagement } from '../../contexts/ModelManagement/ModelManagementContext';
import { useModelCounts } from '../../hooks/useModelCounts';
import type { ViewMode } from '../../types/models';

export default function ModelsScreen() {
  const [selectedType, setSelectedType] = useState<ModelType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('download');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedModelPath, setSelectedModelPath] = useState<string | null>(null);
  
  const modelCounts = useModelCounts(selectedType);
  const { refreshModelStatus, getAvailableModels } = useModelManagement();

  // Refresh all model statuses on mount
  useEffect(() => {
    const refreshAllModels = async () => {
      try {
        const models = getAvailableModels();
        for (const model of models) {
          await refreshModelStatus(model.id);
        }
      } catch (error) {
        console.error('Error refreshing model statuses:', error);
      }
    };
    
    refreshAllModels();
  }, []);

  const handleModelBrowse = async (modelPath: string) => {
    try {
      console.log(`Attempting to browse model at: ${modelPath}`);
      
      if (!modelPath) {
        Alert.alert('Error', 'Model path is empty');
        return;
      }
      
      // Check if the path exists and what type it is
      const info = await FileSystem.getInfoAsync(modelPath);
      console.log(`File info for ${modelPath}:`, info);
      
      if (!info.exists) {
        // Try adding file:// prefix if not present
        if (!modelPath.startsWith('file://')) {
          const altPath = `file://${modelPath}`;
          console.log(`Path doesn't exist, trying alternative: ${altPath}`);
          const altInfo = await FileSystem.getInfoAsync(altPath);
          
          if (altInfo.exists) {
            console.log(`Alternative path exists, using it instead`);
            modelPath = altPath;
            // Create a new info object with the alt info properties
            const updatedInfo = {
              ...info,
              exists: altInfo.exists,
              isDirectory: altInfo.isDirectory,
              uri: altInfo.uri,
              size: altInfo.size,
              modificationTime: altInfo.modificationTime,
            };
            
            // Now browse using the updated path and info
            browseWithValidPath(modelPath, updatedInfo);
            return;
          } else {
            Alert.alert('Error', `Path does not exist: ${modelPath}`);
            return;
          }
        } else {
          Alert.alert('Error', `Path does not exist: ${modelPath}`);
          return;
        }
      }
      
      // If we get here, the original path exists
      browseWithValidPath(modelPath, info);
    } catch (error) {
      console.error('Error handling model browse:', error);
      Alert.alert('Error', `Failed to browse model files: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const browseWithValidPath = (modelPath: string, info: FileSystem.FileInfo) => {
    // If it's a file not a directory, use the parent directory
    const browsePath = info.isDirectory ? modelPath : modelPath.substring(0, modelPath.lastIndexOf('/'));
    
    console.log(`Browsing model at path: ${browsePath}`);
    console.log(`Original path: ${modelPath}, isDirectory: ${info.isDirectory}`);
    
    setSelectedModelPath(modelPath);
    setCurrentPath(browsePath);
    setViewMode('files');
  };

  const handleBackToDownloads = () => {
    setViewMode('download');
    setSelectedModelPath(null);
    setCurrentPath('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ModelTypeSelector
        selectedType={selectedType}
        onSelectType={setSelectedType}
        modelCounts={modelCounts.byType}
      />

      <ViewModeSelector
        viewMode={viewMode}
        onSelectMode={setViewMode}
        availableCount={modelCounts.filtered.available}
        downloadedCount={modelCounts.filtered.downloaded}
      />

      <View style={styles.modelManagerContainer}>
        {viewMode === 'download' ? (
          <ModelManager 
            filterType={selectedType} 
            onModelSelect={handleModelBrowse}
            onBackToDownloads={handleBackToDownloads}
          />
        ) : (
          <FileExplorer 
            currentPath={currentPath}
            onNavigate={setCurrentPath}
            filterType={selectedType}
            initialModelPath={selectedModelPath}
            onBackToDownloads={handleBackToDownloads}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modelManagerContainer: {
    flex: 1,
  },
}); 