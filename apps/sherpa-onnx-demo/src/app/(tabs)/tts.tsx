import type { TtsGenerateResult, TtsInitResult, TtsModelConfig } from '@siteed/sherpa-onnx.rn';
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

// First check for espeak-ng-data directory regardless of model type
// This should be done before the model-specific configurations
const findEspeakData = async (basePath: string): Promise<string | null> => {
  // Check directly in the model directory
  const directEspeakPath = `${basePath}/espeak-ng-data`;
  const directInfo = await FileSystem.getInfoAsync(directEspeakPath);
  if (directInfo.exists && directInfo.isDirectory) {
    console.log(`Found espeak-ng-data directly in model directory: ${directEspeakPath}`);
    return directEspeakPath.replace('file://', '');
  }

  // If not found directly, try to find it in subdirectories
  try {
    const files = await FileSystem.readDirectoryAsync(basePath);
    for (const file of files) {
      const subDirPath = `${basePath}/${file}`;
      const fileInfo = await FileSystem.getInfoAsync(subDirPath);
      
      if (fileInfo.exists && fileInfo.isDirectory) {
        // Check if this subdirectory contains espeak-ng-data
        const subDirEspeakPath = `${subDirPath}/espeak-ng-data`;
        const subDirEspeakInfo = await FileSystem.getInfoAsync(subDirEspeakPath);
        
        if (subDirEspeakInfo.exists && subDirEspeakInfo.isDirectory) {
          console.log(`Found espeak-ng-data in subdirectory: ${subDirEspeakPath}`);
          return subDirEspeakPath.replace('file://', '');
        }
      }
    }
  } catch (error) {
    console.error('Error searching for espeak-ng-data:', error);
  }

  console.log('No espeak-ng-data directory found');
  return null;
};

/**
 * Recursively search for an ONNX model file in a directory and its subdirectories
 * @param basePath Base directory path to start searching
 * @returns Object with modelDir and modelName if found, null otherwise
 */
const findModelFileRecursive = async (basePath: string): Promise<{ modelDir: string, modelName: string } | null> => {
  console.log(`Recursively searching for model file in: ${basePath}`);
  
  const searchDirectory = async (dirPath: string, depth = 0): Promise<{ modelDir: string, modelName: string } | null> => {
    if (depth > 5) {
      // Limit recursion depth to prevent infinite loops
      return null;
    }
    
    try {
      // Check files in this directory
      const files = await FileSystem.readDirectoryAsync(`file://${dirPath}`);
      console.log(`Files in ${dirPath}: ${files.join(', ')}`);
      
      // First look for model.onnx
      if (files.includes('model.onnx')) {
        return {
          modelDir: dirPath,
          modelName: 'model.onnx'
        };
      }
      
      // Then look for any .onnx file
      const onnxFile = files.find(file => file.endsWith('.onnx'));
      if (onnxFile) {
        return {
          modelDir: dirPath,
          modelName: onnxFile
        };
      }
      
      // Recursively check subdirectories
      for (const file of files) {
        const subPath = `${dirPath}/${file}`;
        const fileInfo = await FileSystem.getInfoAsync(`file://${subPath}`);
        
        if (fileInfo.exists && fileInfo.isDirectory) {
          const result = await searchDirectory(subPath, depth + 1);
          if (result) return result;
        }
      }
    } catch (error) {
      console.error(`Error searching directory ${dirPath}:`, error);
    }
    
    return null;
  };
  
  return await searchDirectory(basePath);
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
  const [debugMode, setDebugMode] = useState(false);
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

      const ttsParams = modelMetadata.ttsParams;

      // Use the cleaned path (without file://) for FileSystem operations and native module
      const cleanLocalPath = modelState.localPath.replace('file://', '');
      console.log(`Using model directory: ${cleanLocalPath}`);

      // --- Start Simplified Configuration --- 

      const modelConfig: TtsModelConfig = {
        modelDir: cleanLocalPath,
        numThreads: 2,
        debug: debugMode,
        modelType: ttsParams.ttsModelType, // Use pre-defined model type
        modelFile: ttsParams.modelFile,   // Use pre-defined model file name
        tokensFile: ttsParams.tokensFile, // Use pre-defined tokens file name
        // Pass the dataDir (expected to be relative) from ttsParams
        dataDir: ttsParams.dataDir, 
      };

      // Add optional VITS parameters if present in metadata
      if (ttsParams.ttsModelType === 'vits') {
        if (ttsParams.lexiconFile) {
          modelConfig.lexicon = ttsParams.lexiconFile; // Pass relative name
        }
        // Set default VITS noise/length scales (can be overridden per-generation)
        modelConfig.noiseScale = 0.667;
        modelConfig.noiseScaleW = 0.8;
        modelConfig.lengthScale = 1.0;
      } 
      
      // Add optional Kokoro parameters
      else if (ttsParams.ttsModelType === 'kokoro') {
        if (ttsParams.voicesFile) {
          modelConfig.voices = ttsParams.voicesFile; // Pass relative name
        }
      } 
      
      // Add optional Matcha parameters
      else if (ttsParams.ttsModelType === 'matcha') {
        if (ttsParams.acousticModelFile) {
          // Pass relative name
          modelConfig.acousticModelName = ttsParams.acousticModelFile; 
        }
        if (ttsParams.vocoderFile) {
          modelConfig.vocoder = ttsParams.vocoderFile; // Pass relative name
          // Android maps 'voices' to 'vocoder' internally for Matcha
          modelConfig.voices = ttsParams.vocoderFile; // Pass relative name
        }
      }
      
      // Set the config for visualization BEFORE initializing
      setConfigToVisualize(modelConfig);
      
      console.log('Initializing TTS with simplified config:', JSON.stringify(modelConfig, null, 2));
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
      const result = await TTS.stopSpeech();
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
    if (!ttsResult?.filePath || !sound) {
      setErrorMessage('No audio available to play');
      return;
    }
    
    try {
      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      setErrorMessage(`Error playing audio: ${(error as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Processing...</Text>
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

        <TextInput
          style={styles.textInput}
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Enter text to speak"
        />

        {/* TTS Configuration */}
        {ttsInitialized && (
          <View style={styles.configSection}>
            <Text style={styles.sectionTitle}>TTS Configuration</Text>
            
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
              <Text style={styles.configLabel}>Debug Mode:</Text>
              <Switch
                value={debugMode}
                onValueChange={setDebugMode}
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
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.generateButton,
              (!ttsInitialized || isLoading) && styles.buttonDisabled
            ]} 
            onPress={handleGenerateTts}
            disabled={isLoading || !ttsInitialized}
          >
            <Text style={styles.buttonText}>Generate Speech</Text>
          </TouchableOpacity>
          
          {ttsResult?.filePath && !autoPlay && (
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.playButton,
                (isPlaying || isLoading) && styles.buttonDisabled
              ]} 
              onPress={handlePlayAudio}
              disabled={isPlaying || isLoading}
            >
              <Text style={styles.buttonText}>Play Audio</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.stopButton,
              (!isLoading) && styles.buttonDisabled
            ]} 
            onPress={handleStopTts}
            disabled={!isLoading}
          >
            <Text style={styles.buttonText}>Stop Speech</Text>
          </TouchableOpacity>
        </View>

        {/* TTS Status */}
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
          </View>
        )}
        
        {/* Generated Audio File Info */}
        {ttsResult && ttsResult.filePath && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Generated Audio</Text>
            <Text style={styles.statusDetail}>
              File: {ttsResult.filePath.split('/').pop()}
            </Text>
            {!autoPlay && (
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
            )}
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
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
  audioPlayButton: {
    backgroundColor: '#9C27B0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  audioPlayButtonDisabled: {
    opacity: 0.6,
  },
  audioPlayButtonText: {
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