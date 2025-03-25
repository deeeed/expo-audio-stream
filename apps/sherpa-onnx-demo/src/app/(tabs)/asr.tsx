import { ASR, AsrInitResult, AsrModelConfig, AsrRecognizeResult } from '@siteed/sherpa-onnx.rn';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
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
import { Asset } from 'expo-asset';

// Define sample audio with only name and module
const SAMPLE_AUDIO_FILES = [
  {
    id: '1',
    name: 'English Sentence',
    module: require('@assets/audio/jfk.wav'),
  },
  {
    id: '2',
    name: 'Numbers',
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

/**
 * Recursively search for ASR model files in a directory and its subdirectories
 * @param basePath Base directory path to start searching
 * @returns Object with modelDir and detected modelType if found, null otherwise
 */
const findModelFilesRecursive = async (basePath: string): Promise<{ modelDir: string, modelType: string } | null> => {
  console.log(`Searching for ASR models in: ${basePath}`);
  
  // Ensure base path has file:// prefix for Expo FileSystem
  const expoBasePath = basePath.startsWith('file://') ? basePath : `file://${basePath}`;
  
  const searchDirectory = async (expoPath: string, depth = 0): Promise<{ modelDir: string, modelType: string } | null> => {
    if (depth > 5) return null; // Increased depth limit to 5
    
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
      
      // Check for transducer model files (encoder, decoder, joiner)
      const hasEncoder = contents.includes('encoder.onnx') || contents.some(file => file.includes('encoder') && file.endsWith('.onnx'));
      const hasDecoder = contents.includes('decoder.onnx') || contents.some(file => file.includes('decoder') && file.endsWith('.onnx'));
      const hasJoiner = contents.includes('joiner.onnx') || contents.some(file => file.includes('joiner') && file.endsWith('.onnx'));
      const hasTokens = contents.includes('tokens.txt');
      
      if (hasEncoder && hasDecoder && hasJoiner && hasTokens) {
        console.log(`Found transducer model files in ${expoPath}`);
        return {
          modelDir: expoPath,
          modelType: 'transducer'
        };
      }
      
      // Check for whisper/single-file model
      const hasModel = contents.some(file => file === 'model.onnx' || file.endsWith('.onnx'));
      
      if (hasModel && hasTokens) {
        console.log(`Found whisper/single-file model in ${expoPath}`);
        return {
          modelDir: expoPath,
          modelType: 'whisper'
        };
      }
      
      // Check for paraformer model files (encoder, decoder)
      if (hasEncoder && hasDecoder && hasTokens) {
        console.log(`Found paraformer model files in ${expoPath}`);
        return {
          modelDir: expoPath,
          modelType: 'paraformer'
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

// Create an instance of the ASR Service (renamed from STT)
const asrService = ASR;

export default function AsrScreen() {
  const { getDownloadedModels, getModelState } = useModelManagement();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{ modelDir: string, modelType: string } | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{
    id: string;
    name: string;
    module: number;
    localUri: string;
  } | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  
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
  
  // Get only relevant models for ASR
  const availableModels = getDownloadedModels().filter(model => 
    model.metadata.type === 'asr'
  );
  
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
        console.log('Cleaning up ASR resources');
        asrService.release().catch((err: Error) => 
          console.error('Error releasing ASR resources:', err)
        );
      }
      
      if (sound) {
        sound.unloadAsync().catch(err => 
          console.error('Error unloading audio during cleanup:', err)
        );
      }
    };
  }, [initialized, sound]);
  
  // Setup ASR with a selected model
  async function setupAsr(modelId: string) {
    setLoading(true);
    setError(null);
    
    try {
      const modelState = getModelState(modelId);
      if (!modelState?.localPath) {
        throw new Error('Model files not found locally');
      }
      
      console.log(`Using model path: ${modelState.localPath}`);
      
      // Find ASR model files recursively
      const modelFiles = await findModelFilesRecursive(modelState.localPath);
      if (!modelFiles) {
        setError('Could not find ASR model files in the model directory. Please check the logs for more details.');
        setLoading(false);
        return;
      }
      
      setModelInfo(modelFiles);
      setSelectedModelId(modelId);
      
      // Success, everything is ready
      setLoading(false);
    } catch (err) {
      console.error('Error setting up ASR:', err);
      setError(`Error setting up ASR: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }
  
  // Initialize ASR with the selected model
  const handleInitAsr = async () => {
    if (!modelInfo) {
      setError('Model information not available');
      return;
    }

    setLoading(true);
    setError(null);
    setInitialized(false);
    
    try {
      // Clean path for native module (remove file:// prefix)
      const cleanPath = modelInfo.modelDir.replace(/^file:\/\//, '');
      
      const config: AsrModelConfig = {
        modelDir: cleanPath,
        modelType: modelInfo.modelType,
        numThreads: 2,
        decodingMethod: 'greedy_search'
      };
      
      console.log('Initializing ASR with config:', JSON.stringify(config));
      
      const result = await asrService.initialize(config);
      
      setInitialized(result.success);
      if (result.success) {
        Alert.alert('Success', 'Speech recognition engine initialized successfully');
      } else {
        setError(`Failed to initialize ASR: ${result.error}`);
      }
    } catch (err) {
      setError(`Error initializing ASR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle playing audio samples
  const handlePlayAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    try {
      // Stop current playback if any
      if (sound && isPlaying) {
        await sound.stopAsync();
        setSound(null);
        setIsPlaying(false);
      }
      
      console.log(`Playing audio: ${audioItem.name} from ${audioItem.localUri}`);
      
      // Create a new sound object
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioItem.localUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      setSelectedAudio(audioItem);
      
      // Set up listener for playback status
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(`Failed to play audio: ${err instanceof Error ? err.message : String(err)}`);
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
  
  // Process the selected audio file for speech recognition
  const handleRecognizeAudio = async () => {
    if (!initialized) {
      setError('Please initialize the ASR engine first');
      return;
    }
    
    if (!selectedAudio) {
      setError('Please select an audio file first');
      return;
    }
    
    setProcessing(true);
    setError(null);
    setRecognitionResult('');
    
    try {
      console.log(`Processing audio file: ${selectedAudio.localUri}`);
      
      // Recognize from file (handles mp3, wav, etc.)
      const result = await asrService.recognizeFromFile(selectedAudio.localUri);
      
      if (result.success) {
        console.log('Recognition successful:', result);
        setRecognitionResult(result.text || '');
      } else {
        setError(`Recognition failed: ${result.error}`);
      }
    } catch (err) {
      setError(`Error recognizing speech: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  };
  
  // Release ASR resources
  const handleReleaseAsr = async () => {
    if (!initialized) {
      return;
    }
    
    setLoading(true);
    try {
      const result = await asrService.release();
      
      setInitialized(false);
      setModelInfo(null);
      setRecognitionResult('');
      Alert.alert('Success', 'ASR resources released successfully');
    } catch (err) {
      setError(`Error releasing ASR resources: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Get audio file metadata
  const getAudioMetadata = async (uri: string): Promise<{ size: number; duration: number }> => {
    try {
      setAudioMetadata({ ...audioMetadata, isLoading: true });
      
      // Get file info from filesystem
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      let duration = 0;
      
      if (fileInfo.exists) {
        // Load the sound to get its duration
        const { sound } = await Audio.Sound.createAsync({ uri });
        const status = await sound.getStatusAsync();
        
        if (status.isLoaded) {
          duration = status.durationMillis || 0;
        }
        
        // Clean up
        await sound.unloadAsync();
      }
      
      const result = {
        size: (fileInfo as any).size || 0,
        duration: duration,
      };
      
      setAudioMetadata({
        ...result,
        isLoading: false
      });
      
      return result;
    } catch (err) {
      console.error('Error getting audio metadata:', err);
      setAudioMetadata({ isLoading: false });
      return { size: 0, duration: 0 };
    }
  };
  
  // Handle selecting an audio file
  const handleSelectAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    setSelectedAudio(audioItem);
    
    try {
      // Fetch metadata when selecting an audio file
      await getAudioMetadata(audioItem.localUri);
    } catch (err) {
      console.error('Error getting audio metadata:', err);
    }
  };
  
  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };
  
  // Format duration in milliseconds to human-readable format
  const formatDuration = (milliseconds: number): string => {
    if (!milliseconds) return '0:00';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Automatic Speech Recognition</Text>
        
        {/* Model selection section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select ASR Model</Text>
          {availableModels.length === 0 ? (
            <Text style={styles.noModelsText}>
              No ASR models available. Please download a model from the Models tab.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableModels.map((model) => (
                <TouchableOpacity
                  key={model.metadata.id}
                  style={[
                    styles.modelItem,
                    selectedModelId === model.metadata.id && styles.selectedModelItem
                  ]}
                  onPress={() => setupAsr(model.metadata.id)}
                >
                  <Text 
                    style={[
                      styles.modelName,
                      selectedModelId === model.metadata.id && styles.selectedModelName
                    ]}
                  >
                    {model.metadata.name}
                  </Text>
                  <Text style={styles.modelInfo}>
                    {model.metadata.language || 'Unknown Language'} • {formatFileSize(model.metadata.size || 0)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          
          <View style={styles.buttonContainer}>
            <Button
              title={initialized ? "Initialized" : "Initialize ASR"}
              onPress={handleInitAsr}
              disabled={!modelInfo || initialized || loading}
            />
            {initialized && (
              <Button
                title="Release"
                onPress={handleReleaseAsr}
                color="#FF6B6B"
              />
            )}
          </View>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0000ff" />
              <Text style={styles.loadingText}>Initializing ASR engine...</Text>
            </View>
          )}
          
          {modelInfo && (
            <View style={styles.modelInfoBox}>
              <Text style={styles.modelInfoText}>Model directory: {modelInfo.modelDir}</Text>
              <Text style={styles.modelInfoText}>Model type: {modelInfo.modelType}</Text>
            </View>
          )}
        </View>
        
        {/* Audio selection section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Select Audio Sample</Text>
          <FlatList
            data={loadedAudioFiles}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.audioItem,
                  selectedAudio?.id === item.id && styles.selectedAudioItem
                ]}
                onPress={() => handleSelectAudio(item)}
              >
                <Text 
                  style={[
                    styles.audioName,
                    selectedAudio?.id === item.id && styles.selectedAudioName
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
          
          {selectedAudio && (
            <View style={styles.audioMetadata}>
              <Text style={styles.metadataText}>
                Size: {formatFileSize(audioMetadata.size || 0)}
              </Text>
              <Text style={styles.metadataText}>
                Duration: {formatDuration(audioMetadata.duration || 0)}
              </Text>
              <View style={styles.buttonContainer}>
                <Button
                  title={isPlaying ? "Stop" : "Play"}
                  onPress={isPlaying ? handleStopAudio : () => handlePlayAudio(selectedAudio)}
                  disabled={!selectedAudio}
                />
              </View>
            </View>
          )}
        </View>
        
        {/* Recognition section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Recognize Speech</Text>
          <Button
            title="Recognize Audio"
            onPress={handleRecognizeAudio}
            disabled={!initialized || !selectedAudio || processing}
          />
          
          {processing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0000ff" />
              <Text style={styles.loadingText}>Processing audio...</Text>
            </View>
          )}
          
          {recognitionResult !== '' && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultLabel}>Recognized Text:</Text>
              <View style={styles.textContainer}>
                <Text style={styles.recognizedText}>{recognitionResult}</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Error display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#444',
  },
  noModelsText: {
    marginVertical: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  modelItem: {
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 140,
  },
  selectedModelItem: {
    borderColor: '#4caf50',
    backgroundColor: '#f1f8e9',
  },
  modelName: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  selectedModelName: {
    color: '#2e7d32',
  },
  modelInfo: {
    fontSize: 12,
    color: '#666',
  },
  modelInfoBox: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  modelInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  audioItem: {
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 120,
    alignItems: 'center',
  },
  selectedAudioItem: {
    borderColor: '#2196f3',
    backgroundColor: '#e3f2fd',
  },
  audioName: {
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  selectedAudioName: {
    color: '#0d47a1',
  },
  audioMetadata: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  metadataText: {
    color: '#666',
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  resultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  resultLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#0d47a1',
  },
  textContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  recognizedText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
  },
}); 