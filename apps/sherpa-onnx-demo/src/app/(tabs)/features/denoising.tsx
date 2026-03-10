import React from 'react';
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDenoising, DenoisingAudioFile } from '../../../hooks/useDenoising';
import { InlineModelDownloader } from '../../../components/InlineModelDownloader';
import {
  AudioPlayButton,
  LoadingOverlay,
  ModelSelector,
  PageContainer,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  useTheme,
} from '../../../components/ui';

export default function DenoisingScreen() {
  const theme = useTheme();
  const {
    initialized,
    loading,
    processing,
    error,
    statusMessage,
    selectedModelId,
    outputUri,
    processingDurationMs,
    loadedAudioFiles,
    selectedAudio,
    downloadedModels,
    setSelectedModelId,
    handleInit,
    handleRelease,
    handleSelectAudio,
    handleDenoise,
  } = useDenoising();

  return (
    <PageContainer>
      <LoadingOverlay visible={loading} message={statusMessage || 'Loading...'} />
      <StatusBlock status={!error && !loading ? statusMessage : null} error={error} />

      {/* Step 1: Model */}
      <Section title="1. GTCRN Denoising Model">
        {downloadedModels.length === 0 ? (
          <InlineModelDownloader
            modelType="denoising"
            emptyLabel="No denoising model downloaded. Download GTCRN (~500 KB)."
            onModelDownloaded={(modelId) => setSelectedModelId(modelId)}
          />
        ) : (
          <ModelSelector
            models={downloadedModels}
            selectedId={selectedModelId}
            onSelect={(id) => { if (!initialized) setSelectedModelId(id); }}
          />
        )}
      </Section>

      {/* Init / Release */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.margin.m }}>
        {loading ? (
          <Text variant="bodySmall" style={{ color: theme.colors.primary }}>Initializing...</Text>
        ) : initialized ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success ?? '#4CAF50' }} />
            <Text variant="bodySmall" style={{ color: theme.colors.success ?? '#4CAF50' }}>{statusMessage || 'Ready'}</Text>
          </View>
        ) : (
          <ThemedButton
            label="Initialize"
            variant="primary"
            onPress={handleInit}
            disabled={!selectedModelId}
            testID="denoising-initialize"
          />
        )}
        {initialized && (
          <ThemedButton label="Release" variant="secondary" onPress={handleRelease} compact />
        )}
      </View>

      {/* Step 2: Audio Selection + Run */}
      {initialized && (
        <Section title="2. Select Audio File">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            Select a file to denoise and compare the original vs denoised output.
          </Text>
          <View style={{ gap: 8 }}>
            {loadedAudioFiles.map((item: DenoisingAudioFile) => (
              <TouchableOpacity
                key={item.id}
                testID={`denoising-audio-${item.id}`}
                style={{
                  padding: 12,
                  borderRadius: theme.roundness,
                  backgroundColor: selectedAudio?.id === item.id ? theme.colors.primary : theme.colors.surfaceVariant,
                }}
                onPress={() => handleSelectAudio(item)}
                disabled={processing}
              >
                <Text
                  variant="bodyMedium"
                  style={{ fontWeight: '500', color: selectedAudio?.id === item.id ? theme.colors.onPrimary : theme.colors.onSurface }}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedAudio && (
            <View style={{ marginTop: 12, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, width: 68 }}>Original:</Text>
                <AudioPlayButton uri={selectedAudio.localUri} compact />
              </View>
              <ThemedButton
                label={processing ? 'Denoising...' : 'Denoise'}
                variant="success"
                onPress={() => handleDenoise(selectedAudio)}
                disabled={processing}
                testID="denoising-run"
              />
            </View>
          )}
        </Section>
      )}

      {/* Results */}
      {initialized && (processing || outputUri) && (
        <Section title="Results">
          {processing ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{ marginTop: 10, color: theme.colors.onSurface }}>
                Running denoising...
              </Text>
            </View>
          ) : outputUri ? (
            <View style={{ gap: 12 }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Processed in {processingDurationMs}ms
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, width: 68 }}>Original:</Text>
                <AudioPlayButton uri={selectedAudio?.localUri || ''} compact />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, width: 68 }}>Denoised:</Text>
                <AudioPlayButton uri={outputUri} compact />
              </View>
            </View>
          ) : null}
        </Section>
      )}
    </PageContainer>
  );
}
