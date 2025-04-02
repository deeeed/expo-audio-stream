import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileExplorer } from '../../components/FileExplorer';
import { ModelManager } from '../../components/ModelManager';
import { ModelTypeSelector } from '../../components/ModelTypeSelector';
import { ViewModeSelector } from '../../components/ViewModeSelector';
import WebInfoBanner from '../../components/WebInfoBanner';
import { useModelManagement } from '../../contexts/ModelManagement/ModelManagementContext';
import { useModelCounts } from '../../hooks/useModelCounts';
import type { ViewMode } from '../../types/models';
import { ModelType } from '../../utils/models';

export default function ModelsScreen() {
  const [selectedType, setSelectedType] = useState<ModelType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('download');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedModelPath, setSelectedModelPath] = useState<string | null>(null);
  
  const modelCounts = useModelCounts(selectedType);
  const { getAvailableModels } = useModelManagement();

  // --- Temporary Safeguard for modelCounts ---
  const safeAvailableCount = modelCounts?.filtered?.available ?? 0;
  const safeDownloadedCount = modelCounts?.filtered?.downloaded ?? 0;
  const safeByTypeCounts = modelCounts?.byType ?? {};
  // --- End Safeguard ---

  const handleModelBrowse = async (modelPath: string) => {
    try {
      console.log(`Attempting to browse model at: ${modelPath}`);
      
      if (!modelPath) {
        Alert.alert('Error', 'Model path is empty');
        return;
      }
      
      // Check if the path exists and what type it is
      const info = await FileSystem.getInfoAsync(modelPath);
      
      if (!info.exists) {
        console.warn(`Path does not exist: ${modelPath}`);
        
        // Try adding file:// prefix if not present (for compatibility)
        if (!modelPath.startsWith('file://')) {
          const altPath = `file://${modelPath}`;
          console.log(`Trying alternative with file:// prefix: ${altPath}`);
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
          }
        }
        
        // If we're on iOS, try to find the model by its ID
        if (Platform.OS === 'ios') {
          // Extract model ID from the path
          const pathParts = modelPath.split('/');
          const modelId = pathParts[pathParts.length - 1]; // Last part should be model ID
          
          // Try to reconstruct the path using current document directory
          const newPath = `${FileSystem.documentDirectory}models/${modelId}`;
          console.log(`Trying reconstructed path: ${newPath}`);
          
          const newInfo = await FileSystem.getInfoAsync(newPath);
          if (newInfo.exists) {
            console.log(`Reconstructed path exists, using it`);
            browseWithValidPath(newPath, newInfo);
            return;
          }
        }
        
        // If all attempts fail, show an error
        Alert.alert('Error', `Path does not exist: ${modelPath}`);
        return;
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
      {Platform.OS === 'web' && <WebInfoBanner />}
      
      <ModelTypeSelector
        selectedType={selectedType}
        onSelectType={setSelectedType}
        modelCounts={safeByTypeCounts}
      />

      <ViewModeSelector
        viewMode={viewMode}
        onSelectMode={setViewMode}
        availableCount={safeAvailableCount}
        downloadedCount={safeDownloadedCount}
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