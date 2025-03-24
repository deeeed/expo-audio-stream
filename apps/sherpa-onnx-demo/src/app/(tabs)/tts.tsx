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
import { Asset } from 'expo-asset';

// Extended TTS result with accessible path
interface ExtendedTtsResult extends TtsGenerateResult {
  accessiblePath?: string;
}

// Define a proper interface for the model
interface TtsModel {
  id: string;
  name: string;
  type: string;
  path: string; // Explicit path to the model in assets
  disabled?: boolean; // Make it optional
}

// Define interface for asset listing results
interface AssetListResult {
  assets: string[];
  count: number;
}

export default function TtsScreen() {
  // State
  const [ttsInitialized, setTtsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Add new state for storing asset list
  const [assetList, setAssetList] = useState<string[]>([]);
  const [showAssetList, setShowAssetList] = useState<boolean>(false);
  
  // Sound object for playback
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  
  // TTS configuration
  const [textToSpeak, setTextToSpeak] = useState<string>('Hello, this is a test of Sherpa ONNX text to speech.');
  const [speakerId, setSpeakerId] = useState<number>(0);
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [selectedModel, setSelectedModel] = useState<string>('kokoro-en-v0_19');
  
  // Available models with the proper interface including explicit paths
  const availableModels: TtsModel[] = [
    { 
      id: 'kokoro-en-v0_19', 
      name: 'Kokoro English', 
      type: 'kokoro',
      path: 'assets/tts/kokoro-en-v0_19'
    },
    { 
      id: 'kokoro-multi-lang-v1_0', 
      name: 'Kokoro Multi-language', 
      type: 'kokoro',
      path: 'tts/kokoro-multi-lang-v1_0' 
    },
    { 
      id: 'matcha-icefall-en_US-ljspeech', 
      name: 'Matcha English', 
      type: 'matcha', 
      path: 'tts/matcha-icefall-en_US-ljspeech',
      disabled: false 
    },
    {
      id: 'vits-melo-tts-zh_en',
      name: 'VITS Melo Chinese/English',
      type: 'vits',
      path: 'tts/vits-melo-tts-zh_en',
      disabled: true
    },
  ];
  
  // Results
  const [initResult, setInitResult] = useState<TtsInitResult | null>(null);
  const [ttsResult, setTtsResult] = useState<ExtendedTtsResult | null>(null);

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

  const getAbsoluteModelPaths = async (modelId: string): Promise<{success: boolean, paths: {model?: string, voices?: string, tokens?: string}}> => {
    try {
      console.log(`Loading assets for model: ${modelId}...`);
      
      // Get model info
      const model = availableModels.find(m => m.id === modelId);
      if (!model) {
        console.error("Model not found:", modelId);
        return { success: false, paths: {} };
      }
      
      // Use a switch statement to map model IDs to static require statements
      let modelAsset;
      let voicesAsset;
      let tokensAsset;
      
      switch (modelId) {
        case 'kokoro-en-v0_19':
          try {
            // Static requires - no template literals
            const modelModule = require('../../../assets/tts/kokoro-en-v0_19/model.onnx');
            const voicesModule = require('../../../assets/tts/kokoro-en-v0_19/voices.bin');
            const tokensModule = require('../../../assets/tts/kokoro-en-v0_19/tokens.txt');
            
            // Load assets
            const assets = await Asset.loadAsync([modelModule, voicesModule, tokensModule]);
            modelAsset = assets[0];
            voicesAsset = assets[1];
            tokensAsset = assets[2];
            
            console.log("Loaded kokoro-en-v0_19 assets successfully!");
          } catch (error) {
            console.error("Error loading kokoro-en-v0_19:", error);
            return { success: false, paths: {} };
          }
          break;
          
        case 'kokoro-multi-lang-v1_0':
          try {
            // Add similar static requires for this model
            const modelModule = require('../../../assets/tts/kokoro-multi-lang-v1_0/model.onnx');
            const voicesModule = require('../../../assets/tts/kokoro-multi-lang-v1_0/voices.bin');
            const tokensModule = require('../../../assets/tts/kokoro-multi-lang-v1_0/tokens.txt');
            
            // Load assets
            const assets = await Asset.loadAsync([modelModule, voicesModule, tokensModule]);
            modelAsset = assets[0];
            voicesAsset = assets[1];
            tokensAsset = assets[2];
            
            console.log("Loaded kokoro-multi-lang-v1_0 assets successfully!");
          } catch (error) {
            console.error("Error loading kokoro-multi-lang-v1_0:", error);
            return { success: false, paths: {} };
          }
          break;
          
        // Add cases for other models as needed
          
        default:
          console.error("No static asset mapping for model:", modelId);
          return { success: false, paths: {} };
      }
      
      // Make sure we have all assets
      if (!modelAsset || !voicesAsset || !tokensAsset) {
        console.error("Failed to load all required assets");
        return { success: false, paths: {} };
      }
      
      // Log the loaded assets
      console.log("Model asset:", modelAsset.localUri);
      console.log("Voices asset:", voicesAsset.localUri);
      console.log("Tokens asset:", tokensAsset.localUri);
      
      // Return paths with null to undefined conversion
      return {
        success: true,
        paths: {
          model: modelAsset.localUri ?? undefined,
          voices: voicesAsset.localUri ?? undefined,
          tokens: tokensAsset.localUri ?? undefined
        }
      };
    } catch (error) {
      console.error("Error getting model paths:", error);
      return { success: false, paths: {} };
    }
  };

  const handleInitTts = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Loading model assets...');
    
    try {
      // Get the selected model
      const model = availableModels.find(m => m.id === selectedModel);
      if (!model) {
        throw new Error('Selected model not found');
      }
      
      // Get absolute paths to model files
      const modelAssets = await getAbsoluteModelPaths(model.id);
      if (!modelAssets.success) {
        throw new Error('Failed to load model assets');
      }
      
      setStatusMessage('Model assets loaded successfully. Initializing TTS...');
      
      // Helper function to strip file:// prefix from paths
      const stripFilePrefix = (path?: string): string | undefined => {
        if (!path) return undefined;
        return path.replace(/^file:\/\//, '');
      };

      // Get raw file paths without file:// prefix
      const rawModelPath = stripFilePrefix(modelAssets.paths.model);
      const rawVoicesPath = stripFilePrefix(modelAssets.paths.voices);
      const rawTokensPath = stripFilePrefix(modelAssets.paths.tokens);

      console.log('Raw filesystem paths:');
      console.log('- Model:', rawModelPath);
      console.log('- Voices:', rawVoicesPath);
      console.log('- Tokens:', rawTokensPath);

      // Get the parent directory
      const modelDir = rawModelPath ? rawModelPath.substring(0, rawModelPath.lastIndexOf('/')) : '';
      console.log('Model directory:', modelDir);

      // Use the parent directory and explicit file paths
      const modelConfig: TtsModelConfig = {
        modelDir: modelDir,
        modelName: rawModelPath,  // Provide full path 
        voices: rawVoicesPath,    // Provide full path
        numThreads: 2,
      };

      console.log('Using model config with raw paths:', modelConfig);
      
      // Validate library is loaded
      const validation = await SherpaOnnx.validateLibraryLoaded();
      if (!validation.loaded) {
        throw new Error(`Library validation failed: ${validation.status}`);
      }
      
      // Use the service to initialize TTS
      const result = await SherpaOnnx.TTS.initialize(modelConfig);
      setInitResult(result);
      setTtsInitialized(result.success);
      
      if (result.success) {
        setStatusMessage(`TTS initialized successfully with file path! Sample rate: ${result.sampleRate}Hz`);
      } else if (result.error) {
        setErrorMessage(`TTS initialization failed with file path: ${result.error}`);
        
        // ===== SECOND TEST - FULL PATHS =====
        // If the first approach fails, try using full paths for each file
        setStatusMessage('Trying with absolute file paths for each model file...');
        
        const fullPathConfig: TtsModelConfig = {
          modelDir: "", // Empty to avoid confusion
          modelName: rawModelPath,
          voices: rawVoicesPath,
          numThreads: 2,
        };
        
        console.log('Using model config with normalized file paths:', fullPathConfig);
        
        const secondResult = await SherpaOnnx.TTS.initialize(fullPathConfig);
        setInitResult(secondResult);
        setTtsInitialized(secondResult.success);
        
        if (secondResult.success) {
          setStatusMessage(`TTS initialized successfully with absolute file paths! Sample rate: ${secondResult.sampleRate}Hz`);
        } else if (secondResult.error) {
          setErrorMessage(`TTS initialization failed with absolute file paths: ${secondResult.error}`);
        } else {
          setErrorMessage('TTS initialization failed with absolute file paths');
        }
      } else {
        setErrorMessage('TTS initialization failed with file path');
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
      // Enable playAudio: true to use the native player in the module which should work better
      const result = await SherpaOnnx.TTS.generateSpeech(textToSpeak, {
        speakerId,
        speakingRate,
        playAudio: true // Use the native AudioTrack in the module
      });
      
      if (result.success && result.filePath) {
        setStatusMessage('Speech generated successfully!');
        
        // Copy file to accessible location
        await copyAudioFile(result.filePath);
        
        // Update the result
        setTtsResult(result);
      } else {
        setErrorMessage('TTS generation failed or no file path returned');
        setTtsResult(result);
      }
    } catch (error) {
      setErrorMessage(`TTS generation error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified version without detailed validation and debug info
  const copyAudioFile = async (filePath: string) => {
    try {
      // Check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return;
      }
      
      // Create a copy in the documents directory (accessible via ADB)
      const fileName = "generated_audio.wav";
      const newPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.copyAsync({
        from: filePath,
        to: newPath
      });
      
      // Update the ttsResult with the accessible path
      setTtsResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          accessiblePath: newPath
        };
      });
      
    } catch (error) {
      console.error("Error copying audio file:", error);
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

  // Share audio file
  const shareAudioFile = async (filePath: string) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(filePath);
      } else {
        setErrorMessage("Sharing is not available on this device");
      }
    } catch (error) {
      setErrorMessage(`Error sharing file: ${(error as Error).message}`);
    }
  };

  // Clean up audio resources on component unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playAudio = async (filePath: string) => {
    try {
      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }
      
      setStatusMessage('Loading audio...');
      
      // Format the URI correctly for different platforms
      let uri = filePath;
      if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
        uri = `file://${filePath}`;
      }
      
      console.log(`Attempting to play audio from: ${uri}`);
      
      // Load the audio file
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => console.log('Load status:', JSON.stringify(status))
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setStatusMessage('Playing audio...');
      
      // Listen for playback status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        console.log('Playback status:', JSON.stringify(status));
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
            setStatusMessage('Playback finished');
          }
        } else if (status.error) {
          console.error('Playback error:', status.error);
          setErrorMessage(`Playback error: ${status.error}`);
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      setErrorMessage(`Error playing audio: ${(error as Error).message}`);
      setIsPlaying(false);
    }
  };
  
  const stopAudio = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        setIsPlaying(false);
        setStatusMessage('Playback stopped');
      }
    } catch (error) {
      setErrorMessage(`Error stopping audio: ${(error as Error).message}`);
    }
  };

  // Safe play audio function that handles null/undefined
  const safePlayAudio = (filePath?: string | null) => {
    if (!filePath) {
      setErrorMessage('No audio file path available to play');
      return;
    }
    playAudio(filePath);
  };

  // Safe share audio function that handles null/undefined  
  const safeShareAudioFile = (filePath?: string | null) => {
    if (!filePath) {
      setErrorMessage('No audio file path available to share');
      return;
    }
    shareAudioFile(filePath);
  };

  // Simplified downloadAudioFile function without debug info
  const downloadAudioFile = async (filePath: string) => {
    try {
      // First check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        setErrorMessage(`File doesn't exist: ${filePath}`);
        return null;
      }
      
      // Create a unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `sherpa-tts-${timestamp}.wav`;
      const downloadDir = FileSystem.documentDirectory;
      const newFilePath = `${downloadDir}${fileName}`;
      
      // Copy the file
      await FileSystem.copyAsync({
        from: filePath,
        to: newFilePath
      });
      
      setStatusMessage('File downloaded and ready to share');
      
      // Try to share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newFilePath, {
          UTI: 'public.audio',
          mimeType: 'audio/wav',
          dialogTitle: 'Save or share generated speech'
        });
      }
      
      return newFilePath;
    } catch (error) {
      setErrorMessage(`Error downloading file: ${(error as Error).message}`);
      console.error('Download error:', error);
      return null;
    }
  };

  // Fix for TTS playback issue

  // 1. Check if the generated audio has actual content
  // Make sure the TTS engine is generating proper audio data with a reasonable length

  // 2. Verify audio file format and add error handling
  async function playGeneratedAudio(filePath: string): Promise<void> {
    try {
      console.log(`Playing audio from: ${filePath}`);
      
      // Check if file exists and has content
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        console.error('Audio file does not exist:', filePath);
        setErrorMessage('Audio file does not exist');
        return;
      }
      
      if (fileInfo.size === 0) {
        console.error('Audio file is empty');
        setErrorMessage('Audio file is empty');
        return;
      }
      
      console.log(`Audio file size: ${fileInfo.size} bytes`);
      
      // Ensure file URI is properly formatted
      let uri = filePath;
      if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
        uri = `file://${filePath}`;
      }
      
      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Create and load the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 },
        (status) => {
          console.log('Playback status:', JSON.stringify(status));
          
          if ('isLoaded' in status && status.isLoaded) {
            // Only access properties if status is loaded
            if ('didJustFinish' in status && status.didJustFinish) {
              setIsPlaying(false);
              setStatusMessage('Playback finished');
            }
          } else if ('error' in status) {
            console.error('Playback error:', status.error);
            setErrorMessage(`Playback error: ${status.error}`);
            setIsPlaying(false);
          }
        }
      );
      
      // Save the sound object to state
      setSound(newSound);
      setIsPlaying(true);
      setStatusMessage('Playing audio...');
    } catch (error) {
      console.error('Error playing audio:', error);
      setErrorMessage(`Error playing audio: ${(error as Error).message}`);
    }
  }

  // 3. Try an alternative approach using Expo AV directly
  async function tryAlternativePlayback(filePath: string): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: filePath },
        { shouldPlay: true, volume: 1.0 }
      );
      
      // Keep reference to sound object
      // You might need to store this in a state variable or ref to prevent garbage collection
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Alternative playback error:', error);
    }
  }

  const initializeAudio = async (): Promise<void> => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
      console.log('Audio system initialized');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  // Fix the audio playback issues with proper type checking and initialization
  useEffect(() => {
    // Initialize audio system on component mount
    initializeAudio();
  }, []);

  // Add enhanced audio playback function that works with the downloaded file
  const playDownloadedAudio = async (filePath: string) => {
    try {
      // Make sure audio is initialized
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error(`Audio file not found: ${filePath}`);
      }
      
      // Validate file size - safely access size property
      if (!('size' in fileInfo) || fileInfo.size === 0) {
        throw new Error('Audio file is empty or size cannot be determined');
      }
      
      // Unload any existing sound
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Ensure URI format is correct
      const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      console.log('Playing audio from:', uri);
      
      // Load and play the audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 },
        playbackStatus => {
          // Log playback status for debugging
          console.log('Audio playback status:', JSON.stringify(playbackStatus));
          
          if ('isLoaded' in playbackStatus && playbackStatus.isLoaded) {
            if ('didJustFinish' in playbackStatus && playbackStatus.didJustFinish) {
              setIsPlaying(false);
              setStatusMessage('Playback finished');
            }
          } else if ('error' in playbackStatus) {
            console.error('Playback error:', playbackStatus.error);
            setErrorMessage(`Playback error: ${playbackStatus.error}`);
          }
        }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setStatusMessage('Playing downloaded audio...');
      
      return newSound;
    } catch (error) {
      console.error('Error playing downloaded audio:', error);
      setErrorMessage(`Playback error: ${(error as Error).message}`);
      setIsPlaying(false);
      return null;
    }
  };

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

  const handleListAssets = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setStatusMessage('Listing all assets...');
      
      // Call the native module's listAllAssets method
      const result = await SherpaOnnx.listAllAssets();
      
      if (result && result.assets) {
        setAssetList(result.assets);
        setShowAssetList(true);
        setStatusMessage(`Found ${result.count} assets in the bundle`);
      } else {
        setErrorMessage('Failed to list assets or no assets found');
      }
    } catch (error) {
      setErrorMessage(`Error listing assets: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Sherpa Onnx TTS</Text>
        
        {/* Error and status messages */}
        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        
        {statusMessage ? (
          <Text style={styles.statusText}>{statusMessage}</Text>
        ) : null}
        
        {/* Add Debug Button for Asset List */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={handleListAssets}
          >
            <Text style={styles.buttonText}>Debug: List Assets</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.debugButton} 
            onPress={() => setShowAssetList(false)}
            disabled={!showAssetList}
          >
            <Text style={styles.buttonText}>Hide Asset List</Text>
          </TouchableOpacity>
        </View>
        
        {/* Asset List Display */}
        {showAssetList && (
          <View style={styles.assetListContainer}>
            <Text style={styles.sectionTitle}>Asset Files ({assetList.length})</Text>
            <ScrollView style={styles.assetList}>
              {assetList.map((asset, index) => (
                <Text key={index} style={styles.assetItem}>
                  {asset}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
        
        {/* Model Selection */}
        <Text style={styles.sectionTitle}>1. Select TTS Model</Text>
        <View style={styles.pickerContainer}>
          {availableModels.map((model) => (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelOption,
                selectedModel === model.id && styles.modelOptionSelected,
                model.disabled && styles.modelOptionDisabled
              ]}
              onPress={() => !model.disabled && setSelectedModel(model.id)}
              disabled={model.disabled}
            >
              <Text 
                style={[
                  styles.modelOptionText,
                  selectedModel === model.id && styles.modelOptionTextSelected,
                  model.disabled && styles.modelOptionTextDisabled
                ]}
              >
                {model.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Initialize Button */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleInitTts}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Initialize TTS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleReleaseTts}
            disabled={isLoading || !ttsInitialized}
          >
            <Text style={styles.buttonText}>Release TTS</Text>
          </TouchableOpacity>
        </View>
        
        {/* Input Section */}
        <Text style={styles.sectionTitle}>2. TTS Input</Text>
        <TextInput
          style={styles.textInput}
          multiline
          value={textToSpeak}
          onChangeText={setTextToSpeak}
          placeholder="Enter text to speak"
        />
        
        {/* Configuration */}
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Speaker ID:</Text>
            <TextInput
              style={styles.numberInput}
              value={speakerId.toString()}
              onChangeText={handleSpeakerIdChange}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Speaking Rate:</Text>
            <TextInput
              style={styles.numberInput}
              value={speakingRate.toString()}
              onChangeText={handleSpeakingRateChange}
              keyboardType="numeric"
            />
          </View>
        </View>
        
        {/* Generate Button */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleGenerateTts}
            disabled={isLoading || !ttsInitialized}
          >
            <Text style={styles.buttonText}>Generate Speech</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleStopTts}
            disabled={isLoading || !ttsInitialized}
          >
            <Text style={styles.buttonText}>Stop Speech</Text>
          </TouchableOpacity>
        </View>
        
        {/* Playback Controls */}
        {ttsResult?.filePath && (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => {
                // If we have an accessible path (downloaded file), use that
                if (ttsResult.accessiblePath) {
                  playDownloadedAudio(ttsResult.accessiblePath);
                } else {
                  // Otherwise, try to play the original file
                  safePlayAudio(ttsResult.filePath);
                }
              }}
              disabled={isLoading || isPlaying}
            >
              <Text style={styles.buttonText}>Play Audio</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={stopAudio}
              disabled={isLoading || !isPlaying}
            >
              <Text style={styles.buttonText}>Stop Audio</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => ttsResult.filePath ? downloadAudioFile(ttsResult.filePath) : null}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Save & Share</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  statusText: {
    color: '#333',
    marginBottom: 16,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#555',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  modelOption: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modelOptionSelected: {
    backgroundColor: '#2196F3',
  },
  modelOptionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modelOptionTextSelected: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 16,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    marginBottom: 16,
    backgroundColor: 'white',
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#555',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'white',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#555',
  },
  modelOptionDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  modelOptionTextDisabled: {
    color: '#999',
  },
  debugButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  assetListContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  assetList: {
    maxHeight: 200,
  },
  assetItem: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#555',
    paddingVertical: 2,
  },
}); 