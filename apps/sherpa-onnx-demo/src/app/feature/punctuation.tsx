import { Punctuation } from '@siteed/sherpa-onnx.rn';
import type { PunctuationModelConfig } from '@siteed/sherpa-onnx.rn';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePunctuationModels, usePunctuationModelWithConfig } from '../../hooks/useModelWithConfig';
import { setAgenticPageState } from '../../agentic-bridge';

const SAMPLE_TEXTS = [
  'how are you doing today i am fine thank you',
  'the quick brown fox jumps over the lazy dog it was a sunny day',
  'hello world this is a test of the punctuation model',
  'i went to the store and bought some milk bread and eggs then i came home',
];

export default function PunctuationScreen() {
  // Model state
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Input/output state
  const [inputText, setInputText] = useState(SAMPLE_TEXTS[0]);
  const [outputText, setOutputText] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  // Models
  const { downloadedModels } = usePunctuationModels();
  const { punctuationConfig, localPath } = usePunctuationModelWithConfig({ modelId: selectedModelId });

  // Auto-select first model
  useEffect(() => {
    if (!selectedModelId && downloadedModels.length > 0) {
      setSelectedModelId(downloadedModels[0].metadata.id);
    }
  }, [selectedModelId, downloadedModels]);

  // Agentic page state
  useEffect(() => {
    setAgenticPageState({
      selectedModelId,
      initialized,
      loading,
      processing,
      outputText,
      durationMs,
      error,
      statusMessage,
    });
  }, [selectedModelId, initialized, loading, processing, outputText, durationMs, error, statusMessage]);

  // Initialize Punctuation
  const handleInit = useCallback(async () => {
    if (!selectedModelId || !punctuationConfig || !localPath) {
      setError('No model selected or not downloaded');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Initializing Punctuation...');

    try {
      const config: PunctuationModelConfig = {
        modelDir: localPath,
        ...punctuationConfig,
      };
      const result = await Punctuation.init(config);
      if (result.success) {
        setInitialized(true);
        setStatusMessage('Punctuation initialized successfully');
      } else {
        setError(result.error || 'Init failed');
        setStatusMessage('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedModelId, punctuationConfig, localPath]);

  // Add punctuation
  const handleAddPunctuation = useCallback(async () => {
    if (!initialized || !inputText.trim()) return;

    setProcessing(true);
    setError(null);
    setOutputText(null);
    setDurationMs(null);
    setStatusMessage('Processing...');

    try {
      const result = await Punctuation.addPunctuation(inputText.trim());
      if (result.success) {
        setOutputText(result.text);
        setDurationMs(result.durationMs);
        setStatusMessage(`Done in ${result.durationMs}ms`);
      } else {
        setError(result.error || 'Punctuation failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }, [initialized, inputText]);

  // Release
  const handleRelease = useCallback(async () => {
    await Punctuation.release();
    setInitialized(false);
    setOutputText(null);
    setStatusMessage('Punctuation released');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Model Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model</Text>
          {downloadedModels.length === 0 ? (
            <Text style={styles.infoText}>No Punctuation models downloaded. Go to Models tab to download.</Text>
          ) : (
            <View style={styles.modelList}>
              {downloadedModels.map(model => (
                <TouchableOpacity
                  key={model.metadata.id}
                  style={[
                    styles.modelButton,
                    selectedModelId === model.metadata.id && styles.modelButtonSelected,
                  ]}
                  onPress={() => {
                    if (!initialized) setSelectedModelId(model.metadata.id);
                  }}
                  disabled={initialized}
                >
                  <Text
                    style={[
                      styles.modelButtonText,
                      selectedModelId === model.metadata.id && styles.modelButtonTextSelected,
                    ]}
                  >
                    {model.metadata.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            {!initialized ? (
              <TouchableOpacity
                testID="punct-init-button"
                style={[styles.button, styles.buttonPrimary, (!selectedModelId || loading) && styles.buttonDisabled]}
                onPress={handleInit}
                disabled={!selectedModelId || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonTextWhite}>Initialize</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                testID="punct-release-button"
                style={[styles.button, styles.buttonDanger]}
                onPress={handleRelease}
              >
                <Text style={styles.buttonTextWhite}>Release</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status */}
        {(statusMessage || error) && (
          <View style={styles.section}>
            {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}

        {/* Input */}
        {initialized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Input Text</Text>
            <TextInput
              testID="punct-input"
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              multiline
              placeholder="Enter text without punctuation..."
              placeholderTextColor="#999"
            />
            <View style={styles.sampleRow}>
              {SAMPLE_TEXTS.map((text, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.sampleButton}
                  onPress={() => setInputText(text)}
                >
                  <Text style={styles.sampleButtonText} numberOfLines={1}>
                    {text.substring(0, 30)}...
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              testID="punct-process-button"
              style={[styles.button, styles.buttonPrimary, (processing || !inputText.trim()) && styles.buttonDisabled]}
              onPress={handleAddPunctuation}
              disabled={processing || !inputText.trim()}
            >
              {processing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonTextWhite}>Add Punctuation</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Output */}
        {outputText != null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Result</Text>
            <View style={styles.results}>
              <Text style={styles.outputText}>{outputText}</Text>
              {durationMs != null && (
                <Text style={styles.infoText}>Processing time: {durationMs}ms</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#666' },
  statusText: { fontSize: 14, color: '#333' },
  errorText: { fontSize: 14, color: '#d00' },
  modelList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modelButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ccc' },
  modelButtonSelected: { backgroundColor: '#795548', borderColor: '#795548' },
  modelButtonText: { fontSize: 14, color: '#333' },
  modelButtonTextSelected: { color: '#fff' },
  buttonRow: { flexDirection: 'row', gap: 8 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, alignItems: 'center', minWidth: 100 },
  buttonPrimary: { backgroundColor: '#795548' },
  buttonDanger: { backgroundColor: '#d00' },
  buttonDisabled: { opacity: 0.5 },
  buttonTextWhite: { color: '#fff', fontSize: 14, fontWeight: '600' },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  sampleRow: { gap: 4, marginBottom: 8 },
  sampleButton: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#f0f0f0' },
  sampleButtonText: { fontSize: 12, color: '#666' },
  results: { padding: 8, backgroundColor: '#f9f9f9', borderRadius: 6 },
  outputText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    paddingVertical: 8,
  },
});
