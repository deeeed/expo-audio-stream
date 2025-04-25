import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ViewMode } from '../types/models';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onSelectMode: (mode: ViewMode) => void;
  availableCount: number;
  downloadedCount: number;
}

export function ViewModeSelector({ 
  viewMode, 
  onSelectMode, 
  availableCount, 
  downloadedCount 
}: ViewModeSelectorProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[
          styles.button, 
          viewMode === 'download' && styles.buttonSelected
        ]}
        onPress={() => onSelectMode('download')}
      >
        <Text style={[
          styles.text,
          viewMode === 'download' && styles.textSelected
        ]}>
          Download Models ({availableCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[
          styles.button, 
          viewMode === 'files' && styles.buttonSelected
        ]}
        onPress={() => onSelectMode('files')}
      >
        <Text style={[
          styles.text,
          viewMode === 'files' && styles.textSelected
        ]}>
          Downloaded ({downloadedCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonSelected: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  text: {
    fontSize: 14,
    color: '#666',
  },
  textSelected: {
    color: '#2196F3',
    fontWeight: '500',
  },
}); 