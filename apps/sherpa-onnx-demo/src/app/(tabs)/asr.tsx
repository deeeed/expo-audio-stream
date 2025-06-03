import { ASR, AsrModelConfig } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAsrModels, useAsrModelWithConfig } from '../../hooks/useModelWithConfig';
import { formatDuration, formatBytes } from '../../utils/formatters';

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

/**
 * Automatic Speech Recognition Screen
 * 
 * This screen demonstrates how to use the Sherpa-ONNX ASR (Automatic Speech Recognition)
 * functionality with React Native. The implementation follows a similar pattern to the TTS screen,
 * using predefined configurations from useModelConfig.ts and providing a user interface
 * for selecting models and adjusting configuration settings.
 * 
 * The ASR screen allows users to:
 * 1. Select a downloaded ASR model
 * 2. Configure ASR parameters (threads, decoding method, etc.)
 * 3. Initialize the ASR engine
 * 4. Select a sample audio file
 * 5. Perform speech recognition
 */
export default function AsrScreen() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  
  // Use our hooks
  const { downloadedModels } = useAsrModels();
  const { asrConfig, localPath, isDownloaded } = useAsrModelWithConfig({ modelId: selectedModelId });
  
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
  const [selectedAudio, setSelectedAudio] = useState<typeof loadedAudioFiles[0] | null>(null);
  
  // Add new states for audio metadata
  const [audioMetadata, setAudioMetadata] = useState<{
    size?: number;
    duration?: number;
    sampleRate?: number;
    isLoading: boolean;
  }>({
    isLoading: false
  });
  
  // Add state for ASR configuration options
  const [numThreads, setNumThreads] = useState(2);
  const [decodingMethod, setDecodingMethod] = useState<'greedy_search' | 'beam_search'>('greedy_search');
  const [maxActivePaths, setMaxActivePaths] = useState(4);
  const [isStreaming, setIsStreaming] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [provider, setProvider] = useState<'cpu' | 'gpu'>('cpu');
  const [/* configToVisualize */, setConfigToVisualize] = useState<AsrModelConfig | null>(null);
  
  // Add new state for initialization status messages
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Reset configuration when selected model or asrConfig changes
  useEffect(() => {
    if (asrConfig) {
      // Reset to values from the predefined config or use defaults
      setNumThreads(asrConfig.numThreads ?? 2);
      setDecodingMethod(asrConfig.decodingMethod as 'greedy_search' | 'beam_search' ?? 'greedy_search');
      setMaxActivePaths(asrConfig.maxActivePaths ?? 4);
      setIsStreaming(asrConfig.streaming ?? false);
      setDebugMode(asrConfig.debug ?? false);
      setProvider(asrConfig.provider as 'cpu' | 'gpu' ?? 'cpu');
      
      console.log('[ASR] Reset configuration based on selected model:', selectedModelId);
    }
  }, [selectedModelId, asrConfig]);
  
  // ASR cleanup - only on unmount (empty dependency array)
  useEffect(() => {
    return () => {
      if (initialized) {
        console.log('[ASR] Cleaning up ASR resources');
        ASR.release().catch((err: Error) => 
          console.error('[ASR] Error releasing ASR resources:', err)
        );
      }
    };
  }, []); // Empty dependency array = only runs on unmount
  
  // Sound cleanup - runs when sound changes
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(err => 
          console.error('[ASR] Error unloading audio during cleanup:', err)
        );
      }
    };
  }, [sound]);
  
  // Initialize ASR with the selected model
  const handleInitAsr = async () => {
    if (!selectedModelId) {
      setError('Please select a model first');
      return;
    }

    setLoading(true);
    setError(null);
    setInitialized(false);
    setStatusMessage('Starting initialization...');
    
    console.log(`[ASR] Initializing model: ${selectedModelId}`);
    
    // Check required properties
    if (!asrConfig || !localPath || !isDownloaded) {
      setLoading(false);
      setError('Selected model has no predefined configuration or is not downloaded properly.');
      console.error('[ASR] Missing required configuration/path!');
      return;
    }
    
    try {
      // Clean path for native module (remove file:// prefix)
      let cleanPath = localPath.replace(/^file:\/\//, '');
      setStatusMessage(`Found model path: ${cleanPath}`);
      
      // List directory contents to check what files exist
      let dirContents: string[] = [];
      try {
        setStatusMessage('Reading model directory contents...');
        dirContents = await FileSystem.readDirectoryAsync(localPath);
        console.log('[ASR] Directory contents:', dirContents);
        
        // Check if there's a sherpa-onnx subdirectory
        const sherpaDir = dirContents.find(item => item.includes('sherpa-onnx'));
        if (sherpaDir) {
          const subDirPath = `${localPath}/${sherpaDir}`;
          try {
            const subDirInfo = await FileSystem.getInfoAsync(subDirPath);
            if (subDirInfo.exists && subDirInfo.isDirectory) {
              setStatusMessage(`Checking subdirectory ${sherpaDir}...`);
              const subDirContents = await FileSystem.readDirectoryAsync(subDirPath);
              console.log(`[ASR] Subdirectory ${sherpaDir} contents:`, subDirContents);
              
              // Check if this directory contains model files
              const hasModelFiles = subDirContents.some(file => 
                file.endsWith('.onnx') || file === 'tokens.txt' || file.includes('tokens')
              );
              
              if (hasModelFiles) {
                const newCleanPath = cleanPath + '/' + sherpaDir;
                console.log(`[ASR] Found model files in subdirectory. Updating path to: ${newCleanPath}`);
                setStatusMessage(`Found model files in subdirectory ${sherpaDir}`);
                // Use subdirectory path instead
                cleanPath = newCleanPath;
                // Update directory contents for file verification
                dirContents = subDirContents;
              }
            }
          } catch (subDirErr) {
            console.error(`[ASR] Error checking subdirectory ${sherpaDir}:`, subDirErr);
          }
        }
      } catch (err) {
        console.error('[ASR] Error reading directory:', err);
        setStatusMessage(`Error reading directory: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      // Check if expected model files exist
      if (asrConfig.modelFiles) {
        setStatusMessage('Verifying model files...');
        console.log('[ASR] Verifying model files in directory:');
        for (const [key, fileName] of Object.entries(asrConfig.modelFiles)) {
          if (!fileName) continue;
          
          const fileExists = dirContents.some(file => file === fileName || file.includes(fileName));
          console.log(`[ASR] - ${key}: ${fileName} => ${fileExists ? 'FOUND' : 'NOT FOUND'}`);
          
          if (!fileExists) {
            console.warn(`[ASR] Warning: Expected model file "${fileName}" not found in directory`);
            setStatusMessage(`Warning: Model file "${fileName}" not found`);
          }
        }
      }
      
      // Create a complete configuration with all required fields (non-optional)
      setStatusMessage('Preparing ASR configuration...');
      const config: AsrModelConfig = {
        modelDir: cleanPath,
        modelType: asrConfig.modelType || 'transducer',
        numThreads: numThreads,
        decodingMethod: decodingMethod,
        maxActivePaths: maxActivePaths,
        streaming: asrConfig.streaming || false,
        debug: debugMode,
        provider: provider,
        modelFiles: asrConfig.modelFiles || {
          // Provide fallback default patterns if missing
          encoder: '*encoder*.onnx',
          decoder: '*decoder*.onnx',
          joiner: asrConfig.modelType === 'transducer' || 
                 asrConfig.modelType === 'zipformer' || 
                 asrConfig.modelType === 'zipformer2' ? '*joiner*.onnx' : undefined,
          tokens: '*tokens*.txt'
        }
      };
      
      console.log('[ASR] FINAL ASR CONFIG:', JSON.stringify(config, null, 2));
      
      // Sync UI state with actual configuration (ensure UI matches what's being sent)
      setIsStreaming(!!config.streaming);
      
      // Set the config for visualization (useful for debugging)
      setConfigToVisualize(config);
      
      try {
        // Initialize ASR with the configuration
        setStatusMessage('Calling ASR.initialize()...');
        console.log('[ASR] Calling ASR.initialize() with complete configuration');
        const result = await ASR.initialize(config);
        console.log('[ASR] Initialization result:', result);
        
        if (result.success) {
          setInitialized(true);
          setStatusMessage('ASR initialized successfully');
          console.log('[ASR] ASR initialized successfully:', result);
        } else {
          setError(`Failed to initialize ASR: ${result.error}`);
          setStatusMessage(`Initialization failed: ${result.error}`);
          console.error('[ASR] ASR initialization failed:', result.error);
        }
      } catch (initErr) {
        console.error('[ASR] Exception during ASR.initialize():', initErr);
        setStatusMessage(`Exception during ASR.initialize(): ${initErr instanceof Error ? initErr.message : String(initErr)}`);
        setError(`Exception during initialization: ${initErr instanceof Error ? initErr.message : String(initErr)}`);
      }
    } catch (err) {
      console.error('[ASR] Error during initialization preparation:', err);
      setStatusMessage(`Error during preparation: ${err instanceof Error ? err.message : String(err)}`);
      setError(`Error during initialization preparation: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
      setStatusMessage('');
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

      console.log(`[ASR] Playing audio: ${audioItem.name} from ${audioItem.localUri}`);
      
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
      console.error('[ASR] Error playing audio:', err);
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
        console.error('[ASR] Error stopping audio:', err);
        setError(`Failed to stop audio: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };
  
  // Process audio file for recognition
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
      // Always use 16000 Hz for ASR
      console.log(`[ASR] Processing audio file: ${selectedAudio.localUri}`);
      
      // Ensure the URI has the correct format
      const normalizedUri = selectedAudio.localUri.startsWith('file://')
        ? selectedAudio.localUri
        : `file://${selectedAudio.localUri}`;
      
      const result = await ASR.recognizeFromFile(normalizedUri);
      
      if (result.success) {
        setRecognitionResult(result.text || '');
        console.log('[ASR] Recognition result:', result.text);
      } else {
        throw new Error(result.error || 'Recognition failed');
      }
    } catch (err) {
      console.error('[ASR] Failed to recognize speech from file:', err);
      setError(`Failed to recognize: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  };
  
  // Get audio file metadata
  const getAudioMetadata = async (uri: string): Promise<{ size: number; duration: number; sampleRate?: number }> => {
    setAudioMetadata({ isLoading: true });
    
    try {
      // Get file info
      const info = await FileSystem.getInfoAsync(uri);
      
      if (!info.exists) {
        throw new Error(`File does not exist: ${uri}`);
      }
      
      // Always default to 16000 Hz for ASR
      const sampleRate = 16000;
      let duration = 0;
      
      // Try to get audio details by loading it temporarily
      try {
        const { sound: tempSound } = await Audio.Sound.createAsync({ uri });
        const status = await tempSound.getStatusAsync();
        
        if (status.isLoaded) {
          duration = status.durationMillis ? status.durationMillis / 1000 : 0;
        }
        
        // Clean up temp sound
        await tempSound.unloadAsync();
      } catch (soundErr) {
        console.error('[ASR] Error loading sound for metadata:', soundErr);
      }
      
      const metadata = {
        size: info.size || 0,
        duration,
        sampleRate,
        isLoading: false
      };
      
      setAudioMetadata(metadata);
      
      return { 
        size: metadata.size, 
        duration: metadata.duration,
        sampleRate: metadata.sampleRate
      };
    } catch (error) {
      console.error('[ASR] Error getting audio metadata:', error);
      setAudioMetadata(prev => ({ ...prev, isLoading: false }));
      return { 
        size: 0, 
        duration: 0,
        sampleRate: 16000 // Default to 16000 Hz even on error
      };
    }
  };
  
  // Handle selecting an audio file
  const handleSelectAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    setSelectedAudio(audioItem);
    
    // Get audio metadata when selecting a file
    setStatusMessage(`Getting metadata for ${audioItem.name}...`);
    const metadata = await getAudioMetadata(audioItem.localUri);
    setStatusMessage('');
    
    // Log audio metadata with fixed sample rate
    console.log(`[ASR] Audio metadata:`, {...metadata, sampleRate: 16000});
  };
  
  // Display audio information 
  const renderAudioInfo = () => {
    if (!selectedAudio) return null;
    
    const { size, duration } = audioMetadata;
    
    return (
      <View style={styles.audioInfoContainer}>
        <Text style={styles.audioInfoTitle}>Audio Information:</Text>
        {size !== undefined && <Text style={styles.audioInfoText}>Size: {formatBytes(size)}</Text>}
        {duration !== undefined && <Text style={styles.audioInfoText}>Duration: {formatDuration(duration)}</Text>}
        <Text style={styles.audioInfoText}>Sample Rate: 16000 Hz (optimized for ASR)</Text>
      </View>
    );
  };
  
  // Release ASR resources
  const handleReleaseAsr = async () => {
    try {
      // const result = await ASR.release();
      await ASR.release();
      
      setInitialized(false);
      setRecognitionResult('');
      Alert.alert('Success', 'ASR resources released successfully');
    } catch (err) {
      setError(`Error releasing ASR resources: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate a visualization of the model's predefined config
  const predefinedConfigDisplay = selectedModelId && asrConfig ? (
    <View style={styles.statusSection}>
      <Text style={styles.sectionTitle}>Predefined Model Configuration</Text>
      <Text style={styles.codeText} selectable>
        {JSON.stringify(asrConfig, null, 2)}
      </Text>
    </View>
  ) : null;

  // Effect to load audio assets when component mounts
  useEffect(() => {
    loadAudioAssets();
  }, []);

  // Load sample audio files
  async function loadAudioAssets() {
    try {
      console.log('[ASR] Loading audio assets');
      const audioFiles = [];
      
      for (const sampleAudio of SAMPLE_AUDIO_FILES) {
        try {
          // Load the asset
          const asset = Asset.fromModule(sampleAudio.module);
          await asset.downloadAsync();
          
          if (asset.localUri) {
            audioFiles.push({
              ...sampleAudio,
              localUri: asset.localUri
            });
            console.log(`[ASR] Loaded audio asset: ${sampleAudio.name} at ${asset.localUri}`);
          } else {
            console.error(`[ASR] Failed to get localUri for audio: ${sampleAudio.name}`);
          }
        } catch (err) {
          console.error(`[ASR] Error loading audio asset ${sampleAudio.name}:`, err);
        }
      }
      
      setLoadedAudioFiles(audioFiles);
    } catch (err) {
      console.error('[ASR] Error loading audio assets:', err);
      setError(`Failed to load audio samples: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Loading overlay - moved outside of ScrollView */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>
              {processing ? 'Processing audio...' : 'Initializing ASR...'}
            </Text>
            
            <Text style={styles.loadingSubText}>
              {statusMessage}
            </Text>
          </View>
        </View>
      )}
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Automatic Speech Recognition</Text>
        
        {/* Error and status messages */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}
        
        {/* Model Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select ASR Model</Text>
          {initialized && (
            <Text style={styles.warningText}>
              Switching models will release the currently initialized model
            </Text>
          )}
          <View style={styles.pickerContainer}>
            {downloadedModels.length === 0 ? (
              <Text style={styles.emptyText}>
                No ASR models downloaded. Please visit the Models screen to download a model.
              </Text>
            ) : (
              downloadedModels.map((model) => (
                <TouchableOpacity
                  key={model.metadata.id}
                  style={[
                    styles.modelOption,
                    selectedModelId === model.metadata.id && styles.modelOptionSelected
                  ]}
                  onPress={() => {
                    if (initialized) {
                      Alert.alert(
                        "Switch Model?",
                        "Switching models will release the currently initialized model. Any recognition progress will be lost.",
                        [
                          {
                            text: "Cancel",
                            style: "cancel"
                          },
                          {
                            text: "Switch",
                            style: "destructive",
                            onPress: async () => {
                              await handleReleaseAsr();
                              setSelectedModelId(model.metadata.id);
                            }
                          }
                        ]
                      );
                    } else {
                      setSelectedModelId(model.metadata.id);
                    }
                  }}
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

        {/* ASR Configuration */}
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>2. ASR Configuration</Text>
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Number of Threads:</Text>
            <View style={styles.buttonGroup}>
              {[1, 2, 4, 8].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.optionButton,
                    numThreads === num && styles.optionButtonSelected
                  ]}
                  onPress={() => setNumThreads(num)}
                >
                  <Text style={[
                    styles.optionButtonText,
                    numThreads === num && styles.optionButtonTextSelected
                  ]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Decoding Method:</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  decodingMethod === 'greedy_search' && styles.optionButtonSelected
                ]}
                onPress={() => setDecodingMethod('greedy_search')}
              >
                <Text style={[
                  styles.optionButtonText,
                  decodingMethod === 'greedy_search' && styles.optionButtonTextSelected
                ]}>Greedy Search</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionButton,
                  decodingMethod === 'beam_search' && styles.optionButtonSelected
                ]}
                onPress={() => setDecodingMethod('beam_search')}
              >
                <Text style={[
                  styles.optionButtonText,
                  decodingMethod === 'beam_search' && styles.optionButtonTextSelected
                ]}>Beam Search</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {decodingMethod === 'beam_search' && (
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Max Active Paths:</Text>
              <View style={styles.buttonGroup}>
                {[4, 8, 16, 32].map(paths => (
                  <TouchableOpacity
                    key={paths}
                    style={[
                      styles.optionButton,
                      maxActivePaths === paths && styles.optionButtonSelected
                    ]}
                    onPress={() => setMaxActivePaths(paths)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      maxActivePaths === paths && styles.optionButtonTextSelected
                    ]}>{paths}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Streaming Mode:</Text>
            <Switch
              value={isStreaming}
              onValueChange={setIsStreaming}
            />
          </View>
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Provider:</Text>
            <View style={styles.providerContainer}>
              <TouchableOpacity
                style={[
                  styles.providerOption,
                  provider === 'cpu' && styles.providerOptionSelected
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
                  provider === 'gpu' && styles.providerOptionSelected
                ]}
                onPress={() => setProvider('gpu')}
              >
                <Text style={[
                  styles.providerOptionText,
                  provider === 'gpu' && styles.providerOptionTextSelected
                ]}>GPU</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Debug Mode:</Text>
            <Switch
              value={debugMode}
              onValueChange={setDebugMode}
            />
          </View>
        </View>

        {/* ASR Controls */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.initButton,
              (!selectedModelId || loading) && styles.buttonDisabled
            ]} 
            onPress={handleInitAsr}
            disabled={loading || !selectedModelId}
          >
            <Text style={styles.buttonText}>Initialize ASR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.releaseButton,
              (!initialized || loading) && styles.buttonDisabled
            ]} 
            onPress={handleReleaseAsr}
            disabled={loading || !initialized}
          >
            <Text style={styles.buttonText}>Release ASR</Text>
          </TouchableOpacity>
        </View>

        {/* Audio selection section */}
        {initialized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Select Audio Sample</Text>
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
                  Size: {formatBytes(audioMetadata.size || 0)}
                </Text>
                <Text style={styles.metadataText}>
                  Duration: {formatDuration(audioMetadata.duration || 0)}
                </Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[
                      styles.audioPlayButton,
                      isPlaying && styles.audioPlayButtonDisabled
                    ]}
                    onPress={() => handlePlayAudio(selectedAudio)}
                    disabled={isPlaying}
                  >
                    <Text style={styles.audioPlayButtonText}>
                      {isPlaying ? 'Playing...' : 'Play Audio'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* Recognition section */}
        {initialized && selectedAudio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Recognize Speech</Text>
            <TouchableOpacity
              style={[
                styles.button,
                styles.generateButton,
                processing && styles.buttonDisabled
              ]}
              onPress={handleRecognizeFromFile}
              disabled={processing}
            >
              <Text style={styles.buttonText}>Recognize Speech</Text>
            </TouchableOpacity>
            
            {recognitionResult !== '' && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Recognized Text:</Text>
                <View style={styles.textContainer}>
                  <Text style={styles.recognizedText}>{recognitionResult}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Audio Information Section */}
        {selectedAudio && renderAudioInfo()}
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
  },
  pickerContainer: {
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
  warningText: {
    color: '#FF9800',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
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
  initButton: {
    backgroundColor: '#2196F3',
  },
  releaseButton: {
    backgroundColor: '#757575',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
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
  buttonGroup: {
    flex: 1,
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
    backgroundColor: '#2196F3',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#333',
  },
  optionButtonTextSelected: {
    color: 'white',
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
  audioItem: {
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAudioItem: {
    borderColor: '#2196F3',
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
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  metadataText: {
    color: '#666',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  audioPlayButton: {
    backgroundColor: '#9C27B0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    maxWidth: 200,
  },
  audioPlayButtonDisabled: {
    opacity: 0.6,
  },
  audioPlayButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
  audioInfoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  audioInfoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  audioInfoText: {
    color: '#666',
    marginBottom: 4,
  },
}); 