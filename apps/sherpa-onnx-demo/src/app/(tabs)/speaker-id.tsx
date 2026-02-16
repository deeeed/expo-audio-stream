import { IdentifySpeakerResult, SpeakerEmbeddingResult, SpeakerId, SpeakerIdModelConfig } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSpeakerIdModelWithConfig, useSpeakerIdModels } from '../../hooks/useModelWithConfig';

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

interface AudioFile {
  id: string;
  name: string;
  module: number;
  localUri: string;
}

export default function SpeakerIdScreen() {
  // State for Speaker ID initialization and processing
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [registeredSpeakers, setRegisteredSpeakers] = useState<string[]>([]);
  const [speakerCount, setSpeakerCount] = useState(0);
  
  // State for audio files and playback
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<AudioFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AudioFile | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // State for embedding and identification results
  const [embeddingResult, setEmbeddingResult] = useState<SpeakerEmbeddingResult | null>(null);
  const [identifyResult, setIdentifyResult] = useState<IdentifySpeakerResult | null>(null);
  
  // State for configuration options
  const [numThreads, setNumThreads] = useState<number>(2);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(0.5);
  const [newSpeakerName, setNewSpeakerName] = useState<string>('');
  const [provider, setProvider] = useState<'cpu' | 'gpu'>('cpu');
  
  // State for audio metadata
  const [audioMetadata, setAudioMetadata] = useState<{
    size?: number;
    duration?: number;
    isLoading: boolean;
  }>({
    isLoading: false
  });
  
  // Hooks for model data
  const { downloadedModels } = useSpeakerIdModels();
  const { speakerIdConfig, localPath, isDownloaded } = useSpeakerIdModelWithConfig({ modelId: selectedModelId });
  
  // Track if component is mounted
  const isMounted = React.useRef(true);
  
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
  
  // Reset configuration when selected model changes
  useEffect(() => {
    if (speakerIdConfig) {
      // Reset to values from the predefined config or use defaults
      setNumThreads(speakerIdConfig.numThreads ?? 2);
      setDebugMode(speakerIdConfig.debug ?? false);
      setProvider(speakerIdConfig.provider ?? 'cpu');
      
      console.log('Reset configuration based on selected model:', selectedModelId);
    }
  }, [selectedModelId, speakerIdConfig]);
  
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
  }, [initialized, sound]);
  
  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    // If a model is already initialized, show confirmation before switching
    if (initialized) {
      Alert.alert(
        "Switch Model?",
        "Switching models will release the currently initialized model and clear any registered speakers.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Switch",
            style: "destructive",
            onPress: async () => {
              // Release current model first
              try {
                await handleReleaseSpeakerId();
                // After release, set the new model ID
                setSelectedModelId(modelId);
                setStatusMessage('Model switched to ' + modelId);
              } catch (error) {
                setError(`Error releasing speaker ID: ${(error as Error).message}`);
              }
            }
          }
        ]
      );
    } else {
      // No model initialized, just switch directly
      setSelectedModelId(modelId);
      setStatusMessage('Selected model: ' + modelId);
    }
  };
  
  // Initialize speaker ID with selected model
  const handleInitSpeakerId = async () => {
    if (!selectedModelId) {
      setError('Please select a model first');
      return;
    }

    if (!speakerIdConfig || !localPath || !isDownloaded) {
      setError('Selected model is not valid or configuration not found.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Initializing Speaker ID...');

    try {
      // Use the cleaned path (without file://) for native module
      const cleanLocalPath = localPath.replace(/^file:\/\//, '');
      console.log(`Using model directory: ${cleanLocalPath}`);

      // Create configuration for speaker ID initialization
      const modelConfig: SpeakerIdModelConfig = {
        modelDir: cleanLocalPath,
        modelFile: speakerIdConfig.modelFile || 'model.onnx',
        numThreads,
        debug: debugMode,
        provider,
      };
      
      console.log('Initializing speaker ID with config:', JSON.stringify(modelConfig, null, 2));
      
      // Initialize the speaker ID engine
      const result = await SpeakerId.init(modelConfig);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during speaker ID initialization');
      }
      
      console.log('Speaker ID initialized successfully with embedding dimension:', result.embeddingDim);
      
      // Fetch registered speakers if any
      await refreshSpeakerList();
      
      setInitialized(true);
      setStatusMessage(`Speaker ID initialized successfully! Embedding dimension: ${result.embeddingDim}`);
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
  const handlePlayAudio = async (audioItem: AudioFile) => {
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
  const handleProcessAudio = async (audioItem: AudioFile) => {
    if (!initialized) {
      setError('Speaker ID is not initialized');
      return;
    }
    
    setProcessing(true);
    setEmbeddingResult(null);
    setIdentifyResult(null);
    setError(null);
    setStatusMessage('Processing audio...');
    
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
      setStatusMessage('Audio processed successfully!');
      
      // If we have registered speakers, try to identify
      if (speakerCount > 0) {
        setStatusMessage('Identifying speaker...');
        const identifyResult = await SpeakerId.identifySpeaker(result.embedding, threshold);
        setIdentifyResult(identifyResult);
        
        if (identifyResult.identified) {
          setStatusMessage(`Speaker identified: ${identifyResult.speakerName}`);
        } else {
          setStatusMessage('No matching speaker found');
        }
      }
      
      setProcessing(false);
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(`Error processing audio: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMessage('');
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
    setStatusMessage('Registering speaker...');
    
    try {
      // Register the speaker with the current embedding
      const result = await SpeakerId.registerSpeaker(newSpeakerName, embeddingResult.embedding);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during speaker registration');
      }
      
      Alert.alert('Success', `Speaker "${newSpeakerName}" registered successfully`);
      setNewSpeakerName('');
      setStatusMessage(`Speaker "${newSpeakerName}" registered successfully`);
      
      // Refresh the speaker list
      await refreshSpeakerList();
      
      setProcessing(false);
    } catch (err) {
      console.error('Error registering speaker:', err);
      setError(`Error registering speaker: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMessage('');
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
    setStatusMessage(`Removing speaker "${name}"...`);
    
    try {
      // Remove the speaker
      const result = await SpeakerId.removeSpeaker(name);
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error during speaker removal');
      }
      
      Alert.alert('Success', `Speaker "${name}" removed successfully`);
      setStatusMessage(`Speaker "${name}" removed successfully`);
      
      // Refresh the speaker list
      await refreshSpeakerList();
      
      setProcessing(false);
    } catch (err) {
      console.error('Error removing speaker:', err);
      setError(`Error removing speaker: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMessage('');
      setProcessing(false);
    }
  };
  
  // Release Speaker ID
  const handleReleaseSpeakerId = async () => {
    if (!initialized) {
      return;
    }
    
    setLoading(true);
    setStatusMessage('Releasing Speaker ID resources...');
    
    try {
      const result = await SpeakerId.release();
      
      if (result.released) {
        setInitialized(false);
        setEmbeddingResult(null);
        setIdentifyResult(null);
        setRegisteredSpeakers([]);
        setSpeakerCount(0);
        setStatusMessage('Speaker ID resources released successfully');
      } else {
        setError('Failed to release Speaker ID resources');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error releasing speaker ID:', err);
      setError(`Error releasing speaker ID: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMessage('');
      setLoading(false);
    }
  };
  
  // Handle audio selection
  const handleSelectAudio = async (audioItem: AudioFile) => {
    setSelectedAudio(audioItem);
    setEmbeddingResult(null);
    setIdentifyResult(null);
    
    // Get metadata
    setAudioMetadata({ isLoading: true });
    try {
      const metadata = await getAudioMetadata(audioItem.localUri);
      setAudioMetadata({
        size: metadata.size,
        duration: metadata.duration,
        isLoading: false
      });
    } catch (error) {
      console.error('Error getting audio metadata:', error);
      setAudioMetadata({ isLoading: false });
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
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>
              {statusMessage || 'Processing...'}
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <View style={styles.content}>
            <Text style={styles.title}>Speaker Identification</Text>

            {/* Error and status messages */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
            
            {statusMessage && !error && !loading ? (
              <Text style={styles.statusText}>{statusMessage}</Text>
            ) : null}
            
            {/* Model Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Select Speaker ID Model</Text>
              {initialized && (
                <Text style={styles.warningText}>
                  Switching models will release the currently initialized model
                </Text>
              )}
              <View style={styles.pickerContainer}>
                {downloadedModels.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No speaker identification models available.
                    Please visit the Models screen to download a model.
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
            {selectedModelId && speakerIdConfig && (
              <View style={styles.configSection}>
                <Text style={styles.sectionTitle}>2. Speaker ID Configuration</Text>
                
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Number of Threads:</Text>
                  <TextInput
                    style={styles.configInput}
                    keyboardType="numeric"
                    value={numThreads.toString()}
                    onChangeText={(value) => {
                      const threadCount = parseInt(value);
                      if (!isNaN(threadCount) && threadCount > 0) {
                        setNumThreads(threadCount);
                      }
                    }}
                    editable={!initialized}
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
                      onPress={() => !initialized && setProvider('cpu')}
                      disabled={initialized}
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
                      onPress={() => !initialized && setProvider('gpu')}
                      disabled={initialized}
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
                    onValueChange={(value) => {
                      if (!initialized) {
                        setDebugMode(value);
                      }
                    }}
                    disabled={initialized}
                  />
                </View>
                
                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Similarity Threshold:</Text>
                  <TextInput
                    style={styles.configInput}
                    keyboardType="numeric"
                    value={threshold.toString()}
                    onChangeText={(text) => {
                      const value = parseFloat(text);
                      if (!isNaN(value) && value >= 0 && value <= 1) {
                        setThreshold(value);
                      }
                    }}
                  />
                </View>
              </View>
            )}
            
            {/* Control Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.initButton,
                  (!selectedModelId || loading) && styles.buttonDisabled
                ]} 
                onPress={handleInitSpeakerId}
                disabled={loading || !selectedModelId || initialized}
              >
                <Text style={styles.buttonText}>Initialize Speaker ID</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.releaseButton,
                  (!initialized || loading) && styles.buttonDisabled
                ]} 
                onPress={handleReleaseSpeakerId}
                disabled={loading || !initialized}
              >
                <Text style={styles.buttonText}>Release Speaker ID</Text>
              </TouchableOpacity>
            </View>
            
            {/* Audio Selection (only show if initialized) */}
            {initialized && (
              <>
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
                        <Text style={[
                          styles.audioName,
                          selectedAudio?.id === item.id && styles.selectedAudioItemText
                        ]}>
                          {item.name}
                        </Text>
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
                            <Text style={styles.audioMetadata}>Size: {formatFileSize(audioMetadata.size)}</Text>
                          )}
                          {audioMetadata.duration !== undefined && (
                            <Text style={styles.audioMetadata}>Duration: {formatDuration(audioMetadata.duration)}</Text>
                          )}
                        </>
                      )}
                      
                      <View style={styles.audioControls}>
                        <TouchableOpacity
                          style={[
                            styles.audioPlayButton,
                            isPlaying && styles.audioPlayButtonDisabled
                          ]}
                          onPress={() => !isPlaying && handlePlayAudio(selectedAudio)}
                          disabled={isPlaying || processing}
                        >
                          <Text style={styles.audioPlayButtonText}>
                            {isPlaying ? 'Playing...' : 'Play Audio'}
                          </Text>
                        </TouchableOpacity>
                        
                        {isPlaying ? (
                          <TouchableOpacity
                            style={styles.audioStopButton}
                            onPress={handleStopAudio}
                            disabled={processing}
                          >
                            <Text style={styles.audioStopButtonText}>Stop</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.audioProcessButton}
                            onPress={() => handleProcessAudio(selectedAudio)}
                            disabled={processing}
                          >
                            <Text style={styles.audioProcessButtonText}>Process</Text>
                          </TouchableOpacity>
                        )}
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
                          <TouchableOpacity
                            style={[
                              styles.registerButton,
                              (!newSpeakerName.trim() || processing) && styles.buttonDisabled
                            ]}
                            onPress={handleRegisterSpeaker}
                            disabled={!newSpeakerName.trim() || processing}
                          >
                            <Text style={styles.buttonText}>
                              Register Speaker
                            </Text>
                          </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
  label: {
    fontWeight: 'bold',
    marginBottom: 8,
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
  warningText: {
    color: '#FF9800',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
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
  audioList: {
    gap: 8,
  },
  audioItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  selectedAudioItem: {
    backgroundColor: '#2196F3',
  },
  selectedAudioItemText: {
    color: '#fff',
  },
  audioName: {
    fontWeight: '500',
  },
  audioMetadata: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selectedAudioInfo: {
    marginTop: 16,
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  audioPlayButton: {
    backgroundColor: '#9C27B0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  audioPlayButtonDisabled: {
    opacity: 0.6,
  },
  audioPlayButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  audioStopButton: {
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  audioStopButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  audioProcessButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  audioProcessButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  resultContainer: {
    padding: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resultText: {
    marginBottom: 4,
    color: '#333',
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
  textInput: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 8,
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
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
});