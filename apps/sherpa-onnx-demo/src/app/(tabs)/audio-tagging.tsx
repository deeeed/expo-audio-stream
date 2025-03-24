import type { 
  AudioEvent, 
  AudioTaggingInitResult, 
  AudioTaggingModelConfig 
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
  const { models, getDownloadedModels } = useModelManagement();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<{ modelDir: string, modelName: string } | null>(null);
  const [labelFilePath, setLabelFilePath] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<typeof SAMPLE_AUDIO_FILES[0] | null>(null);
  const [audioTaggingResults, setAudioTaggingResults] = useState<AudioEvent[]>([]);
  
  // Add state for loaded audio assets
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<Array<{
    id: string;
    name: string;
    module: number;
    localUri: string;
  }>>([]);
  
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
  
  // Find the models directory from downloaded models
  const getModelDirectory = () => {
    const downloadedModels = getDownloadedModels();
    if (downloadedModels.length === 0) return null;
    
    // First try to find an audio-tagging model specifically
    const audioTaggingModel = downloadedModels.find(m => m.metadata.type === 'audio-tagging');
    if (audioTaggingModel?.localPath) {
      return audioTaggingModel.localPath;
    }
    
    // If no audio-tagging model, use the first available model's directory
    // (We can search parent directory for audio-tagging model files)
    const firstModel = downloadedModels[0];
    if (firstModel?.localPath) {
      // Get the parent directory (assuming models are in subdirectories)
      const parts = firstModel.localPath.split('/');
      parts.pop(); // Remove the last part (model dir)
      return parts.join('/');
    }
    
    return null;
  };
  
  // Initialize on mount
  useEffect(() => {
    const modelDir = getModelDirectory();
    if (modelDir) {
      setupAudioTagging(modelDir);
    } else {
      setError('No model directory available. Please download a model first.');
    }
    
    // Cleanup on unmount
    return () => {
      if (initialized) {
        SherpaOnnx.releaseAudioTagging().catch(console.error);
      }
    };
  }, [models]);
  
  // Setup audio tagging
  async function setupAudioTagging(modelDir: string) {
    setLoading(true);
    setError(null);
    
    try {
      // Find an audio tagging model file recursively
      const modelFile = await findModelFileRecursive(modelDir);
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
        const result = await SherpaOnnx.initAudioTagging(config);
        
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
  
  // Process an audio file
  const handleProcessAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    if (!initialized) {
      Alert.alert('Error', 'Please initialize the audio tagging engine first');
      return;
    }
    
    setSelectedAudio(audioItem);
    setProcessing(true);
    setAudioTaggingResults([]);
    
    // Define sound variable in the outer scope so it's accessible in the finally block
    let sound: Audio.Sound | undefined;
    
    try {
      // Check if we have a valid local URI
      if (!audioItem.localUri) {
        throw new Error('Audio file not yet loaded');
      }
      
      const localFilePath = audioItem.localUri;
      console.log(`Using local audio file at: ${localFilePath}`);
      
      // No need to check existence since we just downloaded it
      
      // Play the audio file using Expo's Audio API
      try {
        console.log(`Loading audio file: ${localFilePath}`);
        const soundInfo = await Audio.Sound.createAsync({ uri: localFilePath });
        sound = soundInfo.sound;
        await sound.playAsync();
        console.log('Audio playback started');
      } catch (audioError) {
        console.error('Error playing audio:', audioError);
        // Continue with processing even if audio playback fails
      }
      
      // In a real app, we would load the actual audio file and decode it to PCM samples
      // This is a simplified mock implementation that sends random data
      try {
        // Create a simulated audio buffer (16-bit PCM)
        // In a real app, you would read from the actual audio file
        console.log('Creating mock audio buffer...');
        const audioBuffer = new Array(16000).fill(0).map(() => Math.random() * 2 - 1);
        
        // Process the audio through the tagging engine
        console.log('Processing audio samples...');
        const processResult = await SherpaOnnx.processAudioSamples(16000, audioBuffer);
        
        if (!processResult.success) {
          throw new Error('Failed to process audio samples');
        }
        
        console.log(`Successfully processed ${processResult.processedSamples} samples`);
        
        // Compute the results
        console.log('Computing audio tagging results...');
        const result = await SherpaOnnx.computeAudioTagging();
        
        if (!result.success) {
          throw new Error('Failed to compute audio tagging results');
        }
        
        setAudioTaggingResults(result.events || []);
        console.log(`Detected ${result.events?.length || 0} audio events in ${result.durationMs}ms`);
      } catch (processingError) {
        console.error('Error processing audio data:', processingError);
        throw new Error(`Error processing audio data: ${processingError instanceof Error ? processingError.message : String(processingError)}`);
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(`Error processing audio: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Cleanup sound if it was created
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (cleanupErr) {
          console.warn('Error unloading audio:', cleanupErr);
        }
      }
      setProcessing(false);
    }
  };
  
  const handleReleaseAudioTagging = async () => {
    if (!initialized) return;
    
    setLoading(true);
    
    try {
      await SherpaOnnx.releaseAudioTagging();
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
        
        {/* Model info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model Information</Text>
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
                <Text style={styles.errorText}>No audio tagging model found</Text>
              )}
            </>
          )}
        </View>
        
        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, initialized && styles.buttonDisabled]}
              onPress={handleInitAudioTagging}
              disabled={loading || initialized || !modelInfo}
            >
              <Text style={styles.buttonText}>Initialize</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, !initialized && styles.buttonDisabled]}
              onPress={handleReleaseAudioTagging}
              disabled={loading || !initialized}
            >
              <Text style={styles.buttonText}>Release</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Sample Audio Files */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sample Audio Files</Text>
          
          {loadedAudioFiles.length === 0 ? (
            <ActivityIndicator size="small" color="#0000ff" />
          ) : (
            loadedAudioFiles.map(audio => (
              <TouchableOpacity
                key={audio.id}
                style={[
                  styles.audioItem,
                  selectedAudio?.id === audio.id && styles.selectedAudio,
                  !initialized && styles.buttonDisabled
                ]}
                onPress={() => handleProcessAudio(audio)}
                disabled={processing || !initialized}
              >
                <Text style={styles.audioName}>{audio.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        
        {/* Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results</Text>
          
          {processing ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <>
              {audioTaggingResults.length > 0 ? (
                <FlatList
                  data={audioTaggingResults}
                  renderItem={renderItem}
                  keyExtractor={(item) => `${item.index}-${item.name}`}
                  style={styles.resultsList}
                />
              ) : (
                <Text style={styles.infoText}>
                  {initialized
                    ? 'Select an audio file to analyze'
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
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
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
}); 