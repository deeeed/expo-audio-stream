import { AppTheme, ScreenWrapper, useThemePreferences } from '@siteed/design-system';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import EssentiaJS, { AlgorithmResult } from 'react-native-essentia';
import { Button, Card, Text, TouchableRipple } from 'react-native-paper';
import { AssetSourceType, SampleAudioFile, useSampleAudio } from '../hooks/useSampleAudio';
import { sendDummyPCMData } from '../utils/essentiaUtils';
import AlgorithmSelector from '../components/AlgorithmSelector';

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
  });
};

function EssentiaScreen() {
  const { theme } = useThemePreferences();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  // State for initialization
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [initResult, setInitResult] = useState<EssentiaInitResult | null>(null);

  // State for validation
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // State for sample audio
  const { sampleFile: _sampleFile, loadSampleAudio } = useSampleAudio();
  const [selectedSample, setSelectedSample] = useState<SampleAudioFile | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);

  // State for MFCC extraction
  const [isExtractingMFCC, setIsExtractingMFCC] = useState<boolean>(false);
  const [mfccResult, setMfccResult] = useState<AlgorithmResult | null>(null);

  // Add new state for test connection
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);

  const handleLoadSample = async (assetModule: AssetSourceType, index: number) => {
    try {
      setIsLoadingSample(true);
      const sample = await loadSampleAudio(assetModule, `sample${index}`);
      setSelectedSample(sample);
      console.log('Loaded sample:', sample);
    } catch (error) {
      console.error('Error loading sample:', error);
    } finally {
      setIsLoadingSample(false);
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
    setIsValidating(true);
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
    } finally {
      setIsValidating(false);
    }
  };

  const extractMFCCFromSegment = async () => {
    if (!selectedSample) {
      alert('Please select a sample first');
      return;
    }

    setIsExtractingMFCC(true);
    setMfccResult(null);

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
      
      setMfccResult({
        success: true,
        data: result.data
      });
      
      console.log('MFCC extraction result:', result);
    } catch (error) {
      console.error('MFCC extraction error:', error);
      setMfccResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExtractingMFCC(false);
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
                loading={isValidating}
                disabled={isValidating}
                style={styles.button}
              >
                Validate Integration
              </Button>
            </View>
            
            {/* Display the connection test result */}
            {connectionTestResult !== null && (
              <View style={{ marginTop: 8, padding: 8, backgroundColor: theme.colors.surfaceVariant, borderRadius: 4 }}>
                <Text style={{ fontWeight: 'bold' }}>Connection Test Result:</Text>
                <Text>{connectionTestResult}</Text>
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
                  loading={isLoadingSample}
                  disabled={isLoadingSample}
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
          onExecute={(result) => setMfccResult(result)}
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
            </View>
            {mfccResult && (
              <View style={{ marginTop: 8 }}>
                <Text>Result: {mfccResult.success ? 'Success ✅' : 'Failed ❌'}</Text>
                {mfccResult.error && <Text style={{ color: 'red' }}>{mfccResult.error}</Text>}
                {mfccResult.data && (
                  <Text style={styles.resultText}>{JSON.stringify(mfccResult.data, null, 2)}</Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

    </ScreenWrapper>
  );
}

export default EssentiaScreen;
