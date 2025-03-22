import { useState, useEffect } from 'react';
import { Image, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Essentia from '@siteed/react-native-essentia';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const [audioFeatures, setAudioFeatures] = useState<{
    key?: { key: string; scale: string };
    tempo?: { tempo: number };
    mfcc?: { mfcc: number[] };
    isLoading: boolean;
    error?: string;
  }>({
    isLoading: false
  });

  const analyzeAudio = async (): Promise<void> => {
    try {
      setAudioFeatures({ isLoading: true });
      
      // Demo audio data - in a real app, you would load actual audio data
      // This is just a placeholder sine wave (1 second at 440Hz)
      const sampleRate = 44100;
      const duration = 1; // seconds
      const audioData = new Float32Array(sampleRate * duration);
      
      // Generate a simple sine wave at 440Hz (A4)
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }
      
      // Set the audio data
      await Essentia.setAudioData(audioData, sampleRate);
      
      // Extract features individually for better error handling
      let keyData, tempoData, mfccData;
      
      try {
        // Extract key
        const keyResult = await Essentia.executeAlgorithm('Key', {});
        console.log('Key result:', JSON.stringify(keyResult));
        
        if (keyResult.success && keyResult.data) {
          keyData = { 
            key: keyResult.data.key, 
            scale: keyResult.data.scale 
          };
        }
      } catch (keyError) {
        console.error('Error extracting key:', keyError);
      }
      
      try {
        // For tempo, we might need to use a specialized approach
        // Try the PercivalBpmEstimator which is designed for this task
        const tempoResult = await Essentia.executeAlgorithm('PercivalBpmEstimator', {});
        console.log('Tempo result:', JSON.stringify(tempoResult));
        
        if (tempoResult.success && tempoResult.data) {
          tempoData = { tempo: tempoResult.data.bpm };
        }
      } catch (tempoError) {
        console.error('Error extracting tempo:', tempoError);
        
        // Fallback: try with a different tempo estimation algorithm if available
        try {
          const fallbackTempoResult = await Essentia.executeAlgorithm('RhythmExtractor2013', {});
          if (fallbackTempoResult.success && fallbackTempoResult.data) {
            tempoData = { tempo: fallbackTempoResult.data.bpm };
          }
        } catch (fallbackError) {
          console.error('Error in fallback tempo extraction:', fallbackError);
        }
      }
      
      try {
        // Extract MFCC
        const mfccResult = await Essentia.executeAlgorithm('MFCC', {
          numberCoefficients: 13,
          numberBands: 40
        });
        console.log('MFCC result:', JSON.stringify(mfccResult));
        
        if (mfccResult.success && mfccResult.data) {
          console.log('MFCC data type:', typeof mfccResult.data.mfcc);
          console.log('MFCC is array?', Array.isArray(mfccResult.data.mfcc));
          
          if (Array.isArray(mfccResult.data.mfcc)) {
            console.log('MFCC array length:', mfccResult.data.mfcc.length);
            console.log('First few MFCC values:', mfccResult.data.mfcc.slice(0, 5));
          }
          
          // Check if mfcc is an array and filter out any undefined/null values
          const mfccArray = Array.isArray(mfccResult.data.mfcc) 
            ? mfccResult.data.mfcc.filter((value: number | null | undefined) => 
                value !== undefined && value !== null) as number[]
            : [];
            
          if (mfccArray.length > 0) {
            mfccData = { mfcc: mfccArray };
          } else {
            console.warn('MFCC array is empty or contains only invalid values');
          }
        }
      } catch (mfccError) {
        console.error('Error extracting MFCC:', mfccError);
      }
      
      // Update state with what we could extract
      setAudioFeatures({
        key: keyData,
        tempo: tempoData,
        mfcc: mfccData,
        isLoading: false
      });
    } catch (error) {
      console.error('Error analyzing audio:', error);
      setAudioFeatures({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Essentia Audio Analysis</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.container}>
        <TouchableOpacity 
          style={styles.button}
          onPress={analyzeAudio}
          disabled={audioFeatures.isLoading}
        >
          <ThemedText style={styles.buttonText}>
            {audioFeatures.isLoading ? 'Analyzing...' : 'Analyze Test Audio'}
          </ThemedText>
        </TouchableOpacity>
        
        {audioFeatures.error ? (
          <ThemedView style={styles.resultContainer}>
            <ThemedText type="defaultSemiBold" style={styles.errorText}>
              Error: {audioFeatures.error}
            </ThemedText>
          </ThemedView>
        ) : null}
        
        {audioFeatures.key && (
          <ThemedView style={styles.resultContainer}>
            <ThemedText type="subtitle">Musical Key</ThemedText>
            <ThemedText>
              Key: {audioFeatures.key.key} {audioFeatures.key.scale}
            </ThemedText>
          </ThemedView>
        )}
        
        {audioFeatures.tempo && (
          <ThemedView style={styles.resultContainer}>
            <ThemedText type="subtitle">Tempo</ThemedText>
            <ThemedText>
              BPM: {audioFeatures.tempo.tempo.toFixed(1)}
            </ThemedText>
          </ThemedView>
        )}
        
        {audioFeatures.mfcc && Array.isArray(audioFeatures.mfcc.mfcc) && audioFeatures.mfcc.mfcc.length > 0 && (
          <ThemedView style={styles.resultContainer}>
            <ThemedText type="subtitle">MFCC</ThemedText>
            <ThemedText>
              First 3 coefficients: {
                audioFeatures.mfcc.mfcc
                  .slice(0, Math.min(3, audioFeatures.mfcc.mfcc.length))
                  .map(c => (c !== undefined && c !== null) 
                    ? (typeof c === 'number' ? c.toFixed(2) : String(c)) 
                    : 'N/A')
                  .join(', ')
              }...
            </ThemedText>
          </ThemedView>
        )}
        
        <ThemedText style={styles.note}>
          Note: This example uses a synthetic sine wave. In a real application, you would load actual audio data.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  container: {
    padding: 16,
    gap: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
  },
  note: {
    fontStyle: 'italic',
    marginTop: 16,
  }
});
