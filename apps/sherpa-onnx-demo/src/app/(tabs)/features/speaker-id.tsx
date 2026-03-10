import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSpeakerId } from '../../../hooks/useSpeakerId';
import { InlineModelDownloader } from '../../../components/InlineModelDownloader';
import {
  AudioPlayButton,
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
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (!ms) return '0:00';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function SpeakerIdScreen() {
  const theme = useTheme();

  const {
    initialized,
    loading,
    processing,
    error,
    statusMessage,
    selectedModelId,
    registeredSpeakers,
    loadedAudioFiles,
    selectedAudio,
    embeddingResult,
    identifyResult,
    numThreads,
    debugMode,
    threshold,
    newSpeakerName,
    provider,
    audioMetadata,
    downloadedModels,
    speakerIdConfig,
    setNumThreads,
    setDebugMode,
    setThreshold,
    setNewSpeakerName,
    setProvider,
    handleModelSelect,
    handleInitSpeakerId,
    handleReleaseSpeakerId,
    handleProcessAudio,
    handleRegisterSpeaker,
    handleRemoveSpeaker,
    handleSelectAudio,
  } = useSpeakerId();

  return (
    <PageContainer>
      <LoadingOverlay
        visible={loading}
        message={statusMessage || 'Processing...'}
      />

      <StatusBlock status={!error && !loading ? statusMessage : null} error={error} />

      {/* Model Selection */}
      <Section title="1. Select Speaker ID Model">
        {downloadedModels.length === 0 ? (
          <InlineModelDownloader
            modelType="speaker-id"
            emptyLabel="No speaker identification models downloaded."
            onModelDownloaded={(modelId) => handleModelSelect(modelId)}
          />
        ) : (
          <ModelSelector
            models={downloadedModels}
            selectedId={selectedModelId}
            onSelect={handleModelSelect}
          />
        )}
      </Section>

      {/* Configuration */}
      {selectedModelId && speakerIdConfig && (
        <Section title="2. Speaker ID Configuration">
          <ConfigRow label="Number of Threads:">
            <TextInput
              style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, color: theme.colors.onSurface }}
              keyboardType="numeric"
              value={numThreads.toString()}
              onChangeText={(value) => {
                const n = parseInt(value);
                if (!isNaN(n) && n > 0) setNumThreads(n);
              }}
              editable={!initialized}
            />
          </ConfigRow>

          <ConfigRow label="Provider:">
            <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
              <ThemedButton label="CPU" variant={provider === 'cpu' ? 'primary' : 'secondary'} onPress={() => !initialized && setProvider('cpu')} disabled={initialized} compact />
              <ThemedButton label="GPU" variant={provider === 'gpu' ? 'primary' : 'secondary'} onPress={() => !initialized && setProvider('gpu')} disabled={initialized} compact />
            </View>
          </ConfigRow>

          <ConfigRow label="Debug Mode:">
            <Switch value={debugMode} onValueChange={(v) => { if (!initialized) setDebugMode(v); }} disabled={initialized} />
          </ConfigRow>

          <ConfigRow label="Similarity Threshold:">
            <TextInput
              style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, color: theme.colors.onSurface }}
              keyboardType="numeric"
              value={threshold.toString()}
              onChangeText={(t) => {
                const v = parseFloat(t);
                if (!isNaN(v) && v >= 0 && v <= 1) setThreshold(v);
              }}
            />
          </ConfigRow>
        </Section>
      )}

      {/* Model Status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.margin.m }}>
        {loading ? (
          <Text variant="bodySmall" style={{ color: theme.colors.primary }}>Initializing...</Text>
        ) : initialized ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success ?? '#4CAF50' }} />
            <Text variant="bodySmall" style={{ color: theme.colors.success ?? '#4CAF50' }}>Ready</Text>
          </View>
        ) : (
          <ThemedButton testID="spkr-init-btn" label="Initialize" variant="primary" onPress={handleInitSpeakerId} disabled={!selectedModelId} />
        )}
        {initialized && (
          <ThemedButton label="Release" variant="secondary" onPress={handleReleaseSpeakerId} compact />
        )}
      </View>

      {/* Audio Selection (only if initialized) */}
      {initialized && (
        <>
          <Section title="Test Audio">
            <View style={{ gap: 8 }}>
              {loadedAudioFiles.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  testID={`spkr-audio-${item.id}`}
                  style={{
                    padding: 12, borderRadius: theme.roundness,
                    backgroundColor: selectedAudio?.id === item.id ? theme.colors.primary : theme.colors.surfaceVariant,
                  }}
                  onPress={() => handleSelectAudio(item)}
                  disabled={processing}
                >
                  <Text variant="bodyMedium" style={{ fontWeight: '500', color: selectedAudio?.id === item.id ? theme.colors.onPrimary : theme.colors.onSurface }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedAudio && (
              <View style={{ marginTop: theme.margin.m }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: theme.margin.s }}>Selected: {selectedAudio.name}</Text>

                {audioMetadata.isLoading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <>
                    {audioMetadata.size !== undefined && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Size: {formatFileSize(audioMetadata.size)}</Text>
                    )}
                    {audioMetadata.duration !== undefined && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Duration: {formatDuration(audioMetadata.duration)}</Text>
                    )}
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8, marginTop: theme.margin.s }}>
                  <AudioPlayButton uri={selectedAudio.localUri} compact />
                  <ThemedButton testID="spkr-process-btn" label="Process" variant="primary" onPress={() => handleProcessAudio(selectedAudio)} disabled={processing} style={{ flex: 1 }} />
                </View>
              </View>
            )}
          </Section>

          {/* Processing Results */}
          {(processing || embeddingResult) && (
            <Section title="Results">
              {processing ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={{ marginTop: 10, color: theme.colors.onSurface }}>Processing audio...</Text>
                </View>
              ) : embeddingResult && (
                <ResultsBox>
                  <Text variant="titleSmall" style={{ marginBottom: theme.margin.s }}>Embedding Results:</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>Dimension: {embeddingResult.embeddingDim}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>Processing time: {embeddingResult.durationMs} ms</Text>

                  <Text variant="labelMedium" style={{ marginTop: theme.margin.s, marginBottom: 4 }}>First 5 embedding values:</Text>
                  <Text variant="bodySmall" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: theme.colors.onSurfaceVariant, marginBottom: theme.margin.s }}>
                    {embeddingResult.embedding.slice(0, 5).map((v, i) => `${v.toFixed(4)}${i < 4 ? ', ' : ''}`)}
                  </Text>

                  {identifyResult && (
                    <View style={{ marginTop: theme.margin.m, padding: 8, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.roundness }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: theme.margin.s }}>Identification Result:</Text>
                      {identifyResult.identified ? (
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.success ?? 'green' }}>
                          Speaker identified: {identifyResult.speakerName}
                        </Text>
                      ) : (
                        <Text variant="bodyMedium">No matching speaker found</Text>
                      )}
                    </View>
                  )}

                  {/* Register New Speaker */}
                  <View style={{ marginTop: theme.margin.m, paddingTop: theme.padding.s, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: theme.margin.s }}>Register as:</Text>
                    <TextInput
                      style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, marginBottom: theme.margin.s, color: theme.colors.onSurface }}
                      value={newSpeakerName}
                      onChangeText={setNewSpeakerName}
                      placeholder="Enter speaker name"
                      placeholderTextColor={theme.colors.onSurfaceVariant}
                    />
                    <ThemedButton testID="spkr-register-btn" label="Register Speaker" variant="primary" onPress={handleRegisterSpeaker} disabled={!newSpeakerName.trim() || processing} />
                  </View>
                </ResultsBox>
              )}
            </Section>
          )}

          {/* Registered Speakers */}
          {registeredSpeakers.length > 0 && (
            <Section title="Registered Speakers">
              {registeredSpeakers.map((name) => (
                <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.roundness, marginBottom: 8 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{name}</Text>
                  <ThemedButton label="Remove" variant="danger" onPress={() => handleRemoveSpeaker(name)} disabled={processing} compact />
                </View>
              ))}
            </Section>
          )}
        </>
      )}
    </PageContainer>
  );
}
