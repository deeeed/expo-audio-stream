import { ASR, AsrModelConfig } from '@siteed/sherpa-onnx.rn';
import { useAudioRecorder, convertPCMToFloat32, ExpoAudioStreamModule, type AudioDataEvent } from '@siteed/expo-audio-studio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAsrModels, useAsrModelWithConfig } from '../hooks/useModelWithConfig';
import { useLiveAsr } from '../hooks/useLiveAsr';
import { useModelManagement } from '../contexts/ModelManagement';
import { setAgenticPageState } from '../agentic-bridge';

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
  const router = useRouter();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live ASR</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Model Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streaming Model</Text>
          {streamingModels.length === 0 ? (
            <Text style={styles.dimText}>No streaming ASR models available. Download one from the Models tab.</Text>
          ) : (
            streamingModels.map((model) => {
              const downloaded = isModelDownloaded(model.id);
              const isSelected = selectedModelId === model.id;
              return (
                <TouchableOpacity
                  key={model.id}
                  style={[styles.modelItem, isSelected && styles.modelItemSelected]}
                  onPress={() => {
                    setSelectedModelId(model.id);
                    setInitialized(false);
                  }}
                  disabled={!downloaded}
                >
                  <Text style={[styles.modelName, !downloaded && styles.dimText]}>
                    {model.id}
                  </Text>
                  <Text style={styles.modelBadge}>
                    {downloaded ? 'Ready' : 'Not downloaded'}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Init / Release */}
        <View style={styles.buttonRow}>
          {!initialized ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, (!selectedModelId || initializing) && styles.buttonDisabled]}
              onPress={handleInitialize}
              disabled={!selectedModelId || initializing}
            >
              {initializing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Initialize</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleRelease}>
              <Text style={styles.buttonText}>Release</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mic Controls */}
        {initialized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Microphone</Text>
            {!recorder.isRecording ? (
              <TouchableOpacity
                style={[styles.button, styles.micButton]}
                onPress={handleStartMic}
              >
                <Text style={styles.buttonText}>Start Listening</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <TouchableOpacity
                  style={[styles.button, styles.micActiveButton]}
                  onPress={handleStopMic}
                >
                  <Text style={styles.buttonText}>Stop Listening</Text>
                </TouchableOpacity>
                <Text style={styles.dimText}>
                  Recording: {(recorder.durationMs / 1000).toFixed(1)}s
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Results */}
        {(liveAsr.committedText || liveAsr.interimText) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recognition</Text>
            {liveAsr.committedText ? (
              <Text style={styles.committedText}>{liveAsr.committedText}</Text>
            ) : null}
            {liveAsr.interimText ? (
              <Text style={styles.interimText}>{liveAsr.interimText}</Text>
            ) : null}
            <TouchableOpacity style={styles.clearButton} onPress={liveAsr.clear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Sample Audio Files */}
        {initialized && !recorder.isRecording && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test with Sample Audio</Text>
            {SAMPLE_AUDIO_FILES.map((audio) => (
              <TouchableOpacity
                key={audio.id}
                style={[styles.button, styles.secondaryButton, processing && styles.buttonDisabled]}
                onPress={() => handleDemoStreamingPrimitives(audio.module)}
                disabled={processing}
              >
                <Text style={styles.buttonTextDark}>
                  {processing ? 'Processing...' : `Stream: ${audio.name}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Status Log */}
        {statusLog.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Log</Text>
            {statusLog.map((log, i) => (
              <Text key={i} style={styles.logLine}>
                {log}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { marginRight: 12 },
  backText: { fontSize: 16, color: '#007AFF' },
  title: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1 },
  contentInner: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  modelItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelItemSelected: { borderColor: '#007AFF' },
  modelName: { fontSize: 14, flex: 1 },
  modelBadge: { fontSize: 12, color: '#666', marginLeft: 8 },
  dimText: { color: '#999', fontSize: 13 },
  buttonRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryButton: { backgroundColor: '#007AFF' },
  secondaryButton: { backgroundColor: '#e0e0e0' },
  dangerButton: { backgroundColor: '#FF3B30' },
  micButton: { backgroundColor: '#34C759' },
  micActiveButton: { backgroundColor: '#FF9500' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  buttonTextDark: { color: '#333', fontSize: 15, fontWeight: '500' },
  committedText: { fontSize: 18, color: '#000', lineHeight: 26, marginBottom: 4 },
  interimText: { fontSize: 18, color: '#999', fontStyle: 'italic', lineHeight: 26 },
  clearButton: { marginTop: 8, alignSelf: 'flex-start' },
  clearButtonText: { color: '#007AFF', fontSize: 14 },
  errorBox: {
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { color: '#FF3B30', fontSize: 14 },
  logLine: { fontSize: 12, color: '#666', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18 },
});
