import { ASR, AsrModelConfig } from '@siteed/sherpa-onnx.rn';
import { useAudioRecorder, convertPCMToFloat32, ExpoAudioStreamModule, type AudioDataEvent } from '@siteed/expo-audio-studio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAsrModels, useAsrModelWithConfig } from '../../../hooks/useModelWithConfig';
import { useLiveAsr } from '../../../hooks/useLiveAsr';
import { useModelManagement } from '../../../contexts/ModelManagement';
import { setAgenticPageState } from '../../../agentic-bridge';
import {
  PageContainer,
  Section,
  StatusBlock,
  Text,
  ThemedButton,
  ResultsBox,
  useTheme,
} from '../../../components/ui';

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
  },
];

// Decode base64 string to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function LiveAsrScreen() {
  // Deep-link params: /live-asr?model=<id>&autoInit=true&autoTest=jfk&t=<timestamp>
  const params = useLocalSearchParams<{ model?: string; autoInit?: string; autoTest?: string; t?: string }>();
  const theme = useTheme();
  const { availableModels } = useAsrModels();
  const { getModelState, isModelDownloaded } = useModelManagement();

  // Only show streaming models
  const streamingModels = useMemo(
    () => (availableModels ?? []).filter((m) => m.id.startsWith('streaming-')),
    [availableModels]
  );

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const { asrConfig } = useAsrModelWithConfig({ modelId: selectedModelId });
  const [initialized, setInitialized] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLog, setStatusLog] = useState<string[]>([]);

  const liveAsr = useLiveAsr();
  const autoInitFiredRef = useRef<string | null>(null);
  const autoTestFiredRef = useRef<string | null>(null);
  const streamCreatedRef = useRef(false);

  // Audio recorder for mic input
  const recorder = useAudioRecorder();

  const addLog = useCallback((msg: string) => {
    setStatusLog((prev) => [...prev.slice(-19), msg]);
  }, []);

  // Register page state for agentic querying (replaces screenshots)
  useEffect(() => {
    setAgenticPageState({
      selectedModelId,
      initialized,
      initializing,
      processing,
      error,
      isRecording: recorder.isRecording,
      committedText: liveAsr.committedText,
      interimText: liveAsr.interimText,
      statusLog,
      streamingModels: streamingModels.map(m => ({
        id: m.id,
        downloaded: isModelDownloaded(m.id),
      })),
    });
  }, [selectedModelId, initialized, initializing, processing, error, recorder.isRecording, liveAsr.committedText, liveAsr.interimText, statusLog, streamingModels, isModelDownloaded]);

  // Deep-link: select model
  useEffect(() => {
    if (!params.model || !params.t) return;
    ASR.release().catch(() => {}).finally(() => {
      setInitialized(false);
      setSelectedModelId(params.model!);
      addLog(`Deep-link: selected ${params.model}`);
    });
  }, [params.t]);

  const handleInitialize = useCallback(async () => {
    if (!selectedModelId || !asrConfig) {
      setError('Select a streaming model first');
      return;
    }
    const modelState = getModelState(selectedModelId);
    if (!modelState?.localPath) {
      setError('Model not downloaded. Go to Models tab to download it.');
      return;
    }

    setInitializing(true);
    setError(null);
    try {
      // Resolve actual model directory (may be in a sherpa-onnx subdirectory)
      let modelDir = modelState.localPath.replace(/^file:\/\//, '');
      try {
        const dirContents = await FileSystem.readDirectoryAsync(modelState.localPath);
        const sherpaDir = dirContents.find(item => item.includes('sherpa-onnx'));
        if (sherpaDir) {
          const subDirPath = `${modelState.localPath}/${sherpaDir}`;
          const subDirInfo = await FileSystem.getInfoAsync(subDirPath);
          if (subDirInfo.exists && subDirInfo.isDirectory) {
            const subDirContents = await FileSystem.readDirectoryAsync(subDirPath);
            if (subDirContents.some(f => f.endsWith('.onnx') || f === 'tokens.txt')) {
              modelDir = modelDir + '/' + sherpaDir;
              addLog(`Using subdirectory: ${sherpaDir}`);
            }
          }
        }
      } catch (_) { /* use original path */ }

      const config: AsrModelConfig = {
        ...asrConfig,
        modelDir,
        streaming: true,
      } as AsrModelConfig;

      addLog(`Initializing ${selectedModelId}...`);
      const result = await ASR.initialize(config);
      if (result.success) {
        setInitialized(true);
        addLog(`Initialized: ${result.modelType} @ ${result.sampleRate}Hz`);
      } else {
        throw new Error(result.error || 'Init failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      addLog(`Init error: ${e}`);
    } finally {
      setInitializing(false);
    }
  }, [selectedModelId, asrConfig, getModelState, addLog]);

  // Deep-link: auto-init after model is selected
  useEffect(() => {
    if (params.autoInit !== 'true' || !params.model || !params.t) return;
    if (autoInitFiredRef.current === params.t) return;
    if (initializing || initialized) return;
    if (selectedModelId !== params.model) return;
    autoInitFiredRef.current = params.t;
    handleInitialize();
  }, [params.t, params.autoInit, params.model, initializing, initialized, selectedModelId]);

  // Deep-link: auto-test after init completes
  useEffect(() => {
    if (!params.autoTest || !params.t || !initialized) return;
    if (autoTestFiredRef.current === params.t) return;
    if (processing) return;
    autoTestFiredRef.current = params.t;
    const audioFile = SAMPLE_AUDIO_FILES.find(
      a => a.name.toLowerCase().includes(params.autoTest!.toLowerCase()) || a.id === params.autoTest
    );
    if (audioFile) {
      handleDemoStreamingPrimitives(audioFile.module);
    } else {
      addLog(`autoTest: no audio matching "${params.autoTest}"`);
    }
  }, [params.t, params.autoTest, initialized, processing]);

  const handleRelease = useCallback(async () => {
    if (recorder.isRecording) {
      await recorder.stopRecording();
    }
    liveAsr.stop();
    streamCreatedRef.current = false;
    await ASR.release();
    setInitialized(false);
    addLog('Released ASR');
  }, [liveAsr, recorder, addLog]);

  // --- Mic streaming ---
  const handleStartMic = useCallback(async () => {
    if (!initialized) {
      setError('Initialize ASR first');
      return;
    }
    setError(null);
    liveAsr.clear();

    try {
      // Request mic permission
      const permResult = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (permResult.status !== 'granted') {
        setError('Microphone permission denied');
        addLog('Mic: permission denied');
        return;
      }

      // Create online stream for live recognition
      await ASR.createOnlineStream();
      streamCreatedRef.current = true;
      liveAsr.start();
      addLog('Mic: creating online stream + recording at 16kHz...');

      await recorder.startRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm_16bit',
        interval: 100, // ~100ms chunks
        onAudioStream: async (event: AudioDataEvent) => {
          if (!streamCreatedRef.current) return;
          try {
            const buffer = base64ToArrayBuffer(event.data as string);
            const { pcmValues } = await convertPCMToFloat32({
              buffer,
              bitDepth: 16,
              skipWavHeader: true,
            });
            // Convert Float32Array to regular number array for the bridge
            const samples: number[] = Array.from(pcmValues);
            if (samples.length > 0) {
              liveAsr.feedAudio(samples, 16000);
            }
          } catch (e) {
            console.warn('[LiveASR] Error processing audio chunk:', e);
          }
        },
      });

      addLog('Mic: recording started');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      addLog(`Mic error: ${e}`);
      streamCreatedRef.current = false;
    }
  }, [initialized, liveAsr, recorder, addLog]);

  const handleStopMic = useCallback(async () => {
    try {
      await recorder.stopRecording();
      liveAsr.stop();
      streamCreatedRef.current = false;
      addLog('Mic: stopped');

      // Get final result
      const { text } = await ASR.getResult();
      if (text) {
        addLog(`Final: "${text}"`);
      }
    } catch (e) {
      addLog(`Stop error: ${e}`);
    }
  }, [recorder, liveAsr, addLog]);

  // Demo the streaming primitives with a sample audio file
  const handleDemoStreamingPrimitives = useCallback(
    async (audioModule: number) => {
      if (!initialized) {
        setError('Initialize ASR first');
        return;
      }
      setProcessing(true);
      setError(null);
      liveAsr.clear();

      try {
        const asset = Asset.fromModule(audioModule);
        await asset.downloadAsync();
        const uri = asset.localUri;
        if (!uri) throw new Error('Failed to download audio asset');

        addLog('--- Streaming Primitives Demo ---');
        addLog('1. createAsrOnlineStream()');
        await ASR.createOnlineStream();

        addLog('2. recognizeFromFile (uses streaming internally)');
        const result = await ASR.recognizeFromFile(uri);

        if (result.success && result.text) {
          addLog(`3. Result: "${result.text}"`);
          addLog(`   Samples: ${result.samplesLength}`);
        } else {
          addLog(`3. No text recognized`);
        }
        addLog('--- Demo Complete ---');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        addLog(`Error: ${e}`);
      } finally {
        setProcessing(false);
      }
    },
    [initialized, liveAsr, addLog]
  );

  return (
    <PageContainer>
      {/* Model Selection */}
      <Section title="Streaming Model">
        {streamingModels.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>No streaming ASR models available. Download one from the Models tab.</Text>
        ) : (
          streamingModels.map((model) => {
            const downloaded = isModelDownloaded(model.id);
            const isSelected = selectedModelId === model.id;
            return (
              <TouchableOpacity
                key={model.id}
                style={{
                  padding: 12,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.roundness * 2,
                  marginBottom: 6,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: isSelected ? theme.colors.primary : 'transparent',
                }}
                onPress={() => {
                  setSelectedModelId(model.id);
                  setInitialized(false);
                }}
                disabled={!downloaded}
              >
                <Text variant="bodyMedium" style={{ flex: 1, color: downloaded ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
                  {model.id}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
                  {downloaded ? 'Ready' : 'Not downloaded'}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </Section>

      {/* Init / Release */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.margin.m }}>
        {!initialized ? (
          <ThemedButton
            label="Initialize"
            variant="primary"
            onPress={handleInitialize}
            disabled={!selectedModelId || initializing}
            loading={initializing}
            style={{ flex: 1 }}
          />
        ) : (
          <ThemedButton
            label="Release"
            variant="danger"
            onPress={handleRelease}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {/* Mic Controls */}
      {initialized && (
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
      )}

      {/* Results */}
      {(liveAsr.committedText || liveAsr.interimText) ? (
        <Section title="Recognition">
          {liveAsr.committedText ? (
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, lineHeight: 26, marginBottom: 4 }}>{liveAsr.committedText}</Text>
          ) : null}
          {liveAsr.interimText ? (
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', lineHeight: 26 }}>{liveAsr.interimText}</Text>
          ) : null}
          <ThemedButton
            label="Clear"
            variant="primary"
            compact
            onPress={liveAsr.clear}
            style={{ marginTop: 8, alignSelf: 'flex-start' }}
          />
        </Section>
      ) : null}

      {/* Sample Audio Files */}
      {initialized && !recorder.isRecording && (
        <Section title="Test with Sample Audio">
          {SAMPLE_AUDIO_FILES.map((audio) => (
            <ThemedButton
              key={audio.id}
              label={processing ? 'Processing...' : `Stream: ${audio.name}`}
              variant="secondary"
              onPress={() => handleDemoStreamingPrimitives(audio.module)}
              disabled={processing}
              style={{ marginBottom: 8 }}
            />
          ))}
        </Section>
      )}

      {/* Error */}
      <StatusBlock error={error} />

      {/* Status Log */}
      {statusLog.length > 0 && (
        <Section title="Log">
          {statusLog.map((log, i) => (
            <Text key={i} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 }}>
              {log}
            </Text>
          ))}
        </Section>
      )}
    </PageContainer>
  );
}
