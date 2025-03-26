import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ModelType } from '@siteed/sherpa-onnx.rn';
import type { ModelTypeOption } from '../types/models';
import { MODEL_TYPES } from '../types/models';
import { Ionicons } from '@expo/vector-icons';

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
  const handleSelectType = useCallback((type: ModelType | 'all') => {
    onSelectType(type);
  }, [onSelectType]);

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {MODEL_TYPES.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.filterButton,
              selectedType === option.type && styles.filterButtonSelected,
            ]}
            onPress={() => handleSelectType(option.type)}>
            <Text
              style={[
                styles.filterButtonText,
                selectedType === option.type && styles.filterButtonTextSelected,
              ]}>
              {option.label}
            </Text>
            <View
              style={[
                styles.countBadge,
                selectedType === option.type && styles.countBadgeSelected,
              ]}>
              <Text
                style={[
                  styles.countBadgeText,
                  selectedType === option.type && styles.countBadgeTextSelected,
                ]}>
                {modelCounts[option.type].available}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        {selectedType !== 'all' && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => handleSelectType('all')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 120,
  },
  filterButtonSelected: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  filterButtonTextSelected: {
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeSelected: {
    backgroundColor: '#1976D2',
  },
  countBadgeText: {
    fontSize: 12,
    color: '#666',
  },
  countBadgeTextSelected: {
    color: '#fff',
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
}); 