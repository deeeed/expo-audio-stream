import { useTheme } from '@siteed/design-system';
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
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
      <TouchableOpacity
        style={[
          styles.button,
          viewMode === 'download' && { borderBottomWidth: 2, borderBottomColor: colors.primary },
        ]}
        onPress={() => onSelectMode('download')}
      >
        <Text style={[
          styles.text,
          { color: viewMode === 'download' ? colors.primary : colors.onSurfaceVariant },
          viewMode === 'download' && styles.textSelected,
        ]}>
          Download Models ({availableCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          viewMode === 'files' && { borderBottomWidth: 2, borderBottomColor: colors.primary },
        ]}
        onPress={() => onSelectMode('files')}
      >
        <Text style={[
          styles.text,
          { color: viewMode === 'files' ? colors.primary : colors.onSurfaceVariant },
          viewMode === 'files' && styles.textSelected,
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
  },
  textSelected: {
    fontWeight: '500',
  },
});
