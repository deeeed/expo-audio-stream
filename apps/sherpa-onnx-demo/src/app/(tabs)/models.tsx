import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ModelManager } from '../../components/ModelManager';

type ModelType = 'all' | 'tts' | 'asr' | 'vad' | 'kws' | 'speaker' | 'language' | 'audio-tagging' | 'punctuation';

export default function ModelsScreen() {
  const [selectedType, setSelectedType] = useState<ModelType>('all');

  const modelTypes: { type: ModelType; label: string }[] = [
    { type: 'all', label: 'All Models' },
    { type: 'tts', label: 'Text-to-Speech' },
    { type: 'asr', label: 'Speech-to-Text' },
    { type: 'vad', label: 'Voice Activity' },
    { type: 'kws', label: 'Keyword Spotting' },
    { type: 'speaker', label: 'Speaker ID' },
    { type: 'language', label: 'Language ID' },
    { type: 'audio-tagging', label: 'Audio Tagging' },
    { type: 'punctuation', label: 'Punctuation' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Models</Text>
        <ScrollView 
          horizontal 
          style={styles.typeScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeScrollContent}
        >
          {modelTypes.map(({ type, label }) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                selectedType === type && styles.typeButtonSelected
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[
                styles.typeButtonText,
                selectedType === type && styles.typeButtonTextSelected
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.modelManagerContainer}>
        <ModelManager filterType={selectedType} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingLeft: 12,
    height: 44,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  typeScroll: {
    flex: 1,
  },
  typeScrollContent: {
    paddingRight: 12,
    alignItems: 'center',
    height: '100%',
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  typeButtonSelected: {
    backgroundColor: '#2196F3',
  },
  typeButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 13,
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  modelManagerContainer: {
    flex: 1,
  },
}); 