import { KWS } from '@siteed/sherpa-onnx.rn';
import type { KWSInitResult } from '@siteed/sherpa-onnx.rn';
import { useAudioRecorder, convertPCMToFloat32, ExpoAudioStreamModule, type AudioDataEvent } from '@siteed/expo-audio-studio';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useKwsModels, useKwsModelWithConfig } from '../../../hooks/useModelWithConfig';
import { setAgenticPageState } from '../../../agentic-bridge';
import { InlineModelDownloader } from '../../../components/InlineModelDownloader';
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
} from '../../../components/ui';

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
  localUri: string; // native path (no file://)
  source: 'bundled' | 'model'; // bundled = app asset, model = from model test_wavs
}

// Parse keywords.txt: each line is BPE tokens like "▁HE LL O ▁WORLD"
// ▁ marks a word boundary (space before the token). Tokens without ▁ are
// continuation pieces of the previous word and should be concatenated directly.
function parseKeywordsFile(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const tokens = line.split(' ');
      let result = '';
      for (const token of tokens) {
        if (token.startsWith('▁')) {
          // Word boundary — add a space then the rest of the token
          result += ' ' + token.slice(1);
        } else {
          // Continuation piece — concatenate directly
          result += token;
        }
      }
      return result.trim();
    });
}

export default function KwsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ model?: string }>();
  const theme = useTheme();

  // Model state
  const [selectedModelId, setSelectedModelId] = useState<string | null>(params.model ?? null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [initResult, setInitResult] = useState<KWSInitResult | null>(null);
  const [modelDir, setModelDir] = useState<string | null>(null); // resolved model subdir

  // Keywords
  const [keywords, setKeywords] = useState<string[]>([]);
  const [testKeywords, setTestKeywords] = useState<string[]>([]);

  // Config
  const [numThreads, setNumThreads] = useState(2);
  const [debugMode, setDebugMode] = useState(false);
  const [useTestKeywords, setUseTestKeywords] = useState(false);

  // Audio
  const [audioFiles, setAudioFiles] = useState<AudioItem[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AudioItem | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectedKeyword, setDetectedKeyword] = useState<string | null>(null);

  // Live mic state
  const [detectedKeywords, setDetectedKeywords] = useState<string[]>([]);
  const [micError, setMicError] = useState<string | null>(null);
  const [chunksProcessed, setChunksProcessed] = useState(0);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const recorder = useAudioRecorder();
  const processingRef = useRef(false);
  const queueRef = useRef<{ samples: number[]; sampleRate: number }[]>([]);
  const recordingRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setStatusLog((prev) => [...prev.slice(-29), msg]);
  }, []);

  // Hooks
  const { downloadedModels } = useKwsModels();
  const { kwsConfig, localPath, isDownloaded } = useKwsModelWithConfig({ modelId: selectedModelId });

  // Register page state for agentic querying
  useEffect(() => {
    setAgenticPageState({
      selectedModelId,
      initialized,
      loading,
      detecting,
      isRecording: recorder.isRecording,
      error: error || micError || null,
      statusMessage: statusMessage || null,
      detectedKeyword,
      detectedKeywords,
      chunksProcessed,
      downloadedModelCount: downloadedModels.length,
      keywordCount: keywords.length,
    });
  }, [selectedModelId, initialized, loading, detecting, recorder.isRecording, error, micError, statusMessage, detectedKeyword, detectedKeywords, chunksProcessed, downloadedModels.length, keywords.length]);

  const [hasTestKeywordsFile, setHasTestKeywordsFile] = useState(false);

  // Auto-select first downloaded model
  useEffect(() => {
    if (downloadedModels.length > 0 && !selectedModelId) {
      setSelectedModelId(downloadedModels[0].metadata.id);
    }
  }, [downloadedModels, selectedModelId]);

  // Pre-scan for test_keywords.txt when model path is available, default to using it
  useEffect(() => {
    if (!localPath || !isDownloaded) {
      setHasTestKeywordsFile(false);
      return;
    }
    (async () => {
      try {
        const dir = await resolveModelDir(localPath);
        const info = await FileSystem.getInfoAsync(`file://${dir}/test_wavs/test_keywords.txt`);
        setHasTestKeywordsFile(info.exists);
        if (info.exists) {
          setUseTestKeywords(true);
        }
      } catch {
        setHasTestKeywordsFile(false);
      }
    })();
  }, [localPath, isDownloaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (initialized) {
        KWS.release().catch((e: Error) => console.error('KWS cleanup error:', e));
      }
    };
  }, [initialized]);

  // Resolve model subdirectory
  const resolveModelDir = async (basePath: string): Promise<string> => {
    let cleanPath = basePath.replace(/^file:\/\//, '');
    try {
      const expoPath = basePath.startsWith('file://') ? basePath : `file://${basePath}`;
      const contents = await FileSystem.readDirectoryAsync(expoPath);
      const subdir = contents.find(
        (item) => item.includes('sherpa-onnx') && item.includes('kws')
      );
      if (subdir) {
        cleanPath = `${cleanPath}/${subdir}`;
      }
    } catch {
      // use base path
    }
    return cleanPath;
  };

  // Load keywords and test wavs after init
  const loadModelAssets = async (dir: string) => {
    const expoDir = dir.startsWith('file://') ? dir : `file://${dir}`;

    // Read keywords.txt
    try {
      const kwContent = await FileSystem.readAsStringAsync(`${expoDir}/keywords.txt`);
      setKeywords(parseKeywordsFile(kwContent));
    } catch (e) {
      console.warn('[KWS] Could not read keywords.txt:', e);
    }

    // Read test_keywords.txt (subset keywords that match the test wavs)
    try {
      const tkContent = await FileSystem.readAsStringAsync(`${expoDir}/test_wavs/test_keywords.txt`);
      setTestKeywords(parseKeywordsFile(tkContent));
    } catch {
      // not all models have test_keywords.txt
    }

    // Read test_wavs/ transcriptions
    const items: AudioItem[] = [];
    try {
      const transContent = await FileSystem.readAsStringAsync(`${expoDir}/test_wavs/trans.txt`);
      const lines = transContent.split('\n').filter((l) => l.trim());
      for (const line of lines) {
        const spaceIdx = line.indexOf(' ');
        if (spaceIdx === -1) continue;
        const filename = line.substring(0, spaceIdx);
        const transcript = line.substring(spaceIdx + 1).trim();
        const wavPath = `${dir}/test_wavs/${filename}`;
        // Verify file exists
        const info = await FileSystem.getInfoAsync(`file://${wavPath}`);
        if (info.exists) {
          items.push({
            id: `model-${filename}`,
            name: `${filename}: "${transcript}"`,
            localUri: wavPath,
            source: 'model',
          });
        }
      }
    } catch {
      // no test wavs
    }

    // Also add bundled audio assets
    try {
      const bundled = [
        { id: 'bundled-jfk', name: 'JFK Speech (no matching keywords)', module: require('@assets/audio/jfk.wav') },
        { id: 'bundled-en', name: 'English Voice (no matching keywords)', module: require('@assets/audio/en.wav') },
      ];
      const assets = bundled.map((b) => Asset.fromModule(b.module));
      await Promise.all(assets.map((a) => a.downloadAsync()));
      for (let i = 0; i < bundled.length; i++) {
        if (assets[i].localUri) {
          items.push({
            id: bundled[i].id,
            name: bundled[i].name,
            localUri: assets[i].localUri!.replace(/^file:\/\//, ''),
            source: 'bundled',
          });
        }
      }
    } catch (e) {
      console.warn('[KWS] Could not load bundled audio:', e);
    }

    setAudioFiles(items);
  };

  // --- Live mic KWS queue processing ---
  const processKwsQueue = useCallback(async () => {
    if (processingRef.current || !recordingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;

    processingRef.current = true;
    try {
      const result = await KWS.acceptWaveform(next.sampleRate, next.samples);
      setChunksProcessed((c) => {
        const newCount = c + 1;
        if (newCount % 10 === 0) {
          addLog(`Processed ${newCount} chunks (${next.samples.length} samples/chunk, queue: ${queueRef.current.length})`);
        }
        return newCount;
      });
      if (result.detected && result.keyword) {
        const kw = result.keyword;
        setDetectedKeywords((prev) => [...prev, kw]);
        addLog(`DETECTED: "${kw}"`);
        setStatusMessage(`Detected: "${kw}"`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`ERROR: ${msg}`);
      console.warn('[KWS] acceptWaveform error:', msg);
      setMicError(msg);
      // Stop recording on native crash to prevent repeated failures
      recordingRef.current = false;
      queueRef.current = [];
      try { await recorder.stopRecording(); } catch { /* ignore */ }
      return; // Don't process more chunks
    } finally {
      processingRef.current = false;
      if (queueRef.current.length > 0 && recordingRef.current) {
        processKwsQueue();
      }
    }
  }, [addLog, recorder]);

  const handleStartMic = useCallback(async () => {
    if (!initialized) {
      setError('KWS not initialized');
      return;
    }
    setMicError(null);
    setDetectedKeywords([]);
    setChunksProcessed(0);
    queueRef.current = [];

    try {
      const permResult = await ExpoAudioStreamModule.requestPermissionsAsync();
      if (permResult.status !== 'granted') {
        setError('Microphone permission denied');
        return;
      }

      recordingRef.current = true;
      setStatusMessage('Listening for keywords...');
      addLog('Starting mic recording at 16kHz...');

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
            const samples: number[] = Array.from(pcmValues);
            if (samples.length > 0) {
              queueRef.current.push({ samples, sampleRate: 16000 });
              processKwsQueue();
            }
          } catch (e) {
            console.warn('[KWS] Error processing audio chunk:', e);
          }
        },
      });
      addLog('Mic recording started');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Mic error: ${msg}`);
      setError(`Mic error: ${msg}`);
      recordingRef.current = false;
    }
  }, [initialized, recorder, processKwsQueue, addLog]);

  const handleStopMic = useCallback(async () => {
    recordingRef.current = false;
    queueRef.current = [];
    try {
      await recorder.stopRecording();
      const msg = detectedKeywords.length > 0
        ? `Stopped. Detected ${detectedKeywords.length} keyword(s).`
        : `Stopped. No keywords detected (${chunksProcessed} chunks processed).`;
      setStatusMessage(msg);
      addLog(msg);
    } catch (e) {
      console.warn('[KWS] Stop error:', e);
    }
  }, [recorder, detectedKeywords.length, chunksProcessed, addLog]);

  const handleInit = async () => {
    if (!selectedModelId || !kwsConfig || !localPath || !isDownloaded) {
      setError('No model selected or model not downloaded');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Initializing KWS...');

    try {
      const cleanPath = await resolveModelDir(localPath);
      setModelDir(cleanPath);
      console.log(`[KWS] Using model dir: ${cleanPath}`);

      // Decide which keywords file to use
      const kwFile = useTestKeywords ? 'test_wavs/test_keywords.txt' : (kwsConfig.keywordsFile || 'keywords.txt');

      const result = await KWS.init({
        modelDir: cleanPath,
        modelType: kwsConfig.modelType || 'zipformer2',
        modelFiles: {
          encoder: kwsConfig.modelFiles?.encoder || '',
          decoder: kwsConfig.modelFiles?.decoder || '',
          joiner: kwsConfig.modelFiles?.joiner || '',
          tokens: kwsConfig.modelFiles?.tokens || 'tokens.txt',
        },
        keywordsFile: kwFile,
        numThreads,
        debug: debugMode,
      });

      if (result.success) {
        setInitialized(true);
        setInitResult(result);
        setStatusMessage('KWS initialized successfully');
        // Load keywords display and test wavs
        await loadModelAssets(cleanPath);
      } else {
        setError(`KWS init failed: ${result.error}`);
      }
    } catch (err) {
      setError(`KWS init error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    try {
      if (recorder.isRecording) {
        recordingRef.current = false;
        await recorder.stopRecording();
      }
      await KWS.release();
      setInitialized(false);
      setInitResult(null);
      setDetectedKeyword(null);
      setDetectedKeywords([]);
      setKeywords([]);
      setTestKeywords([]);
      setAudioFiles([]);
      setSelectedAudio(null);
      setModelDir(null);
      setChunksProcessed(0);
      setStatusMessage('KWS released');
    } catch (err) {
      setError(`Release error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDetect = async (audioItem: AudioItem) => {
    if (!initialized) {
      setError('KWS not initialized');
      return;
    }

    setDetecting(true);
    setDetectedKeyword(null);
    setError(null);
    setStatusMessage(`Processing "${audioItem.name.split(':')[0]}" for keyword detection...`);

    try {
      const filePath = audioItem.localUri;
      const expoUri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;

      // Read audio file as base64 -> decode to PCM samples
      const base64 = await FileSystem.readAsStringAsync(expoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // Parse WAV header
      const dataView = new DataView(bytes.buffer);
      const sampleRate = dataView.getUint32(24, true);
      const headerSize = 44;

      // Convert int16 LE to float32
      const numSamples = Math.floor((bytes.length - headerSize) / 2);
      const samples: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        const offset = headerSize + i * 2;
        const int16 = dataView.getInt16(offset, true);
        samples.push(int16 / 32768.0);
      }

      console.log(`[KWS] Decoded ${numSamples} samples at ${sampleRate}Hz`);

      // Feed all samples at once — the native handler calls
      // acceptWaveform + decode loop internally.
      const result = await KWS.acceptWaveform(sampleRate, samples);

      if (result.detected) {
        setDetectedKeyword(result.keyword);
        setStatusMessage(`Keyword detected: "${result.keyword}"`);
        console.log(`[KWS] Detected: "${result.keyword}"`);
      } else {
        setDetectedKeyword('');
        setStatusMessage('No keyword detected in this audio');
      }
    } catch (err) {
      console.error('[KWS] Detection error:', err);
      setError(`Detection error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDetecting(false);
    }
  };

  const activeKeywords = useTestKeywords ? testKeywords : keywords;
  const modelTestWavs = audioFiles.filter((a) => a.source === 'model');
  const bundledAudio = audioFiles.filter((a) => a.source === 'bundled');

  return (
    <PageContainer>
      <LoadingOverlay visible={loading} message={statusMessage || 'Processing...'} />

      <StatusBlock status={!loading ? statusMessage : null} error={error} />

      {/* Model Selection */}
      <Section title="1. Select KWS Model">
        {downloadedModels.length === 0 ? (
          <InlineModelDownloader
            modelType="kws"
            emptyLabel="No KWS models downloaded."
            onModelDownloaded={(modelId) => setSelectedModelId(modelId)}
          />
        ) : (
          <ModelSelector
            models={downloadedModels}
            selectedId={selectedModelId}
            onSelect={setSelectedModelId}
            accentColor={theme.colors.error}
          />
        )}
      </Section>

      {/* Configuration */}
      {selectedModelId && (
        <Section title="2. Configuration">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.margin.s }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Threads:</Text>
            <TextInput
              style={{
                flex: 1,
                padding: 8,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                borderRadius: theme.roundness,
                fontSize: 16,
                color: theme.colors.onSurface,
              }}
              keyboardType="numeric"
              value={numThreads.toString()}
              onChangeText={(v) => {
                const n = parseInt(v);
                if (!isNaN(n) && n > 0) setNumThreads(n);
              }}
              editable={!initialized}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.margin.s }}>
            <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Debug:</Text>
            <Switch value={debugMode} onValueChange={setDebugMode} disabled={initialized} />
          </View>
          {!initialized && hasTestKeywordsFile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.margin.s }}>
              <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Use test keywords:</Text>
              <Switch
                testID="kws-use-test-keywords"
                value={useTestKeywords}
                onValueChange={setUseTestKeywords}
              />
            </View>
          )}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic', marginTop: 4 }}>
            {useTestKeywords
              ? 'Using test_keywords.txt (fewer keywords, matched to test audio)'
              : 'Using keywords.txt (all keywords)'}
          </Text>
        </Section>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.margin.m }}>
        <ThemedButton
          testID="kws-init-btn"
          label="Initialize"
          variant="danger"
          onPress={handleInit}
          disabled={loading || !selectedModelId || initialized}
          style={{ flex: 1, marginHorizontal: 8 }}
        />
        <ThemedButton
          testID="kws-release-btn"
          label="Release"
          variant="secondary"
          onPress={handleRelease}
          disabled={loading || !initialized}
          style={{ flex: 1, marginHorizontal: 8 }}
        />
      </View>

      {/* Active Keywords */}
      {initialized && activeKeywords.length > 0 && (
        <Section title={`Active Keywords (${activeKeywords.length})`}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
            The engine will look for these words/phrases in the audio:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {activeKeywords.map((kw, i) => (
              <View key={i} style={{
                backgroundColor: theme.colors.errorContainer ?? '#FFEBEE',
                borderColor: theme.colors.error,
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}>
                <Text variant="bodySmall" style={{ color: theme.colors.error, fontWeight: '500' }}>{kw}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Live Mic Recording */}
      {initialized && (
        <Section title="3. Live Microphone">
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
            Speak keywords into the microphone. The engine processes audio in real-time.
          </Text>
          {!recorder.isRecording ? (
            <ThemedButton
              testID="kws-start-mic"
              label="Start Listening"
              variant="primary"
              onPress={handleStartMic}
            />
          ) : (
            <View>
              <ThemedButton
                testID="kws-stop-mic"
                label="Stop Listening"
                variant="danger"
                onPress={handleStopMic}
              />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}>
                Recording: {(recorder.durationMs / 1000).toFixed(1)}s | Chunks: {chunksProcessed}
              </Text>
            </View>
          )}
          {micError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 8 }}>{micError}</Text>
          ) : null}
        </Section>
      )}

      {/* Detected Keywords */}
      {initialized && detectedKeywords.length > 0 && (
        <Section title="Detected Keywords">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {detectedKeywords.map((kw, i) => (
              <View key={i} style={{
                backgroundColor: theme.colors.successContainer ?? '#E8F5E9',
                borderColor: theme.colors.success ?? '#66BB6A',
                borderWidth: 1,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.success ?? '#2E7D32', fontWeight: '600' }}>{kw}</Text>
              </View>
            ))}
          </View>
          <ThemedButton
            label="Clear"
            variant="danger"
            compact
            onPress={() => setDetectedKeywords([])}
            style={{ marginTop: 10, alignSelf: 'flex-start' }}
          />
        </Section>
      )}

      {/* Test Audio — model's own test wavs (matched to keywords) */}
      {initialized && modelTestWavs.length > 0 && (
        <Section title="Test Audio (from model)">
          {modelTestWavs.map((audio) => (
            <TouchableOpacity
              key={audio.id}
              testID={`kws-audio-${audio.id}`}
              style={{
                padding: 12,
                marginBottom: 8,
                backgroundColor: detecting ? theme.colors.surfaceVariant : (theme.colors.errorContainer ?? '#ffebee'),
                borderRadius: theme.roundness,
              }}
              disabled={detecting}
              onPress={() => handleDetect(audio)}
            >
              <Text variant="bodyMedium" style={{ fontWeight: '500', color: detecting ? theme.colors.onSurfaceVariant : theme.colors.onSurface }}>{audio.name}</Text>
            </TouchableOpacity>
          ))}
        </Section>
      )}

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
