import type { AudioTaggingModelConfig, AudioTaggingResult } from '@siteed/sherpa-onnx.rn';
import { AudioTagging } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useAudioTaggingModels, useAudioTaggingModelWithConfig } from './useModelWithConfig';

const SAMPLE_AUDIO_FILES = [
  { id: '1', name: 'Cat Meow', module: require('@assets/audio/cat-meow.wav') },
  { id: '2', name: 'Dog Bark', module: require('@assets/audio/dog-bark.wav') },
  { id: '3', name: 'Baby Cry', module: require('@assets/audio/baby-cry.wav') },
];

export type AudioTaggingAudioFile = {
  id: string;
  name: string;
  module: number;
  localUri: string;
};

function cleanFilePath(path: string): string {
  if (path.startsWith('file://')) return path.substring(7);
  if (path.startsWith('file:/')) return path.substring(6);
  return path;
}

export function useAudioTagging() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioTaggingResults, setAudioTaggingResults] = useState<AudioTaggingResult | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioTaggingAudioFile | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [needsReinit, setNeedsReinit] = useState(false);
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<AudioTaggingAudioFile[]>([]);
  const [audioMetadata, setAudioMetadata] = useState<{ size?: number; duration?: number; isLoading: boolean }>({ isLoading: false });
  const [topK, setTopK] = useState(5);
  const [numThreads, setNumThreads] = useState(2);
  const [debugMode, setDebugMode] = useState(true);
  const [provider, setProvider] = useState<'cpu' | 'gpu'>('cpu');

  const lastAutoInitRef = useRef<string | null>(null);
  const reinitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initedConfigRef = useRef<{
    modelId: string | null;
    topK: number;
    numThreads: number;
    debugMode: boolean;
    provider: string;
  } | null>(null);

  const { downloadedModels } = useAudioTaggingModels();
  const { audioTaggingConfig, localPath, isDownloaded } = useAudioTaggingModelWithConfig({ modelId: selectedModelId });

  // Reset UI config when model changes
  useEffect(() => {
    if (audioTaggingConfig) {
      setTopK(audioTaggingConfig.topK ?? 5);
      setNumThreads(audioTaggingConfig.numThreads ?? 2);
      setDebugMode(audioTaggingConfig.debug ?? true);
      setProvider(audioTaggingConfig.provider ?? 'cpu');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId]);

  // Auto-select first downloaded model
  useEffect(() => {
    if (downloadedModels.length > 0 && !selectedModelId) {
      setSelectedModelId(downloadedModels[0].metadata.id);
    }
  }, [downloadedModels, selectedModelId]);

  // Auto-init when model is selected and downloaded
  useEffect(() => {
    if (!selectedModelId || !isDownloaded || initialized || loading) return;
    if (lastAutoInitRef.current === selectedModelId) return;
    lastAutoInitRef.current = selectedModelId;
    handleInitAudioTagging();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId, isDownloaded, initialized, loading]);

  // Detect config drift and auto-reinit after a debounce
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
    if (changed) {
      if (reinitTimerRef.current) clearTimeout(reinitTimerRef.current);
      reinitTimerRef.current = setTimeout(() => { handleInitAudioTagging(); }, 1500);
    } else {
      if (reinitTimerRef.current) clearTimeout(reinitTimerRef.current);
    }
    return () => { if (reinitTimerRef.current) clearTimeout(reinitTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, selectedModelId, topK, numThreads, debugMode, provider]);

  // Load audio assets on mount
  useEffect(() => {
    (async () => {
      try {
        const assets = SAMPLE_AUDIO_FILES.map(f => Asset.fromModule(f.module));
        await Promise.all(assets.map(a => a.downloadAsync()));
        setLoadedAudioFiles(SAMPLE_AUDIO_FILES.map((f, i) => ({ ...f, localUri: assets[i].localUri || assets[i].uri || '' })));
      } catch (err) {
        setError(`Failed to load audio assets: ${err instanceof Error ? err.message : String(err)}`);
      }
    })();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (initialized) AudioTagging.release().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModelSelect = useCallback(async (modelId: string) => {
    if (modelId === selectedModelId) return;
    if (initialized) {
      try { await AudioTagging.release(); } catch (_) { /* ignore */ }
      setInitialized(false);
      initedConfigRef.current = null;
      setAudioTaggingResults(null);
    }
    setNeedsReinit(false);
    lastAutoInitRef.current = null;
    setSelectedModelId(modelId);
  }, [initialized, selectedModelId]);

  const handleInitAudioTagging = async () => {
    if (!selectedModelId || !localPath || !isDownloaded) {
      setError('Cannot initialize: no model selected or model not downloaded.');
      return;
    }

    if (initialized) {
      try { await AudioTagging.release(); } catch (_) { /* ignore */ }
      setInitialized(false);
      initedConfigRef.current = null;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Initializing audio tagging...');

    try {
      let cleanLocalPath = cleanFilePath(localPath);

      try {
        const expoPath = localPath.startsWith('file://') ? localPath : `file://${localPath}`;
        const contents = await FileSystem.readDirectoryAsync(expoPath);
        const modelSubdir = contents.find(item =>
          item.includes('sherpa-onnx') &&
          (item.includes('audio-tagging') || item.includes(selectedModelId.replace('ced-', '')))
        );
        if (modelSubdir) cleanLocalPath = `${cleanLocalPath}/${modelSubdir}`;
      } catch (_) { /* use original path */ }

      const config: AudioTaggingModelConfig = {
        modelDir: cleanLocalPath,
        modelType: audioTaggingConfig?.modelType || 'ced',
        modelFile: audioTaggingConfig?.modelFile || 'model.int8.onnx',
        labelsFile: audioTaggingConfig?.labelsFile || 'class_labels_indices.csv',
        numThreads,
        topK,
        debug: debugMode,
        provider,
      };

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
        throw new Error(`Failed to initialize audio tagging engine: ${initError instanceof Error ? initError.message : String(initError)}`);
      }
    } catch (err) {
      setError(`Error initializing audio tagging: ${err instanceof Error ? err.message : String(err)}`);
      Alert.alert('Initialization Failed', `Could not initialize audio tagging: ${err instanceof Error ? err.message : String(err)}`, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAudio = async (audioItem: AudioTaggingAudioFile) => {
    if (!initialized) {
      Alert.alert('Error', 'Please initialize the audio tagging engine first');
      return;
    }

    setProcessing(true);
    setAudioTaggingResults(null);
    setError(null);

    try {
      if (!audioItem.localUri) throw new Error('Audio file not yet loaded');

      try {
        const result = await AudioTagging.processAndCompute({
          filePath: audioItem.localUri,
          topK,
        });

        if (!result.success) throw new Error(result.error || 'Failed to analyze audio');

        setAudioTaggingResults(result as unknown as AudioTaggingResult);
        setStatusMessage(`Detected ${result.events?.length || 0} audio events in ${result.durationMs}ms`);
      } catch (processingError) {
        setError(`Error processing audio data: ${processingError instanceof Error ? processingError.message : String(processingError)}`);
        Alert.alert('Processing Error', 'There was an error analyzing this audio. Try a different audio file or model.', [{ text: 'OK' }]);
      }
    } catch (err) {
      setError(`Error processing audio: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReleaseAudioTagging = async () => {
    if (!initialized) return;
    setLoading(true);
    try { await AudioTagging.release(); } catch (_) { /* ignore */ }
    setInitialized(false);
    setNeedsReinit(false);
    initedConfigRef.current = null;
    setAudioTaggingResults(null);
    setStatusMessage('Audio tagging resources released');
    setLoading(false);
  };

  const handleSelectAudio = async (audioItem: AudioTaggingAudioFile) => {
    if (selectedAudio?.id === audioItem.id) {
      setSelectedAudio(null);
      setAudioMetadata({ isLoading: false });
    } else {
      setSelectedAudio(audioItem);
      setAudioMetadata({ isLoading: true });

      if (audioItem.localUri) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(audioItem.localUri);
          const size = fileInfo.exists ? (fileInfo as any).size || 0 : 0;
          const tempPlayer = createAudioPlayer({ uri: audioItem.localUri });
          await new Promise(r => setTimeout(r, 500));
          const duration = (tempPlayer.duration || 0) * 1000;
          tempPlayer.remove();
          setAudioMetadata({ size, duration, isLoading: false });
        } catch (_) {
          setAudioMetadata({ isLoading: false });
        }
      }
    }
  };

  return {
    // State
    initialized,
    loading,
    processing,
    error,
    statusMessage,
    audioTaggingResults,
    selectedAudio,
    selectedModelId,
    needsReinit,
    loadedAudioFiles,
    audioMetadata,
    topK,
    numThreads,
    debugMode,
    provider,
    // Derived
    downloadedModels,
    audioTaggingConfig,
    // Setters
    setTopK,
    setNumThreads,
    setDebugMode,
    setProvider,
    // Handlers
    handleModelSelect,
    handleInitAudioTagging,
    handleProcessAudio,
    handleReleaseAudioTagging,
    handleSelectAudio,
  };
}
