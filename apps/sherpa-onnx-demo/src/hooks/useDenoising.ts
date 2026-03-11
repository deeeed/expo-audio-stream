import { Denoising } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import { useEffect, useRef, useState } from 'react';
import { useModelManagement } from '../contexts/ModelManagement';
import { useModels } from './useModelWithConfig';

const SAMPLE_AUDIO_FILES = [
  { id: '1', name: 'JFK Speech Extract', module: require('@assets/audio/jfk.wav') },
  { id: '2', name: 'Random English Voice', module: require('@assets/audio/en.wav') },
];

export type DenoisingAudioFile = {
  id: string;
  name: string;
  module: number;
  localUri: string;
};

export function useDenoising() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [sampleRate, setSampleRate] = useState(0);

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [outputUri, setOutputUri] = useState<string | null>(null);
  const [processingDurationMs, setProcessingDurationMs] = useState(0);
  const [selectedAudio, setSelectedAudio] = useState<DenoisingAudioFile | null>(null);
  const [loadedAudioFiles, setLoadedAudioFiles] = useState<DenoisingAudioFile[]>([]);

  const { downloadedModels } = useModels({ modelType: 'denoising' });
  const { getModelState } = useModelManagement();

  // Auto-select first downloaded model
  useEffect(() => {
    if (downloadedModels.length > 0 && !selectedModelId) {
      setSelectedModelId(downloadedModels[0].metadata.id);
    }
  }, [downloadedModels, selectedModelId]);

  // Load sample audio assets
  useEffect(() => {
    (async () => {
      try {
        const assets = SAMPLE_AUDIO_FILES.map(f => Asset.fromModule(f.module));
        await Promise.all(assets.map(a => a.downloadAsync()));
        setLoadedAudioFiles(
          SAMPLE_AUDIO_FILES.map((f, i) => ({ ...f, localUri: assets[i].localUri || assets[i].uri || '' }))
        );
      } catch (err) {
        console.error('[useDenoising] Failed to load audio assets:', err);
      }
    })();
  }, []);

  // Cleanup on unmount
  const initializedRef = useRef(false);
  useEffect(() => { initializedRef.current = initialized; }, [initialized]);
  useEffect(() => {
    return () => {
      if (initializedRef.current) Denoising.release().catch(() => {});
    };
  }, []);

  const handleInit = async () => {
    const modelState = selectedModelId ? getModelState(selectedModelId) : undefined;

    if (!modelState?.localPath) {
      setError('Please download the GTCRN model first');
      return;
    }

    if (initialized) {
      await Denoising.release().catch(() => {});
      setInitialized(false);
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Initializing denoiser...');

    try {
      // Model is a plain .onnx file downloaded to modelDir/gtcrn_simple.onnx
      const cleanPath = modelState.localPath.replace(/^file:\/\//, '');
      const modelFile = `${cleanPath}/gtcrn_simple.onnx`;

      const result = await Denoising.init({ modelFile });

      if (result.success) {
        setInitialized(true);
        setSampleRate(result.sampleRate);
        setStatusMessage(`Ready (${result.sampleRate} Hz)`);
      } else {
        throw new Error(result.error || 'Initialization failed');
      }
    } catch (err) {
      setError(`Init error: ${err instanceof Error ? err.message : String(err)}`);
      setInitialized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDenoise = async (audioFile: DenoisingAudioFile) => {
    if (!initialized) { setError('Initialize denoiser first'); return; }

    setProcessing(true);
    setError(null);
    setOutputUri(null);
    setProcessingDurationMs(0);
    setStatusMessage('Denoising audio...');

    try {
      const uri = audioFile.localUri.startsWith('http')
        ? audioFile.localUri
        : audioFile.localUri.startsWith('file://')
          ? audioFile.localUri
          : `file://${audioFile.localUri}`;

      const result = await Denoising.denoiseFile(uri);
      if (result.success) {
        setOutputUri(result.outputPath);
        setProcessingDurationMs(result.durationMs);
        setStatusMessage(`Done in ${result.durationMs}ms`);
      } else {
        throw new Error(result.error || 'Denoising failed');
      }
    } catch (err) {
      setError(`Denoising error: ${err instanceof Error ? err.message : String(err)}`);
      setStatusMessage('');
    } finally {
      setProcessing(false);
    }
  };

  const handleRelease = async () => {
    if (!initialized) return;
    setLoading(true);
    setStatusMessage('Releasing resources...');
    try {
      await Denoising.release();
      setInitialized(false);
      setSampleRate(0);
      setOutputUri(null);
      setProcessingDurationMs(0);
      setStatusMessage('');
    } catch (err) {
      setError(`Release error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAudio = (audioFile: DenoisingAudioFile) => {
    setSelectedAudio(audioFile);
    setOutputUri(null);
    setProcessingDurationMs(0);
    setError(null);
  };

  return {
    initialized,
    loading,
    processing,
    error,
    statusMessage,
    sampleRate,
    selectedModelId,
    outputUri,
    processingDurationMs,
    loadedAudioFiles,
    selectedAudio,
    downloadedModels,
    setSelectedModelId,
    handleInit,
    handleRelease,
    handleSelectAudio,
    handleDenoise,
  };
}
