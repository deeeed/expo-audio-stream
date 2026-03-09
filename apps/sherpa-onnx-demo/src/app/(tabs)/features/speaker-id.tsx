import { IdentifySpeakerResult, SpeakerEmbeddingResult, SpeakerId, SpeakerIdModelConfig } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSpeakerIdModelWithConfig, useSpeakerIdModels } from '../../../hooks/useModelWithConfig';
import { InlineModelDownloader } from '../../../components/InlineModelDownloader';
import {
  ConfigRow,
  LoadingOverlay,
  ModelSelector,
  PageContainer,
  ResultsBox,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  useTheme,
} from '../../../components/ui';

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
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
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

  const theme = useTheme();

  // Hooks for model data
  const { downloadedModels } = useSpeakerIdModels();
  const { speakerIdConfig, localPath, isDownloaded } = useSpeakerIdModelWithConfig({ modelId: selectedModelId });

  // Track if component is mounted
  const isMounted = React.useRef(true);

  // Auto-select first downloaded model if none selected
  useEffect(() => {
    if (downloadedModels.length > 0 && !selectedModelId) {
      setSelectedModelId(downloadedModels[0].metadata.id);
    }
  }, [downloadedModels, selectedModelId]);

  // Auto-init when model is selected and downloaded
  const lastAutoInitRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedModelId || !isDownloaded || initialized || loading) return;
    if (lastAutoInitRef.current === selectedModelId) return;
    lastAutoInitRef.current = selectedModelId;
    handleInitSpeakerId();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId, isDownloaded, initialized, loading]);

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

      if (player) {
        player.remove();
      }
    };
  }, [initialized, player]);

  // Handle model selection
  const handleModelSelect = async (modelId: string) => {
    if (modelId === selectedModelId) return;
    if (initialized) {
      await handleReleaseSpeakerId();
    }
    lastAutoInitRef.current = null;
    setSelectedModelId(modelId);
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
      if (player) {
        player.pause();
        player.remove();
      }

      // Load and play the new audio
      const newPlayer = createAudioPlayer({ uri: audioItem.localUri });

      setPlayer(newPlayer);
      setIsPlaying(true);
      setSelectedAudio(audioItem);

      // Set up playback status update handler
      newPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      newPlayer.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(`Error playing audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Stop audio playback
  const handleStopAudio = () => {
    if (player) {
      try {
        player.pause();
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

      const tempPlayer = createAudioPlayer({ uri });

      // Wait briefly for the player to load and get duration
      await new Promise(resolve => setTimeout(resolve, 500));
      const durationMs = (tempPlayer.duration || 0) * 1000; // Convert seconds to milliseconds

      tempPlayer.remove();

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
    <PageContainer>
      <LoadingOverlay
        visible={loading}
        message={statusMessage || 'Processing...'}
      />

      {/* Error and status messages */}
      <StatusBlock status={!error && !loading ? statusMessage : null} error={error} />

      {/* Model Selection */}
      <Section title="1. Select Speaker ID Model">
        {downloadedModels.length === 0 ? (
          <InlineModelDownloader
            modelType="speaker-id"
            emptyLabel="No speaker identification models downloaded."
            onModelDownloaded={(modelId) => {
              lastAutoInitRef.current = null;
              setSelectedModelId(modelId);
            }}
          />
        ) : (
          <ModelSelector
            models={downloadedModels}
            selectedId={selectedModelId}
            onSelect={handleModelSelect}
          />
        )}
      </Section>

      {/* Configuration */}
      {selectedModelId && speakerIdConfig && (
        <Section title="2. Speaker ID Configuration">
          <ConfigRow label="Number of Threads:">
            <TextInput
              style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, color: theme.colors.onSurface }}
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
          </ConfigRow>

          <ConfigRow label="Provider:">
            <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
              <ThemedButton
                label="CPU"
                variant={provider === 'cpu' ? 'primary' : 'secondary'}
                onPress={() => !initialized && setProvider('cpu')}
                disabled={initialized}
                compact
              />
              <ThemedButton
                label="GPU"
                variant={provider === 'gpu' ? 'primary' : 'secondary'}
                onPress={() => !initialized && setProvider('gpu')}
                disabled={initialized}
                compact
              />
            </View>
          </ConfigRow>

          <ConfigRow label="Debug Mode:">
            <Switch
              value={debugMode}
              onValueChange={(value) => {
                if (!initialized) {
                  setDebugMode(value);
                }
              }}
              disabled={initialized}
            />
          </ConfigRow>

          <ConfigRow label="Similarity Threshold:">
            <TextInput
              style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, color: theme.colors.onSurface }}
              keyboardType="numeric"
              value={threshold.toString()}
              onChangeText={(text) => {
                const value = parseFloat(text);
                if (!isNaN(value) && value >= 0 && value <= 1) {
                  setThreshold(value);
                }
              }}
            />
          </ConfigRow>
        </Section>
      )}

      {/* Model Status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.margin.m }}>
        {loading ? (
          <Text variant="bodySmall" style={{ color: theme.colors.primary }}>Initializing...</Text>
        ) : initialized ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success ?? '#4CAF50' }} />
            <Text variant="bodySmall" style={{ color: theme.colors.success ?? '#4CAF50' }}>Ready</Text>
          </View>
        ) : (
          <ThemedButton
            testID="spkr-init-btn"
            label="Initialize"
            variant="primary"
            onPress={handleInitSpeakerId}
            disabled={!selectedModelId}
          />
        )}
        {initialized && (
          <ThemedButton
            label="Release"
            variant="secondary"
            onPress={handleReleaseSpeakerId}
            compact
          />
        )}
      </View>

      {/* Audio Selection (only show if initialized) */}
      {initialized && (
        <>
          <Section title="Test Audio">
            <View style={{ gap: 8 }}>
              {loadedAudioFiles.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  testID={`spkr-audio-${item.id}`}
                  style={{
                    padding: 12, borderRadius: theme.roundness,
                    backgroundColor: selectedAudio?.id === item.id ? theme.colors.primary : theme.colors.surfaceVariant,
                  }}
                  onPress={() => handleSelectAudio(item)}
                  disabled={processing}
                >
                  <Text variant="bodyMedium" style={{ fontWeight: '500', color: selectedAudio?.id === item.id ? theme.colors.onPrimary : theme.colors.onSurface }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedAudio && (
              <View style={{ marginTop: theme.margin.m }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: theme.margin.s }}>Selected: {selectedAudio.name}</Text>

                {audioMetadata.isLoading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <>
                    {audioMetadata.size !== undefined && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Size: {formatFileSize(audioMetadata.size)}</Text>
                    )}
                    {audioMetadata.duration !== undefined && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Duration: {formatDuration(audioMetadata.duration)}</Text>
                    )}
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8, marginTop: theme.margin.s }}>
                  <ThemedButton
                    label={isPlaying ? 'Playing...' : 'Play Audio'}
                    onPress={() => !isPlaying && handlePlayAudio(selectedAudio)}
                    disabled={isPlaying || processing}
                    style={{ flex: 1 }}
                  />
                  {isPlaying ? (
                    <ThemedButton
                      label="Stop"
                      variant="danger"
                      onPress={handleStopAudio}
                      disabled={processing}
                    />
                  ) : (
                    <ThemedButton
                      testID="spkr-process-btn"
                      label="Process"
                      variant="success"
                      onPress={() => handleProcessAudio(selectedAudio)}
                      disabled={processing}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </View>
            )}
          </Section>

          {/* Processing Results */}
          {(processing || embeddingResult) && (
            <Section title="Results">
              {processing ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={{ marginTop: 10, color: theme.colors.onSurface }}>Processing audio...</Text>
                </View>
              ) : embeddingResult && (
                <ResultsBox>
                  <Text variant="titleSmall" style={{ marginBottom: theme.margin.s }}>Embedding Results:</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>Dimension: {embeddingResult.embeddingDim}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>Processing time: {embeddingResult.durationMs} ms</Text>

                  {/* Display first few values of the embedding vector */}
                  <Text variant="labelMedium" style={{ marginTop: theme.margin.s, marginBottom: 4 }}>First 5 embedding values:</Text>
                  <Text variant="bodySmall" style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: theme.colors.onSurfaceVariant, marginBottom: theme.margin.s }}>
                    {embeddingResult.embedding.slice(0, 5).map((value, index) =>
                      `${value.toFixed(4)}${index < 4 ? ', ' : ''}`
                    )}
                  </Text>

                  {identifyResult && (
                    <View style={{ marginTop: theme.margin.m, padding: 8, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.roundness }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: theme.margin.s }}>Identification Result:</Text>
                      {identifyResult.identified ? (
                        <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.success ?? 'green' }}>
                          Speaker identified: {identifyResult.speakerName}
                        </Text>
                      ) : (
                        <Text variant="bodyMedium">No matching speaker found</Text>
                      )}
                    </View>
                  )}

                  {/* Register New Speaker */}
                  <View style={{ marginTop: theme.margin.m, paddingTop: theme.padding.s, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant }}>
                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginBottom: theme.margin.s }}>Register as:</Text>
                    <TextInput
                      style={{ padding: 8, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.roundness, marginBottom: theme.margin.s, color: theme.colors.onSurface }}
                      value={newSpeakerName}
                      onChangeText={setNewSpeakerName}
                      placeholder="Enter speaker name"
                      placeholderTextColor={theme.colors.onSurfaceVariant}
                    />
                    <ThemedButton
                      testID="spkr-register-btn"
                      label="Register Speaker"
                      variant="success"
                      onPress={handleRegisterSpeaker}
                      disabled={!newSpeakerName.trim() || processing}
                    />
                  </View>
                </ResultsBox>
              )}
            </Section>
          )}

          {/* Registered Speakers */}
          {registeredSpeakers.length > 0 && (
            <Section title="Registered Speakers">
              {registeredSpeakers.map((item) => (
                <View key={item} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.roundness, marginBottom: 8 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{item}</Text>
                  <ThemedButton
                    label="Remove"
                    variant="danger"
                    onPress={() => handleRemoveSpeaker(item)}
                    disabled={processing}
                    compact
                  />
                </View>
              ))}
            </Section>
          )}
        </>
      )}
    </PageContainer>
  );
}
