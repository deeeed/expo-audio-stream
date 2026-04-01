import * as Clipboard from 'expo-clipboard'
import { Redirect, useRouter } from 'expo-router'
import React, { useEffect, useMemo } from 'react'
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useToast } from '@siteed/design-system'
import { setAgenticPageState } from '../../../agentic-bridge'
import { InlineModelDownloader } from '../../../components/InlineModelDownloader'
import {
  AudioPlayButton,
  Chip,
  LoadingOverlay,
  ModelSelector,
  PageContainer,
  ResultsBox,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  useTheme,
} from '../../../components/ui'
import { useAsrBenchmark, type AsrBenchmarkResult, type BenchmarkMode } from '../../../hooks/useAsrBenchmark'
import {
  getAsrBenchmarkEntry,
  getAsrBenchmarkTierLabel,
} from '../../../utils/asrBenchmarkMatrix'

function formatMs(value?: number): string {
  if (value == null) return 'n/a'
  return `${Math.round(value)} ms`
}

function formatWhen(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString()
}

function modeTabStyle(
  active: boolean,
  backgroundColor: string,
  inactiveColor: string
) {
  return {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center' as const,
    backgroundColor: active ? backgroundColor : inactiveColor,
    borderRadius: 12,
  }
}

function ResultCard({ result }: { result: AsrBenchmarkResult }) {
  const theme = useTheme()
  const entry = getAsrBenchmarkEntry(result.modelId)
  const metricLine = [
    `init ${formatMs(result.initMs)}`,
    result.mode === 'sample'
      ? `recognize ${formatMs(result.recognizeMs)}`
      : `first partial ${formatMs(result.firstPartialMs)}`,
    result.mode === 'live'
      ? `first commit ${formatMs(result.firstCommitMs)}`
      : null,
    result.sessionMs != null ? `session ${formatMs(result.sessionMs)}` : null,
  ]
    .filter(Boolean)
    .join(' | ')

  return (
    <ResultsBox style={{ marginTop: 0, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, flexShrink: 1 }}>
          {result.modelName}
        </Text>
        <Chip
          label={result.runtime === 'streaming' ? 'Streaming' : 'Offline'}
          backgroundColor={result.runtime === 'streaming' ? '#E8F5E9' : '#F3E5F5'}
          color={result.runtime === 'streaming' ? '#2E7D32' : '#6A1B9A'}
        />
        {entry ? (
          <Chip
            label={getAsrBenchmarkTierLabel(entry.tier)}
            backgroundColor={theme.colors.secondaryContainer}
            color={theme.colors.onSecondaryContainer}
          />
        ) : null}
      </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
          {result.mode === 'sample'
            ? `Sample benchmark | ${result.sampleName || 'Unknown sample'}`
            : 'Live transcription benchmark'}
        {' | '}
        {formatWhen(result.createdAt)}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
        {metricLine}
      </Text>
      {result.mode === 'live' ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          Partial updates: {result.partialCount ?? 0} | Commits: {result.commitCount ?? 0}
        </Text>
      ) : null}
      {result.error ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {result.error}
        </Text>
      ) : (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
          {result.transcript || 'No transcript returned'}
        </Text>
      )}
      {result.notes ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
          {result.notes}
        </Text>
      ) : null}
    </ResultsBox>
  )
}

export default function AsrBenchmarkScreen() {
  if (!__DEV__) {
    return <Redirect href="/(tabs)/features" />
  }

  const router = useRouter()
  const theme = useTheme()
  const { show } = useToast()
  const {
    benchmarkModels,
    clearResults,
    error,
    liveAsr,
    liveBenchmarkModels,
    missingBenchmarkEntries,
    mode,
    processing,
    recorderDurationMs,
    recorderIsRecording,
    results,
    samples,
    selectedModel,
    selectedModelId,
    selectedSample,
    selectedSampleId,
    setMode,
    setSelectedModelId,
    setSelectedSampleId,
    startLiveBenchmark,
    statusMessage,
    stopLiveBenchmark,
    runAllSampleBenchmarks,
    runSelectedSampleBenchmark,
  } = useAsrBenchmark()

  const visibleModels = mode === 'live' ? liveBenchmarkModels : benchmarkModels
  const selectedEntry = selectedModel
    ? getAsrBenchmarkEntry(selectedModel.metadata.id)
    : null
  const latestResult = results[0] ?? null
  const isRecording = recorderIsRecording
  const visibleStatusMessage =
    !statusMessage || (statusMessage.startsWith('Recording with') && !recorderIsRecording)
      ? null
      : statusMessage

  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        results.map((result) => ({
          ...result,
          benchmarkTier: getAsrBenchmarkEntry(result.modelId)?.tier,
        })),
        null,
        2
      ),
    [results]
  )

  useEffect(() => {
    setAgenticPageState({
      mode,
      processing,
      isRecording,
      liveAsrListening: liveAsr.isListening,
      recorderDurationMs,
      recorderIsRecording,
      selectedModelId,
      selectedModelName: selectedModel?.metadata.name ?? null,
      selectedSampleId,
      selectedSampleName: selectedSample?.name ?? null,
      benchmarkModelCount: benchmarkModels.length,
      liveBenchmarkModelCount: liveBenchmarkModels.length,
      visibleModelCount: visibleModels.length,
      resultsCount: results.length,
      missingBenchmarkEntryCount: missingBenchmarkEntries.length,
      statusMessage: visibleStatusMessage,
      error: error || null,
      interimText: liveAsr.interimText || null,
      committedText: liveAsr.committedText || null,
      latestResult: latestResult
        ? {
            commitCount: latestResult.commitCount ?? null,
            createdAt: latestResult.createdAt,
            firstCommitMs: latestResult.firstCommitMs ?? null,
            firstPartialMs: latestResult.firstPartialMs ?? null,
            initMs: latestResult.initMs ?? null,
            modelId: latestResult.modelId,
            modelName: latestResult.modelName,
            mode: latestResult.mode,
            notes: latestResult.notes ?? null,
            partialCount: latestResult.partialCount ?? null,
            recognizeMs: latestResult.recognizeMs ?? null,
            runtime: latestResult.runtime,
            sampleName: latestResult.sampleName ?? null,
            sessionMs: latestResult.sessionMs ?? null,
            error: latestResult.error || null,
            transcript: latestResult.transcript || null,
          }
        : null,
    })
  }, [
    benchmarkModels.length,
    error,
    isRecording,
    latestResult,
    liveAsr.committedText,
    liveAsr.interimText,
    liveAsr.isListening,
    liveBenchmarkModels.length,
    missingBenchmarkEntries.length,
    mode,
    processing,
    recorderDurationMs,
    recorderIsRecording,
    results.length,
    selectedModel?.metadata.name,
    selectedModelId,
    selectedSample?.name,
    selectedSampleId,
    statusMessage,
    visibleStatusMessage,
    visibleModels.length,
  ])

  const handleCopyResults = async () => {
    try {
      await Clipboard.setStringAsync(exportPayload)
      show({ iconVisible: true, message: 'Benchmark results copied to clipboard' })
    } catch {
      show({ iconVisible: true, message: 'Failed to copy benchmark results', type: 'error' })
    }
  }

  const handleSetMode = (nextMode: BenchmarkMode) => {
    if (processing) return
    if (nextMode === mode) return
    setMode(nextMode)
  }

  return (
    <PageContainer>
      <LoadingOverlay
        visible={processing && !isRecording}
        message={mode === 'sample' ? 'Running benchmark...' : 'Preparing live benchmark...'}
        subMessage={visibleStatusMessage || undefined}
      />

      <Section title="Recorder Benchmark">
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          Separate experiment page for comparing practical live ASR models against heavier offline references.
          The matrix intentionally includes non-winner baselines so the recommendation is based on tradeoffs, not just best-case models.
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip label="Android-first" backgroundColor="#E3F2FD" color="#1565C0" />
          <Chip label="On-device only" backgroundColor="#E8F5E9" color="#2E7D32" />
          <Chip label="Separate page" backgroundColor="#FFF3E0" color="#EF6C00" />
        </View>
      </Section>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.margin.m }}>
        <TouchableOpacity
          testID="asr-benchmark-mode-sample"
          style={modeTabStyle(mode === 'sample', theme.colors.primary, theme.colors.surfaceVariant)}
          onPress={() => handleSetMode('sample')}
        >
          <Text variant="labelLarge" style={{ color: mode === 'sample' ? theme.colors.onPrimary : theme.colors.onSurface }}>
            Sample File
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="asr-benchmark-mode-live"
          style={modeTabStyle(mode === 'live', theme.colors.primary, theme.colors.surfaceVariant)}
          onPress={() => handleSetMode('live')}
        >
          <Text variant="labelLarge" style={{ color: mode === 'live' ? theme.colors.onPrimary : theme.colors.onSurface }}>
            Live Mic
          </Text>
        </TouchableOpacity>
      </View>

      <StatusBlock
        error={error}
        status={
          isRecording
            ? `Recording with ${selectedModel?.metadata.name || 'selected model'} • ${(recorderDurationMs / 1000).toFixed(1)}s`
            : visibleStatusMessage
        }
      />

      <Section title="Benchmark Matrix">
        {visibleModels.length === 0 ? (
          <>
            <InlineModelDownloader
              modelType="asr"
              emptyLabel={
                mode === 'live'
                  ? 'No benchmark streaming models downloaded.'
                  : 'No benchmark ASR models downloaded.'
              }
              onModelDownloaded={(modelId) => setSelectedModelId(modelId)}
            />
            <ThemedButton
              label="Open model library"
              variant="secondary"
              onPress={() => router.push('/(tabs)/models?type=asr')}
              style={{ marginTop: 12 }}
            />
          </>
        ) : (
          <>
            <ModelSelector
              models={visibleModels}
              selectedId={selectedModelId}
              onSelect={setSelectedModelId}
              disabled={processing || isRecording}
              testIdPrefix="asr-benchmark-model"
            />
            {selectedModel && selectedEntry ? (
              <ResultsBox>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                  {getAsrBenchmarkTierLabel(selectedEntry.tier)}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {selectedEntry.rationale}
                </Text>
              </ResultsBox>
            ) : null}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/models?type=asr')}
              style={{ marginTop: 8, alignItems: 'center' }}
            >
              <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
                Download more benchmark models
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Section>

      {missingBenchmarkEntries.length > 0 ? (
        <Section title="Missing Matrix Models">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
            These comparison points are still missing on this device.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {missingBenchmarkEntries.map((entry) => (
              <Chip
                key={entry.id}
                label={entry.id}
                backgroundColor={theme.colors.surfaceVariant}
                color={theme.colors.onSurfaceVariant}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {mode === 'sample' ? (
        <>
          <Section title="Sample Input">
            <ModelSelector
              models={samples.map((sample) => ({
                metadata: { id: sample.id, name: sample.name },
              }))}
              selectedId={selectedSampleId}
              onSelect={setSelectedSampleId}
              disabled={processing}
              testIdPrefix="asr-benchmark-sample"
            />
            {selectedSample ? (
              <ResultsBox>
                <AudioPlayButton uri={selectedSample.localUri} label="Play sample" compact />
              </ResultsBox>
            ) : null}
          </Section>

          <Section title="Run Benchmarks">
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Sample runs benchmark the same audio across the selected matrix. This is the repeatable path for comparing practical live models against heavier offline references.
            </Text>
            <View style={styles.buttonRow}>
              <ThemedButton
                label="Run Selected"
                variant="primary"
                onPress={runSelectedSampleBenchmark}
                disabled={processing || !selectedModel || !selectedSample}
                testID="asr-benchmark-run-selected"
                style={styles.flexButton}
              />
              <ThemedButton
                label="Run All Downloaded"
                variant="secondary"
                onPress={runAllSampleBenchmarks}
                disabled={processing || benchmarkModels.length === 0 || !selectedSample}
                testID="asr-benchmark-run-all"
                style={styles.flexButton}
              />
            </View>
          </Section>
        </>
      ) : (
        <Section title="Live Transcription">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Live mode is intentionally limited to streaming models. Translation-capable offline references stay in sample mode because the current RN package path does not provide Recorder-class live translation yet.
          </Text>
          <View style={styles.buttonRow}>
            <ThemedButton
              label={isRecording ? 'Listening...' : 'Start Live Benchmark'}
              variant="primary"
              onPress={startLiveBenchmark}
              disabled={processing || isRecording || !selectedModel}
              testID="asr-benchmark-start-live"
              style={styles.flexButton}
            />
            <ThemedButton
              label="Stop"
              variant="danger"
              onPress={stopLiveBenchmark}
              disabled={!isRecording}
              testID="asr-benchmark-stop-live"
              style={styles.flexButton}
            />
          </View>
          <ResultsBox>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
              Recorder state
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {recorderIsRecording
                ? `Mic recording • ${(recorderDurationMs / 1000).toFixed(1)}s`
                : 'Recorder idle'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              ASR listener: {liveAsr.isListening ? 'active' : 'idle'}
            </Text>
          </ResultsBox>
          <ResultsBox>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
              Interim
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 12 }}>
              {liveAsr.interimText || 'No interim transcript yet'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
              Committed
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
              {liveAsr.committedText || 'No committed transcript yet'}
            </Text>
          </ResultsBox>
        </Section>
      )}

      <Section title="Results">
        <View style={styles.buttonRow}>
          <ThemedButton
            label="Copy JSON"
            variant="secondary"
            onPress={handleCopyResults}
            disabled={results.length === 0}
            testID="asr-benchmark-copy-json"
            style={styles.flexButton}
          />
          <ThemedButton
            label="Clear"
            variant="danger"
            onPress={clearResults}
            disabled={results.length === 0}
            testID="asr-benchmark-clear-results"
            style={styles.flexButton}
          />
        </View>
        {results.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No benchmark runs yet.
          </Text>
        ) : (
          results.map((result) => <ResultCard key={`${result.createdAt}-${result.modelId}-${result.mode}`} result={result} />)
        )}
      </Section>

      {Platform.OS !== 'android' ? (
        <Section title="Platform Note">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            This page is Android-first. Native package behavior on {Platform.OS} is still useful for comparison, but the primary recommendation should come from Android measurements.
          </Text>
        </Section>
      ) : null}
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flexButton: {
    flex: 1,
  },
})
