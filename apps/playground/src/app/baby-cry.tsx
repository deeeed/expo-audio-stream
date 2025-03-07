import { AppTheme, Notice, ScreenWrapper, useTheme, useToast } from '@siteed/design-system';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Card, DataTable, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { baseLogger } from '../config';
import { CryDetectionResult, useCryDetector } from '../hooks/useCryDetection';
import { useSampleAudio } from '../hooks/useSampleAudio';

const logger = baseLogger.extend('BabyCryScreen');

interface ProcessingResult {
  method: 'manual' | 'pipeline';
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
      paddingTop: Math.max(insets?.top || 0, 10),
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
    compareContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    resultColumn: {
      flex: 1,
      borderRadius: 8,
      padding: 12,
    },
    manualColumn: {
      backgroundColor: theme.colors.primaryContainer,
    },
    pipelineColumn: {
      backgroundColor: theme.colors.secondaryContainer,
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
  });
};

export default function BabyCryScreen() {
  const theme = useTheme();
  const { bottom, top } = useSafeAreaInsets();
  const styles = useMemo(() => getStyles({ theme, insets: { bottom, top } }), [theme, bottom, top]);
  const { show } = useToast();

  // Sample audio state
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sampleSource, setSampleSource] = useState<'sample' | 'synthetic' | null>(null);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [averageResults, setAverageResults] = useState<{
    manual: { avgTime: number; avgProbability: number; detectionRate: number };
    pipeline: { avgTime: number; avgProbability: number; detectionRate: number };
  } | null>(null);

  // Load sample audio hook
  const { loadSampleAudio } = useSampleAudio({
    onError: (error) => {
      logger.error('Error loading sample audio:', error);
      show({
        type: 'error',
        message: 'Error loading sample audio',
        duration: 3000,
      });
    }
  });

  // Cry detector hook
  const { 
    isModelLoading, 
    isProcessing, 
    detectCryManually, 
    detectCryWithPipeline 
  } = useCryDetector({
    onError: (error) => {
      logger.error('Cry detection error:', error);
      show({
        type: 'error',
        message: `Detection error: ${error.message}`,
        duration: 3000,
      });
    }
  });

  // Generate synthetic audio data
  const generateSyntheticAudio = useCallback(() => {
    try {
      setIsLoading(true);
      
      // Create dummy audio data
      const dummyAudioData = new Float32Array(16000 * 5); // 5 seconds at 16kHz
      
      // Create a complex sound pattern
      for (let i = 0; i < dummyAudioData.length; i++) {
        // Baby cry typically has frequency components around 300-600Hz
        // Mixed with some harmonics and noise
        dummyAudioData[i] = 
          Math.sin(i * 0.02) * 0.4 + // ~500Hz component
          Math.sin(i * 0.04) * 0.2 + // ~1kHz harmonic
          Math.sin(i * 0.01) * 0.3 + // ~250Hz component
          (Math.random() * 0.2 - 0.1); // Some noise
          
        // Add amplitude envelope to simulate cry patterns
        const envelope = 0.5 + 0.5 * Math.sin(i * 0.0001); // Slow amplitude modulation
        dummyAudioData[i] *= envelope;
      }
      
      setAudioData(dummyAudioData);
      setSampleSource('synthetic');
      
      logger.info('Synthetic audio generated', {
        dataLength: dummyAudioData.length,
        sampleRate: 16000,
        durationSec: dummyAudioData.length / 16000
      });
      
      show({
        type: 'success',
        message: 'Synthetic baby cry audio generated',
        duration: 2000,
      });
    } catch (error) {
      logger.error('Error generating synthetic audio:', error);
      show({
        type: 'error',
        message: 'Failed to generate synthetic audio',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [show]);

  // Load real sample audio
  const loadRealSample = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load the sample audio
      const sample = await loadSampleAudio(require('@assets/baby-cry_sample.wav'));
      
      if (!sample) {
        throw new Error('Failed to load sample audio');
      }
      
      // For this demo, we'll just create a dummy audio signal based on the duration
      // In a real implementation, you'd extract the actual audio data from the file
      const sampleCount = Math.floor(sample.durationMs * 16); // 16 samples per ms at 16kHz
      const synthAudioData = new Float32Array(sampleCount);
      
      // Create a synthetic cry pattern to use for testing
      for (let i = 0; i < synthAudioData.length; i++) {
        // Generate a more realistic baby cry pattern with harmonics
        synthAudioData[i] = 
          Math.sin(i * 0.03) * 0.4 + // ~750Hz component
          Math.sin(i * 0.015) * 0.3 + // ~375Hz component
          Math.sin(i * 0.06) * 0.2; // ~1.5kHz harmonic
          
        // Add cry-like amplitude modulation (wah-wah effect)
        const envelope = Math.pow(Math.sin(i * 0.0005) * 0.5 + 0.5, 1.5);
        synthAudioData[i] *= envelope;
      }
      
      setAudioData(synthAudioData);
      setSampleSource('sample');
      
      logger.info('Sample audio loaded and synthesized', {
        originalDuration: sample.durationMs,
        dataLength: synthAudioData.length,
        sampleRate: 16000
      });
      
      show({
        type: 'success',
        message: 'Sample audio loaded',
        duration: 2000,
      });
    } catch (error) {
      logger.error('Error loading sample:', error);
      show({
        type: 'error',
        message: 'Failed to load sample audio',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [loadSampleAudio, show]);

  // Process audio with both methods
  const runCryDetection = useCallback(async () => {
    if (!audioData) {
      show({
        type: 'error',
        message: 'No audio data available',
        duration: 3000,
      });
      return;
    }

    setIsComparing(true);
    const newResults: ProcessingResult[] = [];
    const timestamp = Date.now();

    try {
      // Run manual detection
      const manualStartTime = performance.now();
      const manualResult = await detectCryManually(audioData, timestamp);
      const manualEndTime = performance.now();
      
      newResults.push({
        method: 'manual',
        result: manualResult,
        processingTimeMs: manualEndTime - manualStartTime,
        error: manualResult ? undefined : 'Failed to detect cry manually',
      });

      // Run pipeline detection
      const pipelineStartTime = performance.now();
      const pipelineResult = await detectCryWithPipeline(audioData, timestamp);
      const pipelineEndTime = performance.now();
      
      newResults.push({
        method: 'pipeline',
        result: pipelineResult,
        processingTimeMs: pipelineEndTime - pipelineStartTime,
        error: pipelineResult ? undefined : 'Failed to detect cry with pipeline',
      });

      // Update results
      setResults(prev => [...prev, ...newResults]);
      setComparisonCount(prev => prev + 1);
      
      // Show success message
      show({
        type: 'success',
        message: 'Cry detection completed',
        duration: 2000,
      });
      
      // Calculate averages after adding new results
      calculateAverages([...results, ...newResults]);
    } catch (error) {
      logger.error('Comparison error:', error);
      show({
        type: 'error',
        message: 'Error running comparison',
        duration: 3000,
      });
    } finally {
      setIsComparing(false);
    }
  }, [audioData, detectCryManually, detectCryWithPipeline, results, show]);

  // Calculate average metrics
  const calculateAverages = useCallback((allResults: ProcessingResult[]) => {
    const manualResults = allResults.filter(r => r.method === 'manual' && r.result);
    const pipelineResults = allResults.filter(r => r.method === 'pipeline' && r.result);
    
    if (manualResults.length === 0 || pipelineResults.length === 0) {
      return;
    }
    
    const manualAvgTime = manualResults.reduce((sum, r) => sum + r.processingTimeMs, 0) / manualResults.length;
    const pipelineAvgTime = pipelineResults.reduce((sum, r) => sum + r.processingTimeMs, 0) / pipelineResults.length;
    
    const manualAvgProb = manualResults.reduce((sum, r) => sum + (r.result?.probability || 0), 0) / manualResults.length;
    const pipelineAvgProb = pipelineResults.reduce((sum, r) => sum + (r.result?.probability || 0), 0) / pipelineResults.length;
    
    const manualDetectionRate = manualResults.filter(r => r.result?.isCrying).length / manualResults.length;
    const pipelineDetectionRate = pipelineResults.filter(r => r.result?.isCrying).length / pipelineResults.length;
    
    setAverageResults({
      manual: {
        avgTime: manualAvgTime,
        avgProbability: manualAvgProb,
        detectionRate: manualDetectionRate,
      },
      pipeline: {
        avgTime: pipelineAvgTime,
        avgProbability: pipelineAvgProb,
        detectionRate: pipelineDetectionRate,
      }
    });
  }, []);

  // Clear all results
  const clearResults = useCallback(() => {
    setResults([]);
    setComparisonCount(0);
    setAverageResults(null);
    
    show({
      type: 'info',
      message: 'Results cleared',
      duration: 2000,
    });
  }, [show]);

  // Render comparison results
  const renderComparisonResults = useCallback(() => {
    if (results.length === 0) {
      return (
        <Notice
          type="info"
          message="Run a comparison to see the results between manual and pipeline processing methods."
        />
      );
    }

    // Get the most recent results for each method
    const latestResults = {
      manual: results.filter(r => r.method === 'manual').pop(),
      pipeline: results.filter(r => r.method === 'pipeline').pop(),
    };

    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Latest Detection Results</Text>
          
          <View style={styles.compareContainer}>
            {/* Manual column */}
            <View style={[styles.resultColumn, styles.manualColumn]}>
              <Text variant="titleMedium">Manual Processing</Text>
              
              {latestResults.manual?.error ? (
                <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                  {latestResults.manual.error}
                </Text>
              ) : latestResults.manual?.result ? (
                <>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Crying:</Text>
                    <Text>{latestResults.manual.result.isCrying ? 'Yes ✓' : 'No ✗'}</Text>
                  </View>
                  
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Probability:</Text>
                    <Text>{(latestResults.manual.result.probability * 100).toFixed(2)}%</Text>
                  </View>
                  
                  <View style={{ 
                    width: `${latestResults.manual.result.probability * 100}%`, 
                    backgroundColor: latestResults.manual.result.isCrying ? theme.colors.error : theme.colors.primary,
                    ...styles.probabilityIndicator 
                  }} />
                  
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Processing Time:</Text>
                    <Text>{latestResults.manual.processingTimeMs.toFixed(2)} ms</Text>
                  </View>
                </>
              ) : (
                <Text style={{ marginTop: 8 }}>No results available</Text>
              )}
            </View>
            
            {/* Pipeline column */}
            <View style={[styles.resultColumn, styles.pipelineColumn]}>
              <Text variant="titleMedium">Pipeline Processing</Text>
              
              {latestResults.pipeline?.error ? (
                <Text style={{ color: theme.colors.error, marginTop: 8 }}>
                  {latestResults.pipeline.error}
                </Text>
              ) : latestResults.pipeline?.result ? (
                <>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Crying:</Text>
                    <Text>{latestResults.pipeline.result.isCrying ? 'Yes ✓' : 'No ✗'}</Text>
                  </View>
                  
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Probability:</Text>
                    <Text>{(latestResults.pipeline.result.probability * 100).toFixed(2)}%</Text>
                  </View>
                  
                  <View style={{ 
                    width: `${latestResults.pipeline.result.probability * 100}%`, 
                    backgroundColor: latestResults.pipeline.result.isCrying ? theme.colors.error : theme.colors.secondary,
                    ...styles.probabilityIndicator 
                  }} />
                  
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Processing Time:</Text>
                    <Text>{latestResults.pipeline.processingTimeMs.toFixed(2)} ms</Text>
                  </View>
                </>
              ) : (
                <Text style={{ marginTop: 8 }}>No results available</Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  }, [results, styles, theme.colors.error, theme.colors.primary, theme.colors.secondary]);

  // Render aggregate statistics
  const renderAggregateStats = useCallback(() => {
    if (!averageResults || comparisonCount < 2) {
      return null;
    }

    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <Text style={styles.cardTitle}>Aggregate Statistics ({comparisonCount} runs)</Text>
          
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Metric</DataTable.Title>
              <DataTable.Title numeric>Manual</DataTable.Title>
              <DataTable.Title numeric>Pipeline</DataTable.Title>
              <DataTable.Title numeric>Difference</DataTable.Title>
            </DataTable.Header>
            
            <DataTable.Row>
              <DataTable.Cell>Avg. Processing Time</DataTable.Cell>
              <DataTable.Cell numeric>{averageResults.manual.avgTime.toFixed(2)} ms</DataTable.Cell>
              <DataTable.Cell numeric>{averageResults.pipeline.avgTime.toFixed(2)} ms</DataTable.Cell>
              <DataTable.Cell numeric>
                {(averageResults.manual.avgTime - averageResults.pipeline.avgTime).toFixed(2)} ms
              </DataTable.Cell>
            </DataTable.Row>
            
            <DataTable.Row>
              <DataTable.Cell>Avg. Probability</DataTable.Cell>
              <DataTable.Cell numeric>{(averageResults.manual.avgProbability * 100).toFixed(2)}%</DataTable.Cell>
              <DataTable.Cell numeric>{(averageResults.pipeline.avgProbability * 100).toFixed(2)}%</DataTable.Cell>
              <DataTable.Cell numeric>
                {((averageResults.manual.avgProbability - averageResults.pipeline.avgProbability) * 100).toFixed(2)}%
              </DataTable.Cell>
            </DataTable.Row>
            
            <DataTable.Row>
              <DataTable.Cell>Detection Rate</DataTable.Cell>
              <DataTable.Cell numeric>{(averageResults.manual.detectionRate * 100).toFixed(2)}%</DataTable.Cell>
              <DataTable.Cell numeric>{(averageResults.pipeline.detectionRate * 100).toFixed(2)}%</DataTable.Cell>
              <DataTable.Cell numeric>
                {((averageResults.manual.detectionRate - averageResults.pipeline.detectionRate) * 100).toFixed(2)}%
              </DataTable.Cell>
            </DataTable.Row>
          </DataTable>
        </Card.Content>
      </Card>
    );
  }, [averageResults, comparisonCount, styles.cardTitle, styles.resultCard]);

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
          message="Compare manual feature extraction vs. pipeline processing for baby cry detection"
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
                  detect baby crying sounds. Two methods are compared:
                </Text>
                <Text style={{ marginTop: 8, marginLeft: 16 }}>
                  • <Text style={{ fontWeight: 'bold' }}>Manual:</Text> Step-by-step feature extraction
                </Text>
                <Text style={{ marginLeft: 16 }}>
                  • <Text style={{ fontWeight: 'bold' }}>Pipeline:</Text> Optimized feature extraction pipeline
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
                    mode={sampleSource === 'synthetic' ? "contained" : "outlined"}
                    onPress={generateSyntheticAudio}
                    icon="waveform"
                    style={{ flex: 1 }}
                    disabled={isLoading || isModelLoading}
                  >
                    Generate Synthetic Cry
                  </Button>
                  
                  <Button
                    mode={sampleSource === 'sample' ? "contained" : "outlined"}
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

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Detection Controls</Text>
            
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                mode="contained"
                onPress={runCryDetection}
                loading={isComparing || isProcessing}
                disabled={isComparing || isProcessing || isModelLoading || !audioData}
                icon="account-voice"
                style={{ flex: 1 }}
              >
                Run Detection
              </Button>
              
              {results.length > 0 && (
                <Button
                  mode="outlined"
                  onPress={clearResults}
                  disabled={isComparing || isProcessing}
                  icon="delete"
                >
                  Clear
                </Button>
              )}
            </View>
            
            {!audioData && (
              <Notice
                type="info"
                message="Please select an audio source before running detection"
              />
            )}
          </Card.Content>
        </Card>

        {renderComparisonResults()}
        {renderAggregateStats()}
      </View>
    </ScreenWrapper>
  );
}
