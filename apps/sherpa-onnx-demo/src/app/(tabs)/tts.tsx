import type { TtsGenerateResult, TtsInitResult, TtsModelConfig } from '@siteed/sherpa-onnx.rn';
import SherpaOnnx from '@siteed/sherpa-onnx.rn';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModelManagement } from '../../contexts/ModelManagement';

// Default sample text for TTS
const DEFAULT_TEXT = "Hello, this is a test of the Sherpa Onnx TTS system. I hope you're having a great day!";

// Extended TTS result with accessible path
interface ExtendedTtsResult extends TtsGenerateResult {
  accessiblePath?: string;
}

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
  const [ttsResult, setTtsResult] = useState<ExtendedTtsResult | null>(null);
  const [speakerId, setSpeakerId] = useState(0);
  const [speakingRate, setSpeakingRate] = useState(1.0);

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
      if (!modelState?.localPath) {
        throw new Error('Model files not found locally');
      }

      // Log the path for debugging
      console.log(`Model path from state: ${modelState.localPath}`);
      
      // Ensure the path has the file:// prefix for Android
      let localPath = modelState.localPath.startsWith('file://') 
        ? modelState.localPath 
        : `file://${modelState.localPath}`;
      
      const cleanPath = localPath.replace('file://', '');
      console.log(`Using base local path: ${localPath}`);
      
      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(localPath);
      console.log(`Directory exists: ${dirInfo.exists}, isDirectory: ${dirInfo.isDirectory ?? false}`);
      
      if (!dirInfo.exists) {
        throw new Error(`Model directory does not exist. Please download the model again.`);
      }
      
      try {
        // Get the files in the base directory
        const files = await FileSystem.readDirectoryAsync(localPath);
        console.log(`Files in directory: ${files.join(', ')}`);
        
        // Get model metadata to determine model type and required files
        const modelType = modelState.metadata?.type || 'unknown';
        console.log(`Model type: ${modelType}`);
        
        // Get model ID to determine specific TTS model type
        const modelId = modelState.metadata?.id || '';
        console.log(`Model ID: ${modelId}`);
        
        // Infer TTS model subtype from the model ID
        let ttsModelType = 'vits'; // Default to VITS
        if (modelId.includes('kokoro')) {
          ttsModelType = 'kokoro';
        } else if (modelId.includes('matcha')) {
          ttsModelType = 'matcha';
        }
        console.log(`Detected TTS model subtype: ${ttsModelType}`);
        
        // Define required files based on model type and subtype
        let requiredFiles: string[] = [];
        
        // For TTS models, required files depend on the specific TTS model type
        if (modelType === 'tts') {
          if (ttsModelType === 'kokoro') {
            requiredFiles = ['model.onnx', 'voices.bin', 'tokens.txt'];
          } else if (ttsModelType === 'matcha') {
            requiredFiles = ['acoustic_model.onnx', 'vocoder.onnx', 'tokens.txt'];
          } else {
            // VITS models
            requiredFiles = ['model.onnx', 'tokens.txt'];
          }
        } 
        // For ASR models, we look for encoder, decoder, joiner files and tokens.txt
        else if (modelType === 'asr') {
          requiredFiles = ['encoder', 'decoder', 'joiner', 'tokens.txt'];
        }
        // Default case - attempt to find any ONNX file
        else {
          // If model type isn't explicitly known, search for any .onnx files
          const onnxFiles = files.filter(file => file.endsWith('.onnx'));
          if (onnxFiles.length > 0) {
            requiredFiles = [onnxFiles[0]]; // Use the first ONNX file found
            console.log(`Found ONNX file: ${onnxFiles[0]}`);
          } else {
            // No ONNX files found
            throw new Error('No ONNX model files found in the downloaded model directory');
          }
        }
        
        let finalPath = localPath;
        let modelFilesFound = false;
        let foundModelFiles: Record<string, string> = {};
        
        // Function to check if a file matches any required pattern
        const matchesRequirement = (filename: string, requirement: string): boolean => {
          return filename.includes(requirement) || filename === requirement;
        };
        
        // Check if files exist in the current directory
        const checkDirectoryForFiles = async (dirPath: string): Promise<{
          found: boolean;
          matches: Record<string, string>;
        }> => {
          try {
            const dirFiles = await FileSystem.readDirectoryAsync(dirPath);
            console.log(`Files in ${dirPath}: ${dirFiles.join(', ')}`);
            
            const matches: Record<string, string> = {};
            let allFound = true;
            
            // For each requirement, check if any file matches
            for (const req of requiredFiles) {
              const matchingFile = dirFiles.find(file => matchesRequirement(file, req));
              if (matchingFile) {
                matches[req] = `${dirPath}/${matchingFile}`;
              } else {
                allFound = false;
              }
            }
            
            return { found: allFound, matches };
          } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
            return { found: false, matches: {} };
          }
        };
        
        // First check if files exist in the base directory
        const baseResult = await checkDirectoryForFiles(localPath);
        if (baseResult.found) {
          console.log(`All required files found in base directory`);
          modelFilesFound = true;
          foundModelFiles = baseResult.matches;
        } else {
          // Check subdirectories, especially kokoro-en-v0_19
          console.log(`Not all required files found in base directory, checking subdirectories...`);
          
          // For kokoro models, specifically check the version-named subdirectory first
          if (ttsModelType === 'kokoro') {
            const modelVersion = modelId.includes('-') ? modelId.split('-').pop() : '';
            const versionSubdir = modelState.metadata?.version ? `${modelId}-v${modelState.metadata.version.replace('.', '_')}` : '';
            
            if (versionSubdir && files.includes(versionSubdir)) {
              console.log(`Found version-specific subdirectory: ${versionSubdir}`);
              const versionDirPath = `${localPath}/${versionSubdir}`;
              const versionDirResult = await checkDirectoryForFiles(versionDirPath);
              
              if (versionDirResult.found) {
                console.log(`All required files found in version subdirectory: ${versionSubdir}`);
                finalPath = versionDirPath;
                modelFilesFound = true;
                foundModelFiles = versionDirResult.matches;
              }
            }
          }
          
          // If still not found, check all subdirectories
          if (!modelFilesFound) {
            for (const fileName of files) {
              const itemPath = `${localPath}/${fileName}`;
              const itemInfo = await FileSystem.getInfoAsync(itemPath);
              
              if (itemInfo.exists && itemInfo.isDirectory) {
                console.log(`Checking directory: ${fileName}`);
                
                const subDirResult = await checkDirectoryForFiles(itemPath);
                if (subDirResult.found) {
                  console.log(`All required files found in subdirectory: ${fileName}`);
                  finalPath = itemPath;
                  modelFilesFound = true;
                  foundModelFiles = subDirResult.matches;
                  break;
                }
              }
            }
          }
        }
        
        if (!modelFilesFound) {
          throw new Error(`Could not find all required model files for ${modelType} models. Please check the model download.`);
        }
        
        // Create model config with the final path and proper model type-specific fields
        const modelConfig: TtsModelConfig = {
          modelDir: finalPath.replace('file://', ''), // Remove file:// prefix for native module
          numThreads: 2,
        };
        
        // Now, find espeak data before configuring the model
        const espeakDataDir = await findEspeakData(finalPath);
        if (espeakDataDir) {
          modelConfig.dataDir = espeakDataDir;
          console.log(`Using espeak-ng-data from: ${modelConfig.dataDir}`);
        }

        // Then continue with the model-specific configurations
        if (ttsModelType === 'vits') {
          // Configure VITS model
          modelConfig.modelName = foundModelFiles['model.onnx'] ? 
            foundModelFiles['model.onnx'].split('/').pop() : 'model.onnx';
          
          // If we don't have espeak data (dataDir) already set, try to find a lexicon
          if (!modelConfig.dataDir) {
            // Check if there's a lexicon file we can use instead
            const lexiconPath = `${finalPath}/lexicon.txt`;
            const lexiconInfo = await FileSystem.getInfoAsync(lexiconPath);
            
            if (lexiconInfo.exists) {
              modelConfig.lexicon = lexiconPath.replace('file://', '');
              console.log(`Using lexicon file for VITS: ${modelConfig.lexicon}`);
            } else {
              // This is a critical warning - the model will likely crash without either dataDir or lexicon
              console.warn(`WARNING: VITS model doesn't have espeak-ng-data directory or lexicon file. Initialization may fail.`);
            }
          }
          
          console.log(`Configuring VITS model: ${modelConfig.modelName}`);
        } else if (ttsModelType === 'kokoro') {
          modelConfig.modelName = foundModelFiles['model.onnx'] ? 
            foundModelFiles['model.onnx'].split('/').pop() : 'model.onnx';
          // Only for Kokoro models, set the voices property
          modelConfig.voices = foundModelFiles['voices.bin'] ? 
            foundModelFiles['voices.bin'].split('/').pop() : 'voices.bin';
          
          console.log(`Configuring Kokoro model`);
        } else if (ttsModelType === 'matcha') {
          modelConfig.acousticModelName = foundModelFiles['acoustic_model.onnx'] ? 
            foundModelFiles['acoustic_model.onnx'].split('/').pop() : 'acoustic_model.onnx';
          modelConfig.vocoder = foundModelFiles['vocoder.onnx'] ? 
            foundModelFiles['vocoder.onnx'].split('/').pop() : 'vocoder.onnx';
        }

        console.log('Initializing TTS with config:', JSON.stringify(modelConfig));
        console.log(`Model type: ${ttsModelType}`);
        const result = await SherpaOnnx.TTS.initialize(modelConfig);
        setInitResult(result);
        setTtsInitialized(result.success);

        if (result.success) {
          setStatusMessage(`TTS initialized successfully! Sample rate: ${result.sampleRate}Hz`);
        } else {
          setErrorMessage(`TTS initialization failed: ${result.error}`);
        }
      } catch (readError) {
        console.error('Error reading directory:', readError);
        setErrorMessage(`Failed to read model directory: ${(readError as Error).message}`);
      }
    } catch (error) {
      console.error('TTS init error:', error);
      setErrorMessage(`TTS init error: ${(error as Error).message}`);
      setTtsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      const result = await SherpaOnnx.TTS.generateSpeech(text, {
        speakerId,
        speakingRate,
        playAudio: true
      });

      if (result.success && result.filePath) {
        setStatusMessage('Speech generated successfully!');
        
        // Ensure the path has the file:// prefix for consistent usage
        const accessiblePath = result.filePath.startsWith('file://') 
          ? result.filePath 
          : `file://${result.filePath}`;
        
        // Verify the file exists
        const fileExists = await verifyFileExists(accessiblePath);
        
        if (fileExists) {
          console.log(`Generated audio file accessible at: ${accessiblePath}`);
          setTtsResult({
            ...result,
            accessiblePath
          });
        } else {
          console.error(`Generated audio file does not exist: ${result.filePath}`);
          setTtsResult(result);
        }
      } else {
        setErrorMessage('TTS generation failed or no file path returned');
      }
    } catch (error) {
      setErrorMessage(`TTS generation error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTts = async () => {
    try {
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
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.stopButton,
              (!ttsInitialized || isLoading) && styles.buttonDisabled
            ]} 
            onPress={handleStopTts}
            disabled={isLoading || !ttsInitialized}
          >
            <Text style={styles.buttonText}>Stop Speech</Text>
          </TouchableOpacity>
        </View>

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
          </View>
        )}
        
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
}); 