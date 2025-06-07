import type { AppTheme } from '@siteed/design-system'
import { ScreenWrapper, useThemePreferences } from '@siteed/design-system'
import type { AudioDataEvent, AudioRecording, EncodingType, RecordingConfig, SampleRate, StartRecordingResult } from '@siteed/expo-audio-studio'
import { useAudioRecorder } from '@siteed/expo-audio-studio'
import { useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { LogBox, StyleSheet, View } from 'react-native'
import { Button, Card, Text } from 'react-native-paper'

// Disable warning overlays on agent validation page to prevent E2E test interference
if (__DEV__) {
  LogBox.ignoreAllLogs(true)
  console.log('🤖 Agent validation page: Warning overlays disabled for E2E testing')
}

type ParsedParams = Record<string, string | string[]>

const getStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    gap: 16,
    paddingHorizontal: theme.padding?.s || 16,
    paddingBottom: 80,
    paddingTop: 0,
  },
  resultCard: {
    marginBottom: 12,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: theme.colors.onSurface,
  },
  eventText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
  },
  configText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: theme.colors.primary,
  },
})

const AgentValidationScreen = () => {
  const { theme } = useThemePreferences()
  const styles = getStyles(theme)
  const params = useLocalSearchParams()
  
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isRecording,
    isPaused,
    durationMs,
    size,
    compression,
  } = useAudioRecorder()

  const [startResult, setStartResult] = useState<StartRecordingResult | null>(null)
  const [finalResult, setFinalResult] = useState<AudioRecording | null>(null)
  const [events, setEvents] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Debug finalResult state changes
  useEffect(() => {
    console.log('🟡 finalResult state changed:', finalResult ? 'HAS_DATA' : 'NULL', finalResult?.durationMs)
  }, [finalResult])

  const addEvent = useCallback((message: string) => {
    setEvents(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }, [])

  // Create recording configuration from URL params
  const createRecordingConfig = useCallback((params: ParsedParams): RecordingConfig => {
    const recordingConfig: RecordingConfig = {
      sampleRate: params.sampleRate ? parseInt(params.sampleRate as string) as SampleRate : 44100,
      channels: params.channels ? parseInt(params.channels as string) as 1 | 2 : 1,
      encoding: (params.encoding as EncodingType) || 'pcm_16bit',
      interval: params.interval ? parseInt(params.interval as string) : 100,
      enableProcessing: params.enableProcessing === 'true',
      keepAwake: params.keepAwake !== 'false',
      showNotification: params.showNotification === 'true',
      output: {
        primary: {
          enabled: params.primaryOutput !== 'false',
        },
        compressed: {
          enabled: params.compressedOutput === 'true',
          format: (params.compressedFormat as 'aac' | 'opus') || 'aac',
          bitrate: params.compressedBitrate ? parseInt(params.compressedBitrate as string) : 128000,
        }
      },
      onAudioStream: async (event: AudioDataEvent) => {
        const message = `AudioStream: position=${event.position}, size=${event.eventDataSize}, total=${event.totalSize}`
        addEvent(`${new Date().toISOString()}: ${message}`)
      },
      // Add callback to prevent warning overlay
      onRecordingInterrupted: (event) => {
        console.log('🔄 Recording interrupted:', event)
        addEvent(`Recording interrupted: ${event.reason}`)
      },
    }

    return recordingConfig
  }, [addEvent])

  const handleStartRecording = useCallback(async (recordingConfig?: RecordingConfig) => {
    try {
      console.log('🟢 START BUTTON CLICKED - Starting handleStartRecording')
      setError(null)
      const configToUse = recordingConfig || createRecordingConfig(params)
      if (!configToUse) {
        setError('No configuration available')
        return
      }

      addEvent('Starting recording...')
      console.log('🟢 About to call startRecording with config:', configToUse)
      const result = await startRecording(configToUse)
      console.log('🟢 startRecording() completed, result:', result)
      setStartResult(result)
      addEvent(`Recording started: ${JSON.stringify(result, null, 2)}`)
      console.log('🟢 handleStartRecording completed successfully')
    } catch (err) {
      console.error('🟢 START RECORDING ERROR:', err)
      const errorMessage = `Start recording failed: ${err}`
      setError(errorMessage)
      addEvent(errorMessage)
    }
  }, [params, startRecording, createRecordingConfig, addEvent])

  const handleStopRecording = useCallback(async () => {
    try {
      console.log('🔴 STOP BUTTON CLICKED - Starting handleStopRecording')
      addEvent('Stopping recording...')
      console.log('🔴 About to call stopRecording()')
      const result = await stopRecording()
      console.log('🔴 stopRecording() completed, result:', result)
      setFinalResult(result)
      addEvent(`Recording stopped: ${JSON.stringify(result, null, 2)}`)
      console.log('🔴 handleStopRecording completed successfully')
    } catch (err) {
      console.error('🔴 STOP RECORDING ERROR:', err)
      const errorMessage = `Stop recording failed: ${err}`
      setError(errorMessage)
      addEvent(errorMessage)
    }
  }, [stopRecording, addEvent])

  const handlePauseRecording = useCallback(async () => {
    try {
      addEvent('Pausing recording...')
      await pauseRecording()
      addEvent('Recording paused')
    } catch (err) {
      const errorMessage = `Pause recording failed: ${err}`
      setError(errorMessage)
      addEvent(errorMessage)
    }
  }, [pauseRecording, addEvent])

  const handleResumeRecording = useCallback(async () => {
    try {
      addEvent('Resuming recording...')
      await resumeRecording()
      addEvent('Recording resumed')
    } catch (err) {
      const errorMessage = `Resume recording failed: ${err}`
      setError(errorMessage)
      addEvent(errorMessage)
    }
  }, [resumeRecording, addEvent])

  const clearResults = useCallback(() => {
    setStartResult(null)
    setFinalResult(null)
    setEvents([])
    setError(null)
  }, [])

  return (
    <ScreenWrapper
      withScrollView
      useInsets={false}
      contentContainerStyle={styles.container}
    >
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text variant="titleMedium">Agent Validation Interface</Text>
            <Text variant="bodySmall" style={{ marginTop: 8 }}>
              Configure recording via deep links, then use Detox to press buttons and validate results.
            </Text>
          </Card.Content>
        </Card>

        {/* Configuration Display - Always show for E2E testing */}
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text variant="titleSmall">Current Configuration</Text>
            <Text testID="agent-config" style={styles.configText}>
              {Object.keys(params).length > 0 
                ? JSON.stringify(createRecordingConfig(params), null, 2)
                : '{\n  "status": "No configuration parameters provided"\n}'
              }
            </Text>
          </Card.Content>
        </Card>

        {/* Recording Controls */}
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text variant="titleSmall">Recording Controls</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <Button
                mode="contained"
                onPress={() => {
                  console.log('📱 START RECORDING BUTTON PRESSED')
                  handleStartRecording()
                }}
                disabled={Object.keys(params).length === 0 || isRecording}
                testID="start-recording-button"
              >
                Start Recording
              </Button>
              <Button
                mode="outlined"
                onPress={handlePauseRecording}
                disabled={!isRecording || isPaused}
                testID="pause-recording-button"
              >
                Pause
              </Button>
              <Button
                mode="outlined"
                onPress={handleResumeRecording}
                disabled={!isPaused}
                testID="resume-recording-button"
              >
                Resume
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  console.log('📱 STOP RECORDING BUTTON PRESSED')
                  handleStopRecording()
                }}
                disabled={!isRecording && !isPaused}
                testID="stop-recording-button"
              >
                Stop Recording
              </Button>
              <Button
                mode="text"
                onPress={clearResults}
                testID="clear-results-button"
              >
                Clear Results
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Current Status */}
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text variant="titleSmall">Current Status</Text>
            
            {/* State indicators with dedicated testIDs for testing */}
            {isRecording && <View testID="recording-active-indicator" style={{ height: 1 }} />}
            {isPaused && <View testID="recording-paused-indicator" style={{ height: 1 }} />}
            {!isRecording && !isPaused && <View testID="recording-stopped-indicator" style={{ height: 1 }} />}
            {size > 0 && <View testID="has-audio-data-indicator" style={{ height: 1 }} />}
            
            <Text testID="recording-status" style={styles.resultText}>
              isRecording: {isRecording}
              {'\n'}isPaused: {isPaused}
              {'\n'}durationMs: {durationMs}
              {'\n'}size: {size}
              {compression && `\ncompression: ${JSON.stringify(compression, null, 2)}`}
            </Text>
          </Card.Content>
        </Card>

        {/* Start Recording Result */}
        {startResult && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Text variant="titleSmall">Start Recording Result</Text>
              <Text testID="start-recording-result" style={styles.resultText}>
                {JSON.stringify(startResult, null, 2)}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Event Log - CONTROLLED HEIGHT with detailed statistics */}
        {events.length > 0 && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Text variant="titleSmall">Event Log</Text>
              
              {/* Event Statistics - Useful for E2E validation */}
              <View style={{ marginVertical: 8, padding: 8, backgroundColor: theme.colors.surfaceVariant, borderRadius: 4 }}>
                <Text testID="event-stats" style={[styles.eventText, { color: theme.colors.onSurfaceVariant }]}>
                  📊 Stats: {events.length} total events
                  {events.length > 0 && ` | First: ${events[0]?.split(':')[0]} | Latest: ${events[events.length - 1]?.split(':')[0]}`}
                </Text>
                <Text testID="event-count" style={{ opacity: 0, height: 0 }}>
                  {events.length}
                </Text>
              </View>
              
              {/* Recent Events Display */}
              <View style={{ maxHeight: 150, minHeight: 50 }}>
                <Text style={[styles.eventText, { marginBottom: 4, fontWeight: 'bold' }]}>
                  Recent Events (showing last {Math.min(5, events.length)}):
                </Text>
                {events.slice(-5).map((event, index) => (
                  <Text key={index} testID={`event-${index}`} style={styles.eventText} numberOfLines={2}>
                    {event}
                  </Text>
                ))}
                {events.length > 5 && (
                  <Text testID="events-overflow" style={[styles.eventText, { fontStyle: 'italic', marginTop: 4 }]}>
                    ... and {events.length - 5} earlier events (total: {events.length})
                  </Text>
                )}
              </View>
              
              {/* Quick Event Type Summary */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.eventText, { fontSize: 10, color: theme.colors.onSurfaceVariant }]}>
                  Types: {[...new Set(events.map(e => {
                    if (e.includes('Starting recording')) return 'start'
                    if (e.includes('Recording started')) return 'started'
                    if (e.includes('Stopping recording')) return 'stop'
                    if (e.includes('Recording stopped')) return 'stopped'
                    if (e.includes('AudioStream')) return 'stream'
                    if (e.includes('interrupted')) return 'interrupt'
                    return 'other'
                  }))].join(', ')}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* CRITICAL TEST ELEMENTS - Always in predictable positions */}
        
        {/* Scroll anchor for test navigation */}
        <View testID="test-results-anchor" style={{ height: 1 }} />
        
        {/* Final Recording Result - HIGH PRIORITY for tests */}
        {finalResult && (
          <Card style={[styles.resultCard, { backgroundColor: theme.colors.successContainer }]} testID="final-result-card">
            <Card.Content>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                ✅ Final Recording Result
              </Text>
              <View style={{ maxHeight: 200 }}>
                <Text testID="final-recording-result" style={[styles.resultText, { color: theme.colors.onSurface }]} numberOfLines={10}>
                  {JSON.stringify(finalResult, null, 2)}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Error Display - HIGH PRIORITY for tests */}
        {error && (
          <Card style={[styles.resultCard, { backgroundColor: theme.colors.errorContainer }]} testID="error-card">
            <Card.Content>
              <Text variant="titleSmall" style={{ color: theme.colors.onErrorContainer }}>
                ❌ Error
              </Text>
              <Text testID="error-message" style={[styles.resultText, { color: theme.colors.onErrorContainer }]} numberOfLines={5}>
                {error}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Usage Instructions */}
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text variant="titleSmall">Deep Link Usage</Text>
            <Text style={styles.eventText}>
              Example URLs (scheme varies by APP_VARIANT):
              {'\n'}
              {'\n'}• Basic recording:
              {'\n'}audioplayground://agent-validation?sampleRate=44100&channels=1&encoding=pcm_16bit
              {'\n'}
              {'\n'}• With compression:
              {'\n'}audioplayground://agent-validation?compressedOutput=true&compressedFormat=aac&compressedBitrate=128000
              {'\n'}
              {'\n'}• Production scheme: audioplayground://
              {'\n'}• Development scheme: audioplayground-development://
              {'\n'}
              {'\n'}Parameters: sampleRate, channels, encoding, interval, enableProcessing, keepAwake, showNotification, primaryOutput, compressedOutput, compressedFormat, compressedBitrate
              {'\n'}
              {'\n'}Use Detox to press buttons and test recording workflow.
            </Text>
          </Card.Content>
        </Card>
    </ScreenWrapper>
  )
}

export default AgentValidationScreen