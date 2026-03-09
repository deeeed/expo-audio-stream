import { VAD } from '@siteed/sherpa-onnx.rn';
import type { VadModelConfig, VadAcceptWaveformResult, SpeechSegment } from '@siteed/sherpa-onnx.rn';
import { useAudioRecorder, convertPCMToFloat32, ExpoAudioStreamModule, type AudioDataEvent } from '@siteed/expo-audio-studio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useVadModels, useVadModelWithConfig } from '../../hooks/useModelWithConfig';
import { setAgenticPageState } from '../../agentic-bridge';

// Decode base64 string to ArrayBuffer
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
  { id: '1', name: 'JFK Speech', module: require('@assets/audio/jfk.wav') },
  { id: '2', name: 'English Sample', module: require('@assets/audio/en.wav') },
];

export default function VadScreen() {
  const router = useRouter();
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
  const [segments, setSegments] = useState<SpeechSegment[]>([]);
  const [isSpeechDetected, setIsSpeechDetected] = useState(false);

  // Live mic state
  const [isLiveMic, setIsLiveMic] = useState(false);
  const [liveChunks, setLiveChunks] = useState(0);
  const [liveSegments, setLiveSegments] = useState<SpeechSegment[]>([]);
  const [liveSpeechDetected, setLiveSpeechDetected] = useState(false);

  // Models
  const { downloadedModels } = useVadModels();
  const { vadConfig, localPath } = useVadModelWithConfig({ modelId: selectedModelId });

  // Audio recorder for live mic (same pattern as KWS)
  const recorder = useAudioRecorder();
  const recordingRef = useRef(false);

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
      segmentsCount: segments.length,
      segments: segments.map(s => ({ start: s.startTime, end: s.endTime })),
      liveSegmentsCount: liveSegments.length,
      liveSegments: liveSegments.map(s => ({ start: s.startTime, end: s.endTime })),
      isSpeechDetected,
      liveSpeechDetected,
      error,
      statusMessage,
      audioItemsCount: audioItems.length,
      selectedAudioId,
    });
  }, [selectedModelId, initialized, loading, detecting, isLiveMic, liveChunks, segments, liveSegments, isSpeechDetected, liveSpeechDetected, error]);

  // Initialize VAD
  const handleInit = useCallback(async () => {
    if (!selectedModelId || !vadConfig || !localPath) {
      setError('No model selected or not downloaded');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Initializing VAD...');

    try {
      const config: VadModelConfig = {
        modelDir: localPath,
        ...vadConfig,
      };
      const result = await VAD.init(config);
      if (result.success) {
        setInitialized(true);
        setStatusMessage('VAD initialized successfully');
      } else {
        setError(result.error || 'Init failed');
        setStatusMessage('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedModelId, vadConfig, localPath]);

  // Detect from file
  const handleDetectFromFile = useCallback(async () => {
    const selected = audioItems.find(a => a.id === selectedAudioId);
    if (!selected || !initialized) return;

    setDetecting(true);
    setError(null);
    setSegments([]);
    setIsSpeechDetected(false);
    setStatusMessage(`Processing ${selected.name}...`);

    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync('file://' + selected.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = base64ToArrayBuffer(base64);

      // Parse WAV header for sample rate
      const dataView = new DataView(arrayBuffer);
      const sampleRate = dataView.getUint32(24, true);
      const bitsPerSample = dataView.getUint16(34, true);

      // Convert to float32 (handles WAV header internally)
      const { pcmValues: float32 } = await convertPCMToFloat32({
        buffer: arrayBuffer,
        bitDepth: bitsPerSample,
      });

      // Feed in chunks of 512 samples (window size)
      const chunkSize = 512;
      const allSegments: SpeechSegment[] = [];
      let speechDetected = false;

      for (let offset = 0; offset < float32.length; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, float32.length);
        const chunk = Array.from(float32.subarray(offset, end));

        // Pad last chunk to 512 if needed
        while (chunk.length < chunkSize) {
          chunk.push(0);
        }

        const result = await VAD.acceptWaveform(16000, chunk);
        if (result.success) {
          if (result.isSpeechDetected) speechDetected = true;
          if (result.segments.length > 0) {
            allSegments.push(...result.segments);
          }
        }
      }

      setSegments(allSegments);
      setIsSpeechDetected(speechDetected);
      setStatusMessage(
        `Done. ${allSegments.length} segment(s) found, speech ${speechDetected ? 'detected' : 'not detected'}`
      );

      // Reset VAD for next detection
      await VAD.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetecting(false);
    }
  }, [audioItems, selectedAudioId, initialized]);

  // Live mic start (same pattern as KWS)
  const handleStartMic = useCallback(async () => {
    if (!initialized) {
      setError('VAD not initialized');
      return;
    }
    setLiveChunks(0);
    setLiveSegments([]);
    setLiveSpeechDetected(false);

    try {
      const permResult = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (permResult.status !== 'granted') {
        setError('Microphone permission denied');
        return;
      }

      recordingRef.current = true;
      setIsLiveMic(true);
      setStatusMessage('Live mic active...');

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
              const result = await VAD.acceptWaveform(16000, samples);
              if (result.success) {
                setLiveSpeechDetected(result.isSpeechDetected);
                if (result.segments.length > 0) {
                  setLiveSegments(prev => [...prev, ...result.segments]);
                }
                setLiveChunks(prev => prev + 1);
              }
            }
          } catch (e) {
            console.warn('[VAD] Error processing audio chunk:', e);
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
      await recorder.stopRecording();
    } catch (e) {
      console.warn('[VAD] Stop error:', e);
    }
    setIsLiveMic(false);
    setStatusMessage(`Live mic stopped. ${liveChunks} chunks, ${liveSegments.length} segments`);
    await VAD.reset();
  }, [recorder, liveChunks, liveSegments.length]);

  // Release
  const handleRelease = useCallback(async () => {
    if (isLiveMic) {
      recordingRef.current = false;
      await recorder.stopRecording();
      setIsLiveMic(false);
    }
    await VAD.release();
    setInitialized(false);
    setSegments([]);
    setLiveSegments([]);
    setStatusMessage('VAD released');
  }, [isLiveMic, recorder]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Voice Activity Detection</Text>
        </View>

        {/* Model Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Model</Text>
          {downloadedModels.length === 0 ? (
            <Text style={styles.infoText}>No VAD models downloaded. Go to Models tab to download.</Text>
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
                testID="vad-init-button"
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
                testID="vad-release-button"
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
              testID="vad-detect-button"
              style={[styles.button, styles.buttonPrimary, detecting && styles.buttonDisabled]}
              onPress={handleDetectFromFile}
              disabled={detecting || !selectedAudioId}
            >
              {detecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonTextWhite}>Detect Speech</Text>
              )}
            </TouchableOpacity>

            {/* File detection results */}
            {segments.length > 0 && (
              <View style={styles.results}>
                <Text style={styles.resultTitle}>
                  Segments ({segments.length}):
                </Text>
                {segments.map((seg, i) => (
                  <Text key={i} style={styles.segmentText}>
                    {seg.startTime.toFixed(2)}s - {seg.endTime.toFixed(2)}s ({seg.duration} samples)
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Live mic detection */}
        {initialized && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Live Microphone</Text>
            <TouchableOpacity
              testID="vad-livemic-button"
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

            {isLiveMic && (
              <View style={styles.liveStatus}>
                <Text style={[styles.speechIndicator, liveSpeechDetected && styles.speechActive]}>
                  {liveSpeechDetected ? 'SPEECH' : 'SILENCE'}
                </Text>
                <Text style={styles.infoText}>Chunks: {liveChunks}</Text>
                <Text style={styles.infoText}>Segments: {liveSegments.length}</Text>
              </View>
            )}

            {liveSegments.length > 0 && (
              <View style={styles.results}>
                <Text style={styles.resultTitle}>
                  Live Segments ({liveSegments.length}):
                </Text>
                {liveSegments.slice(-10).map((seg, i) => (
                  <Text key={i} style={styles.segmentText}>
                    {seg.startTime.toFixed(2)}s - {seg.endTime.toFixed(2)}s
                  </Text>
                ))}
                {liveSegments.length > 10 && (
                  <Text style={styles.infoText}>... and {liveSegments.length - 10} more</Text>
                )}
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButton: { marginRight: 16 },
  backText: { fontSize: 16, color: '#007AFF' },
  title: { fontSize: 20, fontWeight: 'bold' },
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
  segmentText: { fontSize: 13, color: '#333', marginBottom: 2 },
  liveStatus: { marginTop: 8, gap: 4 },
  speechIndicator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  speechActive: { color: '#00aa00', backgroundColor: '#e0ffe0' },
});
