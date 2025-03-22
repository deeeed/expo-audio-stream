import Essentia, { BeatsResult, KeyResult, LoudnessResult, MFCCResult, PitchResult, TempoResult } from '@siteed/react-native-essentia';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

// Results type definitions
interface FeatureResults {
  mfcc?: MFCCResult;
  key?: KeyResult;
  tempo?: TempoResult;
  beats?: BeatsResult;
  loudness?: LoudnessResult;
  pitch?: PitchResult;
  errors?: Record<string, string>;
  isLoading: boolean;
}

export default function DirectMethodsScreen() {
  const colorScheme = useColorScheme();
  const [featureResults, setFeatureResults] = useState<FeatureResults>({
    isLoading: false,
  });

  // Function to generate a test audio signal
  const generateSineWave = (frequency: number, duration: number, sampleRate: number): Float32Array => {
    const audioData = new Float32Array(sampleRate * duration);
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }
    return audioData;
  };

  // Generate a more complex test signal with multiple frequencies
  const generateTestSignal = (): Float32Array => {
    const sampleRate = 44100;
    const duration = 2; // seconds
    const signal = new Float32Array(sampleRate * duration);
    
    // Add several sine waves at different frequencies
    // A major chord: A (440Hz), C# (550Hz), E (660Hz)
    for (let i = 0; i < signal.length; i++) {
      signal[i] = 
        0.5 * Math.sin(2 * Math.PI * 440 * i / sampleRate) + // A4
        0.3 * Math.sin(2 * Math.PI * 550 * i / sampleRate) + // C#5
        0.2 * Math.sin(2 * Math.PI * 660 * i / sampleRate);  // E5
    }
    
    return signal;
  };

  const extractMFCC = async () => {
    try {
      setFeatureResults(prev => ({ ...prev, isLoading: true }));
      
      // Generate a test signal
      const audioData = generateTestSignal();
      const sampleRate = 44100;
      
      // Set the audio data
      await Essentia.setAudioData(audioData, sampleRate);
      
      // Extract MFCC using the direct method
      // Using only parameters that MFCC accepts
      const result = await Essentia.extractMFCC({
        numberCoefficients: 13,
        numberBands: 40,
        lowFrequencyBound: 0,
        highFrequencyBound: 22050
      });
      
      console.log('MFCC extraction result:', result);
      
      // Check if result has expected properties of MFCCResult
      if ('mfcc' in result) {
        setFeatureResults(prev => ({
          ...prev,
          mfcc: result as MFCCResult,
          isLoading: false
        }));
      } else {
        throw new Error("Invalid MFCC result format");
      }
    } catch (error) {
      console.error('Error extracting MFCC:', error);
      setFeatureResults(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          mfcc: error instanceof Error ? error.message : String(error)
        },
        isLoading: false
      }));
    }
  };

  const extractKey = async () => {
    try {
      setFeatureResults(prev => ({ ...prev, isLoading: true }));
      
      // Generate a test signal - use a C major chord
      const sampleRate = 44100;
      const duration = 3; // seconds
      
      // C major chord: C (261.63 Hz), E (329.63 Hz), G (392 Hz)
      const audioData = new Float32Array(sampleRate * duration);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = 
          0.4 * Math.sin(2 * Math.PI * 261.63 * i / sampleRate) + // C4
          0.3 * Math.sin(2 * Math.PI * 329.63 * i / sampleRate) + // E4
          0.3 * Math.sin(2 * Math.PI * 392.00 * i / sampleRate);  // G4
      }
      
      // Set the audio data
      await Essentia.setAudioData(audioData, sampleRate);
      
      // Extract Key using the direct method with correct parameters
      // Only using parameters that the Key algorithm explicitly accepts
      const result = await Essentia.extractKey({
        profileType: 'temperley',
        usePolyphony: true,
        // Don't include sampleRate as it's not in the accepted parameters list
      });
      
      console.log('Key extraction result:', result);
      
      // Check if result has expected properties of KeyResult
      if ('key' in result && 'scale' in result) {
        setFeatureResults(prev => ({
          ...prev,
          key: result as KeyResult,
          isLoading: false
        }));
      } else {
        throw new Error("Invalid key result format");
      }
    } catch (error) {
      console.error('Error extracting key:', error);
      setFeatureResults(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          key: error instanceof Error ? error.message : String(error)
        },
        isLoading: false
      }));
    }
  };

  const extractTempo = async () => {
    try {
      setFeatureResults(prev => ({ ...prev, isLoading: true }));
      
      // Generate a rhythmic test signal (120 BPM = 2 Hz)
      const sampleRate = 44100;
      const duration = 5; // seconds
      const bpm = 120;
      const beatsPerSecond = bpm / 60;
      const samplesPerBeat = sampleRate / beatsPerSecond;
      
      const audioData = new Float32Array(sampleRate * duration);
      for (let i = 0; i < audioData.length; i++) {
        // Add a pulse at each beat position
        const beatPosition = i % samplesPerBeat;
        if (beatPosition < samplesPerBeat * 0.1) {
          audioData[i] = 0.8 * Math.sin(2 * Math.PI * 440 * i / sampleRate) * 
            (1 - beatPosition / (samplesPerBeat * 0.1));
        } else {
          audioData[i] = 0.1 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
        }
      }
      
      // Set the audio data
      await Essentia.setAudioData(audioData, sampleRate);
      
      // Extract Tempo using the direct method with correct parameters
      // PercivalBpmEstimator typically doesn't need specific parameters
      const result = await Essentia.extractTempo();
      
      console.log('Tempo extraction result:', result);
      
      // Check if result has expected properties of TempoResult
      if ('bpm' in result) {
        setFeatureResults(prev => ({
          ...prev,
          tempo: result as TempoResult,
          isLoading: false
        }));
      } else {
        throw new Error("Invalid tempo result format");
      }
    } catch (error) {
      console.error('Error extracting tempo:', error);
      setFeatureResults(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          tempo: error instanceof Error ? error.message : String(error)
        },
        isLoading: false
      }));
    }
  };

  const extractBeats = async () => {
    try {
      setFeatureResults(prev => ({ ...prev, isLoading: true }));
      
      // Generate a rhythmic test signal (120 BPM = 2 Hz)
      const sampleRate = 44100;
      const duration = 5; // seconds
      const bpm = 120;
      const beatsPerSecond = bpm / 60;
      const samplesPerBeat = sampleRate / beatsPerSecond;
      
      const audioData = new Float32Array(sampleRate * duration);
      for (let i = 0; i < audioData.length; i++) {
        // Add a pulse at each beat position
        const beatPosition = i % samplesPerBeat;
        if (beatPosition < samplesPerBeat * 0.1) {
          audioData[i] = 0.8 * Math.sin(2 * Math.PI * 440 * i / sampleRate) * 
            (1 - beatPosition / (samplesPerBeat * 0.1));
        } else {
          audioData[i] = 0.1 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
        }
      }
      
      // Set the audio data
      await Essentia.setAudioData(audioData, sampleRate);
      
      // Extract Beats using the direct method
      // BeatTrackerMultiFeature actually does accept minTempo and maxTempo
      const result = await Essentia.extractBeats({
        minTempo: 60,
        maxTempo: 200
      });
      
      console.log('Beats extraction result:', result);
      
      // Check if result has expected properties of BeatsResult
      if ('beats' in result && 'confidence' in result) {
        setFeatureResults(prev => ({
          ...prev,
          beats: result as BeatsResult,
          isLoading: false
        }));
      } else {
        throw new Error("Invalid beats result format");
      }
    } catch (error) {
      console.error('Error extracting beats:', error);
      setFeatureResults(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          beats: error instanceof Error ? error.message : String(error)
        },
        isLoading: false
      }));
    }
  };

  const extractLoudness = async () => {
    try {
      setFeatureResults(prev => ({ ...prev, isLoading: true }));
      
      // Generate a test signal with varying amplitude
      const sampleRate = 44100;
      const duration = 3; // seconds
      
      const audioData = new Float32Array(sampleRate * duration);
      for (let i = 0; i < audioData.length; i++) {
        // Amplitude gradually increases and then decreases
        const time = i / sampleRate;
        const amplitude = time < duration / 2 
          ? 2 * time / duration 
          : 2 * (1 - time / duration);
        
        audioData[i] = amplitude * Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }
      
      // Set the audio data
      await Essentia.setAudioData(audioData, sampleRate);
      
      // Extract Loudness using the direct method
      // The Loudness algorithm doesn't require specific parameters
      const result = await Essentia.extractLoudness();
      
      console.log('Loudness extraction result:', result);
      
      // Check if result has expected properties of LoudnessResult
      if ('loudness' in result) {
        setFeatureResults(prev => ({
          ...prev,
          loudness: result as LoudnessResult,
          isLoading: false
        }));
      } else {
        throw new Error("Invalid loudness result format");
      }
    } catch (error) {
      console.error('Error extracting loudness:', error);
      setFeatureResults(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          loudness: error instanceof Error ? error.message : String(error)
        },
        isLoading: false
      }));
    }
  };

  const extractPitch = async () => {
    try {
      setFeatureResults(prev => ({ ...prev, isLoading: true }));
      
      // Generate a test signal with a pure tone (A4 = 440 Hz)
      const audioData = generateSineWave(440, 2, 44100);
      const sampleRate = 44100;
      
      // Set the audio data
      await Essentia.setAudioData(audioData, sampleRate);
      
      // Extract Pitch using the direct method
      // PitchYinFFT accepts frameSize and sampleRate
      const result = await Essentia.extractPitch({
        frameSize: 2048,
        sampleRate: 44100
      });
      
      console.log('Pitch extraction result:', result);
      
      // Check if result has expected properties of PitchResult
      if ('pitch' in result && 'confidence' in result) {
        setFeatureResults(prev => ({
          ...prev,
          pitch: result as PitchResult,
          isLoading: false
        }));
      } else {
        throw new Error("Invalid pitch result format");
      }
    } catch (error) {
      console.error('Error extracting pitch:', error);
      setFeatureResults(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          pitch: error instanceof Error ? error.message : String(error)
        },
        isLoading: false
      }));
    }
  };

  const renderFeatureButton = (
    title: string, 
    onPress: () => Promise<void>,
    resultKey: keyof FeatureResults
  ) => {
    const isLoading = featureResults.isLoading;
    
    // Fix for the index type errors - this is where the issue is
    let hasError = false;
    if (featureResults.errors && resultKey !== 'isLoading' && resultKey !== 'errors') {
      // The issue was trying to use resultKey directly as an index on errors object
      // We need to check if it exists in the errors object first
      hasError = featureResults.errors.hasOwnProperty(resultKey);
    }
    
    const hasResult = resultKey !== 'isLoading' && resultKey !== 'errors' && 
                      featureResults[resultKey] !== undefined;
    
    return (
      <TouchableOpacity
        style={[
          styles.featureButton,
          hasResult && styles.featureButtonWithResult,
          hasError && styles.featureButtonWithError
        ]}
        onPress={onPress}
        disabled={isLoading}
      >
        <ThemedText style={styles.featureButtonText}>{title}</ThemedText>
        {isLoading && <ActivityIndicator size="small" />}
      </TouchableOpacity>
    );
  };

  const renderMFCCResult = () => {
    if (!featureResults.mfcc) return null;
    
    const { mfcc } = featureResults.mfcc;
    const frameCount = mfcc.length;
    const coeffCount = Array.isArray(mfcc[0]) ? mfcc[0].length : 0;
    
    return (
      <ThemedView style={styles.resultCard}>
        <ThemedText type="subtitle">MFCC Results</ThemedText>
        <ThemedText>Frames: {frameCount}</ThemedText>
        <ThemedText>Coefficients per frame: {coeffCount}</ThemedText>
        {frameCount > 0 && coeffCount > 0 && (
          <ThemedText>
            First frame (first 3 coefficients): 
            {Array.isArray(mfcc[0]) 
              ? mfcc[0].slice(0, 3).map(coef => Number(coef).toFixed(2)).join(', ') 
              : 'N/A'}...
          </ThemedText>
        )}
      </ThemedView>
    );
  };

  const renderKeyResult = () => {
    if (!featureResults.key) return null;
    
    const { key, scale, strength } = featureResults.key;
    
    return (
      <ThemedView style={styles.resultCard}>
        <ThemedText type="subtitle">Key Results</ThemedText>
        <ThemedText>Key: {key} {scale}</ThemedText>
        {strength !== undefined && (
          <ThemedText>Confidence: {Number(strength).toFixed(2)}</ThemedText>
        )}
      </ThemedView>
    );
  };

  const renderTempoResult = () => {
    if (!featureResults.tempo) return null;
    
    return (
      <ThemedView style={styles.resultCard}>
        <ThemedText type="subtitle">Tempo Results</ThemedText>
        <ThemedText>BPM: {Number(featureResults.tempo.bpm).toFixed(1)}</ThemedText>
      </ThemedView>
    );
  };

  const renderBeatsResult = () => {
    if (!featureResults.beats) return null;
    
    const { beats, confidence } = featureResults.beats;
    
    return (
      <ThemedView style={styles.resultCard}>
        <ThemedText type="subtitle">Beats Results</ThemedText>
        <ThemedText>Found {beats.length} beats</ThemedText>
        <ThemedText>Confidence: {Number(confidence).toFixed(2)}</ThemedText>
        {beats.length > 0 && (
          <ThemedText>
            First 3 beats (seconds): 
            {beats.slice(0, 3).map(beat => Number(beat).toFixed(2)).join(', ')}...
          </ThemedText>
        )}
      </ThemedView>
    );
  };

  const renderLoudnessResult = () => {
    if (!featureResults.loudness) return null;
    
    const { loudness } = featureResults.loudness;
    
    return (
      <ThemedView style={styles.resultCard}>
        <ThemedText type="subtitle">Loudness Results</ThemedText>
        <ThemedText>Loudness (LUFS): {Number(loudness).toFixed(2)}</ThemedText>
      </ThemedView>
    );
  };

  const renderPitchResult = () => {
    if (!featureResults.pitch) return null;
    
    const { pitch, confidence } = featureResults.pitch;
    
    return (
      <ThemedView style={styles.resultCard}>
        <ThemedText type="subtitle">Pitch Results</ThemedText>
        <ThemedText>Frequency: {Number(pitch).toFixed(2)} Hz</ThemedText>
        <ThemedText>Confidence: {Number(confidence).toFixed(2)}</ThemedText>
      </ThemedView>
    );
  };

  const renderErrors = () => {
    if (!featureResults.errors || Object.keys(featureResults.errors).length === 0) return null;
    
    return (
      <ThemedView style={styles.errorCard}>
        <ThemedText type="subtitle" style={{ color: '#f44336' }}>Errors</ThemedText>
        {Object.entries(featureResults.errors).map(([feature, error]) => (
          <ThemedText key={feature} style={{ color: '#f44336' }}>
            {feature}: {error}
          </ThemedText>
        ))}
      </ThemedView>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Essentia Direct Methods</ThemedText>
        <ThemedText>
          This demo showcases direct calls to Essentia's extraction methods using synthetic audio data.
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.buttonsContainer}>
        {renderFeatureButton('Extract MFCC', extractMFCC, 'mfcc')}
        {renderFeatureButton('Extract Key', extractKey, 'key')}
        {renderFeatureButton('Extract Tempo', extractTempo, 'tempo')}
        {renderFeatureButton('Extract Beats', extractBeats, 'beats')}
        {renderFeatureButton('Extract Loudness', extractLoudness, 'loudness')}
        {renderFeatureButton('Extract Pitch', extractPitch, 'pitch')}
      </ThemedView>
      
      <ThemedView style={styles.resultsContainer}>
        {renderErrors()}
        {renderMFCCResult()}
        {renderKeyResult()}
        {renderTempoResult()}
        {renderBeatsResult()}
        {renderLoudnessResult()}
        {renderPitchResult()}
        
        {!featureResults.isLoading && 
         !featureResults.errors &&
         Object.keys(featureResults).length <= 1 && (
          <ThemedView style={styles.infoCard}>
            <ThemedText>
              Press any of the buttons above to extract audio features.
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featureButton: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  featureButtonWithResult: {
    backgroundColor: '#4CAF50',
  },
  featureButtonWithError: {
    backgroundColor: '#f44336',
  },
  featureButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultCard: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorCard: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginBottom: 16,
  },
  infoCard: {
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
}); 