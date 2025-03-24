import type { 
  AudioEvent, 
  AudioTaggingInitResult, 
  AudioTaggingModelConfig,
  AudioTaggingResult
} from '@siteed/sherpa-onnx.rn';
import SherpaOnnx from '@siteed/sherpa-onnx.rn';
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
 * Recursively search for an ONNX model file in a directory and its subdirectories
 * @param basePath Base directory path to start searching
 * @returns Object with modelDir and modelName if found, null otherwise
 */
const findModelFileRecursive = async (basePath: string): Promise<{ modelDir: string, modelName: string } | null> => {
  console.log(`Searching for models in: ${basePath}`);
  
  // Ensure base path has file:// prefix for Expo FileSystem
  const expoBasePath = basePath.startsWith('file://') ? basePath : `file://${basePath}`;
  
  const searchDirectory = async (expoPath: string, depth = 0): Promise<{ modelDir: string, modelName: string } | null> => {
    if (depth > 3) return null; // Limit recursion depth
    
    try {
      console.log(`Searching directory: ${expoPath} (depth: ${depth})`);
      
      // Check if this directory contains a model file (CED or Zipformer)
      const dirInfo = await FileSystem.getInfoAsync(expoPath);
      
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        console.log(`Path is not a valid directory: ${expoPath}`);
        return null;
      }
      
      // Get directory contents
      const contents = await FileSystem.readDirectoryAsync(expoPath);
      console.log(`Found ${contents.length} items in ${expoPath}`);
      
      // Check for model files
      for (const item of contents) {
        if (item.endsWith('.onnx')) {
          console.log(`Found model file: ${item} in ${expoPath}`);
          // Return the native-compatible path without file:// prefix for the native module
          // but keep the expo path format for the UI
          return {
            modelDir: expoPath,
            modelName: item
          };
        }
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

export default function AudioTaggingScreen() {
  const { models, getDownloadedModels, getModelState } = useModelManagement();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{ modelDir: string, modelName: string } | null>(null);
  const [labelFilePath, setLabelFilePath] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{
    id: string;
    name: string;
    module: number;
    localUri: string;
  } | null>(null);
  const [audioTaggingResults, setAudioTaggingResults] = useState<AudioEvent[]>([]);
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
  
  // Get only relevant models for audio tagging
  const availableModels = getDownloadedModels().filter(model => 
    model.metadata.type === 'audio-tagging'
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
        console.log('Cleaning up audio tagging resources');
        SherpaOnnx.AudioTagging.release().catch(err => 
          console.error('Error releasing audio tagging resources:', err)
        );
      }
    };
  }, [initialized]);
  
  // Additional cleanup for sound object
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(err => 
          console.error('Error unloading audio during cleanup:', err)
        );
      }
    };
  }, [sound]);
  
  // Setup audio tagging with a specific model
  async function setupAudioTagging(modelId: string) {
    setLoading(true);
    setError(null);
    
    try {
      const modelState = getModelState(modelId);
      if (!modelState?.localPath) {
        throw new Error('Model files not found locally');
      }
      
      console.log(`Using model path: ${modelState.localPath}`);
      
      // Find an audio tagging model file recursively
      const modelFile = await findModelFileRecursive(modelState.localPath);
      if (!modelFile) {
        setError('Could not find audio tagging model in the model directory');
        setLoading(false);
        return;
      }
      
      setModelInfo(modelFile);
      
      // Look for the labels file (using Expo path format)
      const labelsPath = `${modelFile.modelDir}/class_labels_indices.csv`;
      const labelsExists = await verifyFileExists(labelsPath);
      
      if (!labelsExists) {
        setError('Could not find class_labels_indices.csv file');
        setLoading(false);
        return;
      }
      
      setLabelFilePath(labelsPath);
      setSelectedModelId(modelId);
      
      // Success, everything is ready
      setLoading(false);
    } catch (err) {
      console.error('Error setting up audio tagging:', err);
      setError(`Error setting up audio tagging: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
  }
  
  // Initialize the audio tagging engine
  const handleInitAudioTagging = async () => {
    if (!modelInfo || !labelFilePath) {
      setError('Model information not available');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Determine model type from directory name
      const dirName = modelInfo.modelDir.toLowerCase();
      const modelType = dirName.includes('zipformer') ? 'zipformer' : 'ced';
      
      // IMPORTANT PATH HANDLING:
      // 1. Expo APIs (FileSystem, etc.) expect paths with 'file://' prefix
      // 2. Native modules expect clean paths WITHOUT 'file://' prefix
      // So we strip the prefix when sending paths to native modules
      const cleanPath = (path: string) => path.replace(/^file:\/\//, '');
      
      console.log('Setting up audio tagging with model in:', modelInfo.modelDir);
      console.log('Model name:', modelInfo.modelName);
      console.log('Labels file:', labelFilePath);
      
      const config: AudioTaggingModelConfig = {
        modelDir: cleanPath(modelInfo.modelDir),
        modelName: modelInfo.modelName,
        modelType,
        labelsPath: cleanPath(labelFilePath),
        numThreads: 2,
        topK: 5
      };
      
      console.log('Initializing audio tagging with config:', config);
      
      // Check all paths exist before proceeding
      const modelPath = `${modelInfo.modelDir}/${modelInfo.modelName}`;
      const modelExists = await verifyFileExists(modelPath);
      if (!modelExists) {
        throw new Error(`Model file not found: ${modelPath}`);
      }
      
      const labelsExists = await verifyFileExists(labelFilePath);
      if (!labelsExists) {
        throw new Error(`Labels file not found: ${labelFilePath}`);
      }
      
      console.log('Files verified, initializing audio tagging engine...');
      
      try {
        // Use the AudioTagging service instead of direct method
        const result = await SherpaOnnx.AudioTagging.initialize(config);
        
        if (result.success) {
          setInitialized(true);
          Alert.alert('Success', 'Audio tagging engine initialized successfully');
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
    setAudioTaggingResults([]);
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
        
        // Use the new processAndCompute method from the service
        // This will now use our more robust native implementation for files
        const result = await SherpaOnnx.AudioTagging.processAndCompute({
          filePath: localFilePath
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to analyze audio');
        }
        
        setAudioTaggingResults(result.events);
        console.log(`Detected ${result.events.length} audio events in ${result.durationMs}ms`);
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
      await SherpaOnnx.AudioTagging.release();
      setInitialized(false);
      setAudioTaggingResults([]);
      Alert.alert('Success', 'Audio tagging resources released');
    } catch (err) {
      console.error('Error releasing audio tagging resources:', err);
      setError(`Error releasing audio tagging resources: ${err instanceof Error ? err.message : String(err)}`);
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
  
  // Render item for the results list
  const renderItem = ({ item }: { item: AudioEvent }) => (
    <View style={styles.resultItem}>
      <Text style={styles.resultName}>{item.name}</Text>
      <Text style={styles.resultProb}>{(item.probability * 100).toFixed(2)}%</Text>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Audio Tagging Demo</Text>
        
        {/* Model Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Model</Text>
          <View style={styles.pickerContainer}>
            {availableModels.length === 0 ? (
              <Text style={styles.emptyText}>
                No audio tagging models downloaded. Please visit the Models screen to download a model.
              </Text>
            ) : (
              availableModels.map((model) => (
                <TouchableOpacity
                  key={model.metadata.id}
                  style={[
                    styles.modelOption,
                    selectedModelId === model.metadata.id && styles.modelOptionSelected
                  ]}
                  onPress={() => setupAudioTagging(model.metadata.id)}
                  disabled={loading}
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
        
        {/* Model info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Model Information</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <>
              {modelInfo ? (
                <View>
                  <Text>Model Directory: {modelInfo.modelDir}</Text>
                  <Text>Model File: {modelInfo.modelName}</Text>
                  {labelFilePath && <Text>Labels File: {labelFilePath}</Text>}
                </View>
              ) : (
                <Text style={styles.infoText}>Please select a model first</Text>
              )}
            </>
          )}
        </View>
        
        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Actions</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button, 
                styles.initButton,
                (initialized || !modelInfo || loading) && styles.buttonDisabled
              ]}
              onPress={handleInitAudioTagging}
              disabled={loading || initialized || !modelInfo}
            >
              <Text style={styles.buttonText}>Initialize</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button, 
                styles.releaseButton,
                (!initialized || loading) && styles.buttonDisabled
              ]}
              onPress={handleReleaseAudioTagging}
              disabled={loading || !initialized}
            >
              <Text style={styles.buttonText}>Release</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Sample Audio Files */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Sample Audio Files</Text>
          
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
            <Text style={styles.sectionTitle}>5. Audio Actions</Text>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedAudio ? '6. Results' : '5. Results'}
          </Text>
          
          {processing ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <>
              {audioTaggingResults.length > 0 ? (
                <View style={styles.resultsList}>
                  {audioTaggingResults.map((item) => (
                    <View key={`${item.index}-${item.name}`} style={styles.resultItem}>
                      <Text style={styles.resultName}>{item.name}</Text>
                      <Text style={styles.resultProb}>{(item.probability * 100).toFixed(2)}%</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.infoText}>
                  {initialized
                    ? selectedAudio 
                      ? 'Press "Classify" to analyze the selected audio'
                      : 'Select an audio file first'
                    : 'Initialize the audio tagging engine first'}
                </Text>
              )}
            </>
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
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
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
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    minWidth: 120,
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
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
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
}); 