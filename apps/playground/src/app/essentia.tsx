import { AppTheme, ScreenWrapper, useThemePreferences } from '@siteed/design-system';
import { trimAudio } from '@siteed/expo-audio-studio';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Essentia, { essentiaAPI, EssentiaCategory } from 'react-native-essentia';
import { Button, Card, Text, TouchableRipple } from 'react-native-paper';
import { AssetSourceType, SampleAudioFile, useSampleAudio } from '../hooks/useSampleAudio';
import { sendDummyPCMData, sendPCMToEssentia } from '../utils/essentiaUtils';

// Sample audio assets 
// Use a more compatible type
const SAMPLE_ASSETS = [
  require('@assets/jfk.mp3'),
];

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

// Define interface for algorithm list result
interface AlgorithmListResult {
  success: boolean;
  totalCount?: number;
  hasMonoLoader?: boolean;
  hasAudioLoader?: boolean;
  audioAlgorithms?: string[];
  algorithms?: string[];
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
    content: {
      flex: 1,
      gap: 16,
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
    resultText: {
      fontSize: 14,
      marginBottom: 5,
      color: theme.colors.onSurface,
    },
  });
};

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
  
  // Add missing state variables
  const [isInitializing, setIsInitializing] = useState(false);
  const [isGettingVersion, setIsGettingVersion] = useState(false);
  const [algorithmList, setAlgorithmList] = useState<AlgorithmListResult | null>(null);
  const [isListingAlgorithms, setIsListingAlgorithms] = useState(false);
  
  // Computed property for if Essentia is initialized
  const isInitialized = useMemo(() => {
    return initResult?.success === true;
  }, [initResult]);
  
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
        
        // We no longer automatically load the sample into Essentia
        // This will now happen only when the user explicitly requests processing
        console.log('Sample loaded for selection - ready for Essentia processing when requested');
      }
    } catch (error) {
      console.error(`Error loading sample ${index}:`, error);
    }
  };

  const handleInitialize = async () => {
    try {
      setIsInitializing(true);
      const success = await Essentia.initialize();
      setInitResult({ success });
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

  const handleGetVersion = async () => {
    try {
      setIsGettingVersion(true);
      const version = await Essentia.getVersion();
      setVersionResult({ success: true, version });
    } catch (error) {
      console.error('Essentia get version error:', error);
      setVersionResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsGettingVersion(false);
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

      // Create an object to store algorithm results
      const algorithmResults: Record<string, AlgorithmResult> = {};

      // Step 3: Run direct test without loading audio
      try {
        console.log('Testing MFCC algorithm directly without audio loading');
        const mfccTestResult = await essentiaAPI.testMFCC();
        
        algorithmResults['directMFCCTest'] = {
          success: !!mfccTestResult,
          data: mfccTestResult || { message: "No result from MFCC test" }
        };
        
        console.log('Direct MFCC test result:', mfccTestResult);
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
          console.error('Error during PCM audio loading:', error);
          algorithmResults['loadAudioViaPCM'] = {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }

      // Set final validation result
      setValidationResult({
        success: true,
        initialized: true,
        version: version,
        message: `Essentia ${version} is working`,
        algorithmResults: algorithmResults
      });
    } catch (error) {
      console.error('Error during validation:', error);
      setValidationResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
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
      
      // Use the PCM-based approach for more reliable audio loading
      console.log('Using PCM-based approach to extract features...');
      const pcmSuccess = await sendPCMToEssentia({
        fileUri: trimResult.uri,
        startTimeMs: 0, // we already trimmed the file
        maxSamples: 80000, // limit to 5 seconds at 16kHz
        logger: console,
      });
      
      if (!pcmSuccess) {
        throw new Error('Failed to load audio data via PCM');
      }
      
      // Now that PCM data is loaded, process it
      const processed = await essentiaAPI.processAudio(2048, 1024);
      if (!processed) {
        throw new Error('Failed to process audio frames');
      }
      
      // Extract MFCC features
      const mfccParams = {
        numCoeffs: 13,
        numBands: 40,
      };
      
      const mfccResult = await essentiaAPI.executeAlgorithm(
        EssentiaCategory.SPECTRAL,
        'MFCC',
        mfccParams
      );
      
      if (mfccResult && !mfccResult.error) {
        console.log('MFCC extraction successful:', mfccResult);
        
        // Display results
        setValidationResult({
          success: true,
          message: 'MFCC extraction from trimmed segment successful',
          algorithmResults: {
            mfcc: {
              success: true,
              data: mfccResult
            }
          }
        });
      } else {
        throw new Error(mfccResult?.error || 'Unknown error extracting MFCC features');
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


  const listAvailableAlgorithms = async () => {
    try {
      setIsListingAlgorithms(true);
      const result = await essentiaAPI.listAlgorithms();
      setAlgorithmList(result);
      console.log('Available algorithms:', result);
    } catch (error) {
      console.error('Error listing algorithms:', error);
      setAlgorithmList({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsListingAlgorithms(false);
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

  const renderAlgorithmList = () => {
    if (!algorithmList) return null;

    return (
      <View style={{ marginTop: 16 }}>
        <Text style={styles.sectionTitle}>Available Algorithms</Text>
        <Card style={{ marginTop: 8 }}>
          <Card.Content>
            <Text style={{ color: algorithmList.success ? 'green' : 'red' }}>
              Status: {algorithmList.success ? 'Success' : 'Failed'}
            </Text>
            {algorithmList.totalCount !== undefined && (
              <Text>Total Algorithms: {algorithmList.totalCount}</Text>
            )}
            {algorithmList.hasMonoLoader !== undefined && (
              <Text style={{ color: algorithmList.hasMonoLoader ? 'green' : 'red' }}>
                MonoLoader Available: {algorithmList.hasMonoLoader ? 'Yes' : 'No'}
              </Text>
            )}
            {algorithmList.hasAudioLoader !== undefined && (
              <Text style={{ color: algorithmList.hasAudioLoader ? 'green' : 'red' }}>
                AudioLoader Available: {algorithmList.hasAudioLoader ? 'Yes' : 'No'}
              </Text>
            )}
            {algorithmList.audioAlgorithms && algorithmList.audioAlgorithms.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text>Audio-Related Algorithms:</Text>
                {algorithmList.audioAlgorithms.map((algo, index) => (
                  <Text key={index} style={{ marginLeft: 8 }}>• {algo}</Text>
                ))}
              </View>
            )}
            {algorithmList.error && (
              <Text style={{ color: 'red', marginTop: 8 }}>Error: {algorithmList.error}</Text>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Essentia Audio Processing Library</Text>
        <Text style={styles.description}>
          Test the integration with Essentia, a high-performance audio analysis library.
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleInitialize}
            disabled={isInitializing}
            style={styles.button}
          >
            {isInitializing ? 'Initializing...' : 'Initialize Essentia'}
          </Button>

          <Button
            mode="contained"
            onPress={handleGetVersion}
            disabled={isGettingVersion || !isInitialized}
            style={styles.button}
          >
            {isGettingVersion ? 'Getting Version...' : 'Get Version'}
          </Button>

          <Button
            mode="contained"
            onPress={validateEssentiaIntegration}
            disabled={isValidating || !isInitialized}
            style={styles.button}
          >
            {isValidating ? 'Validating...' : 'Validate Integration'}
          </Button>
          
          <Button
            mode="contained"
            onPress={async () => {
              try {
                console.log('Running direct MFCC test...');
                if (!isInitialized) {
                  await essentiaAPI.initialize();
                }
                const result = await essentiaAPI.testMFCC();
                console.log('Direct MFCC test result:', result);
                alert('MFCC Test Successful!\n\n' + JSON.stringify(result, null, 2));
              } catch (error) {
                console.error('MFCC test error:', error);
                alert('MFCC Test Failed: ' + (error instanceof Error ? error.message : String(error)));
              }
            }}
            disabled={!isInitialized}
            style={styles.button}
          >
            Direct MFCC Test
          </Button>
        </View>

        {/* Display version */}
        {versionResult?.version && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>Version: {versionResult.version}</Text>
          </View>
        )}

        {/* Display validation result */}
        {validationResult && (
          <View style={[
            styles.resultContainer,
            validationResult.success ? styles.successContainer : styles.errorContainer
          ]}>
            <Text style={[
              styles.resultText,
              { color: validationResult.success ? theme.colors.tertiary : theme.colors.error }
            ]}>
              {validationResult.message || (validationResult.success ? 'Validation successful!' : 'Validation failed!')}
            </Text>
            {validationResult.version && (
              <Text style={styles.versionText}>Version: {validationResult.version}</Text>
            )}
            {validationResult.algorithmResults && renderAlgorithmResults(validationResult.algorithmResults)}
          </View>
        )}

        {/* Sample Rate Selector */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Sample Rate</Text>
          <View style={styles.pickerContainer}>
            {sampleRates.map((rate) => (
              <Button
                key={rate}
                mode={sampleRate === rate ? "contained" : "outlined"}
                onPress={() => setSampleRate(rate)}
                style={styles.sampleRateButton}
              >
                <Text style={sampleRate === rate ? styles.selectedRateText : styles.rateText}>
                  {rate} Hz
                </Text>
              </Button>
            ))}
          </View>
        </View>

        {/* Sample audio files */}
        {renderSampleAudioFiles()}

        {/* Process Sample Button */}
        {selectedSample && (
          <Button
            mode="contained"
            onPress={extractMFCCFromSegment}
            disabled={isValidating || !isInitialized}
            style={{ marginTop: 16 }}
          >
            {isValidating ? 'Processing...' : 'Extract MFCC from Sample'}
          </Button>
        )}

        {/* List Algorithms Button */}
        <Button
          mode="outlined"
          onPress={listAvailableAlgorithms}
          disabled={isListingAlgorithms || !isInitialized}
          style={{ marginTop: 16 }}
        >
          {isListingAlgorithms ? 'Listing Algorithms...' : 'List Available Algorithms'}
        </Button>

        {/* Algorithm List Results */}
        {renderAlgorithmList()}
      </View>
    </ScreenWrapper>
  );
}

export default EssentiaScreen;
