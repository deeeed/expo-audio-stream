import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, View, Platform, Image } from 'react-native';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import SherpaOnnx, { TtsModelConfig, TtsInitResult, TtsGenerateResult } from '@siteed/sherpa-onnx.rn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function TtsDemo() {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sampleRate?: number;
    numSpeakers?: number;
    filePath?: string;
    progress?: string;
  } | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [inputText, setInputText] = useState<string>("Hello, this is a test of Sherpa ONNX text to speech.");

  // Initialize the TTS engine when the component mounts
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First validate the library is loaded
        const validateResult = await SherpaOnnx.validateLibraryLoaded();
        if (!validateResult.loaded) {
          throw new Error(`Library validation failed: ${validateResult.status}`);
        }
        
        // Configure TTS
        // Note: This configuration needs to be adjusted based on your actual model files
        const modelConfig: TtsModelConfig = {
          modelDir: 'assets/tts/kokoro-en-v0_19',
          modelName: 'model.onnx',
          voices: 'voices.bin',
          dataDir: 'assets/tts/kokoro-en-v0_19/espeak-ng-data',
        };
        
        // Initialize TTS
        const initResult = await SherpaOnnx.initTts(modelConfig);
        if (!initResult.success) {
          throw new Error('Failed to initialize TTS engine');
        }
        
        setIsInitialized(true);
        setResult({
          sampleRate: initResult.sampleRate,
          numSpeakers: initResult.numSpeakers,
        });
        setIsLoading(false);
      } catch (err: any) {
        console.error('Error initializing TTS:', err);
        setError(`Error initializing TTS: ${err.message}`);
        setIsLoading(false);
      }
    };
    
    init();
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      // Release TTS resources when component unmounts
      SherpaOnnx.releaseTts().catch(console.error);
    };
  }, []);
  
  // Function to generate speech
  const generateSpeech = async () => {
    try {
      if (!isInitialized) {
        setError('TTS engine is not initialized');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      // Stop any playing audio
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      // Generate speech
      const generateResult = await SherpaOnnx.generateTts(inputText, {
        speakerId: 0, // Use first speaker
        speakingRate: 1.0,
        playAudio: false // We'll play with Expo AV instead
      });
      
      if (!generateResult.success) {
        throw new Error('Failed to generate speech');
      }
      
      setResult(prev => ({
        ...prev,
        filePath: generateResult.filePath,
        progress: `Generated ${generateResult.samplesLength} samples at ${generateResult.sampleRate}Hz`
      }));
      
      // Load and play the sound
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: Platform.OS === 'ios' ? generateResult.filePath : `file://${generateResult.filePath}` });
      setSound(newSound);
      
      await newSound.playAsync();
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error generating speech:', err);
      setError(`Error generating speech: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Function to stop playback
  const stopPlayback = async () => {
    try {
      await SherpaOnnx.stopTts();
      
      if (sound) {
        await sound.stopAsync();
      }
    } catch (err: any) {
      console.error('Error stopping playback:', err);
      setError(`Error stopping playback: ${err.message}`);
    }
  };
  
  // Update the input text
  const handleInputChange = (text: string) => {
    setInputText(text);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/sherpa-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="title">Sherpa ONNX TTS Demo</ThemedText>
        </View>
        
        <ThemedView style={styles.inputContainer}>
          <ThemedText type="subtitle">Input Text</ThemedText>
          <TouchableOpacity 
            style={styles.textInput}
            onPress={() => {
              // In a real app, you'd show a text input
              // This is just a placeholder
              alert('In a real app, this would be an editable text field');
            }}
          >
            <ThemedText>{inputText}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={generateSpeech}
            disabled={isLoading || !isInitialized}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>
                Generate Speech
              </ThemedText>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.stopButton]}
            onPress={stopPlayback}
            disabled={!sound}
          >
            <ThemedText style={styles.buttonText}>
              Stop Playback
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        {error && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        )}
        
        {result && (
          <ThemedView style={styles.resultContainer}>
            <ThemedText type="subtitle">TTS Information</ThemedText>
            
            {result.sampleRate && (
              <ThemedText>Sample Rate: {result.sampleRate}Hz</ThemedText>
            )}
            
            {result.numSpeakers && (
              <ThemedText>Available Speakers: {result.numSpeakers}</ThemedText>
            )}
            
            {result.progress && (
              <ThemedText>{result.progress}</ThemedText>
            )}
            
            {result.filePath && (
              <ThemedText>File Path: {result.filePath}</ThemedText>
            )}
          </ThemedView>
        )}
        
        <StatusBar style="auto" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  logo: {
    width: 50,
    height: 50,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
  },
  resultContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
  },
}); 