import { IdentifySpeakerResult, SpeakerEmbeddingResult, SpeakerId, SpeakerIdModelConfig } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModelManagement } from '../../contexts/ModelManagement/ModelManagementContext';

// Define sample audio with only name and module
const SAMPLE_AUDIO_FILES = [
  {
    id: '1',
    name: 'Speaker 1',
    module: require('@assets/audio/jfk.wav'),
  },
  {
    id: '2',
    name: 'Speaker 2',
    module: require('@assets/audio/en.wav'),
  }
];

// Helper function to verify file existence - requires Expo URI format with file:// prefix
const verifyFileExists = async (expoUri: string): Promise<boolean> => {
  try {
    // Ensure the URI has the file:// prefix for Expo
    const uri = expoUri.startsWith('file://') ? expoUri : `file://${expoUri}`;
    console.log(`Checking file existence: ${uri}`);
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo.exists;
  } catch (error) {
    console.error(`Error checking file existence: ${expoUri}`, error);
    return false;
  }
};

// Helper function to properly join path segments
const joinPaths = (...paths: string[]): string => {
  return paths
    .map(path => path.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
    .filter(Boolean) // Remove empty segments
    .join('/');
};

interface ModelInfo {
  modelDir: string;
  modelType: string;
}

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

/**
 * Recursively search for a speaker identification model file in a directory and its subdirectories
 * @param basePath Base directory path to start searching
 * @returns Object with modelDir and modelName if found, null otherwise
 */
const findModelFilesRecursive = async (basePath: string): Promise<ModelInfo | null> => {
  console.log(`Searching for speaker ID models in: ${basePath}`);
  
  // Ensure base path has file:// prefix for Expo FileSystem
  const expoBasePath = basePath.startsWith('file://') ? basePath : `file://${basePath}`;
  
  const searchDirectory = async (expoPath: string, depth = 0): Promise<ModelInfo | null> => {
    if (depth > 3) return null; // Limit recursion depth
    
    try {
      console.log(`Searching directory: ${expoPath} (depth: ${depth})`);
      
      const dirInfo = await FileSystem.getInfoAsync(expoPath);
      
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        console.log(`Path is not a valid directory: ${expoPath}`);
        return null;
      }
      
      // Get directory contents
      const contents = await FileSystem.readDirectoryAsync(expoPath);
      console.log(`Found ${contents.length} items in ${expoPath}`);
      
      // Look for the model file - typically a .onnx file with "speaker" in the name
      const modelFile = contents.find(
        file => file.endsWith('.onnx') && 
        (file.toLowerCase().includes('speaker') || 
         file.toLowerCase().includes('voice') || 
         file.toLowerCase().includes('embedding'))
      );
      
      if (modelFile) {
        console.log(`Found speaker ID model file: ${modelFile} in ${expoPath}`);
        return {
          modelDir: expoPath,
          modelType: 'speaker-embedding'
        };
      }
      
      // Recursively check subdirectories
      for (const item of contents) {
        const subDirPath = `${expoPath}/${item}`;
        const subDirInfo = await FileSystem.getInfoAsync(subDirPath);
        
        if (subDirInfo.isDirectory) {
          const result = await searchDirectory(subDirPath, depth + 1);
          if (result) return result;
        }
      }
      
      return null;
    } catch (err) {
      console.error(`Error searching directory ${expoPath}:`, err);
      return null;
    }
  };
  
  // Start the recursive search
  return searchDirectory(expoBasePath);
};

interface ModelState {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}

export default function SpeakerIdScreen() {
  const { getDownloadedModels, getModelState, refreshModelStatus } = useModelManagement();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [modelFile, setModelFile] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{
    id: string;
    name: string;
    module: number;
    localUri: string;
  } | null>(null);
  const [embeddingResult, setEmbeddingResult] = useState<SpeakerEmbeddingResult | null>(null);
  const [identifyResult, setIdentifyResult] = useState<IdentifySpeakerResult | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [registeredSpeakers, setRegisteredSpeakers] = useState<string[]>([]);
  const [speakerCount, setSpeakerCount] = useState(0);
  
  // Add a ref to track already refreshed model IDs
  const refreshedModels = React.useRef<Set<string>>(new Set());
  // Track if component is mounted
  const isMounted = React.useRef(true);
  
  // Get only downloaded speaker ID models
  const availableModels = getDownloadedModels().filter(model => 
    model.metadata?.type === 'speaker-id'
  );
  
  // Add state for loaded audio assets
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<Array<{
    id: string;
    name: string;
    module: number;
    localUri: string;
  }>>([]);
  
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
  const [numThreads, setNumThreads] = useState<number>(2);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(0.5);
  const [newSpeakerName, setNewSpeakerName] = useState<string>('');
  
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
      isMounted.current = false;
      if (initialized) {
        console.log('Cleaning up speaker ID resources');
        SpeakerId.release().catch((err: Error) => 
          console.error('Error releasing speaker ID resources:', err)
        );
      }
      
      if (sound) {
        sound.unloadAsync().catch(err => 
          console.error('Error unloading audio during cleanup:', err)
        );
      }
    };
  }, []);
  
  // Fix the model refresh useEffect to prevent infinite loops
  useEffect(() => {
    async function refreshSelectedModel() {
      if (!selectedModelId || !isMounted.current) return;
      
      // Skip if we've already refreshed this model - use a unique key
      const modelRefreshKey = `refresh-${selectedModelId}`;
      if (refreshedModels.current.has(modelRefreshKey)) {
        console.log(`Skipping refresh for ${selectedModelId} - already refreshed`);
        return;
      }
      
      console.log(`Refreshing model status for ${selectedModelId} (once only)`);
      try {
        // Mark this model as refreshed to prevent future refreshes
        refreshedModels.current.add(modelRefreshKey);
        await refreshModelStatus(selectedModelId);
      } catch (err) {
        if (isMounted.current) {
          console.error(`Error refreshing model status: ${err}`);
        }
      }
    }
    
    refreshSelectedModel();
    
    // Add cleanup function
    return () => {
      // This will run before the next effect or on unmount
    };
  }, [selectedModelId]); // Remove refreshModelStatus from dependencies
  
  // Setup speaker ID with a specific model
  async function setupSpeakerId(modelId: string) {
    setLoading(true);
    setError(null);
    
    try {
      // Only refresh the model status if we haven't already done so
      const modelRefreshKey = `refresh-${modelId}`;
      if (!refreshedModels.current.has(modelRefreshKey)) {
        console.log(`Refreshing model status before setup for ${modelId}`);
        refreshedModels.current.add(modelRefreshKey);
        await refreshModelStatus(modelId);
      } else {
        console.log(`Using cached model status for ${modelId}`);
      }
      
      // Log available models for debugging
      const downloadedModels = getDownloadedModels();
      console.log(`Available speaker ID models: ${downloadedModels.length}`);
      
      // Get model state
      const modelState = getModelState(modelId);
      console.log(`Model state for ${modelId}: ${JSON.stringify(modelState, null, 2)}`);
      
      if (!modelState) {
        throw new Error(`Model state not found for ID: ${modelId}`);
      }
      
      if (!modelState.localPath) {
        throw new Error('Model files not found locally - no localPath in model state');
      }
      
      console.log(`Using model path: ${modelState.localPath}`);
      
      // For speaker ID models, we need the .onnx file
      let modelFile = '';
      let modelDir = '';
      
      // Check if the localPath exists and what it is
      const pathInfo = await FileSystem.getInfoAsync(modelState.localPath);
      
      if (!pathInfo.exists) {
        throw new Error(`Path does not exist: ${modelState.localPath}`);
      }
      
      // Different handling based on whether the path is a file or directory
      if (!pathInfo.isDirectory) {
        // The localPath is directly to the model file
        console.log('Local path is a direct file path');
        modelFile = modelState.localPath.split('/').pop() || '';
        modelDir = modelState.localPath.substring(0, modelState.localPath.lastIndexOf('/'));
        console.log(`Extracted model file: ${modelFile}`);
        console.log(`Extracted model directory: ${modelDir}`);
      } else {
        // The localPath is a directory
        console.log('Local path is a directory');
        modelDir = modelState.localPath;
        
        // Try to find the model file
        if (modelState.extractedFiles && modelState.extractedFiles.length > 0) {
          // Use first extracted file if available
          modelFile = modelState.extractedFiles[0];
          console.log(`Using extracted model file: ${modelFile}`);
        } else {
          // Try to find .onnx file in the directory
          const dirContents = await FileSystem.readDirectoryAsync(modelDir);
          const onnxFile = dirContents.find(file => file.endsWith('.onnx'));
          if (onnxFile) {
            modelFile = onnxFile;
            console.log(`Found ONNX file in directory: ${modelFile}`);
          } else {
            throw new Error('No ONNX model file found in the model directory');
          }
        }
      }
      
      // Verify the model file exists
      const fullModelPath = joinPaths(modelDir, modelFile);
      console.log(`Checking if model file exists at: ${fullModelPath}`);
      const fileExists = await verifyFileExists(fullModelPath);
      
      if (!fileExists) {
        console.error(`File not found at path: ${fullModelPath}`);
        throw new Error(`Model file not found at ${fullModelPath}`);
      }
      
      console.log(`File exists, proceeding with initialization`);
      
      setModelInfo({
        modelDir: modelDir,
        modelType: 'speaker-embedding'
      });
      setModelFile(modelFile);
      
      // Initialize Speaker ID with the model file
      await handleInitSpeakerId(modelDir, modelFile, modelId);
      
    } catch (err) {
      console.error('Error setting up speaker ID:', err);
      setError(`Error setting up speaker ID: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }
  
  // Initialize the speaker ID engine
  const handleInitSpeakerId = async (modelDir: string, modelFile: string, modelId?: string) => {
    if (!modelDir || !modelFile) {
      setError('Model information not available');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const cleanPath = cleanFilePath;
      
      console.log('Setting up speaker ID with model in:', modelDir);
      console.log('Model file:', modelFile);
      
      // Determine if modelFile is already a full path or just a filename
      const isFullPath = modelFile.includes('/');
      
      // Initialize Speaker ID
      const config: SpeakerIdModelConfig = {
        modelDir: cleanPath(modelDir),
        // If modelFile is a full path, use just the filename
        modelFile: isFullPath ? modelFile.split('/').pop() || modelFile : modelFile,
        numThreads: numThreads,
        debug: debugMode
      };
      
      console.log('Initializing speaker ID with config:', JSON.stringify(config));
      
      // Log additional info for debugging
      console.log(`Model directory: ${modelDir}`);
      console.log(`Model filename: ${config.modelFile}`);
      
      // Check if the file exists in the directory
      const fullModelPath = isFullPath ? modelFile : joinPaths(modelDir, config.modelFile || '');
      const fileExists = await verifyFileExists(fullModelPath);
      console.log(`Full model path: ${fullModelPath}`);
      console.log(`Model file exists check: ${fileExists}`);
      
      if (!fileExists) {
        throw new Error(`Model file not found at path: ${fullModelPath}`);
      }
      
      // Initialize the speaker ID engine
      const result = await SpeakerId.init(config);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during speaker ID initialization');
      }
      
      console.log('Speaker ID initialized successfully with embedding dimension:', result.embeddingDim);
      
      // Fetch registered speakers if any
      await refreshSpeakerList();
      
      setInitialized(true);
      if (result.success && modelId) {
        setSelectedModelId(modelId);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error initializing speaker ID:', err);
      setError(`Error initializing speaker ID: ${err instanceof Error ? err.message : String(err)}`);
      setInitialized(false);
      setLoading(false);
    }
  };
  
  // Refresh the list of registered speakers
  const refreshSpeakerList = async () => {
    try {
      const result = await SpeakerId.getSpeakers();
      if (result.success) {
        setRegisteredSpeakers(result.speakers);
        setSpeakerCount(result.count);
      } else {
        console.warn('Failed to get speakers:', result.error);
      }
    } catch (err) {
      console.error('Error getting speakers:', err);
    }
  };
  
  // Play audio
  const handlePlayAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    try {
      // Stop any existing playback
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      // Load and play the new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioItem.localUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setSelectedAudio(audioItem);
      
      // Set up playback status update handler
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      });
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(`Error playing audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // Stop audio playback
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
  
  // Process audio to get embedding
  const handleProcessAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    if (!initialized) {
      setError('Speaker ID is not initialized');
      return;
    }
    
    setProcessing(true);
    setEmbeddingResult(null);
    setIdentifyResult(null);
    setError(null);
    
    try {
      console.log('Processing audio file:', audioItem.localUri);
      
      // Process the audio file to get embedding
      const result = await SpeakerId.processFile(audioItem.localUri);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during audio processing');
      }
      
      console.log('Embedding result:', {
        success: result.success,
        embeddingDim: result.embeddingDim,
        durationMs: result.durationMs,
        embeddingLength: result.embedding.length,
        firstFewValues: result.embedding.slice(0, 5)
      });
      
      setEmbeddingResult(result);
      
      // If we have registered speakers, try to identify
      if (speakerCount > 0) {
        const identifyResult = await SpeakerId.identifySpeaker(result.embedding, threshold);
        setIdentifyResult(identifyResult);
      }
      
      setProcessing(false);
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(`Error processing audio: ${err instanceof Error ? err.message : String(err)}`);
      setProcessing(false);
    }
  };
  
  // Register current speaker
  const handleRegisterSpeaker = async () => {
    if (!initialized || !embeddingResult) {
      setError('Speaker ID is not initialized or no embedding available');
      return;
    }
    
    if (!newSpeakerName.trim()) {
      setError('Please enter a name for the speaker');
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      // Register the speaker with the current embedding
      const result = await SpeakerId.registerSpeaker(newSpeakerName, embeddingResult.embedding);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during speaker registration');
      }
      
      Alert.alert('Success', `Speaker "${newSpeakerName}" registered successfully`);
      setNewSpeakerName('');
      
      // Refresh the speaker list
      await refreshSpeakerList();
      
      setProcessing(false);
    } catch (err) {
      console.error('Error registering speaker:', err);
      setError(`Error registering speaker: ${err instanceof Error ? err.message : String(err)}`);
      setProcessing(false);
    }
  };
  
  // Remove a speaker
  const handleRemoveSpeaker = async (name: string) => {
    if (!initialized) {
      setError('Speaker ID is not initialized');
      return;
    }
    
    setProcessing(true);
    setError(null);
    
    try {
      // Remove the speaker
      const result = await SpeakerId.removeSpeaker(name);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during speaker removal');
      }
      
      Alert.alert('Success', `Speaker "${name}" removed successfully`);
      
      // Refresh the speaker list
      await refreshSpeakerList();
      
      setProcessing(false);
    } catch (err) {
      console.error('Error removing speaker:', err);
      setError(`Error removing speaker: ${err instanceof Error ? err.message : String(err)}`);
      setProcessing(false);
    }
  };
  
  // Release Speaker ID
  const handleReleaseSpeakerId = async () => {
    if (!initialized) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await SpeakerId.release();
      
      if (result.released) {
        setInitialized(false);
        setEmbeddingResult(null);
        setIdentifyResult(null);
        setRegisteredSpeakers([]);
        setSpeakerCount(0);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error releasing speaker ID:', err);
      setError(`Error releasing speaker ID: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  };
  
  // Get audio metadata
  const getAudioMetadata = async (uri: string): Promise<{ size: number; duration: number }> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = fileInfo.exists ? fileInfo.size || 0 : 0;

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );

      const status = await sound.getStatusAsync();
      const durationMs = status.isLoaded ? status.durationMillis || 0 : 0;

      await sound.unloadAsync();

      return {
        size: fileSize,
        duration: durationMs,
      };
    } catch (error) {
      console.error('Error getting audio metadata:', error);
      return {
        size: 0,
        duration: 0,
      };
    }
  };
  
  // Handle audio selection
  const handleSelectAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    setSelectedAudio(audioItem);
    setEmbeddingResult(null);
    setIdentifyResult(null);
    
    // Get metadata
    await getAudioMetadata(audioItem.localUri);
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };
  
  // Format duration for display
  const formatDuration = (milliseconds: number): string => {
    if (!milliseconds) return '0:00';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Speaker Identification</Text>
              
              {/* Model Selection */}
              <View style={styles.modelSelection}>
                <Text style={styles.label}>Select Model:</Text>
                <View style={styles.modelList}>
                  {availableModels.map((item) => (
                    <TouchableOpacity
                      key={item.metadata.id}
                      style={[
                        styles.modelItem,
                        selectedModelId === item.metadata.id && styles.selectedModelItem
                      ]}
                      onPress={() => {
                        console.log(`Selecting model with ID: ${item.metadata.id}`);
                        setSelectedModelId(item.metadata.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.modelItemText,
                          selectedModelId === item.metadata.id && styles.selectedModelItemText
                        ]}
                      >
                        {item.metadata.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {availableModels.length === 0 && (
                  <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>
                      No speaker identification models available.
                      Please download a model from the Models tab.
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Advanced Configuration */}
              <View style={styles.configSection}>
                <Text style={styles.label}>Advanced Configuration:</Text>
                
                <View style={styles.configRow}>
                  <Text>Threads:</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={numThreads.toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num > 0) {
                        setNumThreads(num);
                      }
                    }}
                    keyboardType="numeric"
                    editable={!initialized}
                  />
                </View>
                
                <View style={styles.configRow}>
                  <Text>Debug Mode:</Text>
                  <Switch
                    value={debugMode}
                    onValueChange={(value) => setDebugMode(value)}
                    disabled={initialized}
                  />
                </View>
                
                <View style={styles.configRow}>
                  <Text>Similarity Threshold:</Text>
                  <TextInput
                    style={styles.numberInput}
                    value={threshold.toString()}
                    onChangeText={(text) => {
                      const value = parseFloat(text);
                      if (!isNaN(value) && value >= 0 && value <= 1) {
                        setThreshold(value);
                      }
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              {/* Status */}
              <View style={styles.statusSection}>
                <Text style={styles.label}>Status:</Text>
                <Text>
                  {initialized 
                    ? `Initialized with model: ${modelFile || 'Unknown'}`
                    : 'Not initialized'}
                </Text>
                <Text>
                  Registered Speakers: {speakerCount}
                </Text>
                {error && (
                  <Text style={styles.errorText}>Error: {error}</Text>
                )}
              </View>
              
              {/* Control Buttons */}
              <View style={styles.buttonContainer}>
                <Button
                  title={initialized ? "Release" : "Initialize"}
                  onPress={initialized ? handleReleaseSpeakerId : () => {
                    if (selectedModelId) {
                      console.log(`Initializing model with ID: ${selectedModelId}`);
                      // Get the latest model state from context
                      const currentModelState = getModelState(selectedModelId);
                      
                      if (currentModelState && currentModelState.status === 'downloaded') {
                        setupSpeakerId(selectedModelId);
                      } else {
                        setError(`Model not ready for initialization. Status: ${currentModelState?.status || 'unknown'}`);
                        console.log(`Model state: ${JSON.stringify(currentModelState, null, 2)}`);
                      }
                    } else {
                      setError('Please select a model first');
                    }
                  }}
                  disabled={loading || (!initialized && !selectedModelId)}
                />
              </View>
            </View>
            
            {initialized && (
              <>
                {/* Audio Selection */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Test Audio</Text>
                  
                  <View style={styles.audioList}>
                    {loadedAudioFiles.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.audioItem,
                          selectedAudio?.id === item.id && styles.selectedAudioItem
                        ]}
                        onPress={() => handleSelectAudio(item)}
                        disabled={processing}
                      >
                        <Text style={styles.audioName}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {selectedAudio && (
                    <View style={styles.selectedAudioInfo}>
                      <Text style={styles.label}>Selected: {selectedAudio.name}</Text>
                      
                      {audioMetadata.isLoading ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <>
                          {audioMetadata.size !== undefined && (
                            <Text>Size: {formatFileSize(audioMetadata.size)}</Text>
                          )}
                          {audioMetadata.duration !== undefined && (
                            <Text>Duration: {formatDuration(audioMetadata.duration)}</Text>
                          )}
                        </>
                      )}
                      
                      <View style={styles.audioControls}>
                        <Button
                          title={isPlaying ? "Stop" : "Play"}
                          onPress={isPlaying ? handleStopAudio : () => handlePlayAudio(selectedAudio)}
                          disabled={processing}
                        />
                        <Button
                          title="Process"
                          onPress={() => handleProcessAudio(selectedAudio)}
                          disabled={processing || isPlaying}
                        />
                      </View>
                    </View>
                  )}
                </View>
                
                {/* Processing Results */}
                {(processing || embeddingResult) && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Results</Text>
                    
                    {processing ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0000ff" />
                        <Text style={styles.loadingText}>Processing audio...</Text>
                      </View>
                    ) : embeddingResult && (
                      <View style={styles.resultContainer}>
                        <Text style={styles.resultTitle}>Embedding Results:</Text>
                        <Text style={styles.resultText}>Dimension: {embeddingResult.embeddingDim}</Text>
                        <Text style={styles.resultText}>Processing time: {embeddingResult.durationMs} ms</Text>
                        
                        {/* Display first few values of the embedding vector */}
                        <Text style={styles.embeddingTitle}>First 5 embedding values:</Text>
                        <Text style={styles.embeddingValues}>
                          {embeddingResult.embedding.slice(0, 5).map((value, index) => 
                            `${value.toFixed(4)}${index < 4 ? ', ' : ''}`
                          )}
                        </Text>
                        
                        {identifyResult && (
                          <View style={styles.identifyResult}>
                            <Text style={styles.label}>Identification Result:</Text>
                            {identifyResult.identified ? (
                              <Text style={styles.identifiedText}>
                                Speaker identified: {identifyResult.speakerName}
                              </Text>
                            ) : (
                              <Text>No matching speaker found</Text>
                            )}
                          </View>
                        )}
                        
                        {/* Register New Speaker */}
                        <View style={styles.registerSection}>
                          <Text style={styles.label}>Register as:</Text>
                          <TextInput
                            style={styles.textInput}
                            value={newSpeakerName}
                            onChangeText={setNewSpeakerName}
                            placeholder="Enter speaker name"
                          />
                          <Button
                            title="Register Speaker"
                            onPress={handleRegisterSpeaker}
                            disabled={!newSpeakerName.trim() || processing}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                )}
                
                {/* Registered Speakers */}
                {registeredSpeakers.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Registered Speakers</Text>
                    
                    <FlatList
                      data={registeredSpeakers}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <View style={styles.speakerItem}>
                          <Text style={styles.speakerName}>{item}</Text>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveSpeaker(item)}
                            disabled={processing}
                          >
                            <Text style={styles.removeButtonText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                  </View>
                )}
              </>
            )}
          </View>
        )}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.scrollContent}
      />
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
  content: {
    flex: 1,
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
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modelSelection: {
    marginBottom: 16,
  },
  modelList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modelItem: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  selectedModelItem: {
    backgroundColor: '#007AFF',
  },
  modelItemText: {
    color: '#333',
  },
  selectedModelItemText: {
    color: 'white',
  },
  configSection: {
    marginBottom: 16,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    width: 80,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    width: '100%',
  },
  statusSection: {
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  audioItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  selectedAudioItem: {
    backgroundColor: '#007AFF',
  },
  audioName: {
    fontWeight: '500',
  },
  selectedAudioInfo: {
    marginTop: 16,
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  resultContainer: {
    padding: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  embeddingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  embeddingValues: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  identifyResult: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  identifiedText: {
    fontWeight: 'bold',
    color: 'green',
  },
  registerSection: {
    marginTop: 16,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  emptyList: {
    padding: 16,
    alignItems: 'center',
  },
  emptyListText: {
    color: '#666',
    textAlign: 'center',
  },
  speakerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  speakerName: {
    fontWeight: '500',
  },
  removeButton: {
    padding: 6,
    backgroundColor: '#ff3b30',
    borderRadius: 4,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  resultText: {
    marginBottom: 4,
    color: '#333',
  },
  audioList: {
    gap: 8,
  },
});