import { AppTheme, ScreenWrapper, useThemePreferences } from '@siteed/design-system';
import { trimAudio } from '@siteed/expo-audio-studio';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Essentia, { essentiaAPI, EssentiaCategory } from 'react-native-essentia';
import { Button, Text, TouchableRipple } from 'react-native-paper';
import { AssetSourceType, SampleAudioFile, useSampleAudio } from '../hooks/useSampleAudio';

interface EssentiaInitResult {
  success: boolean;
  error?: string;
}

interface EssentiaVersionResult {
  success: boolean;
  version?: string;
  error?: string;
}

interface ValidationResult {
  success: boolean;
  initialized?: boolean;
  version?: string;
  message?: string;
  algorithmResults?: Record<string, AlgorithmResult>;
  error?: string;
}

interface AlgorithmResult {
  success: boolean;
  data?: Record<string, number | string | number[]>;
  error?: string;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      padding: 20,
      paddingTop: 40,
      gap: 20,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    sectionContainer: {
      marginTop: 16,
      gap: 8,
    },
    pickerContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    sampleRateButton: {
      marginVertical: 4,
    },
    selectedRateText: {
      color: theme.colors.onPrimary,
    },
    rateText: {
      color: theme.colors.onSurface,
    },
    resultContainer: {
      padding: 16,
      backgroundColor: theme.colors.elevation.level2,
      borderRadius: 8,
      marginVertical: 10,
    },
    successContainer: {
      backgroundColor: theme.colors.tertiaryContainer,
    },
    errorContainer: {
      backgroundColor: theme.colors.errorContainer,
    },
    algorithmResultsContainer: {
      marginTop: 10,
      padding: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
    },
    preTitle: {
      marginBottom: 6,
    },
    jsonResults: {
      fontFamily: 'monospace',
      fontSize: 12,
      marginTop: 10,
    },
    sampleSection: {
      marginTop: 16,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 8,
    },
    button: {
      padding: 8,
    },
    sampleListContainer: {
      marginTop: 8,
    },
    sampleItem: {
      padding: 8,
    },
    selectedSample: {
      backgroundColor: theme.colors.primaryContainer,
    },
    noSamples: {
      fontStyle: 'italic',
      textAlign: 'center',
      padding: 20,
      color: theme.colors.onSurfaceDisabled,
    },
    scrollContainer: {
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    description: {
      marginBottom: 10,
    },
    resultBox: {
      padding: 10,
      backgroundColor: theme.colors.elevation.level2,
      borderRadius: 8,
      marginVertical: 10,
    },
    successText: {
      color: theme.colors.tertiaryContainer,
    },
    errorText: {
      color: theme.colors.errorContainer,
    },
    errorDescription: {
      color: theme.colors.error,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
    },
    loadingText: {
      marginLeft: 10,
    },
    messageText: {
      color: theme.colors.onSurface,
    },
    versionText: {
      color: theme.colors.onPrimary,
    },
    algorithmsContainer: {
      marginTop: 10,
    },
    algorithmsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
    },
  });
};

// Sample audio assets 
// Use a more compatible type
const SAMPLE_ASSETS = [
  require('@assets/jfk.mp3'),
];

function EssentiaScreen() {
  const { theme } = useThemePreferences();
  const styles = useMemo(() => getStyles({ theme }), [theme]);
  
  const [initResult, setInitResult] = useState<EssentiaInitResult | null>(null);
  const [versionResult, setVersionResult] = useState<EssentiaVersionResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleAudioFile | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [sampleFiles, setSampleFiles] = useState<SampleAudioFile[]>([]);
  const [sampleRate, setSampleRate] = useState<number>(16000);
  
  // Get sample audio files
  const { loadSampleAudio } = useSampleAudio({
    onError: (error) => {
      console.error('Error loading sample audio:', error);
    }
  });

  // Available sample rates
  const sampleRates = [8000, 16000, 22050, 44100, 48000];

  // Function to load a specific sample on demand
  const handleLoadSample = async (assetModule: AssetSourceType, index: number) => {
    try {
      // Add debug logging to see the asset module details
      console.log(`Loading asset module:`, assetModule);
      
      const sample = await loadSampleAudio(assetModule, `sample${index}.mp3`);
      if (sample) {
        console.log(`Successfully loaded sample to: ${sample.uri}`);
        setSampleFiles(prev => [...prev.filter(f => f.name !== sample.name), sample]);
        setSelectedSample(sample);
      }
    } catch (error) {
      console.error(`Error loading sample ${index}:`, error);
    }
  };
  const handleInitialize = async () => {
    try {
      const success = await Essentia.initialize();
      setInitResult({ success });
    } catch (error) {
      console.error('Essentia initialization error:', error);
      setInitResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleGetVersion = async () => {
    try {
      const version = await Essentia.getVersion();
      setVersionResult({ success: true, version });
    } catch (error) {
      console.error('Essentia get version error:', error);
      setVersionResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSelectSample = (sample: SampleAudioFile) => {
    setSelectedSample(sample);
  };

  const validateEssentiaIntegration = async () => {
    try {
      setValidationResult({ success: false, message: 'Validation in progress...' });
      setIsValidating(true);

      // Step 1: Initialize Essentia
      const initialized = await essentiaAPI.initialize();
      if (!initialized) {
        setValidationResult({
          success: false,
          message: 'Failed to initialize Essentia library',
        });
        return;
      }

      // Step 2: Get the version
      const version = await essentiaAPI.getVersion();

      // Step 3: If we have a sample loaded, try to extract MFCC features
      const algorithmResults: Record<string, AlgorithmResult> = {};
      
      if (selectedSample) {
        try {
          console.log(`Testing MFCC extraction on sample: ${selectedSample.uri}`);
          
          // Try to load the audio
          const audioLoaded = await essentiaAPI.loadAudio(selectedSample.uri, 44100);
          
          if (audioLoaded) {
            console.log('Audio loaded successfully, processing...');
            
            // Process audio (using default frame/hop size)
            const processed = await essentiaAPI.processAudio(2048, 1024);
            
            if (processed) {
              console.log('Audio processed successfully, extracting MFCC...');
              
              // Try to compute MFCC
              const mfccResult = await essentiaAPI.executeAlgorithm(
                EssentiaCategory.SPECTRAL, 
                'MFCC', 
                { numberCoefficients: 13, numberBands: 40 }
              );
              
              algorithmResults['mfcc'] = {
                success: !!mfccResult && !mfccResult.error,
                data: mfccResult,
                error: mfccResult?.error
              };
              
              // Clean up
              await essentiaAPI.unloadAudio();
            } else {
              algorithmResults['processAudio'] = {
                success: false,
                error: 'Failed to process audio frames'
              };
            }
          } else {
            algorithmResults['loadAudio'] = {
              success: false,
              error: 'Failed to load audio file'
            };
          }
        } catch (error) {
          console.error('Algorithm execution error:', error);
          algorithmResults['algorithm'] = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
      
      // Final validation result
      setValidationResult({
        success: true,
        initialized,
        version,
        message: 'Essentia integration validation complete',
        algorithmResults: Object.keys(algorithmResults).length > 0 ? algorithmResults : undefined
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

  /**
   * Example function to extract MFCC from a specific segment of audio
   * First trims the audio to the segment, then analyzes it with Essentia
   */
  const extractMFCCFromSegment = async () => {
    if (!selectedSample) {
      alert('Please select a sample first');
      return;
    }

    setIsValidating(true);
    try {
      // First trim the audio to get a specific segment (e.g., first 5 seconds)
      const startTimeMs = 0;
      const endTimeMs = 5000; // 5 seconds
      
      console.log(`Trimming audio ${selectedSample.name} from ${startTimeMs}ms to ${endTimeMs}ms`);
      
      // Use the trimAudio function to create a segment
      const trimResult = await trimAudio({
        fileUri: selectedSample.uri,
        mode: 'single',
        startTimeMs,
        endTimeMs
      });
      
      console.log('Trim successful, trimmed file:', trimResult.uri);
      
      // Use the new convenience method for feature extraction
      const mfccResult = await essentiaAPI.extractMFCCFromFile({
        audioPath: trimResult.uri,
        sampleRate: 44100,
        numCoeffs: 13,
        numBands: 40,
        cleanup: true // automatically handle cleanup
      });
      
      if (mfccResult.success) {
        console.log('MFCC extraction successful:', mfccResult.features);
        
        // Display results
        setValidationResult({
          success: true,
          message: 'MFCC extraction from trimmed segment successful',
          algorithmResults: {
            mfcc: {
              success: true,
              data: mfccResult.features
            }
          }
        });
      } else {
        throw new Error(mfccResult.error || 'Unknown error extracting MFCC features');
      }
    } catch (error) {
      console.error('Error extracting MFCC from segment:', error);
      setValidationResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsValidating(false);
    }
  };

  const renderAlgorithmResults = (results: Record<string, AlgorithmResult>) => {
    return Object.entries(results).map(([algorithm, result]) => (
      <View key={algorithm} style={styles.algorithmResultsContainer}>
        <Text variant="titleSmall">{algorithm.toUpperCase()} Algorithm:</Text>
        {!result.success ? (
          <Text style={{ color: theme.colors.error }}>Error: {result.error}</Text>
        ) : (
          <Text>Result: {JSON.stringify(result.data)}</Text>
        )}
      </View>
    ));
  };

  const renderSampleAudioFiles = () => {
    return (
      <View style={styles.sampleSection}>
        <Text variant="titleMedium">Sample Audio Files:</Text>
        
        {/* Load Sample Buttons */}
        <View style={styles.buttonRow}>
          {SAMPLE_ASSETS.map((asset, index) => (
            <Button 
              key={`load-sample-${index}`}
              mode="outlined"
              onPress={() => handleLoadSample(asset, index + 1)}
              style={styles.button}>
              Load Sample {index + 1}
            </Button>
          ))}
        </View>
        
        {/* List of loaded samples */}
        {sampleFiles.length > 0 ? (
          <View style={styles.sampleListContainer}>
            {sampleFiles.map((file, index) => (
              <TouchableRipple
                key={index}
                onPress={() => handleSelectSample(file)}
                style={[
                  styles.sampleItem,
                  selectedSample?.uri === file.uri && styles.selectedSample
                ]}>
                <View>
                  <Text>{file.name}</Text>
                  <Text variant="bodySmall">
                    {(file.durationMs / 1000).toFixed(1)}s • {(file.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
              </TouchableRipple>
            ))}
          </View>
        ) : (
          <Text style={styles.noSamples}>No samples loaded. Click a button above to load.</Text>
        )}
      </View>
    );
  };

  return (
    <ScreenWrapper 
      withScrollView 
      useInsets 
      contentContainerStyle={styles.container}
      // Add extra bottom padding to ensure content is fully scrollable on Android
      style={{ paddingBottom: 40 }}
    >
      <Text variant="headlineMedium">Essentia Integration</Text>
      
      <View style={styles.buttonContainer}>
        <Button mode="contained" onPress={handleInitialize}>
          Initialize Essentia
        </Button>
        <Button mode="contained" onPress={handleGetVersion}>
          Get Essentia Version
        </Button>
      </View>

      {/* Sample Rate Selection */}
      <View style={styles.sectionContainer}>
        <Text variant="titleMedium">Sample Rate:</Text>
        <View style={styles.pickerContainer}>
          {sampleRates.map((rate) => (
            <Button 
              key={rate}
              mode={sampleRate === rate ? "contained" : "outlined"}
              onPress={() => setSampleRate(rate)}
              style={styles.sampleRateButton}
              labelStyle={sampleRate === rate ? styles.selectedRateText : styles.rateText}
            >
              {`${rate} Hz`}
            </Button>
          ))}
        </View>
      </View>

      {renderSampleAudioFiles()}

      <Button 
        mode="contained" 
        onPress={validateEssentiaIntegration}
        style={{ backgroundColor: theme.colors.tertiary, marginTop: 20 }}
        loading={isValidating}
        disabled={isValidating || (!selectedSample && sampleFiles.length > 0)}
      >
        Validate Essentia Integration
      </Button>

      <Button
        mode="contained"
        onPress={extractMFCCFromSegment}
        style={{ backgroundColor: theme.colors.secondary, marginTop: 10 }}
        loading={isValidating}
        disabled={isValidating || !selectedSample}
      >
        Extract MFCC from 5s Segment
      </Button>

      {selectedSample && (
        <View style={styles.resultContainer}>
          <Text variant="titleMedium">Selected Sample:</Text>
          <Text>{selectedSample.name}</Text>
          <Text>Duration: {(selectedSample.durationMs / 1000).toFixed(2)} seconds</Text>
        </View>
      )}
      
      {initResult && (
        <View style={[
          styles.resultContainer,
          initResult.success ? styles.successContainer : styles.errorContainer
        ]}>
          <Text variant="titleMedium">Initialization Result:</Text>
          <Text>Success: {initResult.success ? 'Yes' : 'No'}</Text>
          {initResult.error && (
            <Text style={{ color: theme.colors.error }}>
              Error: {initResult.error}
            </Text>
          )}
        </View>
      )}

      {versionResult && (
        <View style={[
          styles.resultContainer,
          versionResult.success ? styles.successContainer : styles.errorContainer
        ]}>
          <Text variant="titleMedium">Version Result:</Text>
          <Text>Success: {versionResult.success ? 'Yes' : 'No'}</Text>
          {versionResult.version && (
            <Text>Essentia Version: {versionResult.version}</Text>
          )}
          {versionResult.error && (
            <Text style={{ color: theme.colors.error }}>
              Error: {versionResult.error}
            </Text>
          )}
        </View>
      )}
      
      {validationResult && (
        <View style={[
          styles.resultContainer,
          validationResult.success ? styles.successContainer : styles.errorContainer
        ]}>
          <Text variant="titleMedium">Integration Validation:</Text>
          <Text>Success: {validationResult.success ? 'Yes' : 'No'}</Text>
          {validationResult.initialized !== undefined && (
            <Text>Essentia Initialized: {validationResult.initialized ? 'Yes' : 'No'}</Text>
          )}
          {validationResult.version && (
            <Text>Essentia Version: {validationResult.version}</Text>
          )}
          {validationResult.message && (
            <Text>Message: {validationResult.message}</Text>
          )}
          {validationResult.error && (
            <Text style={{ color: theme.colors.error }}>
              Error: {validationResult.error}
            </Text>
          )}
          
          {validationResult.algorithmResults && Object.keys(validationResult.algorithmResults).length > 0 && (
            <View>
              <Text variant="titleMedium" style={{ marginTop: 10 }}>Algorithm Results:</Text>
              {renderAlgorithmResults(validationResult.algorithmResults)}
            </View>
          )}
        </View>
      )}
    </ScreenWrapper>
  );
}

export default EssentiaScreen;
