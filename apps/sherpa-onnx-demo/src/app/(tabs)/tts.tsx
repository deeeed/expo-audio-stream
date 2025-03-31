import type { TtsGenerateResult, TtsInitResult, TtsModelConfig, TtsModelType, ModelProvider } from '@siteed/sherpa-onnx.rn';
import { TTS } from '@siteed/sherpa-onnx.rn';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModelManagement } from '../../contexts/ModelManagement';

// Default sample text for TTS
const DEFAULT_TEXT = "Hello, this is a test of the Sherpa Onnx TTS system. I hope you're having a great day!";

// Helper function to verify file existence
const verifyFileExists = async (filePath: string): Promise<boolean> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  } catch (error) {
    console.error(`Error checking file existence: ${filePath}`, error);
    return false;
  }
};


export default function TtsScreen() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  
  // TTS state variables
  const [ttsInitialized, setTtsInitialized] = useState(false);
  const [initResult, setInitResult] = useState<TtsInitResult | null>(null);
  const [ttsResult, setTtsResult] = useState<TtsGenerateResult | null>(null);
  const [speakerId, setSpeakerId] = useState(0);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [numThreads, setNumThreads] = useState(2);
  const [debugMode, setDebugMode] = useState(false);
  const [provider, setProvider] = useState<ModelProvider>('cpu');
  const [autoPlay, setAutoPlay] = useState(true);
  // Add state for visualizing config
  const [configToVisualize, setConfigToVisualize] = useState<TtsModelConfig | null>(null);

  const {
    getDownloadedModels,
    getModelState
  } = useModelManagement();

  // Get only downloaded TTS models
  const availableModels = getDownloadedModels().filter(model => model.metadata.type === 'tts');

  // Initialize audio system on component mount
  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
        console.log('Audio system initialized successfully');
      } catch (error) {
        console.error('Failed to initialize audio system:', error);
      }
    }
    
    setupAudio();
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const handleInitTts = async () => {
    if (!selectedModelId) {
      setErrorMessage('Please select a model first');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Initializing TTS...');

    try {
      const modelState = getModelState(selectedModelId);
      const modelMetadata = availableModels.find(m => m.metadata.id === selectedModelId)?.metadata;

      // --- Add detailed logging before the check ---
      console.log('[DEBUG] Checking model validity:');
      console.log(`  - modelState found: ${!!modelState}`);
      console.log(`  - modelState.localPath: ${modelState?.localPath}`);
      console.log(`  - modelMetadata found: ${!!modelMetadata}`);
      console.log(`  - modelMetadata.type: ${modelMetadata?.type}`);
      console.log(`  - modelMetadata has ttsParams: ${!!modelMetadata?.ttsParams}`);
      console.log(`  - modelMetadata.ttsParams content:`, modelMetadata?.ttsParams); // Log the content too
      // --- End detailed logging ---

      if (!modelState?.localPath || !modelMetadata || modelMetadata.type !== 'tts' || !modelMetadata.ttsParams) {
        throw new Error('Selected model is not a valid TTS model or files not found locally.');
      }

      // Use the cleaned path (without file://) for FileSystem operations and native module
      const cleanLocalPath = modelState.localPath.replace('file://', '');
      console.log(`Using model directory: ${cleanLocalPath}`);

      // Get ttsParams from the metadata
      const ttsParams = modelMetadata.ttsParams;
      console.log(`ttsParams`, JSON.stringify(ttsParams, null, 2));

      // Create configuration for TTS initialization based on model type
      const modelConfig: TtsModelConfig = {
        modelDir: cleanLocalPath,
        ttsModelType: ttsParams.ttsModelType as TtsModelType,
        modelFile: ttsParams.modelFile as string,
        tokensFile: ttsParams.tokensFile as string,
        numThreads,  // Use value from UI
        debug: debugMode,  // Use debug mode from UI
        provider,  // Use provider from UI
      };

      // Add data directory if available
      if (ttsParams.dataDir) {
        modelConfig.dataDir = ttsParams.dataDir;
      }

      // Add model-specific parameters
      if (ttsParams.ttsModelType === 'vits') {
        // Add lexicon for VITS if available
        if (ttsParams.lexiconFile) {
          modelConfig.lexiconFile = ttsParams.lexiconFile;
        }
      } 
      else if (ttsParams.ttsModelType === 'matcha') {
        // For Matcha models, set vocoder
        if (ttsParams.vocoderFile) {
          modelConfig.vocoderFile = ttsParams.vocoderFile;
        }
        // Add lexicon if available
        if (ttsParams.lexiconFile) {
          modelConfig.lexiconFile = ttsParams.lexiconFile;
        }
      }
      else if (ttsParams.ttsModelType === 'kokoro') {
        // For Kokoro models, set voices file
        if (ttsParams.voicesFile) {
          modelConfig.voicesFile = ttsParams.voicesFile;
        }
      }
      
      console.log('FINAL TTS CONFIG:', JSON.stringify(modelConfig, null, 2));
      
      // Set the config for visualization
      setConfigToVisualize(modelConfig);
      
      const result = await TTS.initialize(modelConfig);
      setInitResult(result);
      setTtsInitialized(result.success);

      if (result.success) {
        setStatusMessage(`TTS initialized successfully! Sample rate: ${result.sampleRate}Hz, Speakers: ${result.numSpeakers}`);
      } else {
        setErrorMessage(`TTS initialization failed: ${result.error}`);
      }
    
    } catch (error) {
      console.error('TTS init error:', error);
      setErrorMessage(`TTS init error: ${(error as Error).message}`);
      setTtsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTts = async () => {
    if (!ttsInitialized) {
      setErrorMessage('TTS must be initialized first');
      return;
    }

    if (!text.trim()) {
      setErrorMessage('Please enter text to speak');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Generating speech...');

    try {
      const result = await TTS.generateSpeech(text, {
        speakerId,
        speakingRate,
        playAudio: autoPlay
      });

      // Success case - either we have a file path or the audio was played directly
      if (result.success || result.filePath) {
        setStatusMessage('Speech generated successfully!');
        
        if (result.filePath) {
          // Add file:// prefix if needed for Audio API
          const formattedPath = result.filePath.startsWith('file://') 
            ? result.filePath 
            : `file://${result.filePath}`;
          
          // Verify the file exists
          const fileExists = await verifyFileExists(formattedPath);
          
          if (fileExists) {
            console.log(`Generated audio file at: ${result.filePath}`);
            
            // Store the result
            setTtsResult(result);
            
            // If not auto-playing but we want to play manually, create and play the sound
            if (!autoPlay) {
              // Create a new sound object and play it if requested
              try {
                if (sound) {
                  await sound.unloadAsync();
                }
                // Use formattedPath for Audio API
                const { sound: newSound } = await Audio.Sound.createAsync({ uri: formattedPath });
                setSound(newSound);
                
                // Setup playback status listener
                newSound.setOnPlaybackStatusUpdate((status) => {
                  if (status.isLoaded) {
                    setIsPlaying(status.isPlaying);
                    if (status.didJustFinish) {
                      setIsPlaying(false);
                    }
                  }
                });
                
                setStatusMessage('Audio ready. Use the play button to listen.');
              } catch (audioError) {
                console.error('Error creating sound object:', audioError);
                setErrorMessage(`Error preparing audio: ${(audioError as Error).message}`);
              }
            }
          } else {
            console.error(`Generated audio file does not exist: ${formattedPath}`);
            // Create a basic error result with only valid fields
            setTtsResult({
              success: false,
              filePath: result.filePath
            });
            setErrorMessage('Generated audio file not found.');
          }
        } else if (autoPlay) {
          // Audio was played directly without saving to file
          setStatusMessage('Speech played successfully!');
        }
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
      console.log('Stopping TTS generation...');
      setStatusMessage('Stopping TTS...');
      
      // Don't set isLoading to true here, since we're trying to stop the process
      // This will keep the UI responsive
      
      // Call the stop API
      const result = await TTS.stopSpeech();
      console.log('Stop TTS result:', result);
      
      if (result.stopped) {
        setStatusMessage('TTS stopped successfully');
        // Force loading state to false
        setIsLoading(false);
      } else {
        // If the backend reports failure, show error message
        setErrorMessage(`Failed to stop TTS: ${result.message || 'Unknown error'}`);
        console.error('Failed to stop TTS:', result.message);
      }
    } catch (error) {
      const errorMsg = `Stop TTS error: ${(error as Error).message}`;
      console.error(errorMsg, error);
      setErrorMessage(errorMsg);
    } finally {
      // Always ensure loading state is reset
      setIsLoading(false);
    }
  };

  const handleReleaseTts = async () => {
    try {
      const result = await TTS.release();
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

  const handlePlayAudio = async () => {
    if (!ttsResult?.filePath) {
      setErrorMessage('No audio file available to play');
      return;
    }
    
    try {
      console.log('Attempting to play audio file:', ttsResult.filePath);
      
      // Format the path properly with file:// prefix
      const formattedPath = ttsResult.filePath.startsWith('file://') 
        ? ttsResult.filePath 
        : `file://${ttsResult.filePath}`;
        
      console.log('Formatted path for audio playback:', formattedPath);
      
      // Ensure audio mode is set up correctly
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
      
      // Always create a new sound object to ensure fresh playback
      if (sound) {
        console.log('Unloading existing sound');
        await sound.unloadAsync();
      }
      
      console.log('Creating new sound object');
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: formattedPath },
        { shouldPlay: true, volume: 1.0, progressUpdateIntervalMillis: 200 }
      );
      
      newSound.setOnPlaybackStatusUpdate((status) => {
        console.log('Playback status update:', status);
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            console.log('Audio playback finished');
            setIsPlaying(false);
          }
        } else if (status.error) {
          console.error(`Audio playback error: ${status.error}`);
          setErrorMessage(`Audio playback error: ${status.error}`);
        }
      });
      
      setSound(newSound);
      setIsPlaying(true);
      console.log('Audio playback started');
      
      // Play the sound explicitly (though it should auto-play from options)
      await newSound.playAsync();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      setErrorMessage(`Error playing audio: ${(error as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Loading overlay with embedded Stop button */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>
                {statusMessage || 'Processing...'}
              </Text>
              
              <Text style={styles.loadingSubText}>
                This may take a moment, especially for longer text.
              </Text>
              
              <TouchableOpacity 
                style={styles.overlayStopButton}
                onPress={handleStopTts}
              >
                <Text style={styles.overlayStopButtonText}>Stop Processing</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      
        <Text style={styles.title}>Sherpa Onnx TTS</Text>
        
        {/* Error and status messages */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        
        {statusMessage ? (
          <Text style={styles.statusText}>{statusMessage}</Text>
        ) : null}

        {/* Model Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select TTS Model</Text>
          <View style={styles.pickerContainer}>
            {availableModels.length === 0 ? (
              <Text style={styles.emptyText}>
                No TTS models downloaded. Please visit the Models screen to download a model.
              </Text>
            ) : (
              availableModels.map((model) => (
                <TouchableOpacity
                  key={model.metadata.id}
                  style={[
                    styles.modelOption,
                    selectedModelId === model.metadata.id && styles.modelOptionSelected
                  ]}
                  onPress={() => setSelectedModelId(model.metadata.id)}
                >
                  <Text 
                    style={[
                      styles.modelOptionText,
                      selectedModelId === model.metadata.id && styles.modelOptionTextSelected
                    ]}
                  >
                    {model.metadata.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* TTS Configuration (Moved BEFORE initialization) */}
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>2. TTS Configuration</Text>
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Number of Threads:</Text>
            <TextInput
              style={styles.configInput}
              keyboardType="numeric"
              value={numThreads.toString()}
              onChangeText={(value) => {
                const threadCount = parseInt(value);
                if (!isNaN(threadCount) && threadCount > 0) {
                  setNumThreads(threadCount);
                }
              }}
            />
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Provider:</Text>
            <View style={styles.providerContainer}>
              <TouchableOpacity
                style={[
                  styles.providerOption,
                  provider === 'cpu' && styles.providerOptionSelected
                ]}
                onPress={() => setProvider('cpu')}
              >
                <Text style={[
                  styles.providerOptionText,
                  provider === 'cpu' && styles.providerOptionTextSelected
                ]}>CPU</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.providerOption,
                  provider === 'gpu' && styles.providerOptionSelected
                ]}
                onPress={() => setProvider('gpu')}
              >
                <Text style={[
                  styles.providerOptionText,
                  provider === 'gpu' && styles.providerOptionTextSelected
                ]}>GPU</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Debug Mode:</Text>
            <Switch
              value={debugMode}
              onValueChange={setDebugMode}
            />
          </View>
        </View>

        {/* TTS Controls */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.initButton,
              (!selectedModelId || isLoading) && styles.buttonDisabled
            ]} 
            onPress={handleInitTts}
            disabled={isLoading || !selectedModelId}
          >
            <Text style={styles.buttonText}>Initialize TTS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.releaseButton,
              (!ttsInitialized || isLoading) && styles.buttonDisabled
            ]} 
            onPress={handleReleaseTts}
            disabled={isLoading || !ttsInitialized}
          >
            <Text style={styles.buttonText}>Release TTS</Text>
          </TouchableOpacity>
        </View>

        {/* Text input (only show if initialized) */}
        {ttsInitialized && (
          <>
            <TextInput
              style={styles.textInput}
              multiline
              value={text}
              onChangeText={setText}
              placeholder="Enter text to speak"
            />

            {/* TTS Generation Configuration */}
            <View style={styles.configSection}>
              <Text style={styles.sectionTitle}>Speech Generation</Text>
              
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Speaker ID:</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={speakerId.toString()}
                  onChangeText={(value) => setSpeakerId(parseInt(value) || 0)}
                />
              </View>
              
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Speaking Rate:</Text>
                <TextInput
                  style={styles.configInput}
                  keyboardType="numeric"
                  value={speakingRate.toString()}
                  onChangeText={(value) => setSpeakingRate(parseFloat(value) || 1.0)}
                />
              </View>
              
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Auto-play Audio:</Text>
                <Switch
                  value={autoPlay}
                  onValueChange={setAutoPlay}
                />
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.generateButton,
                  isLoading && styles.buttonDisabled
                ]} 
                onPress={handleGenerateTts}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>Generate Speech</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* TTS Status (only show if initialized) */}
        {initResult && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>TTS Status</Text>
            <Text style={styles.statusDetail}>
              Initialized: {ttsInitialized ? 'Yes' : 'No'}
            </Text>
            {initResult.sampleRate && (
              <Text style={styles.statusDetail}>
                Sample Rate: {initResult.sampleRate}Hz
              </Text>
            )}
            {initResult.numSpeakers && initResult.numSpeakers > 1 && (
              <Text style={styles.statusDetail}>
                Available Speakers: {initResult.numSpeakers}
              </Text>
            )}
          </View>
        )}
        
        {/* Generated Audio File Info */}
        {ttsResult && ttsResult.filePath && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Generated Audio</Text>
            
            {/* File info */}
            <View style={styles.fileInfoContainer}>
              <Text style={styles.statusDetail}>
                <Text style={styles.statusDetailLabel}>File:</Text> {ttsResult.filePath.split('/').pop()}
              </Text>
              
              <Text style={styles.statusDetail}>
                <Text style={styles.statusDetailLabel}>Location:</Text> {ttsResult.filePath}
              </Text>
            </View>
            
            {/* Audio Player */}
            <View style={styles.audioPlayerFullContainer}>
              <Text style={styles.audioPlayerTitle}>
                {isPlaying ? "Playing Audio..." : "Audio Ready To Play"}
              </Text>
              
              <View style={styles.audioPlayerContainer}>
                <TouchableOpacity 
                  style={[
                    styles.audioPlayButton,
                    isPlaying && styles.audioPlayButtonDisabled
                  ]} 
                  onPress={handlePlayAudio}
                  disabled={isPlaying}
                >
                  <Text style={styles.audioPlayButtonText}>
                    {isPlaying ? 'Playing...' : 'Play Audio'}
                  </Text>
                </TouchableOpacity>
                
                {isPlaying ? (
                  <TouchableOpacity
                    style={styles.audioStopButton}
                    onPress={async () => {
                      if (sound) {
                        await sound.stopAsync();
                        setIsPlaying(false);
                      }
                    }}
                  >
                    <Text style={styles.audioStopButtonText}>
                      Stop
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.audioResetButton}
                    onPress={async () => {
                      if (sound) {
                        // Reset the sound to beginning
                        await sound.setPositionAsync(0);
                      }
                    }}
                  >
                    <Text style={styles.audioResetButtonText}>
                      Reset
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Display Config for Debugging */} 
        {configToVisualize && ( 
          <View style={styles.statusSection}> 
            <Text style={styles.sectionTitle}>Config Sent to Native:</Text> 
            <Text style={styles.codeText} selectable> 
              {JSON.stringify(configToVisualize, null, 2)} 
            </Text> 
          </View> 
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 250,
    maxWidth: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubText: {
    marginBottom: 16,
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
  overlayStopButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  overlayStopButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  pickerContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modelOption: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modelOptionSelected: {
    backgroundColor: '#2196F3',
  },
  modelOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modelOptionTextSelected: {
    color: '#fff',
  },
  providerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  providerOption: {
    flex: 1,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  providerOptionSelected: {
    backgroundColor: '#2196F3',
  },
  providerOptionText: {
    fontSize: 14,
    color: '#333',
  },
  providerOptionTextSelected: {
    color: '#fff',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  statusText: {
    color: '#2196F3',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  textInput: {
    marginHorizontal: 16,
    padding: 16,
    minHeight: 100,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
  },
  initButton: {
    backgroundColor: '#2196F3',
  },
  releaseButton: {
    backgroundColor: '#757575',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  playButton: {
    backgroundColor: '#9C27B0',
  },
  configSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  configLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  configInput: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 16,
  },
  statusSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  statusDetail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  statusDetailLabel: {
    fontWeight: 'bold',
  },
  fileInfoContainer: {
    marginBottom: 16,
  },
  audioPlayerFullContainer: {
    marginBottom: 16,
  },
  audioPlayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  audioPlayButton: {
    backgroundColor: '#9C27B0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  audioPlayButtonDisabled: {
    opacity: 0.6,
  },
  audioPlayButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  audioStopButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  audioStopButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  audioResetButton: {
    backgroundColor: '#9C27B0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  audioResetButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Add style for code text
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 4,
  },
}); 