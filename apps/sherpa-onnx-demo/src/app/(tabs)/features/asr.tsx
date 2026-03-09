import { ASR, AsrModelConfig } from '@siteed/sherpa-onnx.rn';
import { useAudioRecorder, convertPCMToFloat32, ExpoAudioStreamModule, type AudioDataEvent } from '@siteed/expo-audio-studio';
import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAsrModels, useAsrModelWithConfig } from '../../../hooks/useModelWithConfig';
import { useLiveAsr } from '../../../hooks/useLiveAsr';
import { formatDuration, formatBytes } from '../../../utils/formatters';
import { setAgenticPageState } from '../../../agentic-bridge';
import {
  LoadingOverlay,
  PageContainer,
  ResultsBox,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  useTheme,
} from '../../../components/ui';

type AsrMode = 'file' | 'live';

const GREEDY_ONLY_TYPES = ['whisper', 'paraformer', 'tdnn', 'sense_voice', 'moonshine', 'fire_red_asr'];

function getModelBadge(modelId: string): { label: string; color: string } {
  if (modelId.startsWith('streaming-')) return { label: 'Streaming', color: '#4CAF50' };
  return { label: 'Offline', color: '#9C27B0' };
}

const SAMPLE_AUDIO_FILES = [
  { id: '1', name: 'JFK Speech Extract', module: require('@assets/audio/jfk.wav') },
  { id: '2', name: 'Random English Voice', module: require('@assets/audio/en.wav') },
];

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function AsrScreen() {
  // Deep-link params: ?model=<id>&autoInit=true&audioId=<id>&mode=file|live&autoTest=jfk&t=<timestamp>
  const params = useLocalSearchParams<{
    model?: string;
    autoInit?: string;
    audioId?: string;
    mode?: string;
    autoTest?: string;
    t?: string;
  }>();
  const theme = useTheme();
  const router = useRouter();

  const [mode, setMode] = useState<AsrMode>((params.mode as AsrMode) ?? 'file');

  // Shared state
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // File mode state
  const [processing, setProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<string | null>(null);
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<{
    id: string; name: string; module: number; localUri: string;
  }[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<typeof loadedAudioFiles[0] | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<{ size?: number; duration?: number; isLoading: boolean }>({ isLoading: false });
  const [sound, setSound] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [numThreads, setNumThreads] = useState(2);
  const [decodingMethod, setDecodingMethod] = useState<'greedy_search' | 'beam_search'>('greedy_search');
  const [maxActivePaths, setMaxActivePaths] = useState(4);
  const [debugMode, setDebugMode] = useState(false);
  const [provider, setProvider] = useState<'cpu' | 'gpu'>('cpu');

  // Live mode state
  const [fileProcessing, setFileProcessing] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const liveAsr = useLiveAsr();
  const recorder = useAudioRecorder();
  const streamCreatedRef = useRef(false);

  const autoInitFiredRef = useRef<string | null>(null);
  const autoTestFiredRef = useRef<string | null>(null);

  const { downloadedModels } = useAsrModels();
  const { asrConfig, localPath, isDownloaded } = useAsrModelWithConfig({ modelId: selectedModelId });

  const streamingModels = useMemo(
    () => downloadedModels.filter(m => m.metadata.id.startsWith('streaming-')),
    [downloadedModels]
  );

  const visibleModels = mode === 'live' ? streamingModels : downloadedModels;

  const addLog = useCallback((msg: string) => {
    setStatusLog(prev => [...prev.slice(-19), msg]);
  }, []);

  // Agentic page state
  useEffect(() => {
    setAgenticPageState({
      mode,
      selectedModelId,
      initialized,
      loading,
      processing,
      error,
      recognitionResult,
      statusMessage,
      selectedAudio: selectedAudio?.name ?? null,
      isRecording: recorder.isRecording,
      committedText: liveAsr.committedText,
      interimText: liveAsr.interimText,
    });
  }, [mode, selectedModelId, initialized, loading, processing, error, recognitionResult, statusMessage, selectedAudio, recorder.isRecording, liveAsr.committedText, liveAsr.interimText]);

  // Sync config defaults when model changes
  useEffect(() => {
    if (asrConfig) {
      setNumThreads(asrConfig.numThreads ?? 2);
      setDecodingMethod(asrConfig.decodingMethod as 'greedy_search' | 'beam_search' ?? 'greedy_search');
      setMaxActivePaths(asrConfig.maxActivePaths ?? 4);
      setDebugMode(asrConfig.debug ?? false);
      setProvider(asrConfig.provider as 'cpu' | 'gpu' ?? 'cpu');
    }
  }, [selectedModelId, asrConfig]);

  // Deep-link: select model
  useEffect(() => {
    if (!params.model || !params.t) return;
    ASR.release().catch(() => {}).finally(() => {
      setInitialized(false);
      setRecognitionResult(null);
      setSelectedModelId(params.model!);
      if (params.mode) setMode(params.mode as AsrMode);
    });
  }, [params.t]);

  // Deep-link: auto-init
  useEffect(() => {
    if (params.autoInit !== 'true' || !params.model || !params.t) return;
    if (autoInitFiredRef.current === params.t) return;
    if (loading) return;
    if (selectedModelId !== params.model) return;
    autoInitFiredRef.current = params.t;
    handleInitAsr();
  }, [params.t, params.autoInit, params.model, loading, selectedModelId]);

  // Deep-link: auto-select audio
  useEffect(() => {
    if (params.audioId && loadedAudioFiles.length > 0) {
      const audio = loadedAudioFiles.find(a => a.id === params.audioId);
      if (audio) handleSelectAudio(audio);
    }
  }, [params.audioId, params.t, loadedAudioFiles]);

  // Deep-link: auto-test (live mode)
  useEffect(() => {
    if (!params.autoTest || !params.t || !initialized) return;
    if (autoTestFiredRef.current === params.t) return;
    if (fileProcessing) return;
    autoTestFiredRef.current = params.t;
    const audioFile = SAMPLE_AUDIO_FILES.find(
      a => a.name.toLowerCase().includes(params.autoTest!.toLowerCase()) || a.id === params.autoTest
    );
    if (audioFile) handleDemoStreaming(audioFile.module);
  }, [params.t, params.autoTest, initialized, fileProcessing]);

  // Cleanup on unmount
  const initializedRef = useRef(false);
  useEffect(() => { initializedRef.current = initialized; }, [initialized]);
  useEffect(() => {
    return () => {
      if (initializedRef.current) ASR.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    return () => { if (sound) sound.remove(); };
  }, [sound]);

  // Load sample audio files
  useEffect(() => {
    (async () => {
      const files = [];
      for (const s of SAMPLE_AUDIO_FILES) {
        try {
          const asset = Asset.fromModule(s.module);
          await asset.downloadAsync();
          if (asset.localUri) files.push({ ...s, localUri: asset.localUri });
        } catch (e) {
          console.error('[ASR] Error loading audio asset:', e);
        }
      }
      setLoadedAudioFiles(files);
    })();
  }, []);

  // Resolve the model directory (handles sherpa-onnx subdirectory layout)
  const resolveModelDir = async (rawPath: string): Promise<string> => {
    let cleanPath = rawPath.replace(/^file:\/\//, '');
    try {
      const dirContents = await FileSystem.readDirectoryAsync(rawPath);
      const sherpaDir = dirContents.find(item => item.includes('sherpa-onnx'));
      if (sherpaDir) {
        const subPath = `${rawPath}/${sherpaDir}`;
        const subInfo = await FileSystem.getInfoAsync(subPath);
        if (subInfo.exists && subInfo.isDirectory) {
          const subContents = await FileSystem.readDirectoryAsync(subPath);
          if (subContents.some(f => f.endsWith('.onnx') || f === 'tokens.txt')) {
            cleanPath = cleanPath + '/' + sherpaDir;
          }
        }
      }
    } catch (_) { /* use original path */ }
    return cleanPath;
  };

  const handleInitAsr = async () => {
    if (!selectedModelId) { setError('Please select a model first'); return; }
    if (!asrConfig || !localPath || !isDownloaded) {
      setError('Model not downloaded or missing configuration.');
      return;
    }

    setLoading(true);
    setError(null);
    setInitialized(false);
    setStatusMessage('Initializing...');

    try {
      const modelDir = await resolveModelDir(localPath);
      setStatusMessage(`Model dir: ${modelDir.split('/').pop()}`);

      const config: AsrModelConfig = {
        modelDir,
        modelType: asrConfig.modelType || 'transducer',
        numThreads: mode === 'live' ? (asrConfig.numThreads ?? 2) : numThreads,
        decodingMethod: mode === 'live' ? 'greedy_search' : decodingMethod,
        maxActivePaths: mode === 'live' ? 4 : maxActivePaths,
        streaming: mode === 'live' ? true : (asrConfig.streaming ?? false),
        debug: debugMode,
        provider,
        modelFiles: asrConfig.modelFiles || {
          encoder: '*encoder*.onnx',
          decoder: '*decoder*.onnx',
          tokens: '*tokens*.txt',
        },
      };

      setStatusMessage('Calling ASR.initialize()...');
      const result = await ASR.initialize(config);

      if (result.success) {
        setInitialized(true);
        setStatusMessage('');
        if (mode === 'live') addLog(`Initialized: ${result.modelType} @ ${result.sampleRate}Hz`);
      } else {
        setError(`Failed to initialize: ${result.error}`);
      }
    } catch (e) {
      setError(`Initialization error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleReleaseAsr = async () => {
    if (recorder.isRecording) await recorder.stopRecording();
    liveAsr.stop();
    streamCreatedRef.current = false;
    await ASR.release().catch(() => {});
    setInitialized(false);
    setRecognitionResult(null);
    if (mode === 'live') addLog('Released ASR');
  };

  // --- File mode handlers ---

  const handlePlayAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    if (isPlaying) { await handleStopAudio(); return; }
    try {
      const player = createAudioPlayer({ uri: audioItem.localUri });
      player.play();
      setSound(player);
      setIsPlaying(true);
      setSelectedAudio(audioItem);
      player.addListener('playbackStatusUpdate', (status) => {
        if ('playing' in status && !status.playing) { setIsPlaying(false); setSound(null); }
      });
    } catch (e) {
      setError(`Failed to play audio: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const handleStopAudio = async () => {
    if (sound) {
      sound.pause();
      sound.remove();
      setSound(null);
      setIsPlaying(false);
    }
  };

  const handleSelectAudio = async (audioItem: typeof loadedAudioFiles[0]) => {
    setSelectedAudio(audioItem);
    setAudioMetadata({ isLoading: true });
    try {
      const info = await FileSystem.getInfoAsync(audioItem.localUri);
      let duration = 0;
      try {
        const tempPlayer = createAudioPlayer({ uri: audioItem.localUri });
        await new Promise(r => setTimeout(r, 500));
        duration = tempPlayer.duration ?? 0;
        tempPlayer.remove();
      } catch (_) {}
      setAudioMetadata({ size: info.exists ? info.size : 0, duration, isLoading: false });
    } catch (_) {
      setAudioMetadata({ isLoading: false });
    }
  };

  const handleRecognizeFromFile = async () => {
    if (!selectedAudio || !initialized) {
      setError('Select an audio file and initialize ASR first');
      return;
    }
    if (isPlaying) await handleStopAudio();

    setProcessing(true);
    setRecognitionResult(null);
    setError(null);
    try {
      const uri = selectedAudio.localUri.startsWith('file://')
        ? selectedAudio.localUri
        : `file://${selectedAudio.localUri}`;
      const result = await ASR.recognizeFromFile(uri);
      if (result.success) {
        setRecognitionResult(result.text || '');
      } else {
        throw new Error(result.error || 'Recognition failed');
      }
    } catch (e) {
      setError(`Recognition failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setProcessing(false);
    }
  };

  // --- Live mode handlers ---

  const handleStartMic = useCallback(async () => {
    if (!initialized) { setError('Initialize ASR first'); return; }
    setError(null);
    liveAsr.clear();
    try {
      const permResult = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (permResult.status !== 'granted') {
        setError('Microphone permission denied');
        return;
      }
      await ASR.createOnlineStream();
      streamCreatedRef.current = true;
      liveAsr.start();
      addLog('Recording at 16kHz...');
      await recorder.startRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm_16bit',
        interval: 100,
        onAudioStream: async (event: AudioDataEvent) => {
          if (!streamCreatedRef.current) return;
          try {
            const buffer = base64ToArrayBuffer(event.data as string);
            const { pcmValues } = await convertPCMToFloat32({ buffer, bitDepth: 16, skipWavHeader: true });
            const samples = Array.from(pcmValues);
            if (samples.length > 0) liveAsr.feedAudio(samples, 16000);
          } catch (e) {
            console.warn('[ASR] Audio chunk error:', e);
          }
        },
      });
      addLog('Listening...');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      streamCreatedRef.current = false;
    }
  }, [initialized, liveAsr, recorder, addLog]);

  const handleStopMic = useCallback(async () => {
    try {
      await recorder.stopRecording();
      liveAsr.stop();
      streamCreatedRef.current = false;
      const { text } = await ASR.getResult();
      if (text) addLog(`Final: "${text}"`);
      addLog('Stopped.');
    } catch (e) {
      addLog(`Stop error: ${e}`);
    }
  }, [recorder, liveAsr, addLog]);

  const handleDemoStreaming = useCallback(async (audioModule: number) => {
    if (!initialized) { setError('Initialize ASR first'); return; }
    setFileProcessing(true);
    setError(null);
    liveAsr.clear();
    try {
      const asset = Asset.fromModule(audioModule);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error('Failed to load audio asset');
      addLog('Creating online stream...');
      await ASR.createOnlineStream();
      const result = await ASR.recognizeFromFile(asset.localUri);
      if (result.success && result.text) {
        addLog(`Result: "${result.text}"`);
      } else {
        addLog('No text recognized');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFileProcessing(false);
    }
  }, [initialized, liveAsr, addLog]);

  // Mode switch: release if needed when switching to live with offline model
  const handleSetMode = (newMode: AsrMode) => {
    if (newMode === 'live' && selectedModelId && !selectedModelId.startsWith('streaming-')) {
      handleReleaseAsr().then(() => setSelectedModelId(null));
    }
    setMode(newMode);
  };

  // --- Render ---

  const modeTabStyle = (tabMode: AsrMode) => ({
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center' as const,
    backgroundColor: mode === tabMode ? theme.colors.primary : theme.colors.surfaceVariant,
    borderRadius: theme.roundness,
  });

  return (
    <PageContainer>
      <LoadingOverlay
        visible={loading}
        message="Initializing ASR..."
        subMessage={statusMessage}
      />

      {/* Mode Toggle */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.margin.m }}>
        <TouchableOpacity style={modeTabStyle('file')} onPress={() => handleSetMode('file')}>
          <Text variant="labelLarge" style={{ color: mode === 'file' ? theme.colors.onPrimary : theme.colors.onSurface }}>
            File
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={modeTabStyle('live')} onPress={() => handleSetMode('live')}>
          <Text variant="labelLarge" style={{ color: mode === 'live' ? theme.colors.onPrimary : theme.colors.onSurface }}>
            Live Mic
          </Text>
        </TouchableOpacity>
      </View>

      <StatusBlock error={error} />

      {/* Model Selection */}
      <Section title="Select ASR Model">
        {initialized && (
          <Text variant="bodySmall" style={{ color: theme.colors.warning ?? '#FF9800', marginBottom: 8, fontStyle: 'italic' }}>
            Switching models will release the current one
          </Text>
        )}
        {visibleModels.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: theme.padding.m }}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 8 }}>
              {mode === 'live' ? 'No streaming ASR models downloaded.' : 'No ASR models downloaded.'}
            </Text>
            <ThemedButton
              label="Download a model"
              variant="primary"
              onPress={() => router.push('/(tabs)/models?type=asr')}
            />
          </View>
        ) : (
          <>
            {visibleModels.map((model) => {
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
                    if (initialized) await handleReleaseAsr();
                    setSelectedModelId(model.metadata.id);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text variant="bodyLarge" style={{ flex: 1, color: isSelected ? theme.colors.onPrimary : theme.colors.onSurface }}>
                      {model.metadata.name}
                    </Text>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : badge.color + '22',
                    }}>
                      <Text variant="labelSmall" style={{ color: isSelected ? '#fff' : badge.color, fontWeight: '600' }}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => router.push('/(tabs)/models?type=asr')} style={{ marginTop: 4, alignItems: 'center' }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>Download more models →</Text>
            </TouchableOpacity>
          </>
        )}
      </Section>

      {/* Config — file mode only */}
      {mode === 'file' && selectedModelId && asrConfig && (
        <Section title="Configuration">
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Threads:</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 2, 4, 8].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6,
                      backgroundColor: numThreads === n ? theme.colors.primary : theme.colors.surfaceVariant,
                      borderRadius: theme.roundness,
                    }}
                    onPress={() => setNumThreads(n)}
                  >
                    <Text variant="labelMedium" style={{ color: numThreads === n ? theme.colors.onPrimary : theme.colors.onSurface }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Decoding:</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['greedy_search', 'beam_search'] as const).map(method => (
                  <TouchableOpacity
                    key={method}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 6,
                      backgroundColor: decodingMethod === method ? theme.colors.primary : theme.colors.surfaceVariant,
                      borderRadius: theme.roundness,
                      opacity: GREEDY_ONLY_TYPES.includes(asrConfig.modelType || '') && method === 'beam_search' ? 0.4 : 1,
                    }}
                    onPress={() => {
                      if (GREEDY_ONLY_TYPES.includes(asrConfig.modelType || '') && method === 'beam_search') return;
                      setDecodingMethod(method);
                    }}
                  >
                    <Text variant="labelMedium" style={{ color: decodingMethod === method ? theme.colors.onPrimary : theme.colors.onSurface }}>
                      {method === 'greedy_search' ? 'Greedy' : 'Beam'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Debug:</Text>
            <Switch value={debugMode} onValueChange={setDebugMode} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Provider:</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['cpu', 'gpu'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 6,
                    backgroundColor: provider === p ? theme.colors.primary : theme.colors.surfaceVariant,
                    borderRadius: theme.roundness,
                  }}
                  onPress={() => setProvider(p)}
                >
                  <Text variant="labelMedium" style={{ color: provider === p ? theme.colors.onPrimary : theme.colors.onSurface }}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Section>
      )}

      {/* Init / Release */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.margin.m }}>
        <ThemedButton
          testID="btn-init-asr"
          label="Initialize"
          variant="primary"
          onPress={handleInitAsr}
          disabled={loading || !selectedModelId}
          loading={loading}
          style={{ flex: 1 }}
        />
        <ThemedButton
          testID="btn-release-asr"
          label="Release"
          variant="secondary"
          onPress={handleReleaseAsr}
          disabled={!initialized}
          style={{ flex: 1 }}
        />
      </View>

      {/* === FILE MODE === */}
      {mode === 'file' && initialized && (
        <>
          <Section title="Select Audio">
            <FlatList
              data={loadedAudioFiles}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`audio-option-${item.id}`}
                  style={{
                    padding: 12, marginRight: 12, borderRadius: theme.roundness * 2,
                    borderWidth: 1,
                    borderColor: selectedAudio?.id === item.id ? theme.colors.primary : theme.colors.outlineVariant,
                    backgroundColor: selectedAudio?.id === item.id ? theme.colors.primaryContainer : 'transparent',
                    minWidth: 130, alignItems: 'center',
                  }}
                  onPress={() => handleSelectAudio(item)}
                >
                  <Text variant="bodyMedium" style={{
                    color: selectedAudio?.id === item.id ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                    fontWeight: '500', textAlign: 'center',
                  }}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {selectedAudio && (
              <ResultsBox>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                  Size: {formatBytes(audioMetadata.size || 0)}
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                  Duration: {formatDuration(audioMetadata.duration || 0)}
                </Text>
                <ThemedButton
                  label={isPlaying ? 'Playing...' : 'Play Audio'}
                  variant="primary"
                  compact
                  onPress={() => handlePlayAudio(selectedAudio)}
                  disabled={isPlaying}
                />
              </ResultsBox>
            )}
          </Section>

          {selectedAudio && (
            <Section title="Recognize Speech">
              <ThemedButton
                testID="btn-recognize"
                label={processing ? 'Processing...' : 'Recognize Speech'}
                variant="success"
                onPress={handleRecognizeFromFile}
                disabled={processing}
              />

              {recognitionResult !== null && (
                <View style={{
                  marginTop: theme.margin.m, padding: 12,
                  backgroundColor: theme.colors.primaryContainer ?? '#f0f7ff',
                  borderRadius: theme.roundness * 2,
                  borderLeftWidth: 4, borderLeftColor: theme.colors.primary,
                }}>
                  <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.primary }}>Result:</Text>
                  <Text testID="text-recognition-result" variant="bodyLarge" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
                    {recognitionResult === '' ? '(no speech detected)' : recognitionResult}
                  </Text>
                </View>
              )}
            </Section>
          )}
        </>
      )}

      {/* === LIVE MODE === */}
      {mode === 'live' && initialized && (
        <>
          <Section title="Microphone">
            {!recorder.isRecording ? (
              <ThemedButton
                label="Start Listening"
                variant="success"
                onPress={handleStartMic}
              />
            ) : (
              <View>
                <ThemedButton
                  label="Stop Listening"
                  variant="warning"
                  onPress={handleStopMic}
                />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Recording: {(recorder.durationMs / 1000).toFixed(1)}s
                </Text>
              </View>
            )}
          </Section>

          {(liveAsr.committedText || liveAsr.interimText) && (
            <Section title="Transcript">
              {liveAsr.committedText ? (
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, lineHeight: 26, marginBottom: 4 }}>
                  {liveAsr.committedText}
                </Text>
              ) : null}
              {liveAsr.interimText ? (
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', lineHeight: 26 }}>
                  {liveAsr.interimText}
                </Text>
              ) : null}
              <ThemedButton
                label="Clear"
                variant="primary"
                compact
                onPress={liveAsr.clear}
                style={{ marginTop: 8, alignSelf: 'flex-start' }}
              />
            </Section>
          )}

          {!recorder.isRecording && (
            <Section title="Test with Sample Audio">
              {SAMPLE_AUDIO_FILES.map(audio => (
                <ThemedButton
                  key={audio.id}
                  label={fileProcessing ? 'Processing...' : `Stream: ${audio.name}`}
                  variant="secondary"
                  onPress={() => handleDemoStreaming(audio.module)}
                  disabled={fileProcessing}
                  style={{ marginBottom: 8 }}
                />
              ))}
            </Section>
          )}
        </>
      )}

      {/* Status Log (live mode) */}
      {mode === 'live' && statusLog.length > 0 && (
        <Section title="Log">
          {statusLog.map((log, i) => (
            <Text
              key={i}
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                lineHeight: 18,
              }}
            >
              {log}
            </Text>
          ))}
        </Section>
      )}
    </PageContainer>
  );
}
