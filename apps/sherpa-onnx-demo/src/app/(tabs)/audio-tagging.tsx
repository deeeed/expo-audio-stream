import type {
  AudioEvent,
  AudioTaggingModelConfig,
  AudioTaggingResult
} from '@siteed/sherpa-onnx.rn';
import { AudioTagging } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModelManagement } from '../../contexts/ModelManagement';
import { useAudioTaggingModels, useAudioTaggingModelWithConfig } from '../../hooks/useModelWithConfig';

// Define sample audio with only name and module
const SAMPLE_AUDIO_FILES = [
  {
    id: '1',
    name: 'Cat Meow',
    module: require('@assets/audio/cat-meow.wav'),
  },
  {
    id: '2',
    name: 'Dog Bark',
    module: require('@assets/audio/dog-bark.wav'),
  },
  {
    id: '3',
    name: 'Baby Cry',
    module: require('@assets/audio/baby-cry.wav'),
  },
];

// Helper function to clean file paths to be compatible with both Expo and native code
const cleanFilePath = (path: string): string => {
  // Strip the file:// or file:/ prefix if present
  if (path.startsWith('file://')) {
    return path.substring(7);
  } else if (path.startsWith('file:/')) {
    return path.substring(6);
  }
  return path;
};

function AudioTaggingScreen() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [audioTaggingResults, setAudioTaggingResults] = useState<AudioTaggingResult | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{
    id: string;
    name: string;
    module: number;
    localUri: string;
  } | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [pendingModelId, setPendingModelId] = useState<string | null>(null);
  
  // Add state for loaded audio assets
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<{
    id: string;
    name: string;
    module: number;
    localUri: string;
  }[]>([]);
  
  // Add state for audio playback
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Add new states for audio metadata
  const [audioMetadata, setAudioMetadata] = useState<{
    size?: number;
    duration?: number;
    isLoading: boolean;
  }>({
    isLoading: false
  });
  
  // Add state for configuration options
  const [topK, setTopK] = useState<number>(5);
  const [numThreads, setNumThreads] = useState<number>(2);
  const [debugMode, setDebugMode] = useState<boolean>(true); // Default to true
  const [provider, setProvider] = useState<'cpu' | 'gpu'>('cpu');
  
  // Use our new hooks
  const { downloadedModels } = useAudioTaggingModels();
  const { audioTaggingConfig, localPath, isDownloaded } = useAudioTaggingModelWithConfig({ modelId: selectedModelId });
  
  // Add a new effect to log selected model and config changes
  useEffect(() => {
    console.log('[DEBUG] Selected model ID changed to:', selectedModelId);
    console.log('[DEBUG] Audio tagging config received:', JSON.stringify(audioTaggingConfig, null, 2));
    console.log('[DEBUG] Local path:', localPath);
    console.log('[DEBUG] Is downloaded:', isDownloaded);
  }, [selectedModelId, audioTaggingConfig, localPath, isDownloaded]);
  
  // Reset configuration when selected model or audioTaggingConfig changes
  useEffect(() => {
    console.log('[DEBUG] Config reset effect triggered');
    console.log('[DEBUG] Current config values:', { topK, numThreads, debugMode, provider });
    
    if (audioTaggingConfig) {
      console.log('[DEBUG] Using audioTaggingConfig:', JSON.stringify(audioTaggingConfig, null, 2));
      
      // Reset to values from the predefined config or use defaults
      const newTopK = audioTaggingConfig.topK ?? 5;
      const newNumThreads = audioTaggingConfig.numThreads ?? 2;
      const newDebugMode = audioTaggingConfig.debug ?? true; // Default to true if not specified
      const newProvider = audioTaggingConfig.provider ?? 'cpu';
      
      console.log('[DEBUG] Setting new values:', {
        topK: newTopK,
        numThreads: newNumThreads,
        debugMode: newDebugMode,
        provider: newProvider
      });
      
      setTopK(newTopK);
      setNumThreads(newNumThreads);
      setDebugMode(newDebugMode); // Use config value or default to true
      setProvider(newProvider);
      
      console.log('Reset configuration based on selected model:', selectedModelId);
    } else {
      console.log('[DEBUG] No audioTaggingConfig available for model:', selectedModelId);
    }
  }, [selectedModelId, audioTaggingConfig]);
  
  // Load audio assets when component mounts
  useEffect(() => {
    async function loadAudioAssets() {
      try {
        const assets = SAMPLE_AUDIO_FILES.map(file => 
          Asset.fromModule(file.module)
        );
        
        // Download all assets to local filesystem
        await Promise.all(assets.map(asset => asset.downloadAsync()));
        
        // Create new array with local URIs
        const loaded = SAMPLE_AUDIO_FILES.map((file, index) => ({
          ...file,
          localUri: assets[index].localUri || '',
        }));
        
        setLoadedAudioFiles(loaded);
        console.log('Audio assets loaded successfully:', loaded);
      } catch (err) {
        console.error('Failed to load audio assets:', err);
        setError(`Failed to load audio assets: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    loadAudioAssets();
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (initialized) {
        console.log('Cleaning up audio tagging resources');
        AudioTagging.release().catch((err: Error) => 
          console.error('Error releasing audio tagging resources:', err)
        );
      }
      
      if (sound) {
        sound.unloadAsync().catch(err => 
          console.error('Error unloading audio during cleanup:', err)
        );
      }
    };
  }, [initialized]);
  
  const handleModelSelect = (modelId: string) => {
    console.log('[DEBUG] handleModelSelect called with modelId:', modelId);
    
    // If a model is already initialized, show confirmation before switching
    if (initialized) {
      console.log('[DEBUG] Model already initialized, showing confirmation dialog');
      setPendingModelId(modelId);
      Alert.alert(
        "Switch Model?",
        "Switching models will release the currently initialized model. Any analysis results will be lost.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              console.log('[DEBUG] User cancelled model switch');
              setPendingModelId(null);
            }
          },
          {
            text: "Switch",
            style: "destructive",
            onPress: async () => {
              // Release current model first
              try {
                console.log('[DEBUG] Releasing current model');
                const result = await AudioTagging.release();
                
                // Log the full result to help debug
                console.log('[DEBUG] Release result:', JSON.stringify(result));
                
                // Check if the result is truthy and has a released property, otherwise assume success
                // This makes the code more resilient to API changes or response issues
                const isReleased = result && (typeof result === 'object') && 
                                  (result.released !== undefined ? result.released : true);
                
                if (isReleased) {
                  console.log('[DEBUG] Successfully released model, switching to new model:', modelId);
                } else {
                  console.log('[DEBUG] Release may have failed, but proceeding with model switch anyway');
                }
                
                // Regardless of the result, proceed with the switch
                // We've seen in logs that resources are actually released successfully
                setInitialized(false);
                setAudioTaggingResults(null);
                setStatusMessage('Audio tagging resources released, switching model');
                
                // After release, set the new model ID
                setSelectedModelId(modelId);
                setPendingModelId(null);
              } catch (error) {
                console.log('[DEBUG] Error releasing model:', error);
                
                // Despite the error, we'll still try to switch models
                // This makes the UI more resilient to transient errors
                console.log('[DEBUG] Proceeding with model switch despite error');
                setInitialized(false);
                setAudioTaggingResults(null);
                setSelectedModelId(modelId);
                setPendingModelId(null);
                
                // Show a warning but don't block the operation
                setError(`Warning: Error during model release, but continuing with model switch: ${(error as Error).message}`);
              }
            }
          }
        ]
      );
    } else {
      // No model initialized, just switch directly
      console.log('[DEBUG] No model initialized, directly setting model ID:', modelId);
      setSelectedModelId(modelId);
    }
  };
  
  // Initialize the audio tagging engine
  const handleInitAudioTagging = async () => {
    console.log('[DEBUG] handleInitAudioTagging called');
    console.log('[DEBUG] Current state:', {
      selectedModelId,
      audioTaggingConfig: JSON.stringify(audioTaggingConfig, null, 2),
      localPath,
      isDownloaded,
      topK,
      numThreads,
      debugMode,
      provider
    });
    
    if (!selectedModelId || !localPath || !isDownloaded) {
      const missingItem = !selectedModelId ? 'selectedModelId' : 
                          !localPath ? 'localPath' : 
                          !isDownloaded ? 'isDownloaded' : '';
      console.log(`[DEBUG] Cannot initialize, missing: ${missingItem}`);
      setError(`Cannot initialize: ${missingItem} is missing.`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setStatusMessage('Initializing audio tagging...');
    
    try {
      // Use the cleaned path (without file://) for native module
      let cleanLocalPath = cleanFilePath(localPath);
      
      // Attempt to find subdirectory
      try {
        const expoPath = localPath.startsWith('file://') ? localPath : `file://${localPath}`;
        const contents = await FileSystem.readDirectoryAsync(expoPath);
        console.log(`Found ${contents.length} items in base directory:`, contents);
        
        // Look for a subdirectory matching the model type
        const modelSubdir = contents.find(item => 
          item.includes('sherpa-onnx') && 
          (item.includes('audio-tagging') || item.includes(selectedModelId.replace('ced-', '')))
        );
        
        if (modelSubdir) {
          console.log(`Found model subdirectory: ${modelSubdir}`);
          cleanLocalPath = `${cleanLocalPath}/${modelSubdir}`;
        }
      } catch (dirError) {
        console.error('Error reading directory:', dirError);
        // Fallback to standard path if directory read fails
      }
      
      console.log(`Using model directory: ${cleanLocalPath}`);
      
      // Create configuration for audio tagging initialization directly from predefined config
      const config: AudioTaggingModelConfig = {
        modelDir: cleanLocalPath,
        modelType: audioTaggingConfig?.modelType || 'ced',
        modelFile: audioTaggingConfig?.modelFile || 'model.int8.onnx',
        labelsFile: audioTaggingConfig?.labelsFile || 'class_labels_indices.csv',
        numThreads,
        topK,
        debug: debugMode,
        provider
      };
      
      console.log('Initializing audio tagging with config:', JSON.stringify(config, null, 2));
      
      try {
        const result = await AudioTagging.initialize(config);
        
        if (result.success) {
          setInitialized(true);
          setStatusMessage('Audio tagging engine initialized successfully');
        } else {
          throw new Error(result.error || 'Unknown initialization error');
        }
      } catch (initError) {
        console.error('Native initialization error:', initError);
        throw new Error(`Failed to initialize audio tagging engine: ${initError instanceof Error ? initError.message : String(initError)}`);
      }
    } catch (err) {
      console.error('Error initializing audio tagging:', err);
      setError(`Error initializing audio tagging: ${err instanceof Error ? err.message : String(err)}`);
      
      // Show alert to user
      Alert.alert(
        'Initialization Failed',
        `Could not initialize audio tagging: ${err instanceof Error ? err.message : String(err)}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Play an audio file
  const handlePlayAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    try {
      // Stop any currently playing audio
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      
      // Check if we have a valid local URI
      if (!audioItem.localUri) {
        throw new Error('Audio file not yet loaded');
      }
      
      console.log(`Loading audio file: ${audioItem.localUri}`);
      const soundInfo = await Audio.Sound.createAsync({ uri: audioItem.localUri });
      setSound(soundInfo.sound);
      
      // Set up status update callback
      soundInfo.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      });
      
      await soundInfo.sound.playAsync();
      setIsPlaying(true);
      console.log('Audio playback started');
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(`Error playing audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Stop playing audio
  const handleStopAudio = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
        setIsPlaying(false);
      } catch (err) {
        console.error('Error stopping audio:', err);
      }
    }
  };
  
  // Enhanced for safer processing
  const handleProcessAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    if (!initialized) {
      Alert.alert('Error', 'Please initialize the audio tagging engine first');
      return;
    }
    
    setProcessing(true);
    setAudioTaggingResults(null);
    setError(null); // Clear any previous errors
    
    try {
      // Check if we have a valid local URI
      if (!audioItem.localUri) {
        throw new Error('Audio file not yet loaded');
      }
      
      const localFilePath = audioItem.localUri;
      console.log(`Using local audio file at: ${localFilePath}`);
      
      try {
        // Process the audio file and compute results in one call
        console.log('Processing and analyzing audio file...');
        
        // Process using the AudioTagging API
        const result = await AudioTagging.processAndCompute({
          filePath: localFilePath, // The SherpaOnnxAPI will clean this path
          topK: topK // Use the current UI topK value
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to analyze audio');
        }
        
        setAudioTaggingResults(result as unknown as AudioTaggingResult);
        setStatusMessage(`Detected ${result.events?.length || 0} audio events in ${result.durationMs}ms`);
      } catch (processingError) {
        console.error('Error processing audio data:', processingError);
        setError(`Error processing audio data: ${processingError instanceof Error ? processingError.message : String(processingError)}`);
        
        // Still show a helpful message to the user
        Alert.alert(
          'Processing Error',
          'There was an error analyzing this audio. Try a different audio file or model.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(`Error processing audio: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleReleaseAudioTagging = async () => {
    if (!initialized) return;
    
    setLoading(true);
    
    try {
      console.log('[DEBUG] Releasing audio tagging resources manually');
      const result = await AudioTagging.release();
      
      // Log the full result to help debug
      console.log('[DEBUG] Release result:', JSON.stringify(result));
      
      // Check if the result is truthy and has a released property, otherwise assume success
      const isReleased = result && (typeof result === 'object') && 
                        (result.released !== undefined ? result.released : true);
      
      // Regardless of the return value, reset UI state
      // The logs indicate resources are actually being released
      setInitialized(false);
      setAudioTaggingResults(null);
      
      if (isReleased) {
        setStatusMessage('Audio tagging resources released successfully');
      } else {
        setStatusMessage('Audio tagging resources probably released (result uncertain)');
        console.log('[DEBUG] Release may have failed based on return value, but proceeding anyway');
      }
    } catch (err) {
      console.error('Error releasing audio tagging resources:', err);
      setError(`Error releasing audio tagging resources: ${err instanceof Error ? err.message : String(err)}`);
      
      // Despite the error, reset UI state to prevent it from being stuck
      setInitialized(false);
      setAudioTaggingResults(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Enhanced function to get audio metadata
  const getAudioMetadata = async (uri: string): Promise<{ size: number; duration: number }> => {
    try {
      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      // Use optional chaining with a fallback for size
      const size = fileInfo.exists ? (fileInfo as any).size || 0 : 0;
      
      // Get audio duration
      const { sound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );
      
      // Get duration from status
      let duration = 0;
      if (status.isLoaded) {
        duration = status.durationMillis || 0;
      }
      
      // Clean up sound object
      await sound.unloadAsync();
      
      return { size, duration };
    } catch (error) {
      console.error('Error getting audio metadata:', error);
      return { size: 0, duration: 0 };
    }
  };
  
  // Enhanced handle select audio
  const handleSelectAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    // If selecting the same item again, deselect it
    if (selectedAudio?.id === audioItem.id) {
      setSelectedAudio(null);
      setAudioMetadata({ isLoading: false });
      
      // Stop playback if active
      if (sound && isPlaying) {
        handleStopAudio();
      }
    } else {
      setSelectedAudio(audioItem);
      setAudioMetadata({ isLoading: true });
      
      // Stop any current playback when selecting a new audio
      if (sound && isPlaying) {
        handleStopAudio();
      }
      
      // Fetch metadata for the selected audio
      if (audioItem.localUri) {
        try {
          const metadata = await getAudioMetadata(audioItem.localUri);
          setAudioMetadata({
            size: metadata.size,
            duration: metadata.duration,
            isLoading: false
          });
        } catch (err) {
          console.error('Failed to get audio metadata:', err);
          setAudioMetadata({ isLoading: false });
        }
      }
    }
  };
  
  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Helper function to format duration
  const formatDuration = (milliseconds: number): string => {
    if (!milliseconds) return 'Unknown';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Generate a visualization of the model's predefined config
  const predefinedConfigDisplay = selectedModelId && audioTaggingConfig ? (
    <View style={styles.statusSection}>
      <Text style={styles.sectionTitle}>Predefined Model Configuration</Text>
      
      {/* Display predefined values in a more readable format */}
      <View style={styles.predefinedValuesContainer}>
        {audioTaggingConfig.modelType && (
          <View style={styles.predefinedValueRow}>
            <Text style={styles.predefinedValueLabel}>Model Type:</Text>
            <Text style={styles.predefinedValueText}>{audioTaggingConfig.modelType}</Text>
          </View>
        )}
        
        {audioTaggingConfig.topK !== undefined && (
          <View style={styles.predefinedValueRow}>
            <Text style={styles.predefinedValueLabel}>Top K Results:</Text>
            <Text style={styles.predefinedValueText}>{audioTaggingConfig.topK}</Text>
          </View>
        )}
        
        {audioTaggingConfig.numThreads !== undefined && (
          <View style={styles.predefinedValueRow}>
            <Text style={styles.predefinedValueLabel}>Num Threads:</Text>
            <Text style={styles.predefinedValueText}>{audioTaggingConfig.numThreads}</Text>
          </View>
        )}
        
        {audioTaggingConfig.provider !== undefined && (
          <View style={styles.predefinedValueRow}>
            <Text style={styles.predefinedValueLabel}>Provider:</Text>
            <Text style={styles.predefinedValueText}>{audioTaggingConfig.provider.toUpperCase()}</Text>
          </View>
        )}
        
        {audioTaggingConfig.debug !== undefined && (
          <View style={styles.predefinedValueRow}>
            <Text style={styles.predefinedValueLabel}>Debug Mode:</Text>
            <Text style={styles.predefinedValueText}>{audioTaggingConfig.debug ? 'Enabled' : 'Disabled'}</Text>
          </View>
        )}
        
        {audioTaggingConfig.modelFile !== undefined && (
          <View style={styles.predefinedValueRow}>
            <Text style={styles.predefinedValueLabel}>Model File:</Text>
            <Text style={styles.predefinedValueText}>{audioTaggingConfig.modelFile}</Text>
          </View>
        )}
        
        {audioTaggingConfig.labelsFile !== undefined && (
          <View style={styles.predefinedValueRow}>
            <Text style={styles.predefinedValueLabel}>Labels File:</Text>
            <Text style={styles.predefinedValueText}>{audioTaggingConfig.labelsFile}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.sectionSubtitle}>Raw Configuration:</Text>
      <Text style={styles.codeText} selectable>
        {JSON.stringify(audioTaggingConfig, null, 2)}
      </Text>
    </View>
  ) : null;
  
  const configSection = (
    <View style={styles.configSection}>
      <Text style={styles.sectionTitle}>2. Configuration</Text>
      
      {audioTaggingConfig && (
        <View style={styles.configInfo}>
          <View style={styles.configInfoRow}>
            <Text style={styles.configInfoText}>
              <Text style={styles.noteText}>Note: </Text>
              Values from predefined configuration are shown in blue
            </Text>
            
            {/* Add Reset button */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                if (audioTaggingConfig) {
                  console.log('[DEBUG] Resetting configuration to predefined values');
                  setTopK(audioTaggingConfig.topK ?? 5);
                  setNumThreads(audioTaggingConfig.numThreads ?? 2);
                  setDebugMode(audioTaggingConfig.debug ?? true);
                  setProvider(audioTaggingConfig.provider ?? 'cpu');
                }
              }}
            >
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <View style={styles.configRow}>
        <Text style={styles.configLabel}>Top K Results:</Text>
        <TextInput 
          value={String(topK)}
          onChangeText={(text) => setTopK(Number(text) || 5)}
          keyboardType="numeric"
          style={[
            styles.configInput,
            audioTaggingConfig?.topK === topK && styles.predefinedInput
          ]}
        />
        {audioTaggingConfig?.topK !== undefined && audioTaggingConfig.topK !== topK && (
          <Text style={styles.predefinedValueBadge}>
            Default: {audioTaggingConfig.topK}
          </Text>
        )}
      </View>
      
      <View style={styles.configRow}>
        <Text style={styles.configLabel}>Num Threads:</Text>
        <TextInput 
          value={String(numThreads)}
          onChangeText={(text) => setNumThreads(Number(text) || 2)}
          keyboardType="numeric"
          style={[
            styles.configInput,
            audioTaggingConfig?.numThreads === numThreads && styles.predefinedInput
          ]}
        />
        {audioTaggingConfig?.numThreads !== undefined && audioTaggingConfig.numThreads !== numThreads && (
          <Text style={styles.predefinedValueBadge}>
            Default: {audioTaggingConfig.numThreads}
          </Text>
        )}
      </View>
      
      <View style={styles.configRow}>
        <Text style={styles.configLabel}>Provider:</Text>
        <View style={styles.providerContainer}>
          <TouchableOpacity
            style={[
              styles.providerOption,
              provider === 'cpu' && styles.providerOptionSelected,
              audioTaggingConfig?.provider === 'cpu' && provider === 'cpu' && styles.predefinedProviderSelected
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
              provider === 'gpu' && styles.providerOptionSelected,
              audioTaggingConfig?.provider === 'gpu' && provider === 'gpu' && styles.predefinedProviderSelected
            ]}
            onPress={() => setProvider('gpu')}
          >
            <Text style={[
              styles.providerOptionText,
              provider === 'gpu' && styles.providerOptionTextSelected
            ]}>GPU</Text>
          </TouchableOpacity>
        </View>
        {audioTaggingConfig?.provider !== undefined && audioTaggingConfig.provider !== provider && (
          <Text style={styles.predefinedValueBadge}>
            Default: {audioTaggingConfig.provider.toUpperCase()}
          </Text>
        )}
      </View>
      
      <View style={styles.configRow}>
        <Text style={styles.configLabel}>Debug Mode:</Text>
        <Switch 
          value={debugMode}
          onValueChange={setDebugMode}
          trackColor={{ 
            false: '#eee', 
            true: audioTaggingConfig?.debug === debugMode ? '#2196F3' : '#81c784' 
          }}
        />
        {audioTaggingConfig?.debug !== undefined && audioTaggingConfig.debug !== debugMode && (
          <Text style={styles.predefinedValueBadge}>
            Default: {audioTaggingConfig.debug ? 'On' : 'Off'}
          </Text>
        )}
      </View>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>
              {statusMessage || 'Processing...'}
            </Text>
            
            <Text style={styles.loadingSubText}>
              This may take a moment, especially for longer audio files.
            </Text>
          </View>
        </View>
      )}
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Audio Tagging Demo</Text>
        
        {/* Error and status messages */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        
        {statusMessage ? (
          <Text style={styles.statusText}>{statusMessage}</Text>
        ) : null}
        
        {/* Model Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Model</Text>
          {initialized && (
            <Text style={styles.warningText}>
              Switching models will release the currently initialized model
            </Text>
          )}
          <View style={styles.pickerContainer}>
            {downloadedModels.length === 0 ? (
              <Text style={styles.emptyText}>
                No audio tagging models downloaded. Please visit the Models screen to download a model.
              </Text>
            ) : (
              downloadedModels.map((model) => (
                <TouchableOpacity
                  key={model.metadata.id}
                  style={[
                    styles.modelOption,
                    selectedModelId === model.metadata.id && styles.modelOptionSelected
                  ]}
                  onPress={() => handleModelSelect(model.metadata.id)}
                  disabled={processing}
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
        
        {/* Show the predefined configuration after model selection */}
        {predefinedConfigDisplay}
        
        {/* Configuration - replace the existing View with the new configSection */}
        {configSection}
        
        {/* Actions */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.initButton,
              (initialized || !selectedModelId || loading || processing) && styles.buttonDisabled
            ]}
            onPress={handleInitAudioTagging}
            disabled={loading || initialized || !selectedModelId || processing}
          >
            <Text style={styles.buttonText}>Initialize</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              styles.releaseButton,
              (!initialized || loading || processing) && styles.buttonDisabled
            ]}
            onPress={handleReleaseAudioTagging}
            disabled={loading || !initialized || processing}
          >
            <Text style={styles.buttonText}>Release</Text>
          </TouchableOpacity>
        </View>
        
        {/* Sample Audio Files */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {initialized ? '3. Sample Audio Files' : '3. Sample Audio Files (Initialize model first)'}
          </Text>
          
          {loadedAudioFiles.length === 0 ? (
            <ActivityIndicator size="small" color="#0000ff" />
          ) : (
            loadedAudioFiles.map(audio => (
              <TouchableOpacity
                key={audio.id}
                style={[
                  styles.audioItem,
                  selectedAudio?.id === audio.id && styles.selectedAudio
                ]}
                onPress={() => handleSelectAudio(audio)}
                disabled={processing}
              >
                <Text style={styles.audioName}>{audio.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        
        {/* Audio Actions */}
        {selectedAudio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Audio Actions</Text>
            <View style={styles.audioMetadataContainer}>
              <Text style={styles.selectedAudioText}>
                Selected: {selectedAudio.name}
              </Text>
              
              {audioMetadata.isLoading ? (
                <ActivityIndicator size="small" color="#0288d1" style={styles.metadataLoader} />
              ) : (
                <View style={styles.metadataDetails}>
                  {audioMetadata.size !== undefined && (
                    <Text style={styles.metadataText}>
                      Size: {formatFileSize(audioMetadata.size)}
                    </Text>
                  )}
                  {audioMetadata.duration !== undefined && (
                    <Text style={styles.metadataText}>
                      Duration: {formatDuration(audioMetadata.duration)}
                    </Text>
                  )}
                </View>
              )}
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.playButton,
                  isPlaying && styles.stopButton,
                  processing && styles.buttonDisabled
                ]}
                onPress={() => {
                  if (selectedAudio && 'localUri' in selectedAudio) {
                    isPlaying ? handleStopAudio() : handlePlayAudio(selectedAudio);
                  }
                }}
                disabled={processing}
              >
                <Text style={styles.buttonText}>{isPlaying ? 'Stop' : 'Play'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.classifyButton,
                  (!initialized || processing) && styles.buttonDisabled
                ]}
                onPress={() => {
                  if (selectedAudio && 'localUri' in selectedAudio) {
                    handleProcessAudio(selectedAudio);
                  }
                }}
                disabled={!initialized || processing}
              >
                <Text style={styles.buttonText}>Classify</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Results */}
        {audioTaggingResults && audioTaggingResults.events && audioTaggingResults.events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedAudio ? '5. Results' : '4. Results'}
            </Text>
            
            {processing ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : (
              <View style={styles.resultsList}>
                {audioTaggingResults.events.map((item) => (
                  <View key={`${item.index}-${item.name}`} style={styles.resultItem}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultProb}>{(item.prob * 100).toFixed(2)}%</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default AudioTaggingScreen;

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
    marginVertical: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  initButton: {
    backgroundColor: '#2196F3',
  },
  releaseButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  audioItem: {
    backgroundColor: '#e1f5fe',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 6,
    borderRadius: 6,
  },
  selectedAudio: {
    backgroundColor: '#81d4fa',
    borderWidth: 2,
    borderColor: '#0288d1',
  },
  audioName: {
    fontSize: 16,
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultProb: {
    fontSize: 16,
    color: '#0288d1',
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
  warningText: {
    color: '#FF9800',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
  },
  pickerContainer: {
    marginBottom: 8,
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
  playButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF5722',
  },
  classifyButton: {
    backgroundColor: '#2196F3',
  },
  selectedAudioText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    color: '#0288d1',
  },
  audioMetadataContainer: {
    marginBottom: 16,
  },
  metadataDetails: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metadataText: {
    fontSize: 14,
    color: '#555',
    marginRight: 16,
    marginBottom: 4,
  },
  metadataLoader: {
    marginTop: 8,
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
  statusSection: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 4,
  },
  predefinedValuesContainer: {
    marginBottom: 16,
  },
  predefinedValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  predefinedValueLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  predefinedValueText: {
    fontSize: 14,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  configInfo: {
    marginBottom: 16,
  },
  configInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configInfoText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    flex: 1,
    marginRight: 16,
  },
  noteText: {
    fontWeight: 'bold',
  },
  predefinedInput: {
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  predefinedValueBadge: {
    backgroundColor: '#2196F3',
    color: '#fff',
    padding: 4,
    borderRadius: 4,
    marginLeft: 8,
    fontSize: 12,
  },
  predefinedProviderSelected: {
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#0d47a1',
  },
  resetButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 