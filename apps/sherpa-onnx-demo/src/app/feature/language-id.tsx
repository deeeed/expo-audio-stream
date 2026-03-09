import { LanguageId } from '@siteed/sherpa-onnx.rn';
import type { LanguageIdModelConfig } from '@siteed/sherpa-onnx.rn';
import { useAudioRecorder, convertPCMToFloat32, ExpoAudioStreamModule, type AudioDataEvent } from '@siteed/expo-audio-studio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguageIdModels, useLanguageIdModelWithConfig } from '../../hooks/useModelWithConfig';
import { setAgenticPageState } from '../../agentic-bridge';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

interface AudioItem {
  id: string;
  name: string;
  localUri: string;
  source: 'bundled';
}

const BUNDLED_AUDIO = [
  { id: '1', name: 'JFK Speech (EN)', module: require('@assets/audio/jfk.wav') },
  { id: '2', name: 'English Sample', module: require('@assets/audio/en.wav') },
];

export default function LanguageIdScreen() {
  const params = useLocalSearchParams<{ model?: string }>();

  // Model state
  const [selectedModelId, setSelectedModelId] = useState<string | null>(params.model ?? null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Audio items
  const [audioItems, setAudioItems] = useState<AudioItem[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);

  // Detection state
  const [detecting, setDetecting] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  // Live mic state
  const [isLiveMic, setIsLiveMic] = useState(false);
  const [liveChunks, setLiveChunks] = useState(0);
  const [liveLanguage, setLiveLanguage] = useState<string | null>(null);

  // Models
  const { downloadedModels } = useLanguageIdModels();
  const { languageIdConfig, localPath } = useLanguageIdModelWithConfig({ modelId: selectedModelId });

  // Audio recorder for live mic
  const recorder = useAudioRecorder();
  const recordingRef = useRef(false);
  const samplesBufferRef = useRef<number[]>([]);

  // Load bundled audio files
  useEffect(() => {
    const loadAudio = async () => {
      const items: AudioItem[] = [];
      for (const audio of BUNDLED_AUDIO) {
        try {
          const [asset] = await Asset.loadAsync(audio.module);
          if (asset?.localUri) {
            const localUri = asset.localUri.replace('file://', '');
            items.push({ id: audio.id, name: audio.name, localUri, source: 'bundled' });
          }
        } catch (e) {
          console.warn(`Failed to load ${audio.name}:`, e);
        }
      }
      setAudioItems(items);
      if (items.length > 0) setSelectedAudioId(items[0].id);
    };
    loadAudio();
  }, []);

  // Auto-select first model
  useEffect(() => {
    if (!selectedModelId && downloadedModels.length > 0) {
      setSelectedModelId(downloadedModels[0].metadata.id);
    }
  }, [selectedModelId, downloadedModels]);

  // Agentic page state
  useEffect(() => {
    setAgenticPageState({
      selectedModelId,
      initialized,
      loading,
      detecting,
      isLiveMic,
      liveChunks,
      detectedLanguage,
      liveLanguage,
      durationMs,
      error,
      statusMessage,
      audioItemsCount: audioItems.length,
      selectedAudioId,
    });
  }, [selectedModelId, initialized, loading, detecting, isLiveMic, liveChunks, detectedLanguage, liveLanguage, durationMs, error, statusMessage, audioItems.length, selectedAudioId]);

  // Initialize Language ID
  const handleInit = useCallback(async () => {
    if (!selectedModelId || !languageIdConfig || !localPath) {
      setError('No model selected or not downloaded');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Initializing Language ID...');

    try {
      const config: LanguageIdModelConfig = {
        modelDir: localPath,
        ...languageIdConfig,
      };
      const result = await LanguageId.init(config);
      if (result.success) {
        setInitialized(true);
        setStatusMessage('Language ID initialized successfully');
      } else {
        setError(result.error || 'Init failed');
        setStatusMessage('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedModelId, languageIdConfig, localPath]);

  // Detect from file
  const handleDetectFromFile = useCallback(async () => {
    const selected = audioItems.find(a => a.id === selectedAudioId);
    if (!selected || !initialized) return;

    setDetecting(true);
    setError(null);
    setDetectedLanguage(null);
    setDurationMs(null);
    setStatusMessage(`Processing ${selected.name}...`);

    try {
      const result = await LanguageId.detectLanguageFromFile(selected.localUri);
      if (result.success) {
        setDetectedLanguage(result.language);
        setDurationMs(result.durationMs);
        setStatusMessage(`Detected: ${result.language} (${result.durationMs}ms)`);
      } else {
        setError(result.error || 'Detection failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetecting(false);
    }
  }, [audioItems, selectedAudioId, initialized]);

  // Live mic start
  const handleStartMic = useCallback(async () => {
    if (!initialized) {
      setError('Language ID not initialized');
      return;
    }
    setLiveChunks(0);
    setLiveLanguage(null);
    samplesBufferRef.current = [];

    try {
      const permResult = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (permResult.status !== 'granted') {
        setError('Microphone permission denied');
        return;
      }

      recordingRef.current = true;
      setIsLiveMic(true);
      setStatusMessage('Live mic active — collecting audio...');

      await recorder.startRecording({
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm_16bit',
        interval: 100,
        onAudioStream: async (event: AudioDataEvent) => {
          if (!recordingRef.current) return;
          try {
            const buffer = base64ToArrayBuffer(event.data as string);
            const { pcmValues } = await convertPCMToFloat32({
              buffer,
              bitDepth: 16,
              skipWavHeader: true,
            });
            const samples = Array.from(pcmValues);
            if (samples.length > 0) {
              samplesBufferRef.current.push(...samples);
              setLiveChunks(prev => prev + 1);

              // Detect every ~2 seconds (32000 samples at 16kHz)
              if (samplesBufferRef.current.length >= 32000) {
                const result = await LanguageId.detectLanguage(16000, samplesBufferRef.current);
                if (result.success) {
                  setLiveLanguage(result.language);
                  setStatusMessage(`Live: ${result.language} (${result.durationMs}ms)`);
                }
                samplesBufferRef.current = [];
              }
            }
          } catch (e) {
            console.warn('[LanguageId] Error processing audio chunk:', e);
          }
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Mic error: ${msg}`);
      recordingRef.current = false;
      setIsLiveMic(false);
    }
  }, [initialized, recorder]);

  const handleStopMic = useCallback(async () => {
    recordingRef.current = false;
    try {
      // Process remaining buffered samples
      if (samplesBufferRef.current.length > 0) {
        const result = await LanguageId.detectLanguage(16000, samplesBufferRef.current);
        if (result.success) {
          setLiveLanguage(result.language);
        }
        samplesBufferRef.current = [];
      }
      await recorder.stopRecording();
    } catch (e) {
      console.warn('[LanguageId] Stop error:', e);
    }
    setIsLiveMic(false);
    setStatusMessage(`Live mic stopped. ${liveChunks} chunks processed.`);
  }, [recorder, liveChunks]);

  // Release
  const handleRelease = useCallback(async () => {
    if (isLiveMic) {
      recordingRef.current = false;
      await recorder.stopRecording();
      setIsLiveMic(false);
    }
    await LanguageId.release();
    setInitialized(false);
    setDetectedLanguage(null);
    setLiveLanguage(null);
    setStatusMessage('Language ID released');
  }, [isLiveMic, recorder]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Model Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model</Text>
          {downloadedModels.length === 0 ? (
            <Text style={styles.infoText}>No Language ID models downloaded. Go to Models tab to download.</Text>
          ) : (
            <View style={styles.modelList}>
              {downloadedModels.map(model => (
                <TouchableOpacity
                  key={model.metadata.id}
                  style={[
                    styles.modelButton,
                    selectedModelId === model.metadata.id && styles.modelButtonSelected,
                  ]}
                  onPress={() => {
                    if (!initialized) setSelectedModelId(model.metadata.id);
                  }}
                  disabled={initialized}
                >
                  <Text
                    style={[
                      styles.modelButtonText,
                      selectedModelId === model.metadata.id && styles.modelButtonTextSelected,
                    ]}
                  >
                    {model.metadata.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            {!initialized ? (
              <TouchableOpacity
                testID="langid-init-button"
                style={[styles.button, styles.buttonPrimary, (!selectedModelId || loading) && styles.buttonDisabled]}
                onPress={handleInit}
                disabled={!selectedModelId || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonTextWhite}>Initialize</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                testID="langid-release-button"
                style={[styles.button, styles.buttonDanger]}
                onPress={handleRelease}
              >
                <Text style={styles.buttonTextWhite}>Release</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Status */}
        {(statusMessage || error) && (
          <View style={styles.section}>
            {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        )}

        {/* File-based detection */}
        {initialized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>File Detection</Text>
            <View style={styles.audioList}>
              {audioItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.audioButton,
                    selectedAudioId === item.id && styles.audioButtonSelected,
                  ]}
                  onPress={() => setSelectedAudioId(item.id)}
                  disabled={detecting}
                >
                  <Text style={styles.audioButtonText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              testID="langid-detect-button"
              style={[styles.button, styles.buttonPrimary, detecting && styles.buttonDisabled]}
              onPress={handleDetectFromFile}
              disabled={detecting || !selectedAudioId}
            >
              {detecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonTextWhite}>Detect Language</Text>
              )}
            </TouchableOpacity>

            {detectedLanguage && (
              <View style={styles.results}>
                <Text style={styles.resultTitle}>Detected Language:</Text>
                <Text style={styles.languageResult}>{detectedLanguage}</Text>
                {durationMs != null && (
                  <Text style={styles.infoText}>Processing time: {durationMs}ms</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Live mic detection */}
        {initialized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live Microphone</Text>
            <TouchableOpacity
              testID="langid-livemic-button"
              style={[
                styles.button,
                isLiveMic ? styles.buttonDanger : styles.buttonPrimary,
              ]}
              onPress={isLiveMic ? handleStopMic : handleStartMic}
            >
              <Text style={styles.buttonTextWhite}>
                {isLiveMic ? 'Stop Mic' : 'Start Mic'}
              </Text>
            </TouchableOpacity>

            {(isLiveMic || liveLanguage) && (
              <View style={styles.liveStatus}>
                {liveLanguage && (
                  <Text style={styles.languageResult}>
                    {liveLanguage}
                  </Text>
                )}
                <Text style={styles.infoText}>Chunks: {liveChunks}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#666' },
  statusText: { fontSize: 14, color: '#333' },
  errorText: { fontSize: 14, color: '#d00' },
  modelList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modelButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ccc' },
  modelButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  modelButtonText: { fontSize: 14, color: '#333' },
  modelButtonTextSelected: { color: '#fff' },
  buttonRow: { flexDirection: 'row', gap: 8 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, alignItems: 'center', minWidth: 100 },
  buttonPrimary: { backgroundColor: '#007AFF' },
  buttonDanger: { backgroundColor: '#d00' },
  buttonDisabled: { opacity: 0.5 },
  buttonTextWhite: { color: '#fff', fontSize: 14, fontWeight: '600' },
  audioList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  audioButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#ccc' },
  audioButtonSelected: { backgroundColor: '#e0e7ff', borderColor: '#007AFF' },
  audioButtonText: { fontSize: 13 },
  results: { marginTop: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 6 },
  resultTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  languageResult: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00BCD4',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#e0f7fa',
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  liveStatus: { marginTop: 8, gap: 4 },
});
