import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SherpaOnnx from '@siteed/sherpa-onnx.rn';
import type { TtsInitResult, TtsGenerateResult } from '@siteed/sherpa-onnx.rn/src/types/interfaces';


// Check if Sherpa-ONNX is available and working
const SherpaOnnxDemo: React.FC = () => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [platformSupport, setPlatformSupport] = useState<string>('Checking...');
  const [moduleInfo, setModuleInfo] = useState<string>('Checking...');
  const [validationResult, setValidationResult] = useState<string>('Not validated');
  const [nativeModulesInfo, setNativeModulesInfo] = useState<string>('Loading...');
  
  // TTS states
  const [ttsInitialized, setTtsInitialized] = useState<boolean>(false);
  const [initResult, setInitResult] = useState<TtsInitResult | null>(null);
  const [textToSpeak, setTextToSpeak] = useState<string>('Hello, this is a test of Sherpa ONNX text to speech.');
  const [speakerId, setSpeakerId] = useState<number>(0);
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [ttsResult, setTtsResult] = useState<TtsGenerateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Simple check to see if we're on Android (current implementation only)
    const isAndroid = Platform.OS === 'android';
    setPlatformSupport(isAndroid ? 'Android: Supported' : 'iOS: Not yet implemented');
    
    // Check available native modules
    try {
      const availableModules = Object.keys(NativeModules);
      setNativeModulesInfo(`Available native modules: ${availableModules.join(', ')}`);
    } catch (error) {
      setNativeModulesInfo(`Error getting native modules: ${(error as Error).message}`);
    }
    
    try {
      // Check if the module is properly loaded
      const hasModule = SherpaOnnx !== undefined;
      setIsAvailable(hasModule);
      setModuleInfo(`Module loaded: ${hasModule ? Object.keys(SherpaOnnx).join(', ') : 'None'}`);
      
      // Try to validate the library
      if (hasModule && SherpaOnnx.validateLibraryLoaded) {
        SherpaOnnx.validateLibraryLoaded()
          .then((result: any) => {
            setValidationResult(`Library validation: ${result.loaded ? 'Success' : 'Failed'} - ${result.status}`);
            
            // Add more details on error
            if (!result.loaded) {
              console.error(`Validation details: ${JSON.stringify(result)}`);
            }
          })
          .catch((error: Error) => {
            setValidationResult(`Validation error: ${error.message}`);
            console.error('Validation error details:', error);
          });
      }
    } catch (error) {
      setIsAvailable(false);
      setModuleInfo(`Error: ${(error as Error).message}`);
      console.error('Module loading error details:', error);
    }
  }, []);

  const handleInitTts = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      // For testing - use bundled assets directory path
      const modelConfig = {
        modelDir: Platform.OS === 'android' 
          ? 'models'  // This would be in the Android assets directory
          : 'models', // For iOS, this would be in the bundle
        numThreads: 1
      };
      
      console.log('Initializing TTS with config:', modelConfig);
      
      const result = await SherpaOnnx.initTts(modelConfig);
      setInitResult(result);
      setTtsInitialized(result.success);
      
      if (!result.success) {
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

  const handleGenerateTts = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      if (!ttsInitialized) {
        setErrorMessage('TTS must be initialized first');
        return;
      }
      
      const result = await SherpaOnnx.generateTts(textToSpeak, {
        speakerId,
        speakingRate,
        playAudio: true
      });
      
      setTtsResult(result);
      
      if (!result.success) {
        setErrorMessage('TTS generation failed');
      }
    } catch (error) {
      setErrorMessage(`TTS generation error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTts = async (): Promise<void> => {
    try {
      const result = await SherpaOnnx.stopTts();
      if (result.stopped) {
        setErrorMessage('TTS stopped successfully');
      } else {
        setErrorMessage(`Failed to stop TTS: ${result.message}`);
      }
    } catch (error) {
      setErrorMessage(`Stop TTS error: ${(error as Error).message}`);
    }
  };

  const handleReleaseTts = async (): Promise<void> => {
    try {
      const result = await SherpaOnnx.releaseTts();
      if (result.released) {
        setTtsInitialized(false);
        setInitResult(null);
        setTtsResult(null);
        setErrorMessage('TTS resources released');
      } else {
        setErrorMessage('Failed to release TTS resources');
      }
    } catch (error) {
      setErrorMessage(`Release TTS error: ${(error as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Sherpa-ONNX Demo</Text>
        <Text style={styles.subtitle}>Testing Native Integration</Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Platform Status:</Text>
          <Text style={styles.status}>{platformSupport}</Text>
          
          <Text style={styles.statusTitle}>Native Modules:</Text>
          <Text style={styles.status}>{nativeModulesInfo}</Text>
          
          <Text style={styles.statusTitle}>Sherpa-ONNX Available:</Text>
          <Text style={[
            styles.status, 
            isAvailable === null ? styles.neutral : 
            isAvailable ? styles.positive : styles.negative
          ]}>
            {isAvailable === null ? 'Checking...' : isAvailable ? 'Yes' : 'No'}
          </Text>

          <Text style={styles.statusTitle}>Module Info:</Text>
          <Text style={styles.status}>{moduleInfo}</Text>
          
          <Text style={styles.statusTitle}>Validation:</Text>
          <Text style={styles.status}>{validationResult}</Text>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.cardTitle}>TTS Testing</Text>

          <TouchableOpacity 
            style={[styles.button, (!isAvailable || isLoading) && styles.buttonDisabled]} 
            onPress={handleInitTts}
            disabled={!isAvailable || isLoading}
          >
            <Text style={styles.buttonText}>Initialize TTS</Text>
          </TouchableOpacity>

          {initResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>Init Result: {initResult.success ? 'Success' : 'Failed'}</Text>
              <Text style={styles.resultText}>Sample Rate: {initResult.sampleRate}Hz</Text>
              <Text style={styles.resultText}>Speakers: {initResult.numSpeakers}</Text>
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

          <View style={styles.controlsRow}>
            <TouchableOpacity 
              style={[styles.button, (!ttsInitialized || isLoading) && styles.buttonDisabled]}
              onPress={handleGenerateTts}
              disabled={!ttsInitialized || isLoading}
            >
              <Text style={styles.buttonText}>Generate Speech</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.buttonSecondary, !ttsInitialized && styles.buttonDisabled]}
              onPress={handleStopTts}
              disabled={!ttsInitialized}
            >
              <Text style={styles.buttonText}>Stop TTS</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.button, styles.buttonDanger, !ttsInitialized && styles.buttonDisabled]} 
            onPress={handleReleaseTts}
            disabled={!ttsInitialized}
          >
            <Text style={styles.buttonText}>Release TTS</Text>
          </TouchableOpacity>

          {ttsResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>TTS Result: {ttsResult.success ? 'Success' : 'Failed'}</Text>
              <Text style={styles.resultText}>Sample Rate: {ttsResult.sampleRate}Hz</Text>
              <Text style={styles.resultText}>Samples: {ttsResult.samplesLength}</Text>
              <Text style={styles.resultText}>File Saved: {ttsResult.saved ? 'Yes' : 'No'}</Text>
              <Text style={styles.resultText}>File Path: {ttsResult.filePath}</Text>
            </View>
          )}
          
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  status: {
    fontSize: 16,
    marginBottom: 8,
  },
  positive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  negative: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  neutral: {
    color: '#607D8B',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonSecondary: {
    backgroundColor: '#FF9500',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 80,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultBox: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginTop: 8,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#007AFF',
    fontSize: 16,
  },
});

export default SherpaOnnxDemo; 