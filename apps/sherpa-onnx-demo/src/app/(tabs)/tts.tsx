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

// Extended TTS result with accessible path
interface ExtendedTtsResult extends Omit<TtsGenerateResult, 'numSamples'> {
  accessiblePath?: string;
  numSamples?: number;
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
  const [ttsResult, setTtsResult] = useState<ExtendedTtsResult | null>(null);
  const [speakerId, setSpeakerId] = useState(0);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [debugMode, setDebugMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

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
        let files: string[] = [];
        try {
          files = await FileSystem.readDirectoryAsync(localPath);
          console.log(`Files in directory: ${files.join(', ')}`);
        } catch (readError) {
          console.error(`Error reading directory: ${localPath}`, readError);
          files = [];
        }
        
        // Additional directory structure check
        if (files.length === 0) {
          console.warn(`No files found in directory: ${localPath}. Checking parent directory...`);
          
          // Try going up one level (sometimes localPath already points to a subdirectory)
          const parentPathComponents = localPath.split('/');
          parentPathComponents.pop(); // Remove the last component
          const parentPath = parentPathComponents.join('/');
          
          console.log(`Trying parent path: ${parentPath}`);
          
          try {
            const parentFiles = await FileSystem.readDirectoryAsync(parentPath);
            console.log(`Files in parent directory: ${parentFiles.join(', ')}`);
            
            // If parent directory has files, use that instead
            if (parentFiles.length > 0) {
              localPath = parentPath;
              files = parentFiles;
              console.log(`Using parent directory: ${localPath}`);
            }
          } catch (parentReadError) {
            console.error(`Error reading parent directory: ${parentPath}`, parentReadError);
          }
        }
        
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
            requiredFiles = ['acoustic_model.onnx', 'model-steps-3.onnx', 'tokens.txt'];
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
        
        // Enhanced file search: Check in all subdirectories if needed
        const searchModelFilesInAllDirs = async (startPath: string): Promise<boolean> => {
          console.log(`Searching for model files in: ${startPath}`);
          const searchQueue = [startPath];
          const visited = new Set<string>();
          
          while (searchQueue.length > 0) {
            const currentPath = searchQueue.shift()!;
            
            if (visited.has(currentPath)) {
              continue;
            }
            visited.add(currentPath);
            
            try {
              console.log(`Checking directory: ${currentPath}`);
              const dirFiles = await FileSystem.readDirectoryAsync(currentPath);
              console.log(`Files found: ${dirFiles.join(', ')}`);
              
              // Check if this directory has the required files
              let matchesFound = 0;
              
              for (const req of requiredFiles) {
                // Special handling for matcha model which can have either acoustic_model.onnx
                // or model-steps-3.onnx
                if (ttsModelType === 'matcha' && 
                   (req === 'acoustic_model.onnx' || req === 'model-steps-3.onnx')) {
                  // Check for either file
                  const matchingFile = dirFiles.find(file => 
                    file === 'acoustic_model.onnx' || 
                    file === 'model-steps-3.onnx' || 
                    file === 'model.onnx');
                  
                  if (matchingFile) {
                    matchesFound++;
                    foundModelFiles[req] = `${currentPath}/${matchingFile}`;
                    console.log(`Found match for ${req}: ${matchingFile}`);
                  }
                } else {
                  // Normal case - look for exact match or similar pattern
                  const matchingFile = dirFiles.find(file => 
                    file === req || file.includes(req));
                    
                  if (matchingFile) {
                    matchesFound++;
                    foundModelFiles[req] = `${currentPath}/${matchingFile}`;
                    console.log(`Found match for ${req}: ${matchingFile}`);
                  }
                }
              }
              
              // If we found all required files or a good portion in this directory, use it
              if (matchesFound >= Math.max(1, Math.floor(requiredFiles.length * 0.7))) {
                console.log(`Found most required files (${matchesFound}/${requiredFiles.length}) in: ${currentPath}`);
                finalPath = currentPath;
                modelFilesFound = true;
                return true;
              }
              
              // Add subdirectories to search queue
              for (const file of dirFiles) {
                const fullPath = `${currentPath}/${file}`;
                const fileInfo = await FileSystem.getInfoAsync(fullPath);
                if (fileInfo.exists && fileInfo.isDirectory) {
                  searchQueue.push(fullPath);
                }
              }
            } catch (error) {
              console.error(`Error reading directory ${currentPath}:`, error);
            }
          }
          
          return false;
        };
        
        // First check the current directory for required files
        const searchResult = await searchModelFilesInAllDirs(localPath);
        
        if (!searchResult) {
          // If files weren't found, do a full recursive search from the base path
          console.log(`Doing a full recursive search for model files`);
          await searchModelFilesInAllDirs(localPath);
        }
        
        if (Object.keys(foundModelFiles).length === 0) {
          throw new Error(`Could not find model files in any directory. Please check the model download.`);
        }
        
        console.log(`Will use model files in: ${finalPath}`);
        console.log(`Found model files:`, foundModelFiles);
        
        // Create model config with the final path and proper model type-specific fields
        const modelConfig: TtsModelConfig = {
          modelDir: finalPath.replace('file://', ''), // Remove file:// prefix for native module
          numThreads: 2,
          debug: debugMode
        };
        
        // Now, find espeak data before configuring the model
        const espeakDataDir = await findEspeakData(finalPath);
        if (espeakDataDir) {
          modelConfig.dataDir = espeakDataDir;
          console.log(`Using espeak-ng-data from: ${modelConfig.dataDir}`);
        }

        // Then continue with the model-specific configurations
        if (ttsModelType === 'vits') {
          // If we couldn't find the model file with the existing approach
          if (!foundModelFiles['model.onnx']) {
            console.log('Standard search failed to find model.onnx, trying recursive search');
            const modelFileResult = await findModelFileRecursive(cleanPath);
            
            if (modelFileResult) {
              console.log(`Found model file through recursive search:`, modelFileResult);
              modelConfig.modelDir = modelFileResult.modelDir;
              modelConfig.modelName = modelFileResult.modelName;
            } else {
              console.error('Could not find model file with any search method');
              throw new Error('Could not find the ONNX model file. Please check the model download.');
            }
          } else {
            // Use the model file found by the standard search
            modelConfig.modelName = foundModelFiles['model.onnx'].split('/').pop() || 'model.onnx';
          }
          
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
          // If we couldn't find the model file with the existing approach
          if (!foundModelFiles['model.onnx']) {
            console.log('Standard search failed to find model.onnx for Kokoro, trying recursive search');
            const modelFileResult = await findModelFileRecursive(cleanPath);
            
            if (modelFileResult) {
              console.log(`Found Kokoro model file through recursive search:`, modelFileResult);
              modelConfig.modelDir = modelFileResult.modelDir;
              modelConfig.modelName = modelFileResult.modelName;
            } else {
              console.error('Could not find Kokoro model file with any search method');
              throw new Error('Could not find the ONNX model file. Please check the model download.');
            }
          } else {
            // Use the model file found by the standard search
            modelConfig.modelName = foundModelFiles['model.onnx'].split('/').pop() || 'model.onnx';
          }
          // Only for Kokoro models, set the voices property
          modelConfig.voices = foundModelFiles['voices.bin'] ? 
            foundModelFiles['voices.bin'].split('/').pop() : 'voices.bin';
          
          console.log(`Configuring Kokoro model`);
        } else if (ttsModelType === 'matcha') {
          // If we couldn't find the model file with the existing approach
          if (!foundModelFiles['acoustic_model.onnx'] && !foundModelFiles['model-steps-3.onnx']) {
            console.log('Standard search failed to find Matcha model files, trying recursive search');
            const modelFileResult = await findModelFileRecursive(cleanPath);
            
            if (modelFileResult) {
              console.log(`Found Matcha model file through recursive search:`, modelFileResult);
              modelConfig.modelDir = modelFileResult.modelDir;
              modelConfig.modelName = modelFileResult.modelName;
            } else {
              console.error('Could not find Matcha model file with any search method');
              throw new Error('Could not find the ONNX model file. Please check the model download.');
            }
          } else {
            // Use the existing Matcha configuration...
          }
          
          // Matcha model configuration
          console.log(`Configuring Matcha model`);
          
          // Example 7 & 8 from documentation:
          // modelDir = "matcha-icefall-en_US-ljspeech"
          // acousticModelName = "model-steps-3.onnx"
          // vocoder = "vocos-22khz-univ.onnx"
          // dataDir = "matcha-icefall-en_US-ljspeech/espeak-ng-data"
          
          // Set model type explicitly
          modelConfig.modelType = 'matcha';
          
          // CRITICAL: Native module expects:
          // - modelName for the acoustic model (will become acousticModel in native code)
          // - voices for the vocoder (will become vocoder in native code)
          modelConfig.modelName = 'model-steps-3.onnx';
          modelConfig.voices = 'vocos-22khz-univ.onnx';
          
          console.log(`Using standard Matcha configuration with native module parameters:`);
          console.log(` - modelDir: ${modelConfig.modelDir}`);
          console.log(` - modelName (acoustic model): ${modelConfig.modelName}`);
          console.log(` - voices (vocoder): ${modelConfig.voices}`);
          if (modelConfig.dataDir) {
            console.log(` - dataDir: ${modelConfig.dataDir}`);
          }
          
          // Verify files exist in the model directory
          try {
            const modelFiles = await FileSystem.readDirectoryAsync(finalPath);
            console.log(`Files in Matcha directory: ${modelFiles.join(', ')}`);
            
            // Check for acoustic model
            if (!modelFiles.includes(modelConfig.modelName)) {
              console.warn(`Warning: ${modelConfig.modelName} not found in model directory.`);
              
              // Look for alternative acoustic model files
              const acousticModelAlternative = modelFiles.find(file => 
                file === 'acoustic_model.onnx' || 
                file.includes('model-') ||
                file === 'model.onnx'
              );
              
              if (acousticModelAlternative) {
                console.log(`Found alternative acoustic model: ${acousticModelAlternative}`);
                modelConfig.modelName = acousticModelAlternative;
                console.log(`Updated modelName to: ${modelConfig.modelName}`);
              }
            } else {
              console.log(`Found acoustic model: ${modelConfig.modelName}`);
            }
            
            // Check for vocoder
            if (!modelFiles.includes(modelConfig.voices)) {
              console.warn(`Warning: ${modelConfig.voices} not found in model directory.`);
              
              // Look for alternative vocoder files
              const vocoderAlternative = modelFiles.find(file => 
                file.includes('vocos') || 
                file.includes('hifigan') ||
                file === 'vocoder.onnx'
              );
              
              if (vocoderAlternative) {
                console.log(`Found alternative vocoder: ${vocoderAlternative}`);
                modelConfig.voices = vocoderAlternative;
                console.log(`Updated voices to: ${modelConfig.voices}`);
              } else {
                // If not found in model directory, check parent directory
                console.log(`Checking parent directory for vocoder...`);
                const pathParts = finalPath.split('/');
                pathParts.pop();
                const parentDir = pathParts.join('/');
                
                try {
                  const parentFiles = await FileSystem.readDirectoryAsync(parentDir);
                  console.log(`Files in parent directory: ${parentFiles.join(', ')}`);
                  
                  const parentVocoder = parentFiles.find(file => 
                    file.includes('vocos') || 
                    file === modelConfig.voices ||
                    file.includes('hifigan') ||
                    file === 'vocoder.onnx'
                  );
                  
                  if (parentVocoder) {
                    console.log(`Found vocoder in parent directory: ${parentVocoder}`);
                    
                    // Try to copy the vocoder to the model directory for better compatibility
                    try {
                      const sourceVocoderPath = `${parentDir}/${parentVocoder}`;
                      const destVocoderPath = `${finalPath}/${parentVocoder}`;
                      
                      await FileSystem.copyAsync({
                        from: sourceVocoderPath,
                        to: destVocoderPath
                      });
                      
                      console.log(`Successfully copied vocoder to model directory`);
                      modelConfig.voices = parentVocoder;
                      console.log(`Updated voices to: ${modelConfig.voices}`);
                    } catch (copyError) {
                      console.error(`Failed to copy vocoder: ${copyError}`);
                      // Keep standard name, the native module will handle the path construction
                    }
                  }
                } catch (error) {
                  console.error(`Error checking parent directory: ${error}`);
                }
              }
            } else {
              console.log(`Found vocoder: ${modelConfig.voices}`);
            }
          } catch (error) {
            console.error(`Error checking Matcha model files: ${error}`);
          }
        }

        console.log('Initializing TTS with config:', JSON.stringify(modelConfig));
        console.log(`Model type: ${ttsModelType}`);
        const result = await TTS.initialize(modelConfig);
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
      const result = await TTS.generateSpeech(text, {
        speakerId,
        speakingRate,
        playAudio: autoPlay
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
          
          // If not auto-playing but we want to play manually, create and play the sound
          if (!autoPlay) {
            // Create a new sound object and play it if requested
            try {
              if (sound) {
                await sound.unloadAsync();
              }
              const { sound: newSound } = await Audio.Sound.createAsync({ uri: accessiblePath });
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
          console.error(`Generated audio file does not exist: ${result.filePath}`);
          setTtsResult(result);
          setErrorMessage('Generated audio file not found.');
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
    if (!ttsResult?.accessiblePath || !sound) {
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

        {/* TTS Configuration - moved before generation buttons */}
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
          
          {ttsResult?.accessiblePath && !autoPlay && (
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
        {ttsResult && ttsResult.accessiblePath && (
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Generated Audio</Text>
            <Text style={styles.statusDetail}>
              File: {ttsResult.accessiblePath.split('/').pop()}
            </Text>
            {ttsResult.sampleRate && (
              <Text style={styles.statusDetail}>
                Sample Rate: {ttsResult.sampleRate}Hz
              </Text>
            )}
            {ttsResult.numSamples && (
              <Text style={styles.statusDetail}>
                Duration: ~{(ttsResult.numSamples / ttsResult.sampleRate).toFixed(2)}s
              </Text>
            )}
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
}); 