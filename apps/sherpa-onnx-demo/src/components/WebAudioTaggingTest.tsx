import React, { useState } from 'react';
import { Button, StyleSheet, Text, View, Platform } from 'react-native';

interface AudioTaggingTestState {
  isInitialized: boolean;
  isProcessing: boolean;
  events: { label: string; confidence: number }[];
  error: string;
}

export default function WebAudioTaggingTest() {
  const [state, setState] = useState<AudioTaggingTestState>({
    isInitialized: false,
    isProcessing: false,
    events: [],
    error: '',
  });

  // Check if we're on web platform
  if (Platform.OS !== 'web') {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Tagging (Coming Soon)</Text>
      
      <View style={styles.placeholderContent}>
        <Text style={styles.placeholderText}>
          Audio tagging module is being implemented for WebAssembly.
        </Text>
        <Text style={styles.placeholderText}>
          This feature requires the audio-tagging WASM module to be built and deployed.
        </Text>
        <Text style={styles.placeholderText}>
          To build it, run:
        </Text>
        <Text style={styles.codeBlock}>
          cd packages/sherpa-onnx.rn{'\n'}
          ./build-sherpa-wasm.sh --speech-enhancement
        </Text>
        <Text style={styles.placeholderText}>
          Once built, audio classification will be available in this tab.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e9e9e9',
    borderRadius: 8,
    marginTop: 10,
  },
  placeholderText: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#555',
  },
  codeBlock: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    marginVertical: 12,
    alignSelf: 'stretch',
  }
}); 