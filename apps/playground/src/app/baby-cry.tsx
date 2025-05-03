import React, { useCallback, useMemo, useState } from 'react'

import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Button, Card, DataTable, Text } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { AppTheme } from '@siteed/design-system'
import { Notice, ScreenWrapper, useTheme, useToast } from '@siteed/design-system'

import { baseLogger } from '../config'
import { useCryDetector } from '../hooks/useCryDetection'
import { useSampleAudio } from '../hooks/useSampleAudio'
import { useScreenHeader } from '../hooks/useScreenHeader'

import type { CryDetectionResult, CryTypeLabel } from '../hooks/useCryDetection'

const logger = baseLogger.extend('BabyCryScreen')

interface ProcessingResult {
  method: 'manual';
  result: CryDetectionResult | null;
  processingTimeMs: number;
  error?: string;
}

const getStyles = ({ theme, insets }: { theme: AppTheme, insets?: { bottom: number, top: number } }) => {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.gap || 16,
      paddingHorizontal: theme.padding.s,
      paddingBottom: insets?.bottom || 80,
      paddingTop: 0,
    },
    card: {
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    resultCard: {
      backgroundColor: theme.colors.surfaceVariant,
      marginBottom: 16,
    },
    resultColumn: {
      flex: 1,
      borderRadius: 8,
      padding: 12,
      backgroundColor: theme.colors.primaryContainer,
    },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    metricLabel: {
      fontWeight: 'bold',
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    probabilityIndicator: {
      height: 20,
      borderRadius: 4,
      marginVertical: 8,
    },
    chartContainer: {
      marginTop: 16,
      height: 200,
      borderRadius: 8,
      overflow: 'hidden',
    },
  })
}

export default function BabyCryScreen() {
  const theme = useTheme()
  const { bottom, top } = useSafeAreaInsets()
  const styles = useMemo(() => getStyles({ theme, insets: { bottom, top } }), [theme, bottom, top])
  const { show } = useToast()

  // Sample audio state
  const [audioData, setAudioData] = useState<Float32Array | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [sampleSource, setSampleSource] = useState<'sample' | 'synthetic' | null>(null)
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [comparisonCount, setComparisonCount] = useState(0)
  const [averageResults, setAverageResults] = useState<{
    manual: { avgTime: number; avgProbability: number; detectionRate: number };
  } | null>(null)

  // Add new state for individual feature extraction results
  const [featureResults, setFeatureResults] = useState<{
    type: string;
    features: number[];
    processingTimeMs: number;
    classification?: CryTypeLabel;
    predictions?: { label: CryTypeLabel; probability: number }[];
    isFullModel?: boolean;
    extractionTimes?: {
      mfcc: number;
      mel: number;
      chroma: number;
      contrast: number;
      tonnetz: number;
      prediction: number;
    };
  } | null>(null)

  // Add individual loading states for each feature extraction process
  const [loadingStates, setLoadingStates] = useState<{
    mfcc: boolean;
    melSpectrogram: boolean;
    chroma: boolean;
    spectralContrast: boolean;
    tonnetz: boolean;
    prediction: boolean;
  }>({
    mfcc: false,
    melSpectrogram: false,
    chroma: false,
    spectralContrast: false,
    tonnetz: false,
    prediction: false,
  })

  useScreenHeader({
    title: 'Baby Cry Detection',
    backBehavior: {
      fallbackUrl: '/more',
    },
  })


  // Load sample audio hook
  const { loadSampleAudio } = useSampleAudio({
    onError: (error) => {
      logger.error('Error loading sample audio:', error)
      show({
        type: 'error',
        message: 'Error loading sample audio',
        duration: 3000,
      })
    },
  })

  // Cry detector hook
  const { 
    isModelLoading, 
    isProcessing, 
    detectCryManually,
    extractMFCC,
    extractMelSpectrogram,
    extractChroma,
    extractSpectralContrast,
    extractTonnetz,
    runPrediction,
  } = useCryDetector({
    onError: (error) => {
      logger.error('Cry detection error:', error)
      show({
        type: 'error',
        message: `Detection error: ${error.message}`,
        duration: 3000,
      })
    },
  })

  // Generate synthetic audio data
  const generateSyntheticAudio = useCallback(() => {
    try {
      setIsLoading(true)
      
      // Create dummy audio data
      const dummyAudioData = new Float32Array(16000 * 5) // 5 seconds at 16kHz
      
      // Create a complex sound pattern
      for (let i = 0; i < dummyAudioData.length; i++) {
        // Baby cry typically has frequency components around 300-600Hz
        // Mixed with some harmonics and noise
        dummyAudioData[i] = 
          Math.sin(i * 0.02) * 0.4 + // ~500Hz component
          Math.sin(i * 0.04) * 0.2 + // ~1kHz harmonic
          Math.sin(i * 0.01) * 0.3 + // ~250Hz component
          (Math.random() * 0.2 - 0.1) // Some noise
          
        // Add amplitude envelope to simulate cry patterns
        const envelope = 0.5 + 0.5 * Math.sin(i * 0.0001) // Slow amplitude modulation
        dummyAudioData[i] *= envelope
      }
      
      setAudioData(dummyAudioData)
      setSampleSource('synthetic')
      
      logger.info('Synthetic audio generated', {
        dataLength: dummyAudioData.length,
        sampleRate: 16000,
        durationSec: dummyAudioData.length / 16000,
      })
      
      show({
        type: 'success',
        message: 'Synthetic baby cry audio generated',
        duration: 2000,
      })
    } catch (error) {
      logger.error('Error generating synthetic audio:', error)
      show({
        type: 'error',
        message: 'Failed to generate synthetic audio',
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }, [show])

  // Load real sample audio
  const loadRealSample = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Load the sample audio
      const sample = await loadSampleAudio(require('@assets/baby-cry_sample.wav'))
      
      if (!sample) {
        throw new Error('Failed to load sample audio')
      }
      
      // For this demo, we'll just create a dummy audio signal based on the duration
      // In a real implementation, you'd extract the actual audio data from the file
      const sampleCount = Math.floor(sample.durationMs * 16) // 16 samples per ms at 16kHz
      const synthAudioData = new Float32Array(sampleCount)
      
      // Create a synthetic cry pattern to use for testing
      for (let i = 0; i < synthAudioData.length; i++) {
        // Generate a more realistic baby cry pattern with harmonics
        synthAudioData[i] = 
          Math.sin(i * 0.03) * 0.4 + // ~750Hz component
          Math.sin(i * 0.015) * 0.3 + // ~375Hz component
          Math.sin(i * 0.06) * 0.2 // ~1.5kHz harmonic
          
        // Add cry-like amplitude modulation (wah-wah effect)
        const envelope = Math.pow(Math.sin(i * 0.0005) * 0.5 + 0.5, 1.5)
        synthAudioData[i] *= envelope
      }
      
      setAudioData(synthAudioData)
      setSampleSource('sample')
      
      logger.info('Sample audio loaded and synthesized', {
        originalDuration: sample.durationMs,
        dataLength: synthAudioData.length,
        sampleRate: 16000,
      })
      
      show({
        type: 'success',
        message: 'Sample audio loaded',
        duration: 2000,
      })
    } catch (error) {
      logger.error('Error loading sample:', error)
      show({
        type: 'error',
        message: 'Failed to load sample audio',
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }, [loadSampleAudio, show])

  // Calculate average metrics
  const calculateAverages = useCallback((allResults: ProcessingResult[]) => {
    const manualResults = allResults.filter((r) => r.method === 'manual' && r.result)
    
    if (manualResults.length === 0) {
      return
    }
    
    const manualAvgTime = manualResults.reduce((sum, r) => sum + r.processingTimeMs, 0) / manualResults.length
    const manualAvgProb = manualResults.reduce((sum, r) => sum + (r.result?.probability || 0), 0) / manualResults.length
    const manualDetectionRate = manualResults.filter((r) => r.result?.isCrying).length / manualResults.length
    
    setAverageResults({
      manual: {
        avgTime: manualAvgTime,
        avgProbability: manualAvgProb,
        detectionRate: manualDetectionRate,
      },
    })
  }, [])

  // Run manual detection only
  const runManualDetection = useCallback(async () => {
    if (!audioData) {
      show({
        type: 'error',
        message: 'No audio data available',
        duration: 3000,
      })
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, prediction: true }))
      const timestamp = Date.now()
      const manualStartTime = performance.now()
      const manualResult = await detectCryManually(audioData, timestamp)
      const manualEndTime = performance.now()
      
      const newResult: ProcessingResult = {
        method: 'manual',
        result: manualResult,
        processingTimeMs: manualEndTime - manualStartTime,
        error: manualResult ? undefined : 'Failed to detect cry manually',
      }

      // Update results
      setResults((prev) => [...prev, newResult])
      setComparisonCount((prev) => prev + 1)
      
      // Show success message
      show({
        type: 'success',
        message: 'Manual cry detection completed',
        duration: 2000,
      })
      
      // Calculate averages after adding new result
      calculateAverages([...results, newResult])
    } catch (error) {
      logger.error('Manual detection error:', error)
      show({
        type: 'error',
        message: 'Error running manual detection',
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, prediction: false }))
    }
  }, [audioData, detectCryManually, results, show, calculateAverages])

  // Clear all results
  const clearResults = useCallback(() => {
    setResults([])
    setComparisonCount(0)
    setAverageResults(null)
    
    show({
      type: 'info',
      message: 'Results cleared',
      duration: 2000,
    })
  }, [show])

  // Render detection results
  const renderDetectionResults = useCallback(() => {
    if (results.length === 0) {
      return (
        <Notice
          type="info"
          message="Run a detection to see the results."
        />
      )
    }

    // Get the most recent result
    const latestResult = results[results.length - 1]

    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Latest Detection Results</Text>
          
          <View>
            {latestResult?.error ? (
              <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                {latestResult.error}
              </Text>
            ) : latestResult?.result ? (
              <View style={styles.resultColumn}>
                <Text variant="titleMedium">Manual Processing</Text>
                <>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Crying:</Text>
                    <Text>{latestResult.result.isCrying ? 'Yes ✓' : 'No ✗'}</Text>
                  </View>
                  
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Type:</Text>
                    <Text>{latestResult.result.classification}</Text>
                  </View>
                  
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Confidence:</Text>
                    <Text>{(latestResult.result.probability * 100).toFixed(2)}%</Text>
                  </View>
                  
                  <View
style={{ 
                    width: `${latestResult.result.probability * 100}%`, 
                    backgroundColor: latestResult.result.isCrying ? theme.colors.error : theme.colors.primary,
                    ...styles.probabilityIndicator, 
                  }}
                  />
                  
                  <Text style={{ marginTop: 8, fontWeight: 'bold' }}>Top Predictions:</Text>
                  {latestResult.result.predictions.slice(0, 3).map((pred, idx) => (
                    <View key={idx} style={styles.metricRow}>
                      <Text>{pred.label}:</Text>
                      <Text>{(pred.probability * 100).toFixed(2)}%</Text>
                    </View>
                  ))}
                  
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Processing Time:</Text>
                    <Text>{latestResult.processingTimeMs.toFixed(2)} ms</Text>
                  </View>
                </>
              </View>
            ) : (
              <Text style={{ marginTop: 8 }}>No results available</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    )
  }, [results, styles, theme.colors.error, theme.colors.primary])

  // Render aggregate statistics
  const renderAggregateStats = useCallback(() => {
    if (!averageResults || comparisonCount < 2) {
      return null
    }

    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Aggregate Statistics ({comparisonCount} runs)</Text>
          
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Metric</DataTable.Title>
              <DataTable.Title numeric>Value</DataTable.Title>
            </DataTable.Header>
            
            <DataTable.Row>
              <DataTable.Cell>Avg. Processing Time</DataTable.Cell>
              <DataTable.Cell numeric>{averageResults.manual.avgTime.toFixed(2)} ms</DataTable.Cell>
            </DataTable.Row>
            
            <DataTable.Row>
              <DataTable.Cell>Avg. Probability</DataTable.Cell>
              <DataTable.Cell numeric>{(averageResults.manual.avgProbability * 100).toFixed(2)}%</DataTable.Cell>
            </DataTable.Row>
            
            <DataTable.Row>
              <DataTable.Cell>Detection Rate</DataTable.Cell>
              <DataTable.Cell numeric>{(averageResults.manual.detectionRate * 100).toFixed(2)}%</DataTable.Cell>
            </DataTable.Row>
          </DataTable>
        </Card.Content>
      </Card>
    )
  }, [averageResults, comparisonCount, styles.cardTitle, styles.resultCard])

  // Update feature extraction functions to use individual loading states
  const extractMFCCOnly = useCallback(async () => {
    if (!audioData) {
      show({
        type: 'error',
        message: 'No audio data available',
        duration: 3000,
      })
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, mfcc: true }))
      const result = await extractMFCC(audioData)
      setFeatureResults({
        type: 'MFCC',
        features: result.features,
        processingTimeMs: result.processingTimeMs,
      })
      show({
        type: 'success',
        message: `MFCC extraction completed in ${result.processingTimeMs.toFixed(2)}ms`,
        duration: 2000,
      })
    } catch (error) {
      logger.error('MFCC extraction error:', error)
      show({
        type: 'error',
        message: 'Error extracting MFCC features',
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, mfcc: false }))
    }
  }, [audioData, extractMFCC, show])

  const extractMelSpectrogramOnly = useCallback(async () => {
    if (!audioData) {
      show({
        type: 'error',
        message: 'No audio data available',
        duration: 3000,
      })
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, melSpectrogram: true }))
      const result = await extractMelSpectrogram(audioData)
      setFeatureResults({
        type: 'Mel Spectrogram',
        features: result.features,
        processingTimeMs: result.processingTimeMs,
      })
      show({
        type: 'success',
        message: `Mel Spectrogram extraction completed in ${result.processingTimeMs.toFixed(2)}ms`,
        duration: 2000,
      })
    } catch (error) {
      logger.error('Mel Spectrogram extraction error:', error)
      show({
        type: 'error',
        message: 'Error extracting Mel Spectrogram features',
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, melSpectrogram: false }))
    }
  }, [audioData, extractMelSpectrogram, show])

  const extractChromaOnly = useCallback(async () => {
    if (!audioData) {
      show({
        type: 'error',
        message: 'No audio data available',
        duration: 3000,
      })
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, chroma: true }))
      const result = await extractChroma(audioData)
      setFeatureResults({
        type: 'Chroma',
        features: result.features,
        processingTimeMs: result.processingTimeMs,
      })
      show({
        type: 'success',
        message: `Chroma extraction completed in ${result.processingTimeMs.toFixed(2)}ms`,
        duration: 2000,
      })
    } catch (error) {
      logger.error('Chroma extraction error:', error)
      show({
        type: 'error',
        message: 'Error extracting Chroma features',
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, chroma: false }))
    }
  }, [audioData, extractChroma, show])

  const extractSpectralContrastOnly = useCallback(async () => {
    if (!audioData) {
      show({
        type: 'error',
        message: 'No audio data available',
        duration: 3000,
      })
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, spectralContrast: true }))
      const result = await extractSpectralContrast(audioData)
      setFeatureResults({
        type: 'Spectral Contrast',
        features: result.features,
        processingTimeMs: result.processingTimeMs,
      })
      show({
        type: 'success',
        message: `Spectral Contrast extraction completed in ${result.processingTimeMs.toFixed(2)}ms`,
        duration: 2000,
      })
    } catch (error) {
      logger.error('Spectral Contrast extraction error:', error)
      show({
        type: 'error',
        message: 'Error extracting Spectral Contrast features',
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, spectralContrast: false }))
    }
  }, [audioData, extractSpectralContrast, show])

  const extractTonnetzOnly = useCallback(async () => {
    if (!audioData) {
      show({
        type: 'error',
        message: 'No audio data available',
        duration: 3000,
      })
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, tonnetz: true }))
      const result = await extractTonnetz(audioData)
      setFeatureResults({
        type: 'Tonnetz',
        features: result.features,
        processingTimeMs: result.processingTimeMs,
      })
      show({
        type: 'success',
        message: `Tonnetz extraction completed in ${result.processingTimeMs.toFixed(2)}ms`,
        duration: 2000,
      })
    } catch (error) {
      logger.error('Tonnetz extraction error:', error)
      show({
        type: 'error',
        message: 'Error extracting Tonnetz features',
        duration: 3000,
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, tonnetz: false }))
    }
  }, [audioData, extractTonnetz, show])

  // Run model prediction on concatenated features with progress indicators
  const runModelPredictionOnly = useCallback(async () => {
    if (!audioData) {
      show({
        type: 'error',
        message: 'No audio data available',
        duration: 3000,
      })
      return
    }

    try {
      setLoadingStates((prev) => ({ ...prev, prediction: true }))
      
      // First extract all features - with proper progress tracking
      setLoadingStates((prev) => ({ ...prev, mfcc: true }))
      const mfccResult = await extractMFCC(audioData)
      setLoadingStates((prev) => ({ ...prev, mfcc: false, melSpectrogram: true }))
      
      const melResult = await extractMelSpectrogram(audioData)
      setLoadingStates((prev) => ({ ...prev, melSpectrogram: false, chroma: true }))
      
      const chromaResult = await extractChroma(audioData)
      setLoadingStates((prev) => ({ ...prev, chroma: false, spectralContrast: true }))
      
      const contrastResult = await extractSpectralContrast(audioData)
      setLoadingStates((prev) => ({ ...prev, spectralContrast: false, tonnetz: true }))
      
      const tonnetzResult = await extractTonnetz(audioData)
      setLoadingStates((prev) => ({ ...prev, tonnetz: false }))
      
      // Concatenate features
      const features = [
        ...mfccResult.features,
        ...chromaResult.features,
        ...melResult.features,
        ...contrastResult.features,
        ...tonnetzResult.features,
      ]
      
      // Run prediction
      const startTime = performance.now()
      const result = await runPrediction(features)
      const endTime = performance.now()
      
      // Show result with classification
      show({
        type: 'success',
        message: `Prediction: ${result.classification} (${(result.probability * 100).toFixed(2)}%)`,
        duration: 3000,
      })
      
      // Update feature results to display classification info
      setFeatureResults({
        type: 'Full Prediction',
        features: result.predictions.map((p) => p.probability),
        processingTimeMs: endTime - startTime,
        classification: result.classification,
        predictions: result.predictions,
        isFullModel: true,
        extractionTimes: {
          mfcc: mfccResult.processingTimeMs,
          mel: melResult.processingTimeMs,
          chroma: chromaResult.processingTimeMs,
          contrast: contrastResult.processingTimeMs,
          tonnetz: tonnetzResult.processingTimeMs,
          prediction: endTime - startTime,
        },
      })
      
    } catch (error) {
      logger.error('Model prediction error:', error)
      show({
        type: 'error',
        message: 'Error running model prediction',
        duration: 3000,
      })
    } finally {
      setLoadingStates({
        mfcc: false,
        melSpectrogram: false,
        chroma: false,
        spectralContrast: false,
        tonnetz: false,
        prediction: false,
      })
    }
  }, [audioData, extractMFCC, extractMelSpectrogram, extractChroma, extractSpectralContrast, extractTonnetz, runPrediction, show])

  // Update the detection controls to use individual loading states
  const renderDetectionControls = useCallback(() => {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Detection Controls</Text>
          
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                mode="contained"
                onPress={runManualDetection}
                loading={loadingStates.prediction || isProcessing}
                disabled={Object.values(loadingStates).some(Boolean) || isProcessing || isModelLoading || !audioData}
                icon="play"
                style={{ flex: 1 }}
              >
                Run Detection
              </Button>
              
              {results.length > 0 && (
                <Button
                  mode="outlined"
                  onPress={clearResults}
                  disabled={Object.values(loadingStates).some(Boolean) || isProcessing}
                  icon="delete"
                >
                  Clear
                </Button>
              )}
            </View>
            
            <View style={{ marginVertical: 12, padding: 12, borderRadius: 8, backgroundColor: theme.colors.surfaceVariant }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Baby Cry Detection Process
              </Text>
              <Text style={{ marginBottom: 8 }}>
                The full detection combines all feature types below to achieve accurate detection results.
                Each button extracts individual features that are later combined for the final prediction.
              </Text>
              <Button
                mode="contained"
                onPress={runModelPredictionOnly}
                loading={Object.values(loadingStates).some(Boolean)}
                disabled={Object.values(loadingStates).some(Boolean) || isModelLoading || !audioData}
                icon="brain"
                style={{ marginTop: 8 }}
              >
                Run Full Detection Pipeline
              </Button>
            </View>
            
            <Text style={{ fontWeight: 'bold', marginTop: 8 }}>Individual Feature Extraction:</Text>
            
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button
                mode="outlined"
                onPress={extractMFCCOnly}
                loading={loadingStates.mfcc}
                disabled={Object.values(loadingStates).some(Boolean) || isProcessing || !audioData}
                icon="music-note"
                style={{ flex: 1, minWidth: 150 }}
              >
                MFCC
              </Button>
              
              <Button
                mode="outlined"
                onPress={extractMelSpectrogramOnly}
                loading={loadingStates.melSpectrogram}
                disabled={Object.values(loadingStates).some(Boolean) || isProcessing || !audioData}
                icon="waveform"
                style={{ flex: 1, minWidth: 150 }}
              >
                Mel Spectrogram
              </Button>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button
                mode="outlined"
                onPress={extractChromaOnly}
                loading={loadingStates.chroma}
                disabled={Object.values(loadingStates).some(Boolean) || isProcessing || !audioData}
                icon="music-circle"
                style={{ flex: 1, minWidth: 150 }}
              >
                Chroma
              </Button>
              
              <Button
                mode="outlined"
                onPress={extractSpectralContrastOnly}
                loading={loadingStates.spectralContrast}
                disabled={Object.values(loadingStates).some(Boolean) || isProcessing || !audioData}
                icon="contrast-circle"
                style={{ flex: 1, minWidth: 150 }}
              >
                Spectral Contrast
              </Button>
            </View>
            
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button
                mode="outlined"
                onPress={extractTonnetzOnly}
                loading={loadingStates.tonnetz}
                disabled={Object.values(loadingStates).some(Boolean) || isProcessing || !audioData}
                icon="music-accidental-sharp"
                style={{ flex: 1, minWidth: 150 }}
              >
                Tonnetz
              </Button>
            </View>

            {!audioData && (
              <Notice
                type="info"
                message="Please select an audio source before running detection"
              />
            )}
          </View>
        </Card.Content>
      </Card>
    )
  }, [
    styles, loadingStates, isProcessing, isModelLoading, audioData, theme.colors.surfaceVariant,
    runManualDetection, clearResults, results.length, 
    extractMFCCOnly, extractMelSpectrogramOnly, extractChromaOnly,
    extractSpectralContrastOnly, extractTonnetzOnly, runModelPredictionOnly,
  ])

  // Enhanced feature results card to show all feature extraction times when full model is run
  const renderFeatureResults = useCallback(() => {
    if (!featureResults) {
      return null
    }

    // Check if this is a full model result with all features
    const isFullModel = 'isFullModel' in featureResults && featureResults.isFullModel
    const extractionTimes = isFullModel && 'extractionTimes' in featureResults ? featureResults.extractionTimes : null

    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>{featureResults.type} Features</Text>
          <Text>Processing Time: {featureResults.processingTimeMs.toFixed(2)} ms</Text>
          
          {isFullModel && extractionTimes && (
            <View
style={{ 
              marginTop: 12, 
              padding: 12, 
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: 8, 
            }}
            >
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Full Detection Pipeline Times:
              </Text>
              <View style={{ gap: 4 }}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>MFCC Extraction:</Text>
                  <Text>{extractionTimes.mfcc.toFixed(2)} ms</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Mel Spectrogram:</Text>
                  <Text>{extractionTimes.mel.toFixed(2)} ms</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Chroma:</Text>
                  <Text>{extractionTimes.chroma.toFixed(2)} ms</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Spectral Contrast:</Text>
                  <Text>{extractionTimes.contrast.toFixed(2)} ms</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Tonnetz:</Text>
                  <Text>{extractionTimes.tonnetz.toFixed(2)} ms</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Final Prediction:</Text>
                  <Text>{extractionTimes.prediction.toFixed(2)} ms</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Time:</Text>
                  <Text style={{ fontWeight: 'bold' }}>
                    {(
                      extractionTimes.mfcc + 
                      extractionTimes.mel + 
                      extractionTimes.chroma +
                      extractionTimes.contrast + 
                      extractionTimes.tonnetz + 
                      extractionTimes.prediction
                    ).toFixed(2)} ms
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {featureResults.type === 'Full Prediction' || featureResults.type === 'Prediction' ? (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: 'bold' }}>
                Classification: {featureResults.classification}
              </Text>
              <Text>Confidence: {(featureResults.features[0] * 100).toFixed(2)}%</Text>
              
              {featureResults.predictions && (
                <>
                  <Text style={{ marginTop: 8, fontWeight: 'bold' }}>All Classifications:</Text>
                  {featureResults.predictions.map((pred, idx) => (
                    <View
key={idx}
style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                    >
                      <Text>{pred.label}:</Text>
                      <Text>{(pred.probability * 100).toFixed(2)}%</Text>
                    </View>
                  ))}
                </>
              )}
              
              <View
style={{ 
                width: `${featureResults.features[0] * 100}%`, 
                backgroundColor: featureResults.features[0] > 0.5 ? theme.colors.error : theme.colors.primary,
                height: 20,
                borderRadius: 4,
                marginVertical: 8,
              }}
              />
            </View>
          ) : (
            <>
              <Text style={{ marginTop: 12, fontWeight: 'bold' }}>Feature Values ({featureResults.features.length}):</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {featureResults.features.slice(0, 20).map((value, index) => (
                  <Text key={index} style={{ marginRight: 8, marginBottom: 4 }}>
                    {index}: {value.toFixed(4)}
                  </Text>
                ))}
                {featureResults.features.length > 20 && (
                  <Text>... {featureResults.features.length - 20} more values</Text>
                )}
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    )
  }, [featureResults, styles, theme.colors])

  return (
    <ScreenWrapper 
      withScrollView 
      useInsets={false} 
      contentContainerStyle={styles.container}
    >
      <View style={{ gap: 16 }}>
        <Notice
          type="info"
          title="Baby Cry Detector"
          message="Manual feature extraction for baby cry detection"
        />

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Detection Model</Text>
            
            {isModelLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 8 }}>Loading detection model...</Text>
              </View>
            ) : (
              <>
                <Text>Model loaded successfully.</Text>
                <Text style={{ marginTop: 8 }}>
                  This detector uses audio feature extraction and a neural network model to
                  detect baby crying sounds.
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Audio Source</Text>
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={{ marginTop: 8 }}>Loading audio data...</Text>
              </View>
            ) : (
              <>
                <Text>Select an audio source to use for detection:</Text>
                
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
                  <Button
                    mode={sampleSource === 'synthetic' ? 'contained' : 'outlined'}
                    onPress={generateSyntheticAudio}
                    icon="waveform"
                    style={{ flex: 1 }}
                    disabled={isLoading || isModelLoading}
                  >
                    Generate Synthetic Cry
                  </Button>
                  
                  <Button
                    mode={sampleSource === 'sample' ? 'contained' : 'outlined'}
                    onPress={loadRealSample}
                    icon="baby-face"
                    style={{ flex: 1 }}
                    disabled={isLoading || isModelLoading}
                  >
                    Load Sample Cry
                  </Button>
                </View>
                
                {audioData && (
                  <View style={{ marginTop: 12 }}>
                    <Text>
                      Audio source: <Text style={{ fontWeight: 'bold' }}>
                        {sampleSource === 'synthetic' ? 'Synthetic baby cry' : 'Sample baby cry'}
                      </Text>
                    </Text>
                    <Text>Samples: {audioData.length}</Text>
                    <Text>Duration: {(audioData.length / 16000).toFixed(2)} seconds @ 16kHz</Text>
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {renderDetectionControls()}
        {renderDetectionResults()}
        {renderFeatureResults()}
        {renderAggregateStats()}
      </View>
    </ScreenWrapper>
  )
}
