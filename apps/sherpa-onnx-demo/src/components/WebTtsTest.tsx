import React, { useState, useEffect } from 'react';
import { Platform, Text, TouchableOpacity, StyleSheet, View, TextInput } from 'react-native';
import { TTS } from '@siteed/sherpa-onnx.rn';

// This component is only used on web platform to test the WASM implementation
const WebTtsTest: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [text, setText] = useState("Hello, this is a test of the WebAssembly TTS engine.");
  const [speakerId, setSpeakerId] = useState(0);
  const [speakingRate, setSpeakingRate] = useState(1.0);

  // Check if we're on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  const handleInit = async () => {
    try {
      setIsLoading(true);
      setMessage('Initializing TTS...');

      // This is a test configuration - in a real app, you would load proper model files
      // The web version loads from the public/wasm directory
      const result = await TTS.initialize({
        modelDir: '/wasm/tts',  // Path relative to public directory on web
        ttsModelType: 'vits',
        modelFile: 'model.onnx',
        tokensFile: 'tokens.txt',
        numThreads: 1,
        debug: true,
        provider: 'cpu',
      });

      if (result.success) {
        setIsInitialized(true);
        setMessage(`TTS initialized successfully! Sample rate: ${result.sampleRate}Hz, Speakers: ${result.numSpeakers}`);
      } else {
        setMessage(`TTS initialization failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!isInitialized) {
      setMessage('Please initialize TTS first');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('Generating speech...');

      const result = await TTS.generateSpeech(text, {
        speakerId,
        speakingRate,
        playAudio: true
      });

      if (result.success) {
        setMessage('Speech generated and played successfully!');
      } else {
        setMessage('Speech generation failed');
      }
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async () => {
    try {
      const result = await TTS.release();
      if (result.released) {
        setIsInitialized(false);
        setMessage('TTS resources released');
      } else {
        setMessage('Failed to release TTS resources');
      }
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Web TTS Test (WASM)</Text>
      
      {isLoading && (
        <Text style={styles.loadingText}>Loading...</Text>
      )}
      
      {message ? (
        <Text style={styles.messageText}>{message}</Text>
      ) : null}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleInit}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Initialize TTS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, (!isInitialized || isLoading) && styles.buttonDisabled]} 
          onPress={handleRelease}
          disabled={!isInitialized || isLoading}
        >
          <Text style={styles.buttonText}>Release TTS</Text>
        </TouchableOpacity>
      </View>
      
      {isInitialized && (
        <>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Enter text to speak"
            multiline
          />
          
          <View style={styles.paramContainer}>
            <Text>Speaker ID:</Text>
            <TextInput
              style={styles.paramInput}
              value={speakerId.toString()}
              onChangeText={(value) => setSpeakerId(parseInt(value) || 0)}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.paramContainer}>
            <Text>Speaking Rate:</Text>
            <TextInput
              style={styles.paramInput}
              value={speakingRate.toString()}
              onChangeText={(value) => setSpeakingRate(parseFloat(value) || 1.0)}
              keyboardType="numeric"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.button, styles.generateButton, isLoading && styles.buttonDisabled]} 
            onPress={handleGenerate}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Generate & Play Speech</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  paramContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paramInput: {
    backgroundColor: 'white',
    borderRadius: 4,
    padding: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: 80,
  },
  generateButton: {
    backgroundColor: '#34C759',
    marginTop: 8,
  },
});

export default WebTtsTest; 