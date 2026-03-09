import type {
  AudioTaggingModelConfig,
  AudioTaggingResult
} from '@siteed/sherpa-onnx.rn';
import { AudioTagging } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAudioTaggingModels, useAudioTaggingModelWithConfig } from '../../../hooks/useModelWithConfig';
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
  const [needsReinit, setNeedsReinit] = useState(false);

  // Add state for loaded audio assets
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<{
    id: string;
    name: string;
    module: number;
    localUri: string;
  }[]>([]);

  // Add state for audio playback
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
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

  const router = useRouter();
  const theme = useTheme();

  // Use our new hooks
  const { downloadedModels } = useAudioTaggingModels();
  const { audioTaggingConfig, localPath, isDownloaded } = useAudioTaggingModelWithConfig({ modelId: selectedModelId });

  // Track the config snapshot that was used for the last successful init
  const initedConfigRef = useRef<{
    modelId: string | null;
    topK: number;
    numThreads: number;
    debugMode: boolean;
    provider: string;
  } | null>(null);

  // Reset UI config values when the selected model changes
  useEffect(() => {
    if (audioTaggingConfig) {
      setTopK(audioTaggingConfig.topK ?? 5);
      setNumThreads(audioTaggingConfig.numThreads ?? 2);
      setDebugMode(audioTaggingConfig.debug ?? true);
      setProvider(audioTaggingConfig.provider ?? 'cpu');
    }
    // Only run when the model selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

  // Detect config drift from what was last initialized
  useEffect(() => {
    if (!initialized || !initedConfigRef.current) return;
    const c = initedConfigRef.current;
    const changed =
      c.modelId !== selectedModelId ||
      c.topK !== topK ||
      c.numThreads !== numThreads ||
      c.debugMode !== debugMode ||
      c.provider !== provider;
    setNeedsReinit(changed);
  }, [initialized, selectedModelId, topK, numThreads, debugMode, provider]);

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

      if (player) {
        player.remove();
      }
    };
  }, [initialized, player]);

  const handleModelSelect = useCallback(async (modelId: string) => {
    if (modelId === selectedModelId) return;
    if (initialized) {
      try {
        await AudioTagging.release();
      } catch (_) { /* ignore */ }
      setInitialized(false);
      initedConfigRef.current = null;
      setAudioTaggingResults(null);
    }
    setNeedsReinit(false);
    setSelectedModelId(modelId);
  }, [initialized, selectedModelId]);

  // Initialize the audio tagging engine
  const handleInitAudioTagging = async () => {
    if (!selectedModelId || !localPath || !isDownloaded) {
      setError('Cannot initialize: no model selected or model not downloaded.');
      return;
    }

    // Release first if reinitializing with new config
    if (initialized) {
      try { await AudioTagging.release(); } catch (_) { /* ignore */ }
      setInitialized(false);
      initedConfigRef.current = null;
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
          setNeedsReinit(false);
          initedConfigRef.current = { modelId: selectedModelId, topK, numThreads, debugMode, provider };
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
      if (player) {
        player.pause();
        player.remove();
        setPlayer(null);
      }

      // Check if we have a valid local URI
      if (!audioItem.localUri) {
        throw new Error('Audio file not yet loaded');
      }

      console.log(`Loading audio file: ${audioItem.localUri}`);
      const newPlayer = createAudioPlayer({ uri: audioItem.localUri });
      setPlayer(newPlayer);

      // Set up status update callback
      newPlayer.addListener('playbackStatusUpdate', (status) => {
        setIsPlaying(status.playing);
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });

      newPlayer.play();
      setIsPlaying(true);
      console.log('Audio playback started');
    } catch (err) {
      console.error('Error playing audio:', err);
      setError(`Error playing audio: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Stop playing audio
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
      await AudioTagging.release();
    } catch (err) {
      console.error('Error releasing audio tagging resources:', err);
    } finally {
      setInitialized(false);
      setNeedsReinit(false);
      initedConfigRef.current = null;
      setAudioTaggingResults(null);
      setStatusMessage('Audio tagging resources released');
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

      // Get audio duration using expo-audio
      const tempPlayer = createAudioPlayer({ uri });

      // Wait briefly for the player to load and get duration
      await new Promise(resolve => setTimeout(resolve, 500));
      const duration = (tempPlayer.duration || 0) * 1000; // Convert seconds to milliseconds

      // Clean up player
      tempPlayer.remove();

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
      if (player && isPlaying) {
        handleStopAudio();
      }
    } else {
      setSelectedAudio(audioItem);
      setAudioMetadata({ isLoading: true });

      // Stop any current playback when selecting a new audio
      if (player && isPlaying) {
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
    <Section title="Predefined Model Configuration">
      {/* Display predefined values in a more readable format */}
      <View style={{ marginBottom: theme.margin.m }}>
        {audioTaggingConfig.modelType && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Model Type:</Text>
            <Text variant="bodyMedium">{audioTaggingConfig.modelType}</Text>
          </View>
        )}
        {audioTaggingConfig.topK !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Top K Results:</Text>
            <Text variant="bodyMedium">{audioTaggingConfig.topK}</Text>
          </View>
        )}
        {audioTaggingConfig.numThreads !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Num Threads:</Text>
            <Text variant="bodyMedium">{audioTaggingConfig.numThreads}</Text>
          </View>
        )}
        {audioTaggingConfig.provider !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Provider:</Text>
            <Text variant="bodyMedium">{audioTaggingConfig.provider.toUpperCase()}</Text>
          </View>
        )}
        {audioTaggingConfig.debug !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Debug Mode:</Text>
            <Text variant="bodyMedium">{audioTaggingConfig.debug ? 'Enabled' : 'Disabled'}</Text>
          </View>
        )}
        {audioTaggingConfig.modelFile !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Model File:</Text>
            <Text variant="bodyMedium">{audioTaggingConfig.modelFile}</Text>
          </View>
        )}
        {audioTaggingConfig.labelsFile !== undefined && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>Labels File:</Text>
            <Text variant="bodyMedium">{audioTaggingConfig.labelsFile}</Text>
          </View>
        )}
      </View>

      <Text variant="titleSmall" style={{ marginBottom: theme.margin.s }}>Raw Configuration:</Text>
      <Text variant="bodySmall" selectable style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: theme.colors.surfaceVariant, padding: 10, borderRadius: theme.roundness }}>
        {JSON.stringify(audioTaggingConfig, null, 2)}
      </Text>
    </Section>
  ) : null;

  const configSection = (
    <Section title="2. Configuration">
      {audioTaggingConfig && (
        <View style={{ marginBottom: theme.margin.m }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', flex: 1, marginRight: theme.margin.m }}>
              <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>Note: </Text>
              Values from predefined configuration are shown in blue
            </Text>
            <ThemedButton
              label="Reset to Defaults"
              compact
              onPress={() => {
                if (audioTaggingConfig) {
                  console.log('[DEBUG] Resetting configuration to predefined values');
                  setTopK(audioTaggingConfig.topK ?? 5);
                  setNumThreads(audioTaggingConfig.numThreads ?? 2);
                  setDebugMode(audioTaggingConfig.debug ?? true);
                  setProvider(audioTaggingConfig.provider ?? 'cpu');
                }
              }}
            />
          </View>
        </View>
      )}

      <ConfigRow label="Top K Results:">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            value={String(topK)}
            onChangeText={(text) => setTopK(Number(text) || 5)}
            keyboardType="numeric"
            style={{
              flex: 1, padding: 8, borderWidth: audioTaggingConfig?.topK === topK ? 2 : 1,
              borderColor: audioTaggingConfig?.topK === topK ? theme.colors.primary : theme.colors.outlineVariant,
              borderRadius: theme.roundness, color: theme.colors.onSurface,
            }}
          />
          {audioTaggingConfig?.topK !== undefined && audioTaggingConfig.topK !== topK && (
            <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, padding: 4, borderRadius: theme.roundness, marginLeft: 8 }}>
              Default: {audioTaggingConfig.topK}
            </Text>
          )}
        </View>
      </ConfigRow>

      <ConfigRow label="Num Threads:">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            value={String(numThreads)}
            onChangeText={(text) => setNumThreads(Number(text) || 2)}
            keyboardType="numeric"
            style={{
              flex: 1, padding: 8, borderWidth: audioTaggingConfig?.numThreads === numThreads ? 2 : 1,
              borderColor: audioTaggingConfig?.numThreads === numThreads ? theme.colors.primary : theme.colors.outlineVariant,
              borderRadius: theme.roundness, color: theme.colors.onSurface,
            }}
          />
          {audioTaggingConfig?.numThreads !== undefined && audioTaggingConfig.numThreads !== numThreads && (
            <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, padding: 4, borderRadius: theme.roundness, marginLeft: 8 }}>
              Default: {audioTaggingConfig.numThreads}
            </Text>
          )}
        </View>
      </ConfigRow>

      <ConfigRow label="Provider:">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
            <ThemedButton
              label="CPU"
              variant={provider === 'cpu' ? 'primary' : 'secondary'}
              onPress={() => setProvider('cpu')}
              compact
            />
            <ThemedButton
              label="GPU"
              variant={provider === 'gpu' ? 'primary' : 'secondary'}
              onPress={() => setProvider('gpu')}
              compact
            />
          </View>
          {audioTaggingConfig?.provider !== undefined && audioTaggingConfig.provider !== provider && (
            <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, padding: 4, borderRadius: theme.roundness, marginLeft: 8 }}>
              Default: {audioTaggingConfig.provider.toUpperCase()}
            </Text>
          )}
        </View>
      </ConfigRow>

      <ConfigRow label="Debug Mode:">
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Switch
            value={debugMode}
            onValueChange={setDebugMode}
            trackColor={{
              false: '#eee',
              true: audioTaggingConfig?.debug === debugMode ? theme.colors.primary : '#81c784'
            }}
          />
          {audioTaggingConfig?.debug !== undefined && audioTaggingConfig.debug !== debugMode && (
            <Text variant="labelSmall" style={{ backgroundColor: theme.colors.primary, color: theme.colors.onPrimary, padding: 4, borderRadius: theme.roundness, marginLeft: 8 }}>
              Default: {audioTaggingConfig.debug ? 'On' : 'Off'}
            </Text>
          )}
        </View>
      </ConfigRow>
    </Section>
  );

  return (
    <PageContainer>
      <LoadingOverlay
        visible={loading}
        message={statusMessage || 'Processing...'}
        subMessage="This may take a moment, especially for longer audio files."
      />

      {/* Error and status messages */}
      <StatusBlock status={statusMessage} error={error} />

      {/* Reinit banner */}
      {needsReinit && (
        <TouchableOpacity
          style={{
            backgroundColor: '#FFF3E0', borderColor: '#FF9800', borderWidth: 1,
            borderRadius: theme.roundness * 2, padding: theme.padding.s,
            marginBottom: theme.margin.s, alignItems: 'center',
          }}
          onPress={handleInitAudioTagging}
          disabled={loading || processing}
        >
          <Text variant="labelMedium" style={{ color: '#E65100', fontWeight: '600' }}>
            Configuration changed — tap to reinitialize
          </Text>
        </TouchableOpacity>
      )}

      {/* Model Selection */}
      <Section title="1. Select Model">
        {downloadedModels.length === 0 ? (
          <InlineModelDownloader
            modelType="audio-tagging"
            emptyLabel="No audio tagging models downloaded."
            onModelDownloaded={(modelId) => handleModelSelect(modelId)}
          />
        ) : (
          <ModelSelector
            models={downloadedModels}
            selectedId={selectedModelId}
            onSelect={handleModelSelect}
            disabled={processing}
          />
        )}
      </Section>

      {/* Show the predefined configuration after model selection */}
      {predefinedConfigDisplay}

      {/* Configuration */}
      {configSection}

      {/* Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.margin.m, gap: theme.gap?.s ?? 8 }}>
        <ThemedButton
          label={needsReinit ? 'Reinitialize' : 'Initialize'}
          variant={needsReinit ? 'warning' : 'primary'}
          onPress={handleInitAudioTagging}
          disabled={loading || processing || (!needsReinit && (initialized || !selectedModelId))}
          style={{ flex: 1 }}
        />
        <ThemedButton
          label="Release"
          variant="secondary"
          onPress={handleReleaseAudioTagging}
          disabled={loading || !initialized || processing}
          style={{ flex: 1 }}
        />
      </View>

      {/* Sample Audio Files */}
      <Section title={initialized ? '3. Sample Audio Files' : '3. Sample Audio Files (Initialize model first)'}>
        {loadedAudioFiles.length === 0 ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          loadedAudioFiles.map(audio => (
            <TouchableOpacity
              key={audio.id}
              style={{
                backgroundColor: selectedAudio?.id === audio.id ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                paddingVertical: 12, paddingHorizontal: 16, marginVertical: 6, borderRadius: theme.roundness,
                borderWidth: selectedAudio?.id === audio.id ? 2 : 0,
                borderColor: theme.colors.primary,
              }}
              onPress={() => handleSelectAudio(audio)}
              disabled={processing}
            >
              <Text variant="bodyMedium">{audio.name}</Text>
            </TouchableOpacity>
          ))
        )}
      </Section>

      {/* Audio Actions */}
      {selectedAudio && (
        <Section title="4. Audio Actions">
          <View style={{ marginBottom: theme.margin.m }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '500', marginBottom: theme.margin.s }}>
              Selected: {selectedAudio.name}
            </Text>

            {audioMetadata.isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 8 }} />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 }}>
                {audioMetadata.size !== undefined && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Size: {formatFileSize(audioMetadata.size)}
                  </Text>
                )}
                {audioMetadata.duration !== undefined && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Duration: {formatDuration(audioMetadata.duration)}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
            <ThemedButton
              label={isPlaying ? 'Stop' : 'Play'}
              variant={isPlaying ? 'danger' : 'success'}
              onPress={() => {
                if (selectedAudio && 'localUri' in selectedAudio) {
                  if (isPlaying) {
                    handleStopAudio();
                  } else {
                    handlePlayAudio(selectedAudio);
                  }
                }
              }}
              disabled={processing}
              style={{ flex: 1 }}
            />
            <ThemedButton
              label="Classify"
              onPress={() => {
                if (selectedAudio && 'localUri' in selectedAudio) {
                  handleProcessAudio(selectedAudio);
                }
              }}
              disabled={!initialized || processing}
              style={{ flex: 1 }}
            />
          </View>
        </Section>
      )}

      {/* Results */}
      {audioTaggingResults && audioTaggingResults.events && audioTaggingResults.events.length > 0 && (
        <Section title={selectedAudio ? '5. Results' : '4. Results'}>
          {processing ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <ResultsBox>
              {audioTaggingResults.events.map((item) => (
                <View key={`${item.index}-${item.name}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '500' }}>{item.name}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>{(item.prob * 100).toFixed(2)}%</Text>
                </View>
              ))}
            </ResultsBox>
          )}
        </Section>
      )}
    </PageContainer>
  );
}

export default AudioTaggingScreen;
