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
import { loadModelFromAssets } from '../utils/tensorflowIO';

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

export const ClassifyPage = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles({ theme, insets }), [theme, insets]);
  const { show } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [_sound, _setSound] = useState<Audio.Sound | null>(null);
  const [_isPlaying, _setIsPlaying] = useState(false);
  const [_audioData, _setAudioData] = useState<Float32Array | null>(null);
  const [_classifying, _setClassifying] = useState(false);
  
  // Check platform
  const isWeb = Platform.OS === 'web';
  
  // Move loadModel inside the component where it belongs
  const loadModel = useCallback(async (): Promise<tf.GraphModel> => {
    try {
      logger.info('Starting model loading process');
      setLoading(true);
      setStatus('Loading TensorFlow...');
      
      await tf.ready();
      logger.info('TensorFlow.js is ready');
      setStatus('Loading model...');
      
      // Use our custom model loader that handles both web and native
      const modelPath = Platform.OS === 'web' 
        ? '/assets/model/model.json'  // Web path (public folder)
        : 'model/model.json';         // Native path (relative to document directory)
      
      logger.info(`Loading model from path: ${modelPath} on platform: ${Platform.OS}`);
      
      // Use the loadModelFromAssets utility we created
      const loadedModel = await loadModelFromAssets(modelPath);
      
      logger.info('Model loaded successfully', { 
        modelType: loadedModel.constructor.name,
        inputNodes: loadedModel.inputs.map(i => i.name),
        outputNodes: loadedModel.outputs.map(o => o.name)
      });
      
      return loadedModel;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load model', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
      setError(`Failed to load model: ${errorMessage}`);
      throw error;
    }
  }, [setLoading, setStatus, setError]);
  
  // Initialize TensorFlow and load model
  const runTensorFlowAndModel = useCallback(async () => {
    try {
      logger.info('Initializing TensorFlow and model');
      setLoading(true);
      setStatus('Initializing TensorFlow...');
      
      if (!model) {
        // Configure TensorFlow.js for the platform
        if (Platform.OS !== 'web') {
          logger.info('Setting up TensorFlow backend for native platform');
          await tf.setBackend('rn-webgl');
          logger.info('Backend set to rn-webgl');
        } else {
          logger.info('Using default TensorFlow backend for web');
        }
        
        // Initialize TensorFlow
        await tf.ready();
        logger.info('TensorFlow initialized successfully');
        
        // Load the model using our loadModel function
        const loadedModel = await loadModel();
        setModel(loadedModel);
      } else {
        logger.info('Model already loaded, skipping initialization');
      }
      
      setStatus('Model loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Failed to initialize TensorFlow', { 
        error: errorMessage, 
        stack: err instanceof Error ? err.stack : undefined,
        platform: Platform.OS
      });
      setError(`Failed to initialize: ${errorMessage}`);
      show({
        type: 'error',
        message: 'Failed to load model',
        duration: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [model, loadModel, setLoading, setStatus, setError, setModel, show]);
  
  // Load TensorFlow and model on component mount
  useEffect(() => {
    runTensorFlowAndModel();
    
    // Cleanup
    return () => {
      if (model) {
        logger.info('Disposing model resources');
        model.dispose();
      }
    };
  }, [runTensorFlowAndModel, model]);

  const pickAudioFile = async () => {
    try {
      logger.info('Starting audio file selection');
      if (Platform.OS === 'web') {
        // For web, use the browser's file input
        logger.info('Using web file input');
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
              setAudioName(file.name);
              resolve();
            } else {
              reject(new Error('No file selected'));
            }
          };
          
          input.click();
        });
      } else {
        // For native, use DocumentPicker
        logger.info('Using document picker for native platform');
        const result = await DocumentPicker.getDocumentAsync({
          type: ['audio/*'],
          copyToCacheDirectory: true,
        });
        
        if (result.canceled) {
          return;
        }
        
        const asset = result.assets[0];
        setAudioUri(asset.uri);
        setAudioName(asset.name);
      }
      logger.info('Audio file selected successfully', { uri: audioUri });
      
      if (audioUri) {
        const processedData = await preprocessAudio(audioUri);
        if (processedData) {
          _setAudioData(processedData);
          logger.info('Audio data processed successfully', { 
            dataLength: processedData.length 
          });
        }
      }
    } catch (error) {
      logger.error('Failed to pick audio file', { 
        error: error instanceof Error ? error.message : String(error)
      });
      console.error('Error picking audio file:', error);
      setError('Failed to pick audio file');
    }
  };

  const preprocessAudio = async (audioUri: string): Promise<Float32Array | null> => {
    try {
      logger.info('Starting audio preprocessing', { uri: audioUri });
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
        
        const processedData = extractedData.normalizedData;
        const sampleRate = extractedData.sampleRate;
        const numChannels = extractedData.channels;
        const audioData = extractedData.rawData;
        
        logger.info('Audio preprocessing completed', { 
          sampleRate,
          duration: audioData.length / sampleRate,
          channels: numChannels
        });
        
        return processedData;
      } catch(err) {
        logger.error('Failed to preprocess audio', { 
          error: err instanceof Error ? err.message : String(err),
          uri: audioUri
        });
        console.error('Error preprocessing audio:', err);
        setError('Failed to preprocess audio');
        return null;
      }
  };

  const classifyAudio = async () => {
    try {
      logger.info('Starting audio classification');
      _setClassifying(true);
      setResults([]);
      
      if (!_audioData) {
        logger.warn('No audio data available for classification');
        show({
          type: 'warning',
          message: 'Please select an audio file first',
          duration: 3000
        });
        return;
      }
      
      if (!model) {
        logger.error('Model not loaded for classification');
        show({
          type: 'error',
          message: 'Model not loaded. Please try again.',
          duration: 3000
        });
        return;
      }
      
      // Fix the null check for model
      // Now TypeScript knows model is not null
      const inputTensor = tf.tensor(_audioData);
      const output = model.predict(inputTensor) as tf.Tensor;
      
      // Get scores (first output tensor)
      const scores = output;
      
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
      const classNames = getModelCapabilities('yamnet', isWeb).classes;
      
      // Format results
      const results: ClassificationResult[] = topKIndices.map(([probability, index]) => {
        const idx = index as number;
        return {
          className: idx < classNames.length ? classNames[idx] : `Unknown (${idx})`,
          probability: probability as number
        };
      });
      
      logger.info('Model prediction completed', { 
        outputShape: output.shape,
        topResults: results.slice(0, 3).map(r => `${r.className}: ${r.probability.toFixed(4)}`)
      });
      
      setResults(results);
      
      // Clean up tensors
      inputTensor.dispose();
      output.dispose();
      meanScores.dispose();
      
      logger.info('Classification completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Classification failed', { error: errorMessage });
      console.error('Error classifying audio:', error);
      setError('Failed to classify audio: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      _setClassifying(false);
    }
  };

  // Prefix with underscore to indicate it's unused
  const _loadClassNames = async (): Promise<string[]> => {
    logger.info('Loading class names');
    const isWeb = Platform.OS === 'web';
    setLoading(false);
    return getModelCapabilities('yamnet', isWeb).classes;
  };

  // Prefix with underscore to indicate it's unused
  const _testModel = async () => {
    try {
      logger.info('Running model test');
      setLoading(true);
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
      setLoading(false);
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
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 10 }}>{status}</Text>
          </View>
        )}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={pickAudioFile} 
            disabled={loading}
          >
            <Text style={styles.buttonText}>Select Audio File</Text>
          </TouchableOpacity>
        </View>
        
        {audioName && (
          <Text style={styles.fileInfo}>Selected file: {audioName}</Text>
        )}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={classifyAudio} 
            disabled={!audioUri || loading}
          >
            <Text style={styles.buttonText}>Classify Audio</Text>
          </TouchableOpacity>
        </View>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultHeader}>Classification Results</Text>
            {results.map((result, index) => (
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