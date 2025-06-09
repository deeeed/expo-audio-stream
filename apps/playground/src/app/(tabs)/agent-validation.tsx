import type { AppTheme } from '@siteed/design-system'
import { ScreenWrapper, useThemePreferences } from '@siteed/design-system'
import type { AudioDataEvent, AudioRecording, EncodingType, RecordingConfig, SampleRate, StartRecordingResult } from '@siteed/expo-audio-studio'
import { useAudioRecorder } from '@siteed/expo-audio-studio'
import type { AudioAnalysisEvent } from '@siteed/expo-audio-studio/src/events'
import { useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { LogBox, Platform, StyleSheet, View } from 'react-native'
import { Button, Card, Text } from 'react-native-paper'

interface TimingStats {
  configuredInterval: number
  actualMinInterval?: number
  actualMaxInterval?: number
  actualAverageInterval?: number
  variance?: number
  eventCount?: number
  totalDuration?: number
  platformLimitation?: string
  expectedEvents?: number
  actualEvents?: number
  averageInterval?: number
  matchesExpectation?: boolean
  // Processing time statistics
  avgExtractionTimeMs?: number
  minExtractionTimeMs?: number
  maxExtractionTimeMs?: number
  extractionTimeCount?: number
}

interface TimingSummary {
  platform: string
  recordingDuration: number
  configuration: {
    intervalAnalysis: number | null
    interval: number | null
  }
  analysisEvents: TimingStats | null
  streamEvents: TimingStats | null
}

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

  // High-frequency event timing analysis using refs to avoid re-renders
  const analysisTimingStats = useRef<TimingStats | null>(null)
  const streamTimingStats = useRef<TimingStats | null>(null)

  const lastAnalysisTimestamp = useRef<number | null>(null)
  const lastStreamTimestamp = useRef<number | null>(null)
  const analysisIntervals = useRef<number[]>([])
  const streamIntervals = useRef<number[]>([])
  const extractionTimes = useRef<number[]>([])
  const [enableTimingAnalysis, setEnableTimingAnalysis] = useState<boolean>(false)
  const [displayStats, setDisplayStats] = useState<{ analysis: TimingStats | null, stream: TimingStats | null }>({ analysis: null, stream: null })
  const [timingSummary, setTimingSummary] = useState<string | null>(null)

  // Debug finalResult state changes
  useEffect(() => {
    console.log('🟡 finalResult state changed:', finalResult ? 'HAS_DATA' : 'NULL', finalResult?.durationMs)
  }, [finalResult])

  const addEvent = useCallback((message: string) => {
    setEvents(prev => [...prev, `${new Date().toISOString()}: ${message}`])
  }, [])

  // Calculate timing statistics
  const calculateTimingStats = useCallback((intervals: number[], configuredInterval: number) => {
    if (intervals.length < 2) return null

    const min = Math.min(...intervals)
    const max = Math.max(...intervals)
    const avg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length

    let platformLimitation: string | undefined
    if (configuredInterval < 100 && avg >= 95) {
      platformLimitation = 'Platform appears to enforce ~100ms minimum interval'
    } else if (Math.abs(avg - configuredInterval) > 20) {
      platformLimitation = `Significant deviation from configured interval (${configuredInterval}ms)`
    }

    return {
      configuredInterval,
      actualMinInterval: min,
      actualMaxInterval: max,
      actualAverageInterval: avg,
      variance,
      eventCount: intervals.length,
      totalDuration: intervals.reduce((sum, val) => sum + val, 0),
      platformLimitation
    }
  }, [])

  // Handle audio analysis events with timing measurement - optimized for performance
  const handleAudioAnalysis = useCallback(async (event: AudioAnalysisEvent) => {
    if (enableTimingAnalysis) {
      const now = Date.now()
      if (lastAnalysisTimestamp.current) {
        const interval = now - lastAnalysisTimestamp.current
        analysisIntervals.current.push(interval)
      }
      lastAnalysisTimestamp.current = now

      // Capture extraction time when available
      if (event.extractionTimeMs) {
        extractionTimes.current.push(event.extractionTimeMs)

        // Log processing time when not recording to avoid spam
        if (!isRecording) {
          console.log(`🔍 Analysis processing time: ${event.extractionTimeMs}ms`)
        }
      }
    }

    // NO UI UPDATES during high-frequency recording to prevent ANR
    // Logging happens only in timing display updates every 3 seconds
  }, [enableTimingAnalysis, isRecording])

  // Handle audio stream events with timing measurement - optimized for performance
  const handleAudioStream = useCallback(async (_event: AudioDataEvent) => {
    if (enableTimingAnalysis) {
      const now = Date.now()
      if (lastStreamTimestamp.current) {
        const interval = now - lastStreamTimestamp.current
        streamIntervals.current.push(interval)
      }
      lastStreamTimestamp.current = now
    }

    // NO UI UPDATES during high-frequency recording to prevent ANR
    // Event details logged only during timing summary generation
  }, [enableTimingAnalysis])

  // Update timing statistics every 5 seconds during recording to reduce UI load
  useEffect(() => {
    if (!enableTimingAnalysis) return

    // Only run interval when recording AND not when timing summary is already generated
    if (!isRecording && timingSummary !== null) return

    const intervalDuration = isRecording ? 5000 : 3000 // Longer interval during recording
    const interval = setInterval(() => {
      // Minimal console logging during high-frequency recording
      if (!isRecording) {
        console.log('📊 Updating timing display - intervals collected:', analysisIntervals.current.length, streamIntervals.current.length, 'extraction times:', extractionTimes.current.length)
      }

      // Update analysis timing stats
      if (analysisIntervals.current.length > 1) {
        const configuredInterval = parseInt(params.intervalAnalysis as string) || parseInt(params.interval as string) || 100
        const stats = calculateTimingStats(analysisIntervals.current, configuredInterval)
        if (stats) {
          analysisTimingStats.current = stats
          console.log('✅ Analysis timing stats:', stats)
        }
      }

      // Update stream timing stats
      if (streamIntervals.current.length > 1) {
        const configuredInterval = parseInt(params.interval as string) || 100
        const stats = calculateTimingStats(streamIntervals.current, configuredInterval)
        if (stats) {
          streamTimingStats.current = stats
          console.log('✅ Stream timing stats:', stats)
        }
      }

      // Update display state only when we have data
      if (analysisTimingStats.current || streamTimingStats.current) {
        setDisplayStats({
          analysis: analysisTimingStats.current,
          stream: streamTimingStats.current
        })
      }
    }, intervalDuration) // Dynamic interval: 5s during recording, 3s otherwise

    return () => clearInterval(interval)
  }, [enableTimingAnalysis, params.intervalAnalysis, params.interval, calculateTimingStats, isRecording, timingSummary])

  // Check for timing analysis parameters
  useEffect(() => {
    const shouldEnableTimingAnalysis = params.measurePrecision === 'true' || params.analysisOnly === 'true' || !!params.intervalAnalysis
    console.log('🔍 Timing analysis check:', {
      measurePrecision: params.measurePrecision,
      analysisOnly: params.analysisOnly,
      intervalAnalysis: params.intervalAnalysis,
      shouldEnable: shouldEnableTimingAnalysis
    })
    setEnableTimingAnalysis(shouldEnableTimingAnalysis)

    // Reset timing data when enabling timing analysis
    if (shouldEnableTimingAnalysis) {
      analysisTimingStats.current = null
      streamTimingStats.current = null
      analysisIntervals.current = []
      streamIntervals.current = []
      extractionTimes.current = []
      lastAnalysisTimestamp.current = null
      lastStreamTimestamp.current = null
      setDisplayStats({ analysis: null, stream: null })
      setTimingSummary(null)
    } else {
      // Clean up when timing analysis is disabled
      console.log('🔍 Timing analysis disabled - cleaning up')
      setDisplayStats({ analysis: null, stream: null })
      setTimingSummary(null)
    }
  }, [params.measurePrecision, params.analysisOnly, params.intervalAnalysis])


  // Create recording configuration from URL params
  const createRecordingConfig = useCallback((params: ParsedParams): RecordingConfig => {
    const shouldEnableTimingAnalysis = enableTimingAnalysis

    // Check if we have a base64-encoded config parameter
    if (params.config && typeof params.config === 'string') {
      try {
        // Decode base64 and parse JSON
        const decodedConfig = JSON.parse(atob(params.config))
        console.log('📦 Using base64-encoded config:', decodedConfig)

        // Add callbacks
        const recordingConfig: RecordingConfig = {
          ...decodedConfig,
          onAudioStream: shouldEnableTimingAnalysis ? handleAudioStream : async (event: AudioDataEvent) => {
            const message = `AudioStream: position=${event.position}, size=${event.eventDataSize}, total=${event.totalSize}`
            addEvent(`${new Date().toISOString()}: ${message}`)
          },
          onAudioAnalysis: shouldEnableTimingAnalysis ? handleAudioAnalysis : undefined,
          onRecordingInterrupted: (event) => {
            console.log('🔄 Recording interrupted:', event)
            addEvent(`Recording interrupted: ${event.reason}, isPaused: ${event.isPaused}`)
          },
        }
        return recordingConfig
      } catch (error) {
        console.error('Failed to parse base64 config:', error)
        // Don't call setError here as it causes re-renders
        // Return a minimal valid config to avoid type errors
        return {
          sampleRate: 44100,
          channels: 1,
          encoding: 'pcm_16bit',
          interval: 100,
        } as RecordingConfig
      }
    }

    // Fallback to legacy parameter parsing for backward compatibility
    const recordingConfig: RecordingConfig = {
      sampleRate: params.sampleRate ? parseInt(params.sampleRate as string) as SampleRate : 44100,
      channels: params.channels ? parseInt(params.channels as string) as 1 | 2 : 1,
      encoding: (params.encoding as EncodingType) || 'pcm_16bit',
      interval: params.interval ? parseInt(params.interval as string) : 100,
      intervalAnalysis: params.intervalAnalysis ? parseInt(params.intervalAnalysis as string) : undefined,
      enableProcessing: params.enableProcessing === 'true' || shouldEnableTimingAnalysis,
      keepAwake: params.keepAwake !== 'false',
      showNotification: params.showNotification === 'true',
      // Support both flat audioFocusStrategy and android.audioFocusStrategy in URL
      android: params['android.audioFocusStrategy'] ? {
        audioFocusStrategy: params['android.audioFocusStrategy'] as 'background' | 'interactive' | 'communication' | 'none'
      } : undefined,
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
      onAudioStream: shouldEnableTimingAnalysis ? handleAudioStream : async (event: AudioDataEvent) => {
        const message = `AudioStream: position=${event.position}, size=${event.eventDataSize}, total=${event.totalSize}`
        addEvent(`${new Date().toISOString()}: ${message}`)
      },
      onAudioAnalysis: shouldEnableTimingAnalysis ? handleAudioAnalysis : undefined,
      onRecordingInterrupted: (event) => {
        console.log('🔄 Recording interrupted:', event)
        addEvent(`Recording interrupted: ${event.reason}, isPaused: ${event.isPaused}`)
      },
    }

    return recordingConfig
  }, [addEvent, handleAudioAnalysis, handleAudioStream, enableTimingAnalysis])

  const handleStartRecording = useCallback(async (recordingConfig?: RecordingConfig) => {
    try {
      console.log('🟢 START BUTTON CLICKED - Starting handleStartRecording')
      setError(null)
      setTimingSummary(null) // Reset timing summary for new recording

      // Reset timing data for new recording
      if (enableTimingAnalysis) {
        analysisIntervals.current = []
        streamIntervals.current = []
        extractionTimes.current = []
        lastAnalysisTimestamp.current = null
        lastStreamTimestamp.current = null
      }

      const configToUse = recordingConfig || createRecordingConfig(params)
      if (!configToUse) {
        setError('No configuration available or invalid base64 config')
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
  }, [params, startRecording, createRecordingConfig, addEvent, enableTimingAnalysis])

  const handleStopRecording = useCallback(async () => {
    try {
      console.log('🔴 STOP BUTTON CLICKED - Starting handleStopRecording')
      addEvent('Stopping recording...')
      console.log('🔴 About to call stopRecording()')
      const result = await stopRecording()
      console.log('🔴 stopRecording() completed, result:', result)
      setFinalResult(result)
      addEvent(`Recording stopped: ${JSON.stringify(result, null, 2)}`)

      // Generate timing summary after recording stops
      if (enableTimingAnalysis) {
        const recordingDuration = result.durationMs

        const summaryData: TimingSummary = {
          platform: Platform.OS,
          recordingDuration,
          configuration: {
            intervalAnalysis: parseInt(params.intervalAnalysis as string) || null,
            interval: parseInt(params.interval as string) || null
          },
          analysisEvents: null,
          streamEvents: null
        }

        if (analysisIntervals.current.length > 0) {
          const configuredAnalysisInterval = parseInt(params.intervalAnalysis as string) || 100
          const expectedAnalysisEvents = Math.floor(recordingDuration / configuredAnalysisInterval)
          const actualAnalysisEvents = analysisIntervals.current.length
          const avgAnalysisInterval = analysisIntervals.current.reduce((sum, val) => sum + val, 0) / analysisIntervals.current.length
          const matchesExpectation = Math.abs(avgAnalysisInterval - configuredAnalysisInterval) < 20

          // Calculate extraction time statistics
          let extractionStats = {}
          if (extractionTimes.current.length > 0) {
            const avgExtraction = extractionTimes.current.reduce((sum, val) => sum + val, 0) / extractionTimes.current.length
            const minExtraction = Math.min(...extractionTimes.current)
            const maxExtraction = Math.max(...extractionTimes.current)

            extractionStats = {
              avgExtractionTimeMs: Math.round(avgExtraction * 100) / 100,
              minExtractionTimeMs: Math.round(minExtraction * 100) / 100,
              maxExtractionTimeMs: Math.round(maxExtraction * 100) / 100,
              extractionTimeCount: extractionTimes.current.length
            }
          }

          summaryData.analysisEvents = {
            configuredInterval: configuredAnalysisInterval,
            expectedEvents: expectedAnalysisEvents,
            actualEvents: actualAnalysisEvents,
            averageInterval: Math.round(avgAnalysisInterval * 10) / 10,
            matchesExpectation,
            ...extractionStats
          }
        }

        if (streamIntervals.current.length > 0) {
          const configuredStreamInterval = parseInt(params.interval as string) || 100
          const expectedStreamEvents = Math.floor(recordingDuration / configuredStreamInterval)
          const actualStreamEvents = streamIntervals.current.length
          const avgStreamInterval = streamIntervals.current.reduce((sum, val) => sum + val, 0) / streamIntervals.current.length
          const matchesExpectation = Math.abs(avgStreamInterval - configuredStreamInterval) < 20

          summaryData.streamEvents = {
            configuredInterval: configuredStreamInterval,
            expectedEvents: expectedStreamEvents,
            actualEvents: actualStreamEvents,
            averageInterval: Math.round(avgStreamInterval * 10) / 10,
            matchesExpectation
          }
        }

        // Set JSON summary for E2E test parsing
        const jsonSummary = JSON.stringify(summaryData, null, 2)
        setTimingSummary(jsonSummary)
        console.log('\n🎯 TIMING VALIDATION JSON:')
        console.log(jsonSummary)
        console.log('🎯 END TIMING JSON\n')

        // Additional extraction time summary
        if (extractionTimes.current.length > 0) {
          const avgExtraction = extractionTimes.current.reduce((sum, val) => sum + val, 0) / extractionTimes.current.length
          const minExtraction = Math.min(...extractionTimes.current)
          const maxExtraction = Math.max(...extractionTimes.current)
          console.log('\n⚡ EXTRACTION TIME SUMMARY:')
          console.log(`   Count: ${extractionTimes.current.length} measurements`)
          console.log(`   Average: ${avgExtraction.toFixed(2)}ms`)
          console.log(`   Range: ${minExtraction.toFixed(2)}ms - ${maxExtraction.toFixed(2)}ms`)
          console.log(`   Recent values: ${extractionTimes.current.slice(-10).map(t => t.toFixed(1)).join(', ')}ms`)
          console.log('⚡ END EXTRACTION SUMMARY\n')
        }
      }

      console.log('🔴 handleStopRecording completed successfully')
    } catch (err) {
      console.error('🔴 STOP RECORDING ERROR:', err)
      const errorMessage = `Stop recording failed: ${err}`
      setError(errorMessage)
      addEvent(errorMessage)
    }
  }, [stopRecording, addEvent, enableTimingAnalysis, params.intervalAnalysis, params.interval])

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
      testID="agent-validation-wrapper"
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
            isRecording: {isRecording ? '🔴 true' : '⭕ false'}
            {'\n'}isPaused: {isPaused ? '⏸️ true' : '▶️ false'}
            {'\n'}durationMs: {durationMs}
            {'\n'}size: {size}
            {compression && `\ncompression: ${JSON.stringify(compression, null, 2)}`}
          </Text>
        </Card.Content>
      </Card>

      {/* Audio Analysis Timing Statistics */}
      {enableTimingAnalysis && (
        <Card style={[styles.resultCard, { backgroundColor: displayStats.analysis?.platformLimitation ? theme.colors.errorContainer : theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              📊 Audio Analysis Events (intervalAnalysis)
            </Text>

            {displayStats.analysis ? (
              <View>
                <Text testID="analysis-timing-stats" style={[styles.resultText, { color: theme.colors.onSurface }]}>
                  Configured Interval: {displayStats.analysis.configuredInterval}ms
                  {'\n'}Actual Average: {displayStats.analysis.actualAverageInterval?.toFixed(1) || 'N/A'}ms
                  {'\n'}Min/Max: {displayStats.analysis.actualMinInterval || 'N/A'}ms / {displayStats.analysis.actualMaxInterval || 'N/A'}ms
                  {'\n'}Variance: {displayStats.analysis.variance?.toFixed(1) || 'N/A'}ms²
                  {'\n'}Event Count: {displayStats.analysis.eventCount || 0}
                  {'\n'}Total Duration: {displayStats.analysis.totalDuration?.toFixed(0) || 'N/A'}ms
                </Text>

                {displayStats.analysis.platformLimitation && (
                  <Text testID="analysis-platform-limitation" style={[styles.resultText, { color: theme.colors.onErrorContainer, marginTop: 8, fontWeight: 'bold' }]}>
                    ⚠️ {displayStats.analysis.platformLimitation}
                  </Text>
                )}

                <Text style={[styles.eventText, { marginTop: 8, color: theme.colors.onSurfaceVariant }]}>
                  Recent intervals (ms): {analysisIntervals.current.slice(-10).join(', ')}
                </Text>
              </View>
            ) : (
              <Text testID="analysis-timing-waiting" style={[styles.resultText, { color: theme.colors.onSurface }]}>
                Timing analysis enabled. Start recording to measure actual intervals...
                {'\n'}Target: {params.intervalAnalysis || params.interval || '100'}ms
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Audio Stream Timing Statistics */}
      {enableTimingAnalysis && (
        <Card style={[styles.resultCard, { backgroundColor: displayStats.stream?.platformLimitation ? theme.colors.errorContainer : theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              📊 Audio Stream Events (interval)
            </Text>

            {displayStats.stream ? (
              <View>
                <Text testID="stream-timing-stats" style={[styles.resultText, { color: theme.colors.onSurface }]}>
                  Configured Interval: {displayStats.stream.configuredInterval}ms
                  {'\n'}Actual Average: {displayStats.stream.actualAverageInterval?.toFixed(1) || 'N/A'}ms
                  {'\n'}Min/Max: {displayStats.stream.actualMinInterval || 'N/A'}ms / {displayStats.stream.actualMaxInterval || 'N/A'}ms
                  {'\n'}Variance: {displayStats.stream.variance?.toFixed(1) || 'N/A'}ms²
                  {'\n'}Event Count: {displayStats.stream.eventCount || 0}
                  {'\n'}Total Duration: {displayStats.stream.totalDuration?.toFixed(0) || 'N/A'}ms
                </Text>

                {displayStats.stream.platformLimitation && (
                  <Text testID="stream-platform-limitation" style={[styles.resultText, { color: theme.colors.onErrorContainer, marginTop: 8, fontWeight: 'bold' }]}>
                    ⚠️ {displayStats.stream.platformLimitation}
                  </Text>
                )}

                <Text style={[styles.eventText, { marginTop: 8, color: theme.colors.onSurfaceVariant }]}>
                  Recent intervals (ms): {streamIntervals.current.slice(-10).join(', ')}
                </Text>
              </View>
            ) : (
              <Text testID="stream-timing-waiting" style={[styles.resultText, { color: theme.colors.onSurface }]}>
                Stream timing analysis enabled. Start recording to measure actual intervals...
                {'\n'}Target: {params.interval || '100'}ms
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

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

      {/* Timing Summary - HIGH PRIORITY for E2E tests */}
      {timingSummary && (
        <Card style={[styles.resultCard, { backgroundColor: theme.colors.primaryContainer }]} testID="timing-summary-card">
          <Card.Content>
            <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer }}>
              🎯 Timing Validation Summary
            </Text>
            <Text testID="timing-validation-summary" style={[styles.resultText, { color: theme.colors.onPrimaryContainer, fontFamily: 'monospace' }]}>
              {timingSummary}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Final Recording Result - HIGH PRIORITY for tests */}
      {finalResult && (
        <Card style={[styles.resultCard, { backgroundColor: theme.colors.successContainer }]} testID="final-result-card">
          <Card.Content>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              ✅ Final Recording Result
            </Text>
            <View>
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
            {'\n'}• High-frequency timing investigation:
            {'\n'}audioplayground://agent-validation?intervalAnalysis=10&enableProcessing=true&measurePrecision=true
            {'\n'}
            {'\n'}• Analysis-only mode:
            {'\n'}audioplayground://agent-validation?intervalAnalysis=25&analysisOnly=true&measurePrecision=true
            {'\n'}
            {'\n'}• With compression:
            {'\n'}audioplayground://agent-validation?compressedOutput=true&compressedFormat=aac&compressedBitrate=128000
            {'\n'}
            {'\n'}• Background recording:
            {'\n'}audioplayground://agent-validation?keepAwake=true&android.audioFocusStrategy=background
            {'\n'}
            {'\n'}• With base64 config:
            {'\n'}audioplayground://agent-validation?config=eyJrZWVwQXdha2UiOnRydWUsImFuZHJvaWQiOnsiYXVkaW9Gb2N1c1N0cmF0ZWd5IjoiYmFja2dyb3VuZCJ9fQ==
            {'\n'}
            {'\n'}• Production scheme: audioplayground://
            {'\n'}• Development scheme: audioplayground-development://
            {'\n'}
            {'\n'}Parameters: sampleRate, channels, encoding, interval, intervalAnalysis, enableProcessing, measurePrecision, analysisOnly, keepAwake, showNotification, android.audioFocusStrategy, primaryOutput, compressedOutput, compressedFormat, compressedBitrate
            {'\n'}Alternative: Pass entire config as base64 JSON with ?config=base64String
            {'\n'}
            {'\n'}🔬 Timing Analysis Parameters:
            {'\n'}• intervalAnalysis: Target analysis interval (ms)
            {'\n'}• measurePrecision: Enable high-precision timing measurement
            {'\n'}• analysisOnly: Focus on analysis timing without audio stream
            {'\n'}
            {'\n'}Use Detox to press buttons and test recording workflow.
          </Text>
        </Card.Content>
      </Card>
    </ScreenWrapper>
  )
}

export default AgentValidationScreen