import { AppTheme, ScreenWrapper, useThemePreferences } from '@siteed/design-system';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Essentia, { AlgorithmParams, essentiaAPI, EssentiaCategory } from 'react-native-essentia';
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
  const handleLoadSample = async (assetModule:  AssetSourceType, index: number) => {
    try {
      const sample = await loadSampleAudio(assetModule, `sample${index}.mp3`);
      if (sample) {
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
    setIsValidating(true);
    try {
      const algorithmResults: Record<string, AlgorithmResult> = {};
      
      // Step 1: Test initialization
      let initialized = false;
      try {
        initialized = await essentiaAPI.initialize();
        console.log('Essentia initialized successfully');
      } catch (error) {
        throw new Error(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 2: Test version retrieval
      let version = '';
      try {
        version = await essentiaAPI.getVersion();
        console.log(`Essentia version: ${version}`);
      } catch (error) {
        throw new Error(`Version retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 3: Test audio loading and processing if a sample was selected
      if (selectedSample && selectedSample.isLoaded) {
        try {
          console.log(`Loading audio file: ${selectedSample.name}`);
          // Use the user-selected sample rate for processing
          console.log(`Using sample rate: ${sampleRate} Hz`);
          
          // Debug file path info
          console.log('File path:', selectedSample.uri, 'Has file:// prefix:', selectedSample.uri.startsWith('file://'));
          
          const loaded = await essentiaAPI.loadAudio(selectedSample.uri, sampleRate);
          if (!loaded) {
            throw new Error('Failed to load audio file');
          }

          console.log('Audio file loaded successfully');
          
          // Process audio with default parameters
          const processed = await essentiaAPI.processAudio();
          if (!processed) {
            throw new Error('Failed to process audio');
          }
          
          console.log('Audio processed successfully');
          
          // Step 4: Test algorithm execution - MFCC
          try {
            const mfccParams: AlgorithmParams = {
              numberBands: 40,
              numberCoefficients: 13
            };
            
            console.log('Computing MFCCs...');
            const mfccResult = await essentiaAPI.executeAlgorithm(
              EssentiaCategory.SPECTRAL, 
              'MFCC', 
              mfccParams
            );
            
            algorithmResults.mfcc = {
              success: true,
              data: mfccResult
            };
            console.log('MFCC computation successful');
          } catch (error) {
            console.warn('MFCC computation failed:', error);
            algorithmResults.mfcc = {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            };
          }
          
          // Step 5: Test tonal analysis if available
          try {
            console.log('Analyzing key...');
            const keyResult = await essentiaAPI.executeAlgorithm(
              EssentiaCategory.TONAL,
              'Key',
              { sampleRate: sampleRate }
            );
            
            algorithmResults.key = {
              success: true,
              data: keyResult
            };
            console.log('Key analysis successful');
          } catch (error) {
            console.warn('Key analysis failed:', error);
            algorithmResults.key = {
              success: false,
              error: error instanceof Error ? error.message : String(error)
            };
          }
          
          // Unload audio when done
          await essentiaAPI.unloadAudio();
          console.log('Audio unloaded');
        } catch (error) {
          console.error('Audio processing error:', error);
          throw new Error(`Audio processing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        console.log('No audio sample selected, skipping audio processing tests');
      }

      setValidationResult({
        success: true,
        initialized,
        version,
        algorithmResults,
        message: selectedSample 
          ? 'Essentia integration is working correctly with audio processing'
          : 'Basic Essentia integration is working correctly (no audio file tested)'
      });
    } catch (error) {
      console.error('Essentia validation error:', error);
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
    <ScreenWrapper withScrollView useInsets contentContainerStyle={styles.container}>
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
