import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAudioTagging } from '../../../hooks/useAudioTagging';
import { InlineModelDownloader } from '../../../components/InlineModelDownloader';
import {
  ConfigRow,
  LoadingOverlay,
  ModelSelector,
  PageContainer,
  ResultsBox,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  useTheme,
} from '../../../components/ui';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  if (!ms) return 'Unknown';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function AudioTaggingScreen() {
  const theme = useTheme();

  const {
    initialized,
    loading,
    processing,
    error,
    statusMessage,
    audioTaggingResults,
    selectedAudio,
    selectedModelId,
    needsReinit,
    loadedAudioFiles,
    isPlaying,
    audioMetadata,
    topK,
    numThreads,
    debugMode,
    provider,
    downloadedModels,
    audioTaggingConfig,
    setTopK,
    setNumThreads,
    setDebugMode,
    setProvider,
    handleModelSelect,
    handleInitAudioTagging,
    handlePlayAudio,
    handleStopAudio,
    handleProcessAudio,
    handleReleaseAudioTagging,
    handleSelectAudio,
  } = useAudioTagging();

  return (
    <PageContainer>
      <LoadingOverlay
        visible={loading}
        message={statusMessage || 'Processing...'}
        subMessage="This may take a moment, especially for longer audio files."
      />

      <StatusBlock status={statusMessage} error={error} />

      {/* Model Selection */}
      <Section title="1. Select Model">
        {downloadedModels.length === 0 ? (
          <InlineModelDownloader
            modelType="audio-tagging"
            emptyLabel="No audio tagging models downloaded."
            onModelDownloaded={handleModelSelect}
          />
        ) : (
          <ModelSelector
            models={downloadedModels}
            selectedId={selectedModelId}
            onSelect={handleModelSelect}
            disabled={processing}
          />
        )}
      </Section>

      {/* Predefined Model Configuration */}
      {selectedModelId && audioTaggingConfig && (
        <Section title="Predefined Model Configuration">
          <View style={{ marginBottom: theme.margin.m }}>
            {audioTaggingConfig.modelType && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Model Type:</Text>
                <Text variant="bodyMedium">{audioTaggingConfig.modelType}</Text>
              </View>
            )}
            {audioTaggingConfig.topK !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Top K Results:</Text>
                <Text variant="bodyMedium">{audioTaggingConfig.topK}</Text>
              </View>
            )}
            {audioTaggingConfig.numThreads !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Num Threads:</Text>
                <Text variant="bodyMedium">{audioTaggingConfig.numThreads}</Text>
              </View>
            )}
            {audioTaggingConfig.provider !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Provider:</Text>
                <Text variant="bodyMedium">{audioTaggingConfig.provider.toUpperCase()}</Text>
              </View>
            )}
            {audioTaggingConfig.debug !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Debug Mode:</Text>
                <Text variant="bodyMedium">{audioTaggingConfig.debug ? 'Enabled' : 'Disabled'}</Text>
              </View>
            )}
            {audioTaggingConfig.modelFile !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Model File:</Text>
                <Text variant="bodyMedium">{audioTaggingConfig.modelFile}</Text>
              </View>
            )}
            {audioTaggingConfig.labelsFile !== undefined && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Labels File:</Text>
                <Text variant="bodyMedium">{audioTaggingConfig.labelsFile}</Text>
              </View>
            )}
          </View>
          <Text variant="titleSmall" style={{ marginBottom: theme.margin.s }}>Raw Configuration:</Text>
          <Text variant="bodySmall" selectable style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: theme.colors.surfaceVariant, padding: 10, borderRadius: theme.roundness }}>
            {JSON.stringify(audioTaggingConfig, null, 2)}
          </Text>
        </Section>
      )}

      {/* Configuration */}
      <Section title="2. Configuration">
        {audioTaggingConfig && (
          <View style={{ marginBottom: theme.margin.m }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', flex: 1, marginRight: theme.margin.m }}>
                <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>Note: </Text>
                Values from predefined configuration are shown in blue
              </Text>
              <ThemedButton
                label="Reset to Defaults"
                compact
                onPress={() => {
                  if (audioTaggingConfig) {
                    setTopK(audioTaggingConfig.topK ?? 5);
                    setNumThreads(audioTaggingConfig.numThreads ?? 2);
                    setDebugMode(audioTaggingConfig.debug ?? true);
                    setProvider(audioTaggingConfig.provider ?? 'cpu');
                  }
                }}
              />
            </View>
          </View>
        )}

        <ConfigRow label="Top K Results:">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              value={String(topK)}
              onChangeText={(t) => setTopK(Number(t) || 5)}
              keyboardType="numeric"
              style={{
                flex: 1, padding: 8,
                borderWidth: audioTaggingConfig?.topK === topK ? 2 : 1,
                borderColor: audioTaggingConfig?.topK === topK ? theme.colors.primary : theme.colors.outlineVariant,
                borderRadius: theme.roundness, color: theme.colors.onSurface,
              }}
            />
            {audioTaggingConfig?.topK !== undefined && audioTaggingConfig.topK !== topK && (
              <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, padding: 4, borderRadius: theme.roundness, marginLeft: 8 }}>
                Default: {audioTaggingConfig.topK}
              </Text>
            )}
          </View>
        </ConfigRow>

        <ConfigRow label="Num Threads:">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              value={String(numThreads)}
              onChangeText={(t) => setNumThreads(Number(t) || 2)}
              keyboardType="numeric"
              style={{
                flex: 1, padding: 8,
                borderWidth: audioTaggingConfig?.numThreads === numThreads ? 2 : 1,
                borderColor: audioTaggingConfig?.numThreads === numThreads ? theme.colors.primary : theme.colors.outlineVariant,
                borderRadius: theme.roundness, color: theme.colors.onSurface,
              }}
            />
            {audioTaggingConfig?.numThreads !== undefined && audioTaggingConfig.numThreads !== numThreads && (
              <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, padding: 4, borderRadius: theme.roundness, marginLeft: 8 }}>
                Default: {audioTaggingConfig.numThreads}
              </Text>
            )}
          </View>
        </ConfigRow>

        <ConfigRow label="Provider:">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
              <ThemedButton label="CPU" variant={provider === 'cpu' ? 'primary' : 'secondary'} onPress={() => setProvider('cpu')} compact />
              <ThemedButton label="GPU" variant={provider === 'gpu' ? 'primary' : 'secondary'} onPress={() => setProvider('gpu')} compact />
            </View>
            {audioTaggingConfig?.provider !== undefined && audioTaggingConfig.provider !== provider && (
              <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, padding: 4, borderRadius: theme.roundness, marginLeft: 8 }}>
                Default: {audioTaggingConfig.provider.toUpperCase()}
              </Text>
            )}
          </View>
        </ConfigRow>

        <ConfigRow label="Debug Mode:">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Switch
              value={debugMode}
              onValueChange={setDebugMode}
              trackColor={{
                false: '#eee',
                true: audioTaggingConfig?.debug === debugMode ? theme.colors.primary : '#81c784',
              }}
            />
            {audioTaggingConfig?.debug !== undefined && audioTaggingConfig.debug !== debugMode && (
              <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, padding: 4, borderRadius: theme.roundness, marginLeft: 8 }}>
                Default: {audioTaggingConfig.debug ? 'On' : 'Off'}
              </Text>
            )}
          </View>
        </ConfigRow>
      </Section>

      {/* Model Status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.margin.m }}>
        {loading ? (
          <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
            {needsReinit ? 'Reinitializing...' : 'Initializing...'}
          </Text>
        ) : initialized && !needsReinit ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success ?? '#4CAF50' }} />
            <Text variant="bodySmall" style={{ color: theme.colors.success ?? '#4CAF50' }}>Ready</Text>
          </View>
        ) : needsReinit ? (
          <Text variant="bodySmall" style={{ color: theme.colors.warning ?? '#FF9800' }}>
            Config changed — reinitializing...
          </Text>
        ) : (
          <ThemedButton
            label="Initialize"
            variant="primary"
            onPress={handleInitAudioTagging}
            disabled={!selectedModelId || processing}
          />
        )}
        {initialized && !loading && (
          <ThemedButton label="Release" variant="secondary" onPress={handleReleaseAudioTagging} disabled={processing} compact />
        )}
      </View>

      {/* Sample Audio Files */}
      <Section title={initialized ? '3. Sample Audio Files' : '3. Sample Audio Files (Initialize model first)'}>
        {loadedAudioFiles.length === 0 ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          loadedAudioFiles.map(audio => (
            <TouchableOpacity
              key={audio.id}
              style={{
                backgroundColor: selectedAudio?.id === audio.id ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                paddingVertical: 12, paddingHorizontal: 16, marginVertical: 6, borderRadius: theme.roundness,
                borderWidth: selectedAudio?.id === audio.id ? 2 : 0,
                borderColor: theme.colors.primary,
              }}
              onPress={() => handleSelectAudio(audio)}
              disabled={processing}
            >
              <Text variant="bodyMedium">{audio.name}</Text>
            </TouchableOpacity>
          ))
        )}
      </Section>

      {/* Audio Actions */}
      {selectedAudio && (
        <Section title="4. Audio Actions">
          <View style={{ marginBottom: theme.margin.m }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '500', marginBottom: theme.margin.s }}>
              Selected: {selectedAudio.name}
            </Text>
            {audioMetadata.isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 8 }} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 }}>
                {audioMetadata.size !== undefined && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Size: {formatFileSize(audioMetadata.size)}
                  </Text>
                )}
                {audioMetadata.duration !== undefined && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Duration: {formatDuration(audioMetadata.duration)}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
            <ThemedButton
              label={isPlaying ? 'Stop' : 'Play'}
              variant={isPlaying ? 'danger' : 'success'}
              onPress={() => isPlaying ? handleStopAudio() : handlePlayAudio(selectedAudio)}
              disabled={processing}
              style={{ flex: 1 }}
            />
            <ThemedButton
              label="Classify"
              onPress={() => handleProcessAudio(selectedAudio)}
              disabled={!initialized || processing}
              style={{ flex: 1 }}
            />
          </View>
        </Section>
      )}

      {/* Results */}
      {audioTaggingResults && audioTaggingResults.events && audioTaggingResults.events.length > 0 && (
        <Section title={selectedAudio ? '5. Results' : '4. Results'}>
          {processing ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <ResultsBox>
              {audioTaggingResults.events.map((item) => (
                <View key={`${item.index}-${item.name}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{item.name}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>{(item.prob * 100).toFixed(2)}%</Text>
                </View>
              ))}
            </ResultsBox>
          )}
        </Section>
      )}
    </PageContainer>
  );
}
