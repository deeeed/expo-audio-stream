import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@siteed/design-system';
import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MODEL_TYPES } from '../types/models';
import { ModelType } from '../utils/models';

interface ModelTypeSelectorProps {
  selectedType: ModelType | 'all';
  onSelectType: (type: ModelType | 'all') => void;
  modelCounts: Record<ModelType | 'all', {
    available: number;
    downloaded: number;
  }>;
}

export function ModelTypeSelector({
  selectedType,
  onSelectType,
  modelCounts,
}: ModelTypeSelectorProps) {
  const { colors } = useTheme();
  const handleSelectType = useCallback((type: ModelType | 'all') => {
    onSelectType(type);
  }, [onSelectType]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
      <View style={styles.filterContainer}>
        {MODEL_TYPES.map((option) => {
          const isSelected = selectedType === option.type;
          return (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.filterButton,
                { backgroundColor: isSelected ? colors.primary : colors.surfaceVariant },
              ]}
              onPress={() => handleSelectType(option.type)}>
              <Text
                style={[
                  styles.filterButtonText,
                  { color: isSelected ? colors.onPrimary : colors.onSurface },
                ]}>
                {option.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: isSelected ? colors.primaryContainer : colors.outlineVariant },
                ]}>
                <Text
                  style={[
                    styles.countBadgeText,
                    { color: isSelected ? colors.onPrimaryContainer : colors.onSurfaceVariant },
                  ]}>
                  {modelCounts[option.type].available}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {selectedType !== 'all' && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleSelectType('all')}>
            <Ionicons name="close-circle" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 120,
  },
  filterButtonText: {
    fontSize: 14,
    marginRight: 8,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
});
