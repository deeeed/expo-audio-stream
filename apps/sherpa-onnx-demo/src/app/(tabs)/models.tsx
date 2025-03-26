import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModelManager } from '../../components/ModelManager';
import { FileExplorer } from '../../components/FileExplorer';
import { ModelTypeSelector } from '../../components/ModelTypeSelector';
import { ViewModeSelector } from '../../components/ViewModeSelector';
import { useModelCounts } from '../../hooks/useModelCounts';
import type { ViewMode } from '../../types/models';
import type { ModelType } from '@siteed/sherpa-onnx.rn';

export default function ModelsScreen() {
  const [selectedType, setSelectedType] = useState<ModelType | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('download');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [selectedModelPath, setSelectedModelPath] = useState<string | null>(null);
  
  const modelCounts = useModelCounts(selectedType);

  const handleModelBrowse = (modelPath: string) => {
    setSelectedModelPath(modelPath);
    setCurrentPath(modelPath);
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