import { AppTheme, Notice, ScreenWrapper, useTheme, useToast } from '@siteed/design-system';
import { extractAudioData } from '@siteed/expo-audio-stream';
import * as tf from '@tensorflow/tfjs';
import type { AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { baseLogger } from '../config';
import { useSampleAudio } from '../hooks/useSampleAudio';

interface ClassificationResult {
  className: string;
  probability: number;
}


const logger = baseLogger.extend("Classify")

const getStyles = ({ theme, insets }: { theme: AppTheme, insets?: { bottom: number, top: number } }) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingBottom: insets?.bottom || 0,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: theme.colors.text,
    },
    buttonContainer: {
      marginVertical: 16,
    },
    resultsContainer: {
      marginTop: 16,
      padding: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 8,
    },
    resultHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      color: theme.colors.text,
    },
    resultItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    className: {
      fontSize: 16,
      color: theme.colors.text,
      flex: 3,
    },
    probability: {
      fontSize: 16,
      color: theme.colors.primary,
      flex: 1,
      textAlign: 'right',
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginVertical: 8,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: theme.colors.text,
    },
    errorText: {
      color: 'red',
      marginTop: 16,
    },
    fileInfo: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.text,
    },
  });
};

// Fix unused parameters by prefixing with underscore
const getModelCapabilities = (_modelName: string, _isWeb: boolean): { classes: string[] } => {
  // This is a simplified implementation - replace with actual logic if needed
  return {
    classes: ['Speech', 'Music', 'Animal', 'Vehicle', 'Ambient noise'] // Default classes
  };
};

// Fix the loadModel function to use state from props
const loadModel = async ({ 
  setLoading, 
  setStatus, 
  setError 
}: { 
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  setError: (error: string | null) => void;
}): Promise<tf.GraphModel> => {
  try {
    setLoading(true);
    setStatus('Loading model...');
    
    // Use the original URL that was working
    const handler = tf.io.http(
      'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1/default/1'
    );
    const model = await tf.loadGraphModel(handler);
    
    setStatus('Model loaded successfully');
    return model;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error loading model';
    setError(errorMessage);
    throw error;
  } finally {
    setLoading(false);
  }
};

// Fix the _loadModelFromAssets function to avoid require
const _loadModelFromAssets = async ({ 
  setLoading, 
  setStatus, 
  setError 
}: { 
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  setError: (error: string | null) => void;
}): Promise<tf.GraphModel> => {
  setLoading(true);
  setStatus('Loading model from assets...');
  
  try {
    // Initialize TensorFlow
    await tf.ready();
    
    setStatus('Loading YAMNet model from assets...');
    
    // Use a string path instead of require
    const modelPath = 'asset:///assets/yamnet/model.json';
    
    const loadedModel = await tf.loadGraphModel(modelPath);
    
    setStatus('Model loaded successfully');
    return loadedModel;
  } catch (error) {
    console.error('Error loading model from assets:', error);
    setError('Failed to load model from assets: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  } finally {
    setLoading(false);
  }
};

export const ClassifyPage = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles({ theme, insets }), [theme, insets]);
  
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isModelLoading, _setIsModelLoading] = useState(true);
  const [status, setStatus] = useState('Loading TensorFlow...');
  const [error, setError] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [classificationResults, setClassificationResults] = useState<ClassificationResult[]>([]);
  const [_classNames, _setClassNames] = useState<string[]>([]);
      const { show } = useToast()

    const { isLoading: isSampleLoading, loadSampleAudio } = useSampleAudio({
        onError: () => {
            logger.error('Error loading sample audio file:')
            show({
                type: 'error',
                message: 'Error loading sample audio file',
                duration: 3000
            })
        }
    })

  // Wrap in useCallback to fix exhaustive-deps warning
  const runTensorFlowAndModel = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Initialize TF
      await tf.ready();
      
      // Load model if not already loaded
      if (!model) {
        const loadedModel = await loadModel({ 
          setLoading: setIsLoading,
          setStatus, 
          setError 
        });
        setModel(loadedModel);
      }
      
      setStatus('Model loaded successfully');
    } catch (err) {
      setError(`Failed to initialize: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [model, setIsLoading, setStatus, setError, setModel]);

  // Load TensorFlow and model on component mount
  useEffect(() => {
    runTensorFlowAndModel();
  }, [runTensorFlowAndModel]);

  const pickAudioFile = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, use the browser's file input
        return new Promise<void>((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'audio/*';
          
          input.onchange = async (e) => {
            const target = e.target as HTMLInputElement;
            const files = target.files;
            
            if (files && files.length > 0) {
              const file = files[0];
              const fileUrl = URL.createObjectURL(file);
              setAudioUri(fileUrl);
              setFileName(file.name);
              resolve();
            } else {
              reject(new Error('No file selected'));
            }
          };
          
          input.click();
        });
      } else {
        // For native, use DocumentPicker
        const result = await DocumentPicker.getDocumentAsync({
          type: ['audio/*'],
          copyToCacheDirectory: true,
        });
        
        if (result.canceled) {
          return;
        }
        
        const asset = result.assets[0];
        setAudioUri(asset.uri);
        setFileName(asset.name);
      }
    } catch (error) {
      console.error('Error picking audio file:', error);
      setError('Failed to pick audio file');
    }
  };

  const preprocessAudio = async (audioUri: string): Promise<Float32Array | null> => {
    try {
      // Use the correct Audio API
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {},
        (_status: AVPlaybackStatus) => {
          // Handle status updates
        }
      );
      
      // Use sound object as needed
      await sound.unloadAsync(); // Make sure to unload when done
      
      // Web-specific handling for audio preprocessing
      if (Platform.OS === 'web') {
        // For web, we need to handle the audio differently
        // Web Audio API approach
        const response = await fetch(audioUri);
        const arrayBuffer = await response.arrayBuffer();
        
        // Create audio context with proper type
        interface WebkitWindow extends Window {
          webkitAudioContext: typeof AudioContext;
        }
        
        const AudioContextClass = window.AudioContext || 
          (window as unknown as WebkitWindow).webkitAudioContext;
        const audioContext = new AudioContextClass({ sampleRate: 16000 });
        
        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get audio data and resample if needed
        const originalData = audioBuffer.getChannelData(0);
        
        // If the sample rate is not 16kHz, we need to resample
        let normalizedData: Float32Array;
        if (audioBuffer.sampleRate !== 16000) {
          // Simple resampling by picking samples at intervals
          // (In a production app, you'd want a better resampling algorithm)
          const resampleRatio = audioBuffer.sampleRate / 16000;
          const resampledLength = Math.floor(originalData.length / resampleRatio);
          normalizedData = new Float32Array(resampledLength);
          
          for (let i = 0; i < resampledLength; i++) {
            normalizedData[i] = originalData[Math.floor(i * resampleRatio)];
          }
        } else {
          normalizedData = originalData;
        }
        
        return normalizedData;
      } else {
        // Native implementation - use extractAudioData
        const extractedData = await extractAudioData({
          fileUri: audioUri,
          includeNormalizedData: true,
          decodingOptions: {
            targetSampleRate: 16000, // YAMNet requires 16kHz sample rate
            targetChannels: 1, // Mono audio
            normalizeAudio: true,
          }
        });
        
        if (!extractedData.normalizedData) {
          throw new Error('Failed to extract normalized audio data');
        }
        
        return extractedData.normalizedData;
      }
    } catch (error) {
      console.error('Error preprocessing audio:', error);
      setError('Failed to preprocess audio: ' + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  };


    const handleLoadSampleAudio = useCallback(async () => {
        try {            
            // Load the sample audio
            const sampleFile = await loadSampleAudio(require('@assets/why jfk.mp3'))
            
            if (!sampleFile) {
                throw new Error('Failed to load sample audio file')
            }
            
            // TODO now we should process it
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sample audio')
            show({
                type: 'error',
                message: 'Failed to load sample audio',
                duration: 3000
            })
        }
    }, [loadSampleAudio, show])

  const classifyAudio = async () => {
    try {
      if (!audioUri || !model) {
        setError('No audio file selected or model not loaded');
        return;
      }

      setIsLoading(true);
      setError(null);
      setClassificationResults([]);
      setStatus('Processing audio...');

      // Use the accessible function instead
      await runTensorFlowAndModel();
      
      // Preprocess audio to get waveform
      const waveform = await preprocessAudio(audioUri);
      if (!waveform) {
        throw new Error('Failed to preprocess audio');
      }

      setStatus('Running inference...');
      
      // Create input tensor
      const waveformTensor = tf.tensor(waveform);
      
      // Run inference - note the model returns multiple outputs
      const outputs = model.predict(waveformTensor) as tf.Tensor[];
      
      // Get scores (first output tensor)
      const scores = outputs[0];
      
      // Get top 5 predictions
      const topK = 5;
      
      // Mean-aggregate across frames (time dimension)
      const meanScores = scores.mean(0);
      
      // Get the data from the tensor
      const scoreData = await meanScores.data();
      
      // Create array of [score, index] pairs
      const scoreIndices = Array.from(scoreData).map((score, index) => [score, index]);
      
      // Sort by score in descending order
      scoreIndices.sort((a, b) => (b[0] as number) - (a[0] as number));
      
      // Get top K results
      const topKIndices = scoreIndices.slice(0, topK);
      
      // Get class names from config
      const isWeb = Platform.OS === 'web';
      const classNames = getModelCapabilities('yamnet', isWeb).classes;
      
      // Format results
      const classificationResults: ClassificationResult[] = topKIndices.map(([probability, index]) => {
        const idx = index as number;
        return {
          className: idx < classNames.length ? classNames[idx] : `Unknown (${idx})`,
          probability: probability as number
        };
      });
      
      setClassificationResults(classificationResults);
      
      // Clean up tensors
      waveformTensor.dispose();
      meanScores.dispose();
      outputs.forEach(tensor => tensor.dispose());
      
    } catch (error) {
      console.error('Error classifying audio:', error);
      setError('Failed to classify audio: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  // Prefix with underscore to indicate it's unused
  const _loadClassNames = async (): Promise<string[]> => {
    const isWeb = Platform.OS === 'web';
    setIsLoading(false);
    return getModelCapabilities('yamnet', isWeb).classes;
  };

  // Prefix with underscore to indicate it's unused
  const _testModel = async () => {
    try {
      setIsLoading(true);
      setStatus('Testing model...');
      
      // Use the accessible function instead
      await runTensorFlowAndModel();
      
      // Add null check for model
      if (!model) {
        setStatus('Model not loaded');
        return;
      }
      
      // Create a zero waveform like in the example
      const waveform = tf.zeros([16000 * 3]);
      
      // Run inference
      const [scores, embeddings, spectrogram] = model.predict(waveform) as tf.Tensor[];
      
      // Get the top class
      const meanScores = scores.mean(0);
      const topClass = meanScores.argMax();
      
      // Get the class index
      const classIndex = await topClass.data();
      
      setStatus(`Test successful! Top class index: ${classIndex[0]}`);
      
      // Clean up
      waveform.dispose();
      scores.dispose();
      embeddings.dispose();
      spectrogram.dispose();
      meanScores.dispose();
      topClass.dispose();
      
    } catch (error) {
      console.error('Error testing model:', error);
      setError('Test failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper withScrollView>
        <Text style={styles.header}>Audio Classifier</Text>
        
        <Notice 
          type="info"
          title="Audio Classification"
          message="This demo uses TensorFlow.js to classify audio files. Select an audio file and the model will identify the sound category."
        />
        
        {/* Model loading indicator */}
        {isModelLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 10 }}>{status}</Text>
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={pickAudioFile} 
            disabled={isLoading || isModelLoading}
          >
            <Text style={styles.buttonText}>Select Audio File</Text>
          </TouchableOpacity>
             <TouchableOpacity 
                        style={styles.button}
                        onPress={handleLoadSampleAudio}
                        disabled={isSampleLoading}
                    >
                        <Text style={styles.buttonText}>Load Sample</Text>
                    </TouchableOpacity>
        </View>
        
        {fileName && (
          <Text style={styles.fileInfo}>Selected file: {fileName}</Text>
        )}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={classifyAudio} 
            disabled={!audioUri || isLoading || isModelLoading || !model}
          >
            <Text style={styles.buttonText}>Classify Audio</Text>
          </TouchableOpacity>
        </View>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        {classificationResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultHeader}>Classification Results</Text>
            {classificationResults.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <Text style={styles.className}>{result.className}</Text>
                <Text style={styles.probability}>
                  {(result.probability * 100).toFixed(2)}%
                </Text>
              </View>
            ))}
          </View>
        )}
    </ScreenWrapper>
  );
};

export default ClassifyPage;