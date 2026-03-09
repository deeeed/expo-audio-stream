import { ASR, AsrModelConfig } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAsrModels, useAsrModelWithConfig } from '../../hooks/useModelWithConfig';
import { formatDuration, formatBytes } from '../../utils/formatters';
import { setAgenticPageState } from '../../agentic-bridge';
import {
  LoadingOverlay,
  ModelSelector,
  PageContainer,
  ResultsBox,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  useTheme,
} from '../../components/ui';

const GREEDY_ONLY_TYPES = ['whisper', 'paraformer', 'tdnn', 'sense_voice', 'moonshine', 'fire_red_asr']
const BEAM_SEARCH_TYPES = ['transducer', 'zipformer', 'zipformer2', 'nemo_transducer', 'nemo_ctc', 'lstm']

// Derive streaming/offline badge from model ID without needing per-model config lookup
function getModelBadge(modelId: string): { label: string; color: string } {
  if (modelId.startsWith('streaming-')) {
    return { label: 'Streaming', color: '#4CAF50' };
  }
  return { label: 'Offline', color: '#9C27B0' };
}

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
  // Deep-link params: /feature/asr?model=<id>&autoInit=true&audioId=1&t=<timestamp>
  // Pass t=<Date.now()> to force re-trigger effects when navigating to same screen
  const params = useLocalSearchParams<{ model?: string; autoInit?: string; audioId?: string; t?: string }>();
  const theme = useTheme();

  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const router = useRouter();

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
  const [sound, setSound] = useState<AudioPlayer | null>(null);
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

  // Track if autoInit has already fired for the current params
  const autoInitFiredRef = useRef<string | null>(null);

  // Register page state for agentic querying (replaces screenshots)
  useEffect(() => {
    setAgenticPageState({
      selectedModelId,
      initialized,
      loading,
      processing,
      error,
      recognitionResult,
      statusMessage,
      selectedAudio: selectedAudio?.name ?? null,
    });
  }, [selectedModelId, initialized, loading, processing, error, recognitionResult, statusMessage, selectedAudio]);

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

  // Handle deep-link params: ?model=<id>&autoInit=true&audioId=<id>&t=<timestamp>
  // Force-release and switch model without the Switch Model alert.
  // Pass a fresh t=Date.now() each call to re-trigger even for the same model.
  useEffect(() => {
    if (!params.model || !params.t) return;
    // Release native ASR, reset state, select model
    ASR.release().catch(() => {}).finally(() => {
      setInitialized(false);
      setRecognitionResult(null);
      setSelectedModelId(params.model!);
    });
  }, [params.t]); // only re-run when t changes (fresh navigation)

  useEffect(() => {
    // autoInit: fire once per t value, after selectedModelId is confirmed and not loading
    if (params.autoInit !== 'true' || !params.model || !params.t) return;
    if (autoInitFiredRef.current === params.t) return;
    if (loading) return;
    // Wait until selectedModelId matches the requested model (deep-link effect may be async)
    if (selectedModelId !== params.model) return;
    autoInitFiredRef.current = params.t;
    handleInitAsr();
  }, [params.t, params.autoInit, params.model, loading, selectedModelId]);

  useEffect(() => {
    if (params.audioId && loadedAudioFiles.length > 0) {
      const audio = loadedAudioFiles.find(a => a.id === params.audioId);
      if (audio) handleSelectAudio(audio);
    }
  }, [params.audioId, params.t, loadedAudioFiles]);

  // ASR cleanup - only on unmount
  const initializedRef = useRef(false);
  useEffect(() => {
    initializedRef.current = initialized;
  }, [initialized]);
  useEffect(() => {
    return () => {
      if (initializedRef.current) {
        console.log('[ASR] Cleaning up ASR resources');
        ASR.release().catch((err: Error) =>
          console.error('[ASR] Error releasing ASR resources:', err)
        );
      }
    };
  }, []); // empty deps = only on unmount

  // Sound cleanup - runs when sound changes
  useEffect(() => {
    return () => {
      if (sound) {
        sound.remove();
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

      // Create a new audio player
      const newPlayer = createAudioPlayer({ uri: audioItem.localUri });
      newPlayer.play();

      setSound(newPlayer);
      setIsPlaying(true);
      setSelectedAudio(audioItem);

      // Set up listener for playback status
      newPlayer.addListener('playbackStatusUpdate', (status) => {
        if ('playing' in status && !status.playing) {
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
        sound.pause();
        sound.remove();
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
    setRecognitionResult(null);
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
        const tempPlayer = createAudioPlayer({ uri });
        // Wait briefly for player to load
        await new Promise(resolve => setTimeout(resolve, 500));
        duration = tempPlayer.duration ?? 0;

        // Clean up temp player
        tempPlayer.remove();
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
      <ResultsBox>
        <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.onSurface }}>Audio Information:</Text>
        {size !== undefined && <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Size: {formatBytes(size)}</Text>}
        {duration !== undefined && <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>Duration: {formatDuration(duration)}</Text>}
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Sample Rate: 16000 Hz (optimized for ASR)</Text>
      </ResultsBox>
    );
  };

  // Release ASR resources
  const handleReleaseAsr = async () => {
    try {
      // const result = await ASR.release();
      await ASR.release();

      setInitialized(false);
      setRecognitionResult(null);
    } catch (err) {
      setError(`Error releasing ASR resources: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate a visualization of the model's predefined config
  const predefinedConfigDisplay = selectedModelId && asrConfig ? (
    <Section title="Predefined Model Configuration">
      <Text variant="bodySmall" selectable style={{
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        backgroundColor: theme.colors.surfaceVariant,
        padding: 10,
        borderRadius: theme.roundness,
        color: theme.colors.onSurface,
      }}>
        {JSON.stringify(asrConfig, null, 2)}
      </Text>
    </Section>
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
    <PageContainer>
      {/* Loading overlay */}
      <LoadingOverlay
        visible={loading}
        message={processing ? 'Processing audio...' : 'Initializing ASR...'}
        subMessage={statusMessage}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text variant="headlineSmall">Automatic Speech Recognition</Text>
        <ThemedButton
          label="Live ASR"
          variant="success"
          compact
          onPress={() => router.push('/live-asr')}
        />
      </View>

      {/* Error and status messages */}
      <StatusBlock error={error} />

      {/* Model Selection */}
      <Section title="1. Select ASR Model">
        {initialized && (
          <Text variant="bodySmall" style={{ color: theme.colors.warning ?? '#FF9800', marginBottom: 8, textAlign: 'center', fontStyle: 'italic' }}>
            Switching models will release the currently initialized model
          </Text>
        )}
        <View style={{ marginBottom: theme.margin.m }}>
          {downloadedModels.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: theme.padding.m }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>No ASR models downloaded.</Text>
              <ThemedButton
                testID="download-models-inline-btn"
                label="Download a model"
                variant="primary"
                onPress={() => router.push('/(tabs)/models?type=asr')}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : (
            <>
              {downloadedModels.map((model) => {
                const isSelected = selectedModelId === model.metadata.id;
                const badge = getModelBadge(model.metadata.id);
                return (
                  <TouchableOpacity
                    key={model.metadata.id}
                    testID={`model-option-${model.metadata.id}`}
                    style={{
                      padding: 12,
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                      borderRadius: theme.roundness * 2,
                      marginBottom: 8,
                      ...Platform.select({
                        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
                        android: { elevation: 2 },
                      }),
                    }}
                    onPress={async () => {
                      if (initialized) {
                        await handleReleaseAsr();
                      }
                      setSelectedModelId(model.metadata.id);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text variant="bodyLarge" style={{
                        color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface,
                        flex: 1,
                      }}>
                        {model.metadata.name}
                      </Text>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : badge.color + '22',
                      }}>
                        <Text variant="labelSmall" style={{
                          color: isSelected ? '#fff' : badge.color,
                          fontWeight: '600',
                        }}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={() => router.push('/(tabs)/models?type=asr')} style={{ marginTop: 8, alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>Download more models →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Section>

      {/* Show the predefined configuration after model selection */}
      {predefinedConfigDisplay}

      {/* ASR Configuration */}
      <Section title="2. ASR Configuration">
        {selectedModelId && asrConfig && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, fontStyle: 'italic' }}>
            Options pre-configured for this model. Adjust threads for performance.
          </Text>
        )}

        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Number of Threads:</Text>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
              {[1, 2, 4, 8].map(num => (
                <TouchableOpacity
                  key={num}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: numThreads === num ? theme.colors.primary : theme.colors.surfaceVariant,
                    borderRadius: theme.roundness,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => setNumThreads(num)}
                >
                  <Text variant="labelMedium" style={{
                    color: numThreads === num ? theme.colors.onPrimary : theme.colors.onSurface,
                  }}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginTop: -8, marginBottom: 4 }}>More threads = faster on multi-core CPUs. Diminishing returns above 4.</Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Decoding Method:</Text>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: decodingMethod === 'greedy_search' ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderRadius: theme.roundness,
                  marginRight: 8,
                  marginBottom: 8,
                }}
                onPress={() => setDecodingMethod('greedy_search')}
              >
                <Text variant="labelMedium" style={{
                  color: decodingMethod === 'greedy_search' ? theme.colors.onPrimary : theme.colors.onSurface,
                }}>Greedy Search</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: decodingMethod === 'beam_search' ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderRadius: theme.roundness,
                  marginRight: 8,
                  marginBottom: 8,
                }}
                onPress={() => setDecodingMethod('beam_search')}
              >
                <Text variant="labelMedium" style={{
                  color: decodingMethod === 'beam_search' ? theme.colors.onPrimary : theme.colors.onSurface,
                }}>Beam Search</Text>
              </TouchableOpacity>
            </View>
          </View>
          {asrConfig && GREEDY_ONLY_TYPES.includes(asrConfig.modelType || '') && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>This model type only supports greedy search</Text>
          )}
          {asrConfig && BEAM_SEARCH_TYPES.includes(asrConfig.modelType || '') && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>Beam search gives better accuracy at the cost of speed</Text>
          )}
        </View>

        <View style={[{ marginBottom: 12 }, decodingMethod !== 'beam_search' && { opacity: 0.5 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Max Active Paths:</Text>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
              {[4, 8, 16, 32].map(paths => (
                <TouchableOpacity
                  key={paths}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: maxActivePaths === paths ? theme.colors.primary : theme.colors.surfaceVariant,
                    borderRadius: theme.roundness,
                    marginRight: 8,
                    marginBottom: 8,
                    opacity: decodingMethod !== 'beam_search' ? 0.6 : 1,
                  }}
                  onPress={() => decodingMethod === 'beam_search' && setMaxActivePaths(paths)}
                >
                  <Text variant="labelMedium" style={{
                    color: maxActivePaths === paths && decodingMethod === 'beam_search' ? theme.colors.onPrimary : theme.colors.onSurface,
                  }}>{paths}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {decodingMethod === 'beam_search' ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>Higher values = more accurate but slower</Text>
          ) : (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>Only active when Beam Search is selected</Text>
          )}
        </View>

        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Streaming Mode:</Text>
            <Switch
              value={isStreaming}
              onValueChange={setIsStreaming}
              disabled={!!asrConfig}
            />
          </View>
          {asrConfig && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>Determined by model architecture</Text>
          )}
        </View>

        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Provider:</Text>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 8,
                  backgroundColor: provider === 'cpu' ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderRadius: theme.roundness,
                  marginHorizontal: 4,
                  alignItems: 'center',
                }}
                onPress={() => setProvider('cpu')}
              >
                <Text variant="labelMedium" style={{
                  color: provider === 'cpu' ? theme.colors.onPrimary : theme.colors.onSurface,
                }}>CPU</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 8,
                  backgroundColor: provider === 'gpu' ? theme.colors.primary : theme.colors.surfaceVariant,
                  borderRadius: theme.roundness,
                  marginHorizontal: 4,
                  alignItems: 'center',
                }}
                onPress={() => setProvider('gpu')}
              >
                <Text variant="labelMedium" style={{
                  color: provider === 'gpu' ? theme.colors.onPrimary : theme.colors.onSurface,
                }}>GPU</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
            {asrConfig && GREEDY_ONLY_TYPES.includes(asrConfig.modelType || '')
              ? 'GPU recommended for whisper-family models. Falls back to CPU if unavailable.'
              : 'GPU acceleration requires compatible hardware. Falls back to CPU if unavailable.'}
          </Text>
        </View>

        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Debug Mode:</Text>
            <Switch
              value={debugMode}
              onValueChange={setDebugMode}
            />
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>Prints model config and architecture to logcat on init only. No effect on recognition results.</Text>
        </View>
      </Section>

      {/* ASR Controls */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: theme.padding.m, marginBottom: theme.margin.m }}>
        <ThemedButton
          testID="btn-init-asr"
          label="Initialize ASR"
          variant="primary"
          onPress={handleInitAsr}
          disabled={loading || !selectedModelId}
          style={{ flex: 1, marginHorizontal: 8 }}
        />
        <ThemedButton
          testID="btn-release-asr"
          label="Release ASR"
          variant="secondary"
          onPress={handleReleaseAsr}
          disabled={loading || !initialized}
          style={{ flex: 1, marginHorizontal: 8 }}
        />
      </View>

      {/* Audio selection section */}
      {initialized && (
        <Section title="3. Select Audio Sample">
          <FlatList
            data={loadedAudioFiles}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`audio-option-${item.id}`}
                style={{
                  padding: 12,
                  marginRight: 12,
                  borderRadius: theme.roundness * 2,
                  borderWidth: 1,
                  borderColor: selectedAudio?.id === item.id ? theme.colors.primary : theme.colors.outlineVariant,
                  backgroundColor: selectedAudio?.id === item.id ? theme.colors.primaryContainer : 'transparent',
                  minWidth: 120,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => handleSelectAudio(item)}
              >
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: '500',
                    color: selectedAudio?.id === item.id ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                    textAlign: 'center',
                  }}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />

          {selectedAudio && (
            <ResultsBox>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                Size: {formatBytes(audioMetadata.size || 0)}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                Duration: {formatDuration(audioMetadata.duration || 0)}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                <ThemedButton
                  label={isPlaying ? 'Playing...' : 'Play Audio'}
                  variant="primary"
                  onPress={() => handlePlayAudio(selectedAudio)}
                  disabled={isPlaying}
                />
              </View>
            </ResultsBox>
          )}
        </Section>
      )}

      {/* Recognition section */}
      {initialized && selectedAudio && (
        <Section title="4. Recognize Speech">
          <ThemedButton
            testID="btn-recognize"
            label="Recognize Speech"
            variant="success"
            onPress={handleRecognizeFromFile}
            disabled={processing}
          />

          {recognitionResult !== null && (
            <View style={{
              marginTop: theme.margin.m,
              padding: 12,
              backgroundColor: theme.colors.primaryContainer ?? '#f0f7ff',
              borderRadius: theme.roundness * 2,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.primary,
            }}>
              <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.primary }}>Recognized Text:</Text>
              <View style={{
                backgroundColor: theme.colors.surface,
                padding: 12,
                borderRadius: theme.roundness,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
              }}>
                <Text testID="text-recognition-result" variant="bodyLarge" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
                  {recognitionResult === '' ? '(no speech detected)' : recognitionResult}
                </Text>
              </View>
            </View>
          )}
        </Section>
      )}

      {/* Audio Information Section */}
      {selectedAudio && renderAudioInfo()}
    </PageContainer>
  );
}
