import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { InlineModelDownloader } from '../../../components/InlineModelDownloader';
import {
  AudioPlayButton,
  ConfigRow,
  LoadingOverlay,
  ModelSelector,
  PageContainer,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  useTheme,
} from '../../../components/ui';
import { useTts } from '../../../hooks/useTts';
import { baseLogger } from '../../../config';

const logger = baseLogger.extend('TTSScreen');

export default function TtsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const {
    text,
    isLoading,
    errorMessage,
    statusMessage,
    selectedModelId,
    ttsInitialized,
    initResult,
    ttsResult,
    speakerId,
    speakingRate,
    numThreads,
    debugMode,
    provider,
    autoPlay,
    downloadedModels,
    ttsConfig,
    setText,
    setSpeakerId,
    setSpeakingRate,
    setNumThreads,
    setDebugMode,
    setProvider,
    setAutoPlay,
    handleModelSelect,
    handleInitTts,
    handleGenerateTts,
    handleStopTts,
    handleReleaseTts,
  } = useTts();

  return (
    <PageContainer>
      <LoadingOverlay
        visible={isLoading}
        message={statusMessage || 'Processing...'}
        subMessage="This may take a moment, especially for longer text."
        onStop={handleStopTts}
      />

      <StatusBlock status={statusMessage} error={errorMessage} />

      {/* Model Selection */}
      <Section title="1. Select TTS Model">
        {downloadedModels.length === 0 ? (
          <InlineModelDownloader
            modelType="tts"
            emptyLabel="No TTS models downloaded."
            onModelDownloaded={(modelId) => handleModelSelect(modelId)}
          />
        ) : (
          <>
            <ModelSelector
              models={downloadedModels}
              selectedId={selectedModelId}
              onSelect={handleModelSelect}
            />
            <TouchableOpacity onPress={() => router.push('/(tabs)/models?type=tts')} style={{ marginTop: theme.margin.s, alignItems: 'center' }}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Download more models →</Text>
            </TouchableOpacity>
          </>
        )}
      </Section>

      {/* Predefined Model Configuration */}
      {selectedModelId && ttsConfig && (
        <Section title="Predefined Model Configuration">
          <Text variant="bodySmall" selectable style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: theme.colors.surfaceVariant, padding: 10, borderRadius: theme.roundness }}>
            {JSON.stringify(ttsConfig, null, 2)}
          </Text>
        </Section>
      )}

      {/* TTS Configuration */}
      <Section title="2. TTS Configuration">
        {/* Threads & Provider: hidden on web — WASM is single-threaded, CPU only */}
        {Platform.OS !== 'web' && (
          <>
            <ConfigRow label="Number of Threads:">
              <TextInput
                style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, color: theme.colors.onSurface }}
                keyboardType="numeric"
                value={numThreads.toString()}
                onChangeText={(value) => {
                  const threadCount = parseInt(value);
                  if (!isNaN(threadCount) && threadCount > 0) setNumThreads(threadCount);
                }}
              />
            </ConfigRow>

            <ConfigRow label="Provider:">
              <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
                <ThemedButton label="CPU" variant={provider === 'cpu' ? 'primary' : 'secondary'} onPress={() => setProvider('cpu')} compact />
                <ThemedButton label="GPU" variant={provider === 'gpu' ? 'primary' : 'secondary'} onPress={() => setProvider('gpu')} compact />
              </View>
            </ConfigRow>
          </>
        )}

        <ConfigRow label="Debug Mode:">
          <Switch value={debugMode} onValueChange={setDebugMode} />
        </ConfigRow>
      </Section>

      {/* Model Status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.margin.m }}>
        {isLoading ? (
          <Text variant="bodySmall" style={{ color: theme.colors.primary }}>Initializing...</Text>
        ) : ttsInitialized ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success ?? '#4CAF50' }} />
            <Text variant="bodySmall" style={{ color: theme.colors.success ?? '#4CAF50' }}>Ready</Text>
          </View>
        ) : (
          <ThemedButton label="Initialize TTS" onPress={handleInitTts} disabled={!selectedModelId} />
        )}
        {ttsInitialized && (
          <ThemedButton label="Release" variant="secondary" onPress={handleReleaseTts} compact />
        )}
      </View>

      {/* Text input and generation (only if initialized) */}
      {ttsInitialized && (
        <>
          <TextInput
            style={{
              padding: theme.padding.m,
              minHeight: 100,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.roundness * 2,
              marginBottom: theme.margin.m,
              color: theme.colors.onSurface,
            }}
            multiline
            value={text}
            onChangeText={setText}
            placeholder="Enter text to speak"
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />

          <Section title="Speech Generation">
            {initResult && initResult.numSpeakers > 1 && (
              <View style={{ marginBottom: theme.margin.m }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: theme.margin.s }}>
                  Speaker: {speakerId} of {initResult.numSpeakers - 1}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.gap?.s ?? 8 }}>
                  <ThemedButton label="-" onPress={() => setSpeakerId(Math.max(0, speakerId - 1))} disabled={speakerId <= 0} compact />
                  <TextInput
                    style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, textAlign: 'center', color: theme.colors.onSurface }}
                    keyboardType="numeric"
                    value={speakerId.toString()}
                    onChangeText={(value) => {
                      const id = parseInt(value);
                      if (!isNaN(id)) setSpeakerId(Math.max(0, Math.min(id, initResult.numSpeakers - 1)));
                    }}
                  />
                  <ThemedButton label="+" onPress={() => setSpeakerId(Math.min(initResult.numSpeakers - 1, speakerId + 1))} disabled={speakerId >= initResult.numSpeakers - 1} compact />
                  <ThemedButton label="Random" variant="secondary" onPress={() => setSpeakerId(Math.floor(Math.random() * initResult.numSpeakers))} compact />
                </View>
              </View>
            )}

            <ConfigRow label="Speaking Rate:">
              <TextInput
                style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, color: theme.colors.onSurface }}
                keyboardType="numeric"
                value={speakingRate.toString()}
                onChangeText={(value) => setSpeakingRate(parseFloat(value) || 1.0)}
              />
            </ConfigRow>

            <ConfigRow label="Auto-play Audio:">
              <Switch value={autoPlay} onValueChange={setAutoPlay} />
            </ConfigRow>
          </Section>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.margin.m }}>
            <ThemedButton label="Generate Speech" variant="primary" onPress={() => { logger.info(`action: generate speech (speakerId: ${speakerId}, rate: ${speakingRate})`); handleGenerateTts(); }} disabled={isLoading} style={{ flex: 1 }} />
          </View>
        </>
      )}

      {/* TTS Status */}
      {initResult && (
        <Section title="TTS Status">
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
            Initialized: {ttsInitialized ? 'Yes' : 'No'}
          </Text>
          {initResult.sampleRate && (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
              Sample Rate: {initResult.sampleRate}Hz
            </Text>
          )}
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            Speakers: {initResult.numSpeakers}
          </Text>
        </Section>
      )}

      {/* Generated Audio */}
      {ttsResult && ttsResult.filePath && (
        <Section title="Generated Audio">
          <View style={{ marginBottom: theme.margin.m }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>File:</Text> {ttsResult.filePath.split('/').pop()}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Location:</Text> {ttsResult.filePath}
            </Text>
          </View>

          <AudioPlayButton
            uri={ttsResult.filePath.startsWith('file://') ? ttsResult.filePath : `file://${ttsResult.filePath}`}
            label="Play Generated Audio"
          />
        </Section>
      )}
    </PageContainer>
  );
}
