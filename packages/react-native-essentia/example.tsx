import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
// Note: In a real project, you would need to install expo-av
// This is just for demonstration purposes
import { Audio } from 'expo-av';
import EssentiaJS from './src/index';

interface ExampleProps {
  audioUri?: string;
}

interface ResultData {
  [key: string]: number[] | string | number;
}

const EssentiaExample: React.FC<ExampleProps> = ({ audioUri }) => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [results, setResults] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    const initializeEssentia = async (): Promise<void> => {
      try {
        const success = await EssentiaJS.initialize();
        setIsInitialized(success);
        console.log('Essentia initialized successfully');
      } catch (err) {
        setError(
          `Failed to initialize Essentia: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error('Initialization error:', err);
      }
    };

    initializeEssentia();
  }, []);

  const extractMFCC = async (): Promise<void> => {
    if (!isInitialized) {
      setError('Essentia is not initialized');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      // Load audio data
      const { sound } = await Audio.Sound.createAsync(
        audioUri ? { uri: audioUri } : require('./assets/sample.mp3')
      );

      // Get audio data as PCM
      const audioStatus = await sound.getStatusAsync();
      const durationMs = audioStatus.durationMillis || 0;
      const sampleRate = 44100;

      // Create a buffer for 5 seconds or the full duration if shorter
      const bufferLength = Math.min(
        5 * sampleRate,
        Math.ceil((durationMs / 1000) * sampleRate)
      );
      const pcmData = new Float32Array(bufferLength);

      // In a real app, you would fill pcmData with actual audio samples
      // This is just a placeholder
      for (let i = 0; i < bufferLength; i++) {
        pcmData[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI);
      }

      // Set audio data in Essentia
      await EssentiaJS.setAudioData(pcmData, sampleRate);

      // Execute MFCC algorithm
      const mfccResult = await EssentiaJS.executeAlgorithm('MFCC', {
        numberCoefficients: 13,
        numberBands: 40,
        lowFrequencyBound: 0,
        highFrequencyBound: 22050,
      });

      setResults(mfccResult.data);
      await sound.unloadAsync();
    } catch (err) {
      setError(
        `Error extracting MFCC: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error('MFCC extraction error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractSpectrum = async (): Promise<void> => {
    if (!isInitialized) {
      setError('Essentia is not initialized');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      // Load audio data
      const { sound } = await Audio.Sound.createAsync(
        audioUri ? { uri: audioUri } : require('./assets/sample.mp3')
      );

      // Get audio data as PCM
      const audioStatus = await sound.getStatusAsync();
      const durationMs = audioStatus.durationMillis || 0;
      const sampleRate = 44100;

      // Create a buffer for 5 seconds or the full duration if shorter
      const bufferLength = Math.min(
        5 * sampleRate,
        Math.ceil((durationMs / 1000) * sampleRate)
      );
      const pcmData = new Float32Array(bufferLength);

      // In a real app, you would fill pcmData with actual audio samples
      // This is just a placeholder
      for (let i = 0; i < bufferLength; i++) {
        pcmData[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI);
      }

      // Set audio data in Essentia
      await EssentiaJS.setAudioData(pcmData, sampleRate);

      // Execute Spectrum algorithm
      const spectrumResult = await EssentiaJS.executeAlgorithm('Spectrum', {
        size: 2048,
      });

      setResults(spectrumResult.data);
      await sound.unloadAsync();
    } catch (err) {
      setError(
        `Error extracting spectrum: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error('Spectrum extraction error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Essentia Audio Analysis</Text>

      <Text style={styles.status}>
        Status: {isInitialized ? 'Initialized' : 'Not Initialized'}
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Extract MFCC"
          onPress={extractMFCC}
          disabled={!isInitialized || isProcessing}
        />

        <Button
          title="Extract Spectrum"
          onPress={extractSpectrum}
          disabled={!isInitialized || isProcessing}
        />
      </View>

      {isProcessing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Processing audio...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {results && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Results:</Text>
          <Text style={styles.resultsText}>
            {Object.keys(results).map((key) => {
              const value = results[key];
              if (Array.isArray(value)) {
                return `${key}: [${value.slice(0, 5).join(', ')}${value.length > 5 ? '...' : ''}]\n`;
              }
              return `${key}: ${value}\n`;
            })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  errorText: {
    color: '#ff0000',
  },
  resultsContainer: {
    backgroundColor: '#eeffee',
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultsText: {
    fontFamily: 'monospace',
  },
});

export default EssentiaExample;
