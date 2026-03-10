import { ASR, AsrModelConfig } from '@siteed/sherpa-onnx.rn';
import { useAudioRecorder, convertPCMToFloat32, ExpoAudioStreamModule, type AudioDataEvent } from '@siteed/expo-audio-studio';
import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsrModels, useAsrModelWithConfig } from './useModelWithConfig';
import { useLiveAsr } from './useLiveAsr';
import { setAgenticPageState } from '../agentic-bridge';
import { stopAllAudio } from '../components/AudioPlayButton';

export type AsrMode = 'file' | 'live';

export const GREEDY_ONLY_TYPES = ['whisper', 'paraformer', 'tdnn', 'sense_voice', 'moonshine', 'fire_red_asr'];

export const SAMPLE_AUDIO_FILES = [
  { id: '1', name: 'JFK Speech Extract', module: require('@assets/audio/jfk.wav') },
  { id: '2', name: 'Random English Voice', module: require('@assets/audio/en.wav') },
];

export type LoadedAudioFile = {
  id: string;
  name: string;
  module: number;
  localUri: string;
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function useAsr() {
  const params = useLocalSearchParams<{
    model?: string;
    autoInit?: string;
    audioId?: string;
    mode?: string;
    autoTest?: string;
    t?: string;
  }>();

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
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<LoadedAudioFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<LoadedAudioFile | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<{ size?: number; duration?: number; isLoading: boolean }>({ isLoading: false });
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

  // Auto-select first downloaded model when none is selected
  useEffect(() => {
    if (visibleModels.length > 0 && !selectedModelId) {
      setSelectedModelId(visibleModels[0].metadata.id);
    }
  }, [visibleModels, selectedModelId]);

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

  const handleInitAsr = async (configOverride?: Partial<AsrModelConfig>) => {
    if (!selectedModelId) { setError('Please select a model first'); return; }
    if (!asrConfig || !localPath || !isDownloaded) {
      setError('Model not downloaded or missing configuration.');
      return;
    }

    if (initialized) {
      await ASR.release().catch(() => {});
      setInitialized(false);
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Initializing...');

    // Use configOverride values (from auto-init with model defaults) or fall back to user-set state
    const effectiveNumThreads = configOverride?.numThreads ?? numThreads;
    const effectiveDecodingMethod = (configOverride?.decodingMethod ?? decodingMethod) as 'greedy_search' | 'beam_search';
    const effectiveMaxActivePaths = configOverride?.maxActivePaths ?? maxActivePaths;
    const effectiveDebugMode = configOverride?.debug ?? debugMode;
    const effectiveProvider = (configOverride?.provider ?? provider) as 'cpu' | 'gpu';

    try {
      const modelDir = await resolveModelDir(localPath);
      setStatusMessage(`Model dir: ${modelDir.split('/').pop()}`);

      const config: AsrModelConfig = {
        modelDir,
        modelType: asrConfig.modelType || 'transducer',
        numThreads: mode === 'live' ? (asrConfig.numThreads ?? 2) : effectiveNumThreads,
        decodingMethod: mode === 'live' ? 'greedy_search' : effectiveDecodingMethod,
        maxActivePaths: mode === 'live' ? 4 : effectiveMaxActivePaths,
        streaming: mode === 'live' ? true : (asrConfig.streaming ?? false),
        debug: effectiveDebugMode,
        provider: effectiveProvider,
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

  const handleSelectAudio = async (audioItem: LoadedAudioFile) => {
    setSelectedAudio(audioItem);
    setAudioMetadata({ isLoading: true });
    try {
      const info = await FileSystem.getInfoAsync(audioItem.localUri);
      let duration = 0;
      try {
        const tempPlayer = createAudioPlayer({ uri: audioItem.localUri });
        await new Promise(r => setTimeout(r, 500));
        duration = (tempPlayer.duration ?? 0) * 1000;
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
    stopAllAudio();
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

  const handleSetMode = (newMode: AsrMode) => {
    if (newMode === 'live' && selectedModelId && !selectedModelId.startsWith('streaming-')) {
      handleReleaseAsr().then(() => setSelectedModelId(null));
    }
    setMode(newMode);
  };

  const handleModelSelect = async (modelId: string) => {
    if (initialized) await handleReleaseAsr();
    setSelectedModelId(modelId);
  };

  // No auto-init: user selects model, adjusts config, then manually clicks Initialize.

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
      numThreads,
      decodingMethod,
      debugMode,
      provider,
    });
  }, [mode, selectedModelId, initialized, loading, processing, error, recognitionResult, statusMessage, selectedAudio, recorder.isRecording, liveAsr.committedText, liveAsr.interimText, numThreads, decodingMethod, debugMode, provider]);

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

  // Load sample audio files
  useEffect(() => {
    (async () => {
      const files: LoadedAudioFile[] = [];
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

  return {
    // State
    mode,
    selectedModelId,
    initialized,
    loading,
    error,
    statusMessage,
    processing,
    recognitionResult,
    loadedAudioFiles,
    selectedAudio,
    audioMetadata,
    numThreads,
    decodingMethod,
    maxActivePaths,
    debugMode,
    provider,
    fileProcessing,
    statusLog,
    // Derived
    downloadedModels,
    visibleModels,
    streamingModels,
    asrConfig,
    recorder,
    liveAsr,
    // Setters
    setNumThreads,
    setDecodingMethod,
    setMaxActivePaths,
    setDebugMode,
    setProvider,
    // Handlers
    handleInitAsr,
    handleReleaseAsr,
    handleModelSelect,
    handleSetMode,
    handleSelectAudio,
    handleRecognizeFromFile,
    handleStartMic,
    handleStopMic,
    handleDemoStreaming,
  };
}
