import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Platform, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SherpaOnnx from '@siteed/sherpa-onnx.rn';
import type { TtsModelConfig, TtsInitResult, TtsGenerateResult } from '@siteed/sherpa-onnx.rn';

export default function TtsScreen() {
  // State
  const [ttsInitialized, setTtsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // TTS configuration
  const [textToSpeak, setTextToSpeak] = useState<string>('Hello, this is a test of Sherpa ONNX text to speech.');
  const [speakerId, setSpeakerId] = useState<number>(0);
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  
  // Results
  const [initResult, setInitResult] = useState<TtsInitResult | null>(null);
  const [ttsResult, setTtsResult] = useState<TtsGenerateResult | null>(null);

  // Check if library is loaded on component mount
  useEffect(() => {
    checkLibraryStatus();
  }, []);

  const checkLibraryStatus = async () => {
    try {
      const validation = await SherpaOnnx.validateLibraryLoaded();
      if (!validation.loaded) {
        setErrorMessage(`Library validation failed: ${validation.status}`);
      } else {
        setStatusMessage('Library validation successful. Ready to initialize TTS.');
      }
    } catch (error) {
      setErrorMessage(`Error validating library: ${(error as Error).message}`);
    }
  };

  const handleInitTts = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Initializing TTS...');
    
    try {
      // For testing - use bundled assets directory path
      const modelConfig: TtsModelConfig = {
        modelDir: Platform.OS === 'android' 
          ? 'models'  // This would be in the Android assets directory
          : 'models', // For iOS, this would be in the bundle
        numThreads: 1
      };
      
      console.log('Initializing TTS with config:', modelConfig);
      
      // Fix: Use SherpaOnnx.validateLibraryLoaded instead of this.validateLibrary
      const validation = await SherpaOnnx.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }
      
      // Use the service instead of direct API
      const result = await SherpaOnnx.TTS.initialize(modelConfig);
      setInitResult(result);
      setTtsInitialized(result.success);
      
      if (result.success) {
        setStatusMessage(`TTS initialized successfully. Sample rate: ${result.sampleRate}Hz, Speakers: ${result.numSpeakers}`);
      } else {
        setErrorMessage('TTS initialization failed');
      }
    } catch (error) {
      const errorMsg = `TTS init error: ${(error as Error).message}`;
      setErrorMessage(errorMsg);
      setTtsInitialized(false);
      console.error('TTS initialization error details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTts = async () => {
    if (!ttsInitialized) {
      setErrorMessage('TTS must be initialized first');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Generating speech...');
    
    try {
      // Use the service instead of direct API
      const result = await SherpaOnnx.TTS.generateSpeech(textToSpeak, {
        speakerId,
        speakingRate,
        playAudio: true
      });
      
      setTtsResult(result);
      
      if (result.success) {
        setStatusMessage('Speech generated successfully!');
      } else {
        setErrorMessage('TTS generation failed');
      }
    } catch (error) {
      setErrorMessage(`TTS generation error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTts = async () => {
    try {
      // Use the service instead of direct API
      const result = await SherpaOnnx.TTS.stopSpeech();
      if (result.stopped) {
        setStatusMessage('TTS stopped successfully');
      } else {
        setErrorMessage(`Failed to stop TTS: ${result.message}`);
      }
    } catch (error) {
      setErrorMessage(`Stop TTS error: ${(error as Error).message}`);
    }
  };

  const handleReleaseTts = async () => {
    try {
      // Use the service instead of direct API
      const result = await SherpaOnnx.TTS.release();
      if (result.released) {
        setTtsInitialized(false);
        setInitResult(null);
        setTtsResult(null);
        setStatusMessage('TTS resources released');
      } else {
        setErrorMessage('Failed to release TTS resources');
      }
    } catch (error) {
      setErrorMessage(`Release TTS error: ${(error as Error).message}`);
    }
  };

  const handleSpeakingRateChange = (text: string) => {
    const rate = parseFloat(text);
    if (!isNaN(rate) && rate >= 0.5 && rate <= 2.0) {
      setSpeakingRate(rate);
    }
  };

  const handleSpeakerIdChange = (text: string) => {
    const id = parseInt(text, 10);
    if (!isNaN(id) && id >= 0) {
      setSpeakerId(id);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Text-to-Speech Demo</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TTS Configuration</Text>
          
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[
              styles.statusValue,
              ttsInitialized ? styles.statusSuccess : styles.statusPending
            ]}>
              {ttsInitialized ? 'Initialized' : 'Not Initialized'}
            </Text>
          </View>
          
          {!ttsInitialized ? (
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleInitTts}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Initialize TTS</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              {initResult && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>Sample Rate: {initResult.sampleRate}Hz</Text>
                  <Text style={styles.infoText}>Available Speakers: {initResult.numSpeakers}</Text>
                </View>
              )}
              
              <Text style={styles.inputLabel}>Text to speak:</Text>
              <TextInput
                style={styles.textInput}
                value={textToSpeak}
                onChangeText={setTextToSpeak}
                multiline
                placeholder="Enter text to speak"
              />
              
              <View style={styles.paramRow}>
                <View style={styles.paramContainer}>
                  <Text style={styles.inputLabel}>Speaker ID:</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={speakerId.toString()}
                    onChangeText={handleSpeakerIdChange}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                </View>
                
                <View style={styles.paramContainer}>
                  <Text style={styles.inputLabel}>Speaking Rate:</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={speakingRate.toString()}
                    onChangeText={handleSpeakingRateChange}
                    keyboardType="decimal-pad"
                    placeholder="1.0"
                  />
                </View>
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.button, styles.buttonFlex, isLoading && styles.buttonDisabled]}
                  onPress={handleGenerateTts}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Generate Speech</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.buttonFlex, styles.buttonSecondary]}
                  onPress={handleStopTts}
                >
                  <Text style={styles.buttonText}>Stop</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.button, styles.buttonDanger]}
                onPress={handleReleaseTts}
              >
                <Text style={styles.buttonText}>Release TTS Resources</Text>
              </TouchableOpacity>
            </>
          )}
          
          {/* Status and error messages */}
          {statusMessage ? (
            <View style={styles.statusMessageBox}>
              <Text style={styles.statusMessageText}>{statusMessage}</Text>
            </View>
          ) : null}
          
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          
          {/* TTS result display */}
          {ttsResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>TTS Result</Text>
              <Text style={styles.resultText}>Sample Rate: {ttsResult.sampleRate}Hz</Text>
              <Text style={styles.resultText}>Samples: {ttsResult.samplesLength}</Text>
              <Text style={styles.resultText}>File Saved: {ttsResult.saved ? 'Yes' : 'No'}</Text>
              <Text style={styles.resultText}>File Path: {ttsResult.filePath}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSuccess: {
    color: '#4CAF50',
  },
  statusPending: {
    color: '#FF9800',
  },
  infoBox: {
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#0066CC',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paramContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonFlex: {
    flex: 1,
    marginHorizontal: 4,
  },
  buttonSecondary: {
    backgroundColor: '#FF9800',
  },
  buttonDanger: {
    backgroundColor: '#F44336',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusMessageBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  statusMessageText: {
    color: '#388E3C',
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    color: '#D32F2F',
  },
  resultBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#555',
  },
}); 