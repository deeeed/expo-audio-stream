import { AppTheme, ScreenWrapper, useThemePreferences } from '@siteed/design-system';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, ToastAndroid, View } from 'react-native';
import EssentiaJS, { AlgorithmResult, BatchProcessingResults } from 'react-native-essentia';
import { Button, Card, Text, TouchableRipple } from 'react-native-paper';
import { AlgorithmExplorer } from '../components/AlgorithmExplorer';
import AlgorithmSelector from '../components/AlgorithmSelector';
import { AssetSourceType, SampleAudioFile, useSampleAudio } from '../hooks/useSampleAudio';
import { sendDummyPCMData } from '../utils/essentiaUtils';

// Sample audio assets 
// Use a more compatible type
const SAMPLE_ASSETS = [
  require('@assets/jfk.mp3'),
];

interface EssentiaInitResult {
  success: boolean;
  error?: string;
}

interface ValidationResult {
  success: boolean;
  initialized?: boolean;
  message?: string;
  algorithmResults?: Record<string, AlgorithmResult>;
  error?: string;
  isValidating?: boolean;
  isLoadingSample?: boolean;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      paddingBottom: 30,
    },
    card: {
      marginBottom: 16,
      padding: 8,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    cardContent: {
      marginBottom: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    button: {
      marginBottom: 8,
      minWidth: '48%',
    },
    resultText: {
      fontFamily: 'monospace',
      fontSize: 12,
      marginTop: 8,
    },
    sampleItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    selectedSample: {
      backgroundColor: theme.colors.primaryContainer,
    },
    sampleName: {
      fontSize: 16,
    },
    chipContainer: {
      flexDirection: 'row',
      marginVertical: 8,
      maxHeight: 48,
    },
    chip: {
      marginRight: 8,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 12,
      marginBottom: 4,
    },
    item: {
      fontSize: 14,
      marginLeft: 8,
      marginBottom: 2,
    },
    testResult: {
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
    },
  });
};

function EssentiaScreen() {
  const { theme } = useThemePreferences();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  const { loadSampleAudio } = useSampleAudio();

  const [selectedSample, setSelectedSample] = useState<SampleAudioFile | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [initResult, setInitResult] = useState<EssentiaInitResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isExtractingMFCC, setIsExtractingMFCC] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);
  const [isExtractingBatch, setIsExtractingBatch] = useState<boolean>(false);
  const [batchResults, setBatchResults] = useState<BatchProcessingResults | null>(null);
  const [isGettingVersion, setIsGettingVersion] = useState<boolean>(false);
  const [versionInfo, setVersionInfo] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProcessingResults, setBatchProcessingResults] = useState<BatchProcessingResults | null>(null);

  // Toast utility function
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Message', message);
    }
  };

  const handleLoadSample = async (assetModule: AssetSourceType, index: number) => {
    try {
      const sample = await loadSampleAudio(assetModule, `sample${index}`);
      setSelectedSample(sample);
      console.log('Loaded sample:', sample);
    } catch (error) {
      console.error('Error loading sample:', error);
    }
  };

  const handleInitialize = async () => {
    try {
      setIsInitializing(true);
      const success = await EssentiaJS.initialize();
      setInitResult({ success });
      setIsInitialized(success);
    } catch (error) {
      console.error('Essentia initialization error:', error);
      setInitResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSelectSample = (sample: SampleAudioFile) => {
    setSelectedSample(sample);
  };

  const validateEssentiaIntegration = async () => {
    setValidationResult(null);

    try {
      // Step 1: Initialize Essentia
      const initialized = await EssentiaJS.initialize();
      if (!initialized) {
        setValidationResult({
          success: false,
          initialized: false,
          error: 'Failed to initialize Essentia',
        });
        return;
      }

      setIsInitialized(true);

      // Create an object to store algorithm results
      const algorithmResults: Record<string, AlgorithmResult> = {};

      // Step 3: Test direct MFCC algorithm
      try {
        console.log('Testing MFCC algorithm directly with dummy data');
        
        // Create dummy PCM data
        const dummyPcmData = new Float32Array(4096);
        for (let i = 0; i < dummyPcmData.length; i++) {
          dummyPcmData[i] = Math.sin(i * 0.01);
        }
        
        // Set the audio data
        await EssentiaJS.setAudioData(dummyPcmData, 44100);
        
        // Execute MFCC algorithm
        const mfccResult = await EssentiaJS.executeAlgorithm('MFCC', {
          numberCoefficients: 13,
          numberBands: 40,
          lowFrequencyBound: 0,
          highFrequencyBound: 22050
        });
        
        algorithmResults['directMFCCTest'] = {
          success: true,
          data: mfccResult.data || { message: "No result from MFCC test" }
        };
        
        console.log('Direct MFCC test result:', mfccResult);
      } catch (error) {
        console.error('Error in direct MFCC test:', error);
        algorithmResults['directMFCCTest'] = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }

      // Step 4: If we have a sample loaded, try PCM approach only
      // This is a safer approach that avoids the missing audio I/O algorithms
      if (selectedSample) {
        try {
          console.log(`Testing MFCC extraction on sample: ${selectedSample.uri}`);
          
          // Try our dummy PCM data approach
          console.log('Trying dummy PCM-based audio loading approach...');
          const audioLoaded = await sendDummyPCMData(console);
          
          if (audioLoaded) {
            console.log('Dummy PCM-based audio loading succeeded!');
            algorithmResults['loadAudioViaPCM'] = {
              success: true,
              data: { message: "Successfully loaded audio via dummy PCM data" }
            };
          } else {
            console.log('PCM-based audio loading failed, skipping extraction');
            algorithmResults['loadAudioViaPCM'] = {
              success: false,
              error: "Failed to load PCM data"
            };
          }
        } catch (error) {
          console.error('Error in PCM-based audio loading:', error);
          algorithmResults['loadAudioViaPCM'] = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      // Final validation result
      setValidationResult({
        success: Object.values(algorithmResults).some(result => result.success),
        initialized: true,
        algorithmResults,
        message: 'Validation completed with some successful tests',
      });
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const extractMFCCFromSegment = async () => {
    if (!selectedSample) {
      alert('Please select a sample first');
      return;
    }

    setIsExtractingMFCC(true);

    try {
      // Initialize if not already
      if (!isInitialized) {
        await EssentiaJS.initialize();
        setIsInitialized(true);
      }

      // Create dummy PCM data
      const dummyPcmData = new Float32Array(4096);
      for (let i = 0; i < dummyPcmData.length; i++) {
        dummyPcmData[i] = Math.sin(i * 0.01);
      }
      
      // Set the audio data
      await EssentiaJS.setAudioData(dummyPcmData, 44100);
      
      // Execute MFCC algorithm
      const result = await EssentiaJS.executeAlgorithm('MFCC', {
        numberCoefficients: 13,
        numberBands: 40,
        lowFrequencyBound: 0,
        highFrequencyBound: 22050
      });
      
      setValidationResult(prevResults => ({
        ...prevResults,
        success: true,
        algorithmResults: {
          ...prevResults?.algorithmResults,
          MFCC: { name: 'MFCC', data: result.data, success: true }
        }
      }));
      showToast(`Successfully extracted MFCC`);
    } catch (error) {
      console.error('MFCC extraction error:', error);
      setValidationResult(prevResults => ({
        ...prevResults,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    } finally {
      setIsExtractingMFCC(false);
    }
  };

  const handleBatchFeatureExtraction = async () => {
    if (!isInitialized) {
      showToast('Please initialize Essentia first');
      return;
    }

    setIsExtractingBatch(true);
    setBatchResults(null);

    try {
      // Create dummy PCM data
      const dummyPcmData = new Float32Array(4096);
      for (let i = 0; i < dummyPcmData.length; i++) {
        dummyPcmData[i] = Math.sin(i * 0.01) + Math.sin(i * 0.05);  // Add some harmonic content
      }
      
      // Set the audio data
      await EssentiaJS.setAudioData(dummyPcmData, 44100);
      
      // Extract multiple features in a single call
      const result = await EssentiaJS.extractFeatures([
        { 
          name: 'MFCC', 
          params: { 
            numberCoefficients: 13, 
            numberBands: 40,
            lowFrequencyBound: 0,
            highFrequencyBound: 22050
          } 
        },
        {
          name: 'Spectrum',
          params: {}
        },
        {
          name: 'Key',
          params: {}
        },
        {
          name: 'MelBands',
          params: {
            numberBands: 128
          }
        }
      ]);
      
      console.log('Batch feature extraction result:', result);
      // Type cast to ensure we get the right type
      setBatchResults(result.data as BatchProcessingResults);
      
      setValidationResult(prevResults => ({
        ...prevResults,
        success: true,
        algorithmResults: {
          ...prevResults?.algorithmResults,
          batchExtraction: { 
            name: 'BatchExtraction', 
            data: result.data, 
            success: true 
          }
        }
      }));
      
      showToast('Successfully extracted multiple features in batch');
    } catch (error) {
      console.error('Batch feature extraction error:', error);
      setValidationResult(prevResults => ({
        ...prevResults,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }));
      showToast('Failed to extract batch features');
    } finally {
      setIsExtractingBatch(false);
    }
  };

  const handleBatchProcessing = async () => {
    if (!isInitialized) {
      showToast('Please initialize Essentia first');
      return;
    }
    
    setIsBatchProcessing(true);
    setBatchProcessingResults(null);
    
    console.log('Starting batch processing with progress tracking...');
    
    try {
      // Create dummy PCM data
      const dummyPcmData = new Float32Array(4096);
      for (let i = 0; i < dummyPcmData.length; i++) {
        dummyPcmData[i] = Math.sin(i * 0.01) + Math.sin(i * 0.05);  // Add some harmonic content
      }
      
      // Set the audio data
      await EssentiaJS.setAudioData(dummyPcmData, 44100);
      
      // Execute multiple algorithms in batch
      console.log('Executing batch algorithms...');
      const result = await EssentiaJS.executeBatch([
        { 
          name: 'MFCC', 
          params: { 
            numberCoefficients: 13, 
            numberBands: 40,
            lowFrequencyBound: 0,
            highFrequencyBound: 22050
          } 
        },
        {
          name: 'Spectrum',
          params: {}
        },
        {
          name: 'Key',
          params: {}
        },
        {
          name: 'MelBands',
          params: {
            numberBands: 128
          }
        }
      ]);
      
      console.log('Batch processing completed successfully');
      console.log('Batch processing result:', result);
      setBatchProcessingResults(result.data);
      
      showToast('Batch processing completed successfully');
    } catch (error) {
      console.error('Batch processing error:', error);
      showToast('Batch processing failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const renderAlgorithmResults = (results: Record<string, AlgorithmResult>) => {
    return Object.entries(results).map(([key, result]) => (
      <View key={key} style={{ marginBottom: 8 }}>
        <Text style={{ fontWeight: 'bold' }}>{key}: {result.success ? '✅' : '❌'}</Text>
        {result.error && <Text style={{ color: 'red' }}>{result.error}</Text>}
        {result.data && <Text style={styles.resultText}>{JSON.stringify(result.data, null, 2)}</Text>}
      </View>
    ));
  };

  const renderSampleAudioFiles = () => {
    if (!selectedSample) {
      return <Text>No sample audio files available</Text>;
    }

    return (
      <TouchableRipple
        onPress={() => handleSelectSample(selectedSample)}
        style={[
          styles.sampleItem,
          styles.selectedSample,
        ]}
      >
        <View>
          <Text style={styles.sampleName}>{selectedSample.name}</Text>
          <Text>{`Duration: ${selectedSample.durationMs ? (selectedSample.durationMs / 1000).toFixed(2) : 'Unknown'} seconds`}</Text>
        </View>
      </TouchableRipple>
    );
  };

  // Add a new handler for testing the connection
  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      setConnectionTestResult(null);
      
      // Call the test connection method
      const result = await EssentiaJS.testConnection();
      console.log('Connection test result:', result);
      setConnectionTestResult(result);
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionTestResult(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  const renderBatchResults = () => {
    if (!batchProcessingResults) return null;
    
    return (
      <View>
        <Text style={styles.subtitle}>Batch Processing Results:</Text>
        {Object.entries(batchProcessingResults).map(([key, value]) => (
          <View key={key} style={{ marginBottom: 12 }}>
            <Text style={[styles.item, { fontWeight: 'bold' }]}>
              {key}:
            </Text>
            <Text style={styles.resultText}>
              {Array.isArray(value) 
                ? JSON.stringify(value, null, 2).substring(0, 300) + '...' 
                : String(value)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const handleGetVersion = async () => {
    try {
      setIsGettingVersion(true);
      setVersionInfo(null);
      
      // Call the getVersion method
      const version = await EssentiaJS.getVersion();
      console.log('Essentia version:', version);
      setVersionInfo(version);
      showToast(`Essentia version: ${version}`);
    } catch (error) {
      console.error('Error getting Essentia version:', error);
      setVersionInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGettingVersion(false);
    }
  };

  
  return (
    <ScreenWrapper contentContainerStyle={styles.container} withScrollView>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Essentia Initialization</Text>
            <Text style={styles.cardContent}>
              Status: {isInitialized ? 'Initialized ✅' : 'Not Initialized ❌'}
            </Text>
            {initResult && (
              <View>
                <Text>Result: {initResult.success ? 'Success ✅' : 'Failed ❌'}</Text>
                {initResult.error && <Text style={{ color: 'red' }}>{initResult.error}</Text>}
              </View>
            )}
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleTestConnection}
                loading={isTestingConnection}
                disabled={isTestingConnection}
                style={styles.button}
              >
                Test JNI Connection
              </Button>
              <Button
                mode="contained"
                onPress={handleInitialize}
                loading={isInitializing}
                disabled={isInitializing}
                style={styles.button}
              >
                Initialize Essentia
              </Button>
              <Button
                mode="contained"
                onPress={validateEssentiaIntegration}
                loading={validationResult?.isValidating}
                disabled={validationResult?.isValidating}
                style={styles.button}
              >
                Validate Integration
              </Button>
              <Button
                mode="outlined"
                onPress={handleGetVersion}
                loading={isGettingVersion}
                disabled={isGettingVersion}
                style={styles.button}
              >
                Get Version
              </Button>
            </View>
            
            {/* Display the connection test result */}
            {connectionTestResult !== null && (
              <View style={styles.testResult}>
                <Text style={{ fontWeight: 'bold' }}>Connection Test Result:</Text>
                <Text>{connectionTestResult}</Text>
              </View>
            )}
            
            {/* Add this to display version information */}
            {versionInfo !== null && (
              <View style={styles.testResult}>
                <Text style={{ fontWeight: 'bold' }}>Essentia Version:</Text>
                <Text>{versionInfo}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {validationResult && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Validation Results</Text>
              <Text style={styles.cardContent}>
                Status: {validationResult.success ? 'Success ✅' : 'Failed ❌'}
              </Text>
              {validationResult.message && <Text>{validationResult.message}</Text>}
              {validationResult.error && <Text style={{ color: 'red' }}>{validationResult.error}</Text>}
              {validationResult.algorithmResults && renderAlgorithmResults(validationResult.algorithmResults)}
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Sample Audio Files</Text>
            <View style={styles.buttonContainer}>
              {SAMPLE_ASSETS.map((asset, index) => (
                <Button
                  key={index}
                  mode="outlined"
                  onPress={() => handleLoadSample(asset, index)}
                  loading={validationResult?.isLoadingSample}
                  disabled={validationResult?.isLoadingSample}
                  style={styles.button}
                >
                  Load Sample {index + 1}
                </Button>
              ))}
            </View>
            {renderSampleAudioFiles()}
          </Card.Content>
        </Card>

        <AlgorithmSelector 
          onExecute={(result) => setValidationResult(prevResults => ({
            ...prevResults,
            success: true,
            algorithmResults: {
              ...prevResults?.algorithmResults,
              MFCC: { name: 'MFCC', data: result.data, success: true }
            }
          }))}
          isInitialized={isInitialized}
        />
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Feature Extraction</Text>
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={extractMFCCFromSegment}
                loading={isExtractingMFCC}
                disabled={isExtractingMFCC || !isInitialized}
                style={styles.button}
              >
                Extract MFCC
              </Button>
              
              <Button
                mode="contained"
                onPress={handleBatchFeatureExtraction}
                loading={isExtractingBatch}
                disabled={isExtractingBatch || !isInitialized}
                style={styles.button}
              >
                Batch Extract Features
              </Button>
            </View>
            
            {batchResults && (
              <View style={styles.testResult}>
                <Text style={{ fontWeight: 'bold' }}>Batch Extraction Completed</Text>
                <Text>
                  Successfully extracted {Object.keys(batchResults).length} features in one call.
                </Text>
                {renderBatchResults()}
              </View>
            )}
          </Card.Content>
        </Card>

        {isInitialized && (
          <AlgorithmExplorer
            isInitialized={isInitialized}
            showToast={showToast}
            onExecute={(algorithmName: string, result: unknown) => {
              // Update the validation results with the algorithm execution result
              setValidationResult(prevResult => {
                const currentResults = prevResult?.algorithmResults || {};
                return {
                  success: true,
                  algorithmResults: {
                    ...currentResults,
                    [algorithmName]: {
                      name: algorithmName,
                      data: (result as { data?: Record<string, string | number | number[]> }).data || {},
                      success: true
                    }
                  }
                };
              });
            }}
          />
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Version Information</Text>
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleGetVersion}
                loading={isGettingVersion}
                disabled={isGettingVersion}
                style={styles.button}
              >
                Get Essentia Version
              </Button>
            </View>
            {versionInfo && (
              <View style={{ marginTop: 8, padding: 8, backgroundColor: theme.colors.surfaceVariant, borderRadius: 4 }}>
                <Text style={{ fontWeight: 'bold' }}>Essentia Version:</Text>
                <Text>{versionInfo}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Optimized Processing</Text>
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleBatchProcessing}
                loading={isBatchProcessing}
                disabled={isBatchProcessing || !isInitialized}
                style={styles.button}
              >
                Run Batch Processing
              </Button>
            </View>
            
            {batchProcessingResults && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 'bold' }}>Batch Processing Completed</Text>
                <Text>Successfully processed multiple algorithms with shared computations.</Text>
                {renderBatchResults()}
              </View>
            )}
          </Card.Content>
        </Card>
        <View style={{ height: 100 }} />

    </ScreenWrapper>
  );
}

export default EssentiaScreen;
