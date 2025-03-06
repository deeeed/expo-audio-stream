import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text, SegmentedButtons, TextInput } from 'react-native-paper';
import { AppTheme, useThemePreferences } from '@siteed/design-system';
import EssentiaJS, { AlgorithmResult } from 'react-native-essentia';

// Define available algorithms and their default parameters
interface AlgorithmConfig {
  name: string;
  displayName: string;
  description: string;
  parameters: Record<string, {
    type: 'number' | 'boolean' | 'string';
    default: number | boolean | string;
    description: string;
    min?: number;
    max?: number;
  }>;
}

const AVAILABLE_ALGORITHMS: Record<string, AlgorithmConfig> = {
  MFCC: {
    name: 'MFCC',
    displayName: 'MFCC (Mel-Frequency Cepstral Coefficients)',
    description: 'Computes the MFCCs of a spectrum.',
    parameters: {
      numberCoefficients: {
        type: 'number',
        default: 13,
        description: 'Number of output MFCC coefficients',
        min: 1,
        max: 100
      },
      numberBands: {
        type: 'number',
        default: 40,
        description: 'Number of mel-bands',
        min: 1,
        max: 100
      },
      lowFrequencyBound: {
        type: 'number',
        default: 0,
        description: 'Lower bound of the frequency range (Hz)',
        min: 0,
        max: 22050
      },
      highFrequencyBound: {
        type: 'number',
        default: 22050,
        description: 'Upper bound of the frequency range (Hz)',
        min: 0,
        max: 22050
      }
    }
  },
  Spectrum: {
    name: 'Spectrum',
    displayName: 'Spectrum',
    description: 'Computes the spectrum of an audio signal.',
    parameters: {
      size: {
        type: 'number',
        default: 2048,
        description: 'FFT size',
        min: 32,
        max: 65536
      }
    }
  }
  // Add more algorithms as needed
};

interface AlgorithmSelectorProps {
  onExecute: (result: AlgorithmResult) => void;
  isInitialized: boolean;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    container: {
      marginBottom: 16,
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
    parameterContainer: {
      marginTop: 16,
    },
    parameterRow: {
      marginBottom: 12,
    },
    parameterLabel: {
      fontSize: 14,
      marginBottom: 4,
    },
    parameterDescription: {
      fontSize: 12,
      color: theme.colors.outline,
      marginBottom: 4,
    },
    buttonContainer: {
      marginTop: 16,
    },
    resultContainer: {
      marginTop: 16,
    }
  });
};

function AlgorithmSelector({ onExecute, isInitialized }: AlgorithmSelectorProps) {
  const { theme } = useThemePreferences();
  const styles = useMemo(() => getStyles({ theme }), [theme]);

  // State for selected algorithm and parameters
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('MFCC');
  const [parameters, setParameters] = useState<Record<string, number | boolean | string>>({});
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<AlgorithmResult | null>(null);

  // Initialize parameters when algorithm changes
  useEffect(() => {
    if (selectedAlgorithm && AVAILABLE_ALGORITHMS[selectedAlgorithm]) {
      const defaultParams: Record<string, number | boolean | string> = {};
      const algorithmConfig = AVAILABLE_ALGORITHMS[selectedAlgorithm];
      
      Object.entries(algorithmConfig.parameters).forEach(([key, config]) => {
        defaultParams[key] = config.default;
      });
      
      setParameters(defaultParams);
    }
  }, [selectedAlgorithm]);

  const handleParameterChange = (paramName: string, value: string) => {
    const paramConfig = AVAILABLE_ALGORITHMS[selectedAlgorithm].parameters[paramName];
    
    if (paramConfig.type === 'number') {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        setParameters(prev => ({
          ...prev,
          [paramName]: numValue
        }));
      }
    } else {
      setParameters(prev => ({
        ...prev,
        [paramName]: value
      }));
    }
  };

  const setDummyAudioData = async () => {
    try {
      // Create dummy PCM data - same as in extractMFCCFromSegment
      const dummyPcmData = new Float32Array(4096);
      for (let i = 0; i < dummyPcmData.length; i++) {
        dummyPcmData[i] = Math.sin(i * 0.01);
      }
      
      // Set the audio data
      const success = await EssentiaJS.setAudioData(dummyPcmData, 44100);
      console.log('Set audio data result:', success);
      return success;
    } catch (error) {
      console.error('Error setting audio data:', error);
      return false;
    }
  };

  const executeAlgorithm = async () => {
    if (!isInitialized) {
      alert('Essentia is not initialized. Please initialize it first.');
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      // First, set the audio data - this is the key step that was missing
      const audioDataSuccess = await setDummyAudioData();
      
      if (!audioDataSuccess) {
        throw new Error('Failed to set audio data');
      }
      
      // Execute the selected algorithm with the current parameters
      console.log(`Executing ${selectedAlgorithm} with parameters:`, parameters);
      const result = await EssentiaJS.executeAlgorithm(selectedAlgorithm, parameters);
      
      console.log(`${selectedAlgorithm} execution result:`, result);
      setResult(result);
      onExecute(result);
    } catch (error) {
      console.error('Error executing algorithm:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const renderParameters = () => {
    if (!selectedAlgorithm || !AVAILABLE_ALGORITHMS[selectedAlgorithm]) {
      return null;
    }

    const algorithmConfig = AVAILABLE_ALGORITHMS[selectedAlgorithm];
    
    return (
      <View style={styles.parameterContainer}>
        <Text style={styles.cardTitle}>Parameters</Text>
        
        {Object.entries(algorithmConfig.parameters).map(([paramName, config]) => (
          <View key={paramName} style={styles.parameterRow}>
            <Text style={styles.parameterLabel}>{paramName}</Text>
            <Text style={styles.parameterDescription}>{config.description}</Text>
            
            <TextInput
              mode="outlined"
              value={String(parameters[paramName] || config.default)}
              onChangeText={(value) => handleParameterChange(paramName, value)}
              keyboardType={config.type === 'number' ? 'numeric' : 'default'}
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Algorithm Selection</Text>
        
        <SegmentedButtons
          value={selectedAlgorithm}
          onValueChange={setSelectedAlgorithm}
          buttons={Object.values(AVAILABLE_ALGORITHMS).map(algo => ({
            value: algo.name,
            label: algo.name,
          }))}
        />
        
        {selectedAlgorithm && AVAILABLE_ALGORITHMS[selectedAlgorithm] && (
          <View style={styles.cardContent}>
            <Text>{AVAILABLE_ALGORITHMS[selectedAlgorithm].description}</Text>
          </View>
        )}
        
        {renderParameters()}
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={executeAlgorithm}
            loading={isExecuting}
            disabled={isExecuting || !isInitialized}
          >
            Execute {selectedAlgorithm}
          </Button>
        </View>
        
        {result && (
          <View style={styles.resultContainer}>
            <Text style={{ fontWeight: 'bold' }}>
              Result: {result.success ? 'Success ✅' : 'Failed ❌'}
            </Text>
            {result.error && <Text style={{ color: 'red' }}>{result.error}</Text>}
            {result.data && (
              <Text style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 8 }}>
                {JSON.stringify(result.data, null, 2)}
              </Text>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

export default AlgorithmSelector; 