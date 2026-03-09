import type { ModelProvider, TtsGenerateResult, TtsInitResult, TtsModelConfig } from '@siteed/sherpa-onnx.rn';
import { TTS } from '@siteed/sherpa-onnx.rn';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import { useTtsModels, useTtsModelWithConfig } from './useModelWithConfig';
import { setAgenticPageState } from '../agentic-bridge';

export const TTS_DEFAULT_TEXT = "Hello, this is a test of the Sherpa Onnx TTS system. I hope you're having a great day!";

async function verifyFileExists(filePath: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    return fileInfo.exists;
  } catch {
    return false;
  }
}

export function useTts() {
  const [text, setText] = useState(TTS_DEFAULT_TEXT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const [ttsInitialized, setTtsInitialized] = useState(false);
  const [initResult, setInitResult] = useState<TtsInitResult | null>(null);
  const [ttsResult, setTtsResult] = useState<TtsGenerateResult | null>(null);
  const [speakerId, setSpeakerId] = useState(0);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [numThreads, setNumThreads] = useState(2);
  const [debugMode, setDebugMode] = useState(false);
  const [provider, setProvider] = useState<ModelProvider>('cpu');
  const [autoPlay, setAutoPlay] = useState(true);

  const lastAutoInitRef = useRef<string | null>(null);

  const { downloadedModels } = useTtsModels();
  const { ttsConfig, localPath, isDownloaded } = useTtsModelWithConfig({ modelId: selectedModelId });

  // Agentic page state
  useEffect(() => {
    setAgenticPageState({
      selectedModelId,
      ttsInitialized,
      isLoading,
      isPlaying,
      errorMessage: errorMessage || null,
      statusMessage: statusMessage || null,
      speakerId,
      speakingRate,
      hasResult: !!ttsResult,
    });
  }, [selectedModelId, ttsInitialized, isLoading, isPlaying, errorMessage, statusMessage, speakerId, speakingRate, ttsResult]);

  // Initialize audio system on mount
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
    }).catch(e => console.error('Failed to initialize audio system:', e));

    return () => {
      if (player) player.remove();
    };
  }, [player]);

  // Reset configuration when selected model changes
  useEffect(() => {
    if (ttsConfig) {
      setNumThreads(ttsConfig.numThreads ?? 2);
      setDebugMode(ttsConfig.debug ?? false);
      setProvider(ttsConfig.provider ?? 'cpu');
      setSpeakerId(0);
      setSpeakingRate(1.0);
    }
  }, [selectedModelId, ttsConfig]);

  // Auto-select the first downloaded model if none is selected
  useEffect(() => {
    if (downloadedModels.length > 0 && !selectedModelId) {
      setSelectedModelId(downloadedModels[0].metadata.id);
    }
  }, [downloadedModels, selectedModelId]);

  // Auto-init when model is selected and downloaded
  useEffect(() => {
    if (!selectedModelId || !isDownloaded || ttsInitialized || isLoading) return;
    if (lastAutoInitRef.current === selectedModelId) return;
    lastAutoInitRef.current = selectedModelId;
    handleInitTts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModelId, isDownloaded, ttsInitialized, isLoading]);

  const handleModelSelect = async (modelId: string) => {
    if (modelId === selectedModelId) return;
    if (ttsInitialized) {
      try {
        await TTS.release();
        setTtsInitialized(false);
        setInitResult(null);
        setTtsResult(null);
      } catch (error) {
        setErrorMessage(`Error releasing TTS: ${(error as Error).message}`);
      }
    }
    lastAutoInitRef.current = null;
    setSelectedModelId(modelId);
  };

  const handleInitTts = async () => {
    if (!selectedModelId) {
      setErrorMessage('Please select a model first');
      return;
    }
    if (!ttsConfig || !localPath || !isDownloaded) {
      setErrorMessage('Selected model is not valid or configuration not found.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Initializing TTS...');

    try {
      const cleanLocalPath = localPath.replace('file://', '');

      const modelConfig: TtsModelConfig = {
        modelDir: cleanLocalPath,
        ttsModelType: ttsConfig.ttsModelType || 'vits',
        modelFile: ttsConfig.modelFile || '',
        tokensFile: ttsConfig.tokensFile || '',
        ...ttsConfig,
        numThreads,
        debug: debugMode,
        provider,
      };

      const result = await TTS.initialize(modelConfig);
      setInitResult(result);
      setTtsInitialized(result.success);

      if (result.success) {
        setStatusMessage(`TTS initialized successfully! Sample rate: ${result.sampleRate}Hz, Speakers: ${result.numSpeakers}`);
      } else {
        setErrorMessage(`TTS initialization failed: ${result.error}`);
      }
    } catch (error) {
      setErrorMessage(`TTS init error: ${(error as Error).message}`);
      setTtsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTts = async () => {
    if (!ttsInitialized) {
      setErrorMessage('TTS must be initialized first');
      return;
    }
    if (!text.trim()) {
      setErrorMessage('Please enter text to speak');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Generating speech...');

    try {
      const result = await TTS.generateSpeech(text, {
        speakerId,
        speakingRate,
        playAudio: autoPlay,
      });

      if (result.success || result.filePath) {
        setStatusMessage('Speech generated successfully!');

        if (result.filePath) {
          const formattedPath = result.filePath.startsWith('file://')
            ? result.filePath
            : `file://${result.filePath}`;

          const fileExists = await verifyFileExists(formattedPath);

          if (fileExists) {
            setTtsResult(result);

            if (!autoPlay) {
              try {
                if (player) player.remove();
                const newPlayer = createAudioPlayer({ uri: formattedPath });
                setPlayer(newPlayer);
                newPlayer.addListener('playbackStatusUpdate', (status) => {
                  setIsPlaying(status.playing);
                  if (status.didJustFinish) setIsPlaying(false);
                });
                setStatusMessage('Audio ready. Use the play button to listen.');
              } catch (audioError) {
                setErrorMessage(`Error preparing audio: ${(audioError as Error).message}`);
              }
            }
          } else {
            setTtsResult({ success: false, filePath: result.filePath });
            setErrorMessage('Generated audio file not found.');
          }
        } else if (autoPlay) {
          setStatusMessage('Speech played successfully!');
        }
      } else {
        setErrorMessage('TTS generation failed');
      }
    } catch (error) {
      setErrorMessage(`TTS generation error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopTts = async () => {
    setStatusMessage('Stopping TTS...');
    try {
      const result = await TTS.stopSpeech();
      if (result.stopped) {
        setStatusMessage('TTS stopped successfully');
        setIsLoading(false);
      } else {
        setErrorMessage(`Failed to stop TTS: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      setErrorMessage(`Stop TTS error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseTts = async () => {
    try {
      const result = await TTS.release();
      if (result.released) {
        setTtsInitialized(false);
        setInitResult(null);
        setTtsResult(null);
        setStatusMessage('TTS resources released');
      } else {
        setErrorMessage('Failed to release TTS resources');
      }
    } catch (error) {
      setErrorMessage(`Release TTS error: ${(error as Error).message}`);
    }
  };

  const handlePlayAudio = async () => {
    if (!ttsResult?.filePath) {
      setErrorMessage('No audio file available to play');
      return;
    }

    try {
      const formattedPath = ttsResult.filePath.startsWith('file://')
        ? ttsResult.filePath
        : `file://${ttsResult.filePath}`;

      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });

      if (player) player.remove();

      const newPlayer = createAudioPlayer({ uri: formattedPath });
      newPlayer.addListener('playbackStatusUpdate', (status) => {
        setIsPlaying(status.playing);
        if (status.didJustFinish) setIsPlaying(false);
      });

      setPlayer(newPlayer);
      newPlayer.play();
      setIsPlaying(true);
    } catch (error) {
      setErrorMessage(`Error playing audio: ${(error as Error).message}`);
    }
  };

  const handleStopPlayer = () => {
    if (player) {
      player.pause();
      setIsPlaying(false);
    }
  };

  const handleResetPlayer = () => {
    if (player) player.seekTo(0);
  };

  return {
    // State
    text,
    isLoading,
    errorMessage,
    statusMessage,
    isPlaying,
    selectedModelId,
    ttsInitialized,
    initResult,
    ttsResult,
    speakerId,
    speakingRate,
    numThreads,
    debugMode,
    provider,
    autoPlay,
    // Derived
    downloadedModels,
    ttsConfig,
    // Setters
    setText,
    setSpeakerId,
    setSpeakingRate,
    setNumThreads,
    setDebugMode,
    setProvider,
    setAutoPlay,
    setIsPlaying,
    // Handlers
    handleModelSelect,
    handleInitTts,
    handleGenerateTts,
    handleStopTts,
    handleReleaseTts,
    handlePlayAudio,
    handleStopPlayer,
    handleResetPlayer,
  };
}
