import { ASR, AsrModelConfig } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useModelManagement } from '../../contexts/ModelManagement';

// Define sample audio with only name and module
const SAMPLE_AUDIO_FILES = [
  {
    id: '1',
    name: 'JFK Speech Extract',
    module: require('@assets/audio/jfk.wav'),
  },
  {
    id: '2',
    name: 'Random English Voice',
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

interface ModelInfo {
  modelDir: string;
  modelType: 'transducer' | 'whisper' | 'paraformer' | 'nemo_transducer' | 'nemo_ctc' | 'tdnn' | 'zipformer2_ctc' | 'wenet_ctc' | 'telespeech_ctc' | 'fire_red_asr' | 'moonshine' | 'sense_voice' | 'zipformer' | 'lstm' | 'zipformer2';
}

// Extend the AsrModelConfig to include additional model types not yet in the library
interface ExtendedAsrModelConfig extends Omit<AsrModelConfig, 'modelType'> {
  modelType:
    | 'transducer'
    | 'nemo_transducer'
    | 'paraformer'
    | 'nemo_ctc'
    | 'whisper'
    | 'tdnn'
    | 'zipformer2_ctc'
    | 'wenet_ctc'
    | 'telespeech_ctc'
    | 'fire_red_asr'
    | 'moonshine'
    | 'sense_voice'
    | 'zipformer'
    | 'lstm'
    | 'zipformer2';
  streaming?: boolean;
  featConfig?: {
    sampleRate?: number;
    featureDim?: number;
  };
}

// Update the ASRConfig interface to include the new model types
interface ASRConfig {
  modelDir: string;
  modelType: 'transducer' | 'whisper' | 'paraformer' | 'nemo_transducer' | 'nemo_ctc' | 'tdnn' | 'zipformer2_ctc' | 'wenet_ctc' | 'telespeech_ctc' | 'fire_red_asr' | 'moonshine' | 'sense_voice' | 'zipformer' | 'lstm' | 'zipformer2';
  modelFiles: Record<string, string>;
  numThreads: number;
  decodingMethod: string;
  maxActivePaths: number;
  streaming: boolean;
}

/**
 * Recursively search for ASR model files in a directory and its subdirectories
 * @param basePath Base directory path to start searching
 * @returns Object with modelDir and detected modelType if found, null otherwise
 */
const findModelFilesRecursive = async (basePath: string): Promise<ModelInfo | null> => {
  console.log(`Searching for ASR models in: ${basePath}`);
  
  // Ensure base path has file:// prefix for Expo FileSystem
  const expoBasePath = basePath.startsWith('file://') ? basePath : `file://${basePath}`;
  
  const searchDirectory = async (expoPath: string, depth = 0): Promise<ModelInfo | null> => {
    if (depth > 5) return null;
    
    try {
      const dirInfo = await FileSystem.getInfoAsync(expoPath);
      
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return null;
      }
      
      const contents = await FileSystem.readDirectoryAsync(expoPath);
      
      // If we find a single directory that looks like a model directory, use that
      if (depth === 0 && contents.length === 1 && contents[0].includes('sherpa-onnx')) {
        const subDirPath = `${expoPath}/${contents[0]}`;
        console.log(`Found potential model directory: ${subDirPath}`);
        return searchDirectory(subDirPath, depth + 1);
      }
      
      // Get directory contents
      const dirContents = await FileSystem.readDirectoryAsync(expoPath);
      console.log(`Found ${dirContents.length} items in ${expoPath}`);
      
      // Debug output the actual file list to help identify model files
      console.log(`Files in directory: ${dirContents.join(', ')}`);
      
      // Look specifically for any .onnx files as potential model files
      const onnxFiles = dirContents.filter(file => file.endsWith('.onnx'));
      if (onnxFiles.length > 0) {
        console.log(`Found ONNX files: ${onnxFiles.join(', ')}`);
      }
      
      // Check for transducer model files (encoder, decoder, joiner)
      const hasEncoder = dirContents.some(file => file.includes('encoder') && file.endsWith('.onnx'));
      const hasDecoder = dirContents.some(file => file.includes('decoder') && file.endsWith('.onnx'));
      const hasJoiner = dirContents.some(file => file.includes('joiner') && file.endsWith('.onnx'));
      const hasTokens = dirContents.some(file => 
        file === 'tokens.txt' || 
        file.toLowerCase().includes('tokens') && file.toLowerCase().endsWith('.txt')
      );
      
      // Check for whisper model files
      const hasWhisperModel = dirContents.some(file => 
        (file.includes('model') && file.endsWith('.onnx')) || 
        (file.toLowerCase().includes('whisper') && file.endsWith('.onnx')) ||
        (file.toLowerCase().includes('encoder') && file.toLowerCase().includes('.onnx'))
      );
      
      // Check for paraformer model files
      const hasParaformerEncoder = dirContents.some(file => file.includes('encoder') && file.endsWith('.onnx'));
      const hasParaformerDecoder = dirContents.some(file => file.includes('decoder') && file.endsWith('.onnx'));
      
      // Check if this is likely a zipformer model from the directory name
      let isLikelyZipformer = expoPath.toLowerCase().includes('zipformer');
      if (isLikelyZipformer) {
        // It's probably a zipformer model
        // Depending on the directory structure, it might be 'zipformer' or 'zipformer2'
        const isZipformer2 = expoPath.toLowerCase().includes('zipformer2');
        return {
          modelDir: expoPath,
          modelType: isZipformer2 ? 'zipformer2' : 'zipformer'
        };
      }
      
      // Log what we found to help debug
      console.log(`Directory check: hasWhisperModel=${hasWhisperModel}, hasTokens=${hasTokens}`);
      
      // Specific handling for this Whisper model structure
      if (expoPath.toLowerCase().includes('whisper') && 
          dirContents.some(file => file.toLowerCase().includes('encoder') && file.endsWith('.onnx')) &&
          dirContents.some(file => file.toLowerCase().includes('tokens') && file.endsWith('.txt'))) {
        
        console.log("Detected special Whisper model structure with encoder/decoder format");
        return { modelDir: expoPath, modelType: 'whisper' as const };
      }
      
      // Determine model type based on file presence
      if (hasWhisperModel && hasTokens) {
        return { modelDir: expoPath, modelType: 'whisper' as const };
      } else if (hasEncoder && hasDecoder && hasJoiner && hasTokens) {
        // This is a transducer model (with joiner)
        return { 
          modelDir: expoPath, 
          modelType: 'transducer' as const
        };
      } else if (hasParaformerEncoder && hasParaformerDecoder && hasTokens && !hasJoiner && !isLikelyZipformer) {
        // Only categorize as paraformer if it doesn't have a joiner and doesn't look like a zipformer
        return { modelDir: expoPath, modelType: 'paraformer' as const };
      } else if (isLikelyZipformer && hasEncoder && hasDecoder && hasTokens) {
        // If it's missing a joiner but has zipformer in the name, treat as transducer
        // We'll add the joiner file later in handleInitAsr
        return { 
          modelDir: expoPath, 
          modelType: 'transducer' as const
        };
      }
      
      // Recursively check subdirectories
      for (const item of dirContents) {
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

// Add this debugging function
const exploreDirectoryStructure = async (basePath: string, maxDepth = 3) => {
  const explore = async (path: string, depth = 0): Promise<void> => {
    if (depth > maxDepth) return;
    
    try {
      const contents = await FileSystem.readDirectoryAsync(path);
      console.log(`[EXPLORER] Level ${depth}: ${path} contains ${contents.length} items: ${contents.join(', ')}`);
      
      for (const item of contents) {
        const itemPath = `${path}/${item}`;
        const info = await FileSystem.getInfoAsync(itemPath);
        if (info.isDirectory) {
          await explore(itemPath, depth + 1);
        } else if (item.endsWith('.onnx') || item === 'tokens.txt') {
          console.log(`[EXPLORER] Found important file: ${itemPath}`);
        }
      }
    } catch (err) {
      console.error(`[EXPLORER] Error exploring ${path}:`, err);
    }
  };
  
  await explore(basePath);
};

// Define a component for advanced ASR settings
interface AdvancedAsrSettingsProps {
  config: Partial<ExtendedAsrModelConfig>;
  onChange: (newConfig: Partial<ExtendedAsrModelConfig>) => void;
  enabled: boolean;
}

const AdvancedAsrSettings: React.FC<AdvancedAsrSettingsProps> = ({
  config,
  onChange,
  enabled
}) => {
  if (!enabled) return null;

  const handleChange = (key: keyof ExtendedAsrModelConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };
  
  const handleFeatureConfigChange = (key: string, value: any) => {
    onChange({
      ...config,
      featConfig: {
        ...config.featConfig,
        [key]: value
      }
    });
    
    // Log feature configuration changes for debugging
    console.log(`Updated feature config: ${key} = ${value}`);
  };

  return (
    <View style={styles.advancedSettingsContainer}>
      <Text style={styles.sectionTitle}>Advanced Settings</Text>
      
      {/* Decoding method */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Decoding Method:</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              config.decodingMethod === 'greedy_search' && styles.optionButtonSelected
            ]}
            onPress={() => handleChange('decodingMethod', 'greedy_search')}
          >
            <Text style={[
              styles.optionButtonText,
              config.decodingMethod === 'greedy_search' && styles.optionButtonTextSelected
            ]}>Greedy Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              config.decodingMethod === 'beam_search' && styles.optionButtonSelected
            ]}
            onPress={() => handleChange('decodingMethod', 'beam_search')}
          >
            <Text style={[
              styles.optionButtonText,
              config.decodingMethod === 'beam_search' && styles.optionButtonTextSelected
            ]}>Beam Search</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Number of threads */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Threads:</Text>
        <View style={styles.buttonGroup}>
          {[1, 2, 4, 8].map(numThreads => (
            <TouchableOpacity
              key={numThreads}
              style={[
                styles.optionButton,
                config.numThreads === numThreads && styles.optionButtonSelected
              ]}
              onPress={() => handleChange('numThreads', numThreads)}
            >
              <Text style={[
                styles.optionButtonText,
                config.numThreads === numThreads && styles.optionButtonTextSelected
              ]}>{numThreads}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Max active paths (for beam search) */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Max Active Paths:</Text>
        <View style={styles.buttonGroup}>
          {[4, 8, 16, 32].map(paths => (
            <TouchableOpacity
              key={paths}
              style={[
                styles.optionButton,
                config.maxActivePaths === paths && styles.optionButtonSelected
              ]}
              onPress={() => handleChange('maxActivePaths', paths)}
              disabled={config.decodingMethod !== 'beam_search'}
            >
              <Text style={[
                styles.optionButtonText,
                config.maxActivePaths === paths && styles.optionButtonTextSelected
              ]}>{paths}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Feature extraction settings - new section */}
      <View style={styles.settingSection}>
        <Text style={styles.sectionSubTitle}>Feature Extraction</Text>
        
        {/* Sample Rate */}
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Sample Rate:</Text>
          <View style={styles.buttonGroup}>
            {[8000, 16000, 22050, 44100].map(rate => (
              <TouchableOpacity
                key={rate}
                style={[
                  styles.optionButton,
                  (config.featConfig?.sampleRate === rate) && styles.optionButtonSelected
                ]}
                onPress={() => handleFeatureConfigChange('sampleRate', rate)}
              >
                <Text style={[
                  styles.optionButtonText,
                  (config.featConfig?.sampleRate === rate) && styles.optionButtonTextSelected
                ]}>{rate}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      
      {/* Streaming mode */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Streaming Mode:</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              config.streaming === true && styles.optionButtonSelected
            ]}
            onPress={() => handleChange('streaming', true)}
          >
            <Text style={styles.optionButtonText}>On</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              config.streaming === false && styles.optionButtonSelected
            ]}
            onPress={() => handleChange('streaming', false)}
          >
            <Text style={styles.optionButtonText}>Off</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Debug mode */}
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Debug Mode:</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              config.debug === true && styles.optionButtonSelected
            ]}
            onPress={() => handleChange('debug', true)}
          >
            <Text style={styles.optionButtonText}>On</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              config.debug === false && styles.optionButtonSelected
            ]}
            onPress={() => handleChange('debug', false)}
          >
            <Text style={styles.optionButtonText}>Off</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function AsrScreen() {
  const { getDownloadedModels, getModelState } = useModelManagement();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
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
  
  // Add state for advanced settings
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);
  const [asrConfig, setAsrConfig] = useState<Partial<ExtendedAsrModelConfig>>({
    numThreads: 2,
    decodingMethod: 'greedy_search',
    maxActivePaths: 4,
    streaming: false,
    debug: true,
    featConfig: {
      sampleRate: 16000
    }
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
  
  // ASR cleanup - only on unmount (empty dependency array)
  useEffect(() => {
    return () => {
      if (initialized) {
        console.log('Cleaning up ASR resources');
        asrService.release().catch((err: Error) => 
          console.error('Error releasing ASR resources:', err)
        );
      }
    };
  }, []); // Empty dependency array = only runs on unmount
  
  // Sound cleanup - runs when sound changes
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(err => 
          console.error('Error unloading audio during cleanup:', err)
        );
      }
    };
  }, [sound]);
  
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
      
      // Call this in your setupAsr function
      exploreDirectoryStructure(modelState.localPath);
      
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
      
      // List directory contents to check what files actually exist
      const dirContents = await FileSystem.readDirectoryAsync(modelInfo.modelDir);
      console.log('Directory contents:', dirContents);
      
      // Check if this is a directory with a subdirectory containing the actual model files
      if (dirContents.length >= 1) {
        const possibleSubdir = dirContents.find(name => 
          name.includes('sherpa-onnx') && !name.endsWith('.tar.bz2')
        );
        
        if (possibleSubdir) {
          try {
            // Check if it's a directory
            const subdirPath = `${modelInfo.modelDir}/${possibleSubdir}`;
            const subdirInfo = await FileSystem.getInfoAsync(subdirPath);
            
            if (subdirInfo.exists && subdirInfo.isDirectory) {
              // Use this as the actual model directory
              const newModelDir = `${cleanPath}/${possibleSubdir}`;
              console.log(`Found model subdirectory, updating model path to: ${newModelDir}`);
              
              // Get contents of the subdirectory to look for model files
              const subdirContents = await FileSystem.readDirectoryAsync(subdirPath);
              console.log('Subdirectory contents:', subdirContents);
              
              // Base configuration with updated model directory
              const config: ExtendedAsrModelConfig = {
                modelDir: newModelDir,
                modelType: modelInfo.modelType,
                numThreads: asrConfig.numThreads ?? 2,
                decodingMethod: asrConfig.decodingMethod ?? 'greedy_search',
                maxActivePaths: asrConfig.maxActivePaths ?? 4,
                streaming: true, // Force streaming for this model
                debug: asrConfig.debug ?? true,
                featConfig: {
                  sampleRate: asrConfig.featConfig?.sampleRate ?? 16000,
                  featureDim: 39
                },
                modelFiles: {}
              };
              
              // Find and set model files
              const modelFiles = {
                encoder: subdirContents.find(f => f.includes('encoder') && f.endsWith('.onnx')),
                decoder: subdirContents.find(f => f.includes('decoder') && f.endsWith('.onnx')),
                joiner: subdirContents.find(f => f.includes('joiner') && f.endsWith('.onnx')),
                tokens: subdirContents.find(f => f === 'tokens.txt' || f.includes('tokens') && f.endsWith('.txt'))
              };
              
              if (modelFiles.encoder && modelFiles.decoder && modelFiles.joiner && modelFiles.tokens) {
                config.modelFiles = {
                  encoder: modelFiles.encoder,
                  decoder: modelFiles.decoder,
                  joiner: modelFiles.joiner,
                  tokens: modelFiles.tokens
                };
                
                console.log('Found all required model files:', config.modelFiles);
                
                // Initialize ASR with the configuration
                const result = await asrService.initialize(config);
                
                if (result.success) {
                  setInitialized(true);
                  console.log('ASR initialized successfully:', result);
                } else {
                  setError(`Failed to initialize ASR: ${result.error}`);
                }
              } else {
                throw new Error('Missing required model files in the subdirectory');
              }
            }
          } catch (e) {
            console.error('Error checking subdirectory:', e);
            throw e;
          }
        } else {
          throw new Error('Could not find valid model subdirectory');
        }
      } else {
        throw new Error('Empty model directory');
      }
    } catch (err) {
      console.error('Error during initialization:', err);
      setError(`Error during initialization: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle playing audio samples
  const handlePlayAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    try {
      if (isPlaying) {
        // If already playing, stop the current playback
        await handleStopAudio();
        return;
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
        if (!status.isLoaded) return;
        
        if (status.didJustFinish) {
          setIsPlaying(false);
          setSound(null);
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
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      } catch (err) {
        console.error('Error stopping audio:', err);
        setError(`Failed to stop audio: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
  
  // Update the handleRecognizeFromFile function to reinitialize with correct feature dimension 
  const handleRecognizeFromFile = async () => {
    if (!selectedAudio || !initialized) {
      setError('Please select an audio file and initialize ASR first');
      return;
    }
    
    // Stop any playing audio before recognition
    if (isPlaying) {
      await handleStopAudio();
    }
    
    setProcessing(true);
    setRecognitionResult('');
    setError(null);
    
    try {
      console.log(`Recognizing file with feature dim: ${asrConfig.featConfig?.featureDim}`);
      console.log(`Processing audio file: ${selectedAudio.localUri}`);
      
      // Ensure the URI has the correct format
      const normalizedUri = selectedAudio.localUri.startsWith('file://')
        ? selectedAudio.localUri
        : `file://${selectedAudio.localUri}`;
      
      const result = await asrService.recognizeFromFile(normalizedUri);
      
      if (result.success) {
        setRecognitionResult(result.text || '');
        console.log('Recognition result:', result.text);
      } else {
        throw new Error(result.error || 'Recognition failed');
      }
    } catch (err) {
      console.error('Failed to recognize speech from file:', err);
      setError(`Failed to recognize: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
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
  
  // Fix the handleReleaseAsr function reference by adding a new function
  const handleReleaseAsr = async () => {
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
        
        {/* Toggle for advanced settings */}
        <TouchableOpacity
          style={styles.advancedSettingsToggle}
          onPress={() => setAdvancedSettingsVisible(!advancedSettingsVisible)}
        >
          <Text style={styles.advancedSettingsToggleText}>
            {advancedSettingsVisible ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
          </Text>
        </TouchableOpacity>
        
        {/* Advanced settings component */}
        <AdvancedAsrSettings
          config={asrConfig}
          onChange={setAsrConfig}
          enabled={advancedSettingsVisible}
        />
        
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
                  onPress={() => handlePlayAudio(selectedAudio)}
                />
              </View>
            </View>
          )}
        </View>
        
        {/* Recognition section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Recognize Speech</Text>
          <Button
            title="Recognize"
            onPress={handleRecognizeFromFile}
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
    justifyContent: 'space-between',
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
  advancedSettingsToggle: {
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  advancedSettingsToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  advancedSettingsContainer: {
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    width: 120,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#333',
  },
  optionButtonTextSelected: {
    color: 'white',
  },
  settingSection: {
    marginTop: 10,
    marginBottom: 5,
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#555',
  },
  audioControls: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackStatus: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
}); 