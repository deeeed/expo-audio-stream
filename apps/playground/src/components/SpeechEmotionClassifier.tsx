import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { AppTheme, useTheme } from '@siteed/design-system';
import EssentiaJS from '@siteed/react-native-essentia';

interface SpeechEmotionClassifierProps {
  showToast: (message: string) => void;
}

interface SpeechEmotionResult {
  features?: Record<string, any>;
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

export function SpeechEmotionClassifier({ showToast }: SpeechEmotionClassifierProps) {
  const theme = useTheme();
  const styles = getStyles({ theme });
  
  const [isClassifyingEmotion, setIsClassifyingEmotion] = useState<boolean>(false);
  const [emotionResult, setEmotionResult] = useState<SpeechEmotionResult | null>(null);

  const handleSpeechEmotionClassification = async () => {
    try {
      setIsClassifyingEmotion(true);
      setEmotionResult(null);
      
      // Create dummy PCM data - using different frequencies to simulate speech
      const dummyPcmData = new Float32Array(8192);
      for (let i = 0; i < dummyPcmData.length; i++) {
        // Simulate some speech-like characteristics with multiple frequencies
        dummyPcmData[i] = 
          0.5 * Math.sin(i * 0.01) +  // Low frequency component
          0.3 * Math.sin(i * 0.05) +  // Mid frequency
          0.2 * Math.sin(i * 0.2) +   // High frequency component
          0.1 * Math.random();        // Some noise
      }
      
      // Set the audio data
      await EssentiaJS.setAudioData(dummyPcmData, 16000); // Speech is typically 16kHz
      
      // Extract speech emotion features
      const result = await EssentiaJS.extractSpeechEmotionFeatures();
      
      console.log('Speech emotion classification result:', result);
      
      if (result.success && result.data) {
        setEmotionResult({
          features: result.data
        });
        showToast('Speech emotion classification completed successfully');
      } else {
        throw new Error(result.error?.message || 'Unknown error during emotion classification');
      }
    } catch (error) {
      console.error('Speech emotion classification error:', error);
      setEmotionResult({
        error: error instanceof Error ? error.message : String(error)
      });
      showToast('Speech emotion classification failed');
    } finally {
      setIsClassifyingEmotion(false);
    }
  };

  const renderEmotionClassificationResults = () => {
    if (!emotionResult) return null;
    
    if (emotionResult.error) {
      return (
        <View style={styles.resultContainer}>
          <Text style={{ color: 'red', fontWeight: 'bold' }}>Error:</Text>
          <Text style={{ color: 'red' }}>{emotionResult.error}</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.resultContainer}>
        <Text style={{ fontWeight: 'bold' }}>Speech Emotion Features:</Text>
        <Text style={styles.resultText}>
          {JSON.stringify(emotionResult.features, null, 2).substring(0, 500)}
          {JSON.stringify(emotionResult.features, null, 2).length > 500 ? '...' : ''}
        </Text>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Speech Emotion Classification</Text>
        <Text>Test the speech emotion classification pipeline with synthetic audio data.</Text>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSpeechEmotionClassification}
            loading={isClassifyingEmotion}
            disabled={isClassifyingEmotion}
            style={styles.button}
          >
            Classify Speech Emotion
          </Button>
        </View>
        
        {emotionResult && renderEmotionClassificationResults()}
      </Card.Content>
    </Card>
  );
} 