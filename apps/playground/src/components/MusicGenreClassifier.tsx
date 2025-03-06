import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { AppTheme, useTheme } from '@siteed/design-system';
import EssentiaJS from '@siteed/react-native-essentia';
import type { MusicGenreFeatures } from '@siteed/react-native-essentia/src/types/piepleine.types';

interface MusicGenreClassifierProps {
  showToast: (message: string) => void;
}

interface GenreClassificationResult {
  features?: MusicGenreFeatures;
  error?: string;
}

const getStyles = ({ theme }: { theme: AppTheme }) => {
  return StyleSheet.create({
    card: {
      marginBottom: 16,
      padding: 8,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
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
    resultContainer: {
      marginTop: 16,
      padding: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
    },
    resultText: {
      fontFamily: 'monospace',
      fontSize: 12,
      marginTop: 8,
    },
  });
};

export function MusicGenreClassifier({ showToast }: MusicGenreClassifierProps) {
  const theme = useTheme();
  const styles = getStyles({ theme });
  
  const [isClassifyingGenre, setIsClassifyingGenre] = useState<boolean>(false);
  const [genreClassificationResult, setGenreClassificationResult] = useState<GenreClassificationResult | null>(null);

  const handleMusicGenreClassification = async () => {
    try {
      setIsClassifyingGenre(true);
      setGenreClassificationResult(null);
      
      // Create dummy PCM data
      const dummyPcmData = new Float32Array(4096);
      for (let i = 0; i < dummyPcmData.length; i++) {
        dummyPcmData[i] = Math.sin(i * 0.01) + Math.sin(i * 0.05);  // Add some harmonic content
      }
      
      // Set the audio data
      await EssentiaJS.setAudioData(dummyPcmData, 44100);
      
      // Use the improved helper method without needing to pass a configuration
      const result = await EssentiaJS.extractMusicGenreFeatures();
      
      console.log('Music genre classification result:', result);
      
      if (result.success && result.data) {
        setGenreClassificationResult({
          features: result.data
        });
        showToast('Music genre classification completed successfully');
      } else {
        throw new Error(result.error?.message || 'Unknown error during genre classification');
      }
    } catch (error) {
      console.error('Music genre classification error:', error);
      setGenreClassificationResult({
        error: error instanceof Error ? error.message : String(error)
      });
      showToast('Music genre classification failed');
    } finally {
      setIsClassifyingGenre(false);
    }
  };

  const renderGenreClassificationResults = () => {
    if (!genreClassificationResult) return null;
    
    if (genreClassificationResult.error) {
      return (
        <View style={styles.resultContainer}>
          <Text style={{ color: 'red', fontWeight: 'bold' }}>Error:</Text>
          <Text style={{ color: 'red' }}>{genreClassificationResult.error}</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.resultContainer}>
        <Text style={{ fontWeight: 'bold' }}>Music Genre Classification Features:</Text>
        <Text style={styles.resultText}>
          {JSON.stringify(genreClassificationResult.features, null, 2).substring(0, 500)}
          {JSON.stringify(genreClassificationResult.features, null, 2).length > 500 ? '...' : ''}
        </Text>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Music Genre Classification</Text>
        <Text>Test the music genre classification pipeline with synthetic audio data.</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleMusicGenreClassification}
            loading={isClassifyingGenre}
            disabled={isClassifyingGenre}
            style={styles.button}
          >
            Classify Music Genre
          </Button>
        </View>
        
        {genreClassificationResult && renderGenreClassificationResults()}
      </Card.Content>
    </Card>
  );
} 