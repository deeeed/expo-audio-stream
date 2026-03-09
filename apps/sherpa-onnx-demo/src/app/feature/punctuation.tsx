import { Punctuation } from '@siteed/sherpa-onnx.rn';
import type { PunctuationModelConfig } from '@siteed/sherpa-onnx.rn';
import React, { useCallback, useEffect, useState } from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePunctuationModels, usePunctuationModelWithConfig } from '../../hooks/useModelWithConfig';
import { setAgenticPageState } from '../../agentic-bridge';
import {
  PageContainer,
  Section,
  StatusBlock,
  ThemedButton,
  ModelSelector,
  ResultsBox,
  Text,
  useTheme,
} from '../../components/ui';

const SAMPLE_TEXTS = [
  'how are you doing today i am fine thank you',
  'the quick brown fox jumps over the lazy dog it was a sunny day',
  'hello world this is a test of the punctuation model',
  'i went to the store and bought some milk bread and eggs then i came home',
];

export default function PunctuationScreen() {
  const theme = useTheme();

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
    <PageContainer>
      {/* Model Selector */}
      <Section title="Model">
        <ModelSelector
          models={downloadedModels}
          selectedId={selectedModelId}
          onSelect={(id) => { if (!initialized) setSelectedModelId(id); }}
          disabled={initialized}
          emptyMessage="No Punctuation models downloaded. Go to Models tab to download."
        />
      </Section>

      {/* Controls */}
      <Section>
        <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
          {!initialized ? (
            <ThemedButton
              testID="punct-init-button"
              label="Initialize"
              onPress={handleInit}
              disabled={!selectedModelId || loading}
              loading={loading}
              variant="primary"
            />
          ) : (
            <ThemedButton
              testID="punct-release-button"
              label="Release"
              onPress={handleRelease}
              variant="danger"
            />
          )}
        </View>
      </Section>

      {/* Status */}
      <StatusBlock status={statusMessage} error={error} />

      {/* Input */}
      {initialized && (
        <Section title="Input Text">
          <TextInput
            testID="punct-input"
            style={{
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              borderRadius: theme.roundness * 2,
              padding: theme.padding.s,
              fontSize: 15,
              minHeight: 80,
              textAlignVertical: 'top',
              marginBottom: theme.margin.s,
              color: theme.colors.onSurface,
            }}
            value={inputText}
            onChangeText={setInputText}
            multiline
            placeholder="Enter text without punctuation..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
          <View style={{ gap: 4, marginBottom: theme.margin.s }}>
            {SAMPLE_TEXTS.map((text, idx) => (
              <TouchableOpacity
                key={idx}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: theme.roundness,
                  backgroundColor: theme.colors.surfaceVariant,
                }}
                onPress={() => setInputText(text)}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                  {text.substring(0, 30)}...
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedButton
            testID="punct-process-button"
            label="Add Punctuation"
            onPress={handleAddPunctuation}
            disabled={processing || !inputText.trim()}
            loading={processing}
            variant="primary"
          />
        </Section>
      )}

      {/* Output */}
      {outputText != null && (
        <Section title="Result">
          <ResultsBox>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, lineHeight: 24, paddingVertical: 8 }}>
              {outputText}
            </Text>
            {durationMs != null && (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Processing time: {durationMs}ms</Text>
            )}
          </ResultsBox>
        </Section>
      )}
    </PageContainer>
  );
}
