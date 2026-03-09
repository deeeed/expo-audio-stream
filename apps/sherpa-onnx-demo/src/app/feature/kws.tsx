import { KWS } from '@siteed/sherpa-onnx.rn';
import type { KWSInitResult } from '@siteed/sherpa-onnx.rn';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKwsModels, useKwsModelWithConfig } from '../../hooks/useModelWithConfig';
import { setAgenticPageState } from '../../agentic-bridge';

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

  // Model state
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
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
      error: error || null,
      statusMessage: statusMessage || null,
      detectedKeyword,
      downloadedModelCount: downloadedModels.length,
      keywordCount: keywords.length,
    });
  }, [selectedModelId, initialized, loading, detecting, error, statusMessage, detectedKeyword, downloadedModels.length, keywords.length]);

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
      await KWS.release();
      setInitialized(false);
      setInitResult(null);
      setDetectedKeyword(null);
      setKeywords([]);
      setTestKeywords([]);
      setAudioFiles([]);
      setSelectedAudio(null);
      setModelDir(null);
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
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#F44336" />
            <Text style={styles.loadingText}>{statusMessage || 'Processing...'}</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {statusMessage && !error && !loading ? (
          <Text style={styles.statusText}>{statusMessage}</Text>
        ) : null}

        {/* Model Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select KWS Model</Text>
          {downloadedModels.length === 0 ? (
            <View style={styles.emptyModelContainer}>
              <Text style={styles.emptyText}>No KWS models downloaded.</Text>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => router.push('/(tabs)/models?type=kws')}
              >
                <Text style={styles.downloadButtonText}>Download a model</Text>
              </TouchableOpacity>
            </View>
          ) : (
            downloadedModels.map((model) => (
              <TouchableOpacity
                key={model.metadata.id}
                style={[
                  styles.modelOption,
                  selectedModelId === model.metadata.id && styles.modelOptionSelected,
                ]}
                onPress={() => setSelectedModelId(model.metadata.id)}
              >
                <Text
                  style={[
                    styles.modelOptionText,
                    selectedModelId === model.metadata.id && styles.modelOptionTextSelected,
                  ]}
                >
                  {model.metadata.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Configuration */}
        {selectedModelId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Configuration</Text>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Threads:</Text>
              <TextInput
                style={styles.configInput}
                keyboardType="numeric"
                value={numThreads.toString()}
                onChangeText={(v) => {
                  const n = parseInt(v);
                  if (!isNaN(n) && n > 0) setNumThreads(n);
                }}
                editable={!initialized}
              />
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Debug:</Text>
              <Switch value={debugMode} onValueChange={setDebugMode} disabled={initialized} />
            </View>
            {!initialized && hasTestKeywordsFile && (
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Use test keywords:</Text>
                <Switch
                  testID="kws-use-test-keywords"
                  value={useTestKeywords}
                  onValueChange={setUseTestKeywords}
                />
              </View>
            )}
            <Text style={styles.configHint}>
              {useTestKeywords
                ? 'Using test_keywords.txt (fewer keywords, matched to test audio)'
                : 'Using keywords.txt (all keywords)'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            testID="kws-init-btn"
            style={[styles.button, styles.initButton, (!selectedModelId || loading || initialized) && styles.buttonDisabled]}
            onPress={handleInit}
            disabled={loading || !selectedModelId || initialized}
          >
            <Text style={styles.buttonText}>Initialize</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="kws-release-btn"
            style={[styles.button, styles.releaseButton, (!initialized || loading) && styles.buttonDisabled]}
            onPress={handleRelease}
            disabled={loading || !initialized}
          >
            <Text style={styles.buttonText}>Release</Text>
          </TouchableOpacity>
        </View>

        {/* Active Keywords */}
        {initialized && activeKeywords.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Active Keywords ({activeKeywords.length})
            </Text>
            <Text style={styles.keywordsHint}>
              The engine will look for these words/phrases in the audio:
            </Text>
            <View style={styles.keywordsContainer}>
              {activeKeywords.map((kw, i) => (
                <View key={i} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{kw}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Upstream bug notice */}
        {initialized && (
          <View style={[styles.section, styles.warningSection]}>
            <Text style={styles.warningTitle}>File-based detection unavailable</Text>
            <Text style={styles.warningText}>
              The upstream KWS model (sherpa-onnx v1.12.28) has a confirmed Reshape bug
              in the encoder's downsample node (T=45 produces 17 post-downsample frames,
              but the ONNX graph expects 16). This affects all decode calls.{'\n\n'}
              Live microphone streaming (small real-time chunks) may work. File-based
              detection is disabled until the upstream model is fixed.
            </Text>
          </View>
        )}

        {/* Test Audio — model's own test wavs (matched to keywords) */}
        {initialized && modelTestWavs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Test Audio (from model)</Text>
            <Text style={styles.audioHint}>
              These audio files come with the model and contain words that should be detected.
            </Text>
            {modelTestWavs.map((audio) => (
              <TouchableOpacity
                key={audio.id}
                testID={`kws-audio-${audio.id}`}
                style={[styles.audioItem, styles.audioItemMuted]}
                disabled
              >
                <Text style={styles.audioName}>{audio.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 16 },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  errorText: { color: '#f44336', textAlign: 'center', marginBottom: 8, paddingHorizontal: 16 },
  statusText: { color: '#2196F3', textAlign: 'center', marginBottom: 8, paddingHorizontal: 16 },
  emptyModelContainer: { alignItems: 'center', paddingVertical: 16 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 14 },
  downloadButton: {
    marginTop: 12,
    backgroundColor: '#F44336',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  downloadButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modelOption: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  modelOptionSelected: { backgroundColor: '#F44336' },
  modelOptionText: { fontSize: 16, color: '#333' },
  modelOptionTextSelected: { color: '#fff' },
  configRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  configLabel: { flex: 1, fontSize: 16, color: '#333' },
  configInput: {
    flex: 1,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 16,
  },
  configHint: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 4 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  button: { flex: 1, padding: 12, borderRadius: 8, marginHorizontal: 8, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  buttonDisabled: { opacity: 0.5 },
  initButton: { backgroundColor: '#F44336' },
  releaseButton: { backgroundColor: '#757575' },
  keywordsHint: { fontSize: 13, color: '#666', marginBottom: 10 },
  keywordsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keywordChip: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF9A9A',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  keywordText: { fontSize: 14, color: '#C62828', fontWeight: '500' },
  audioHint: { fontSize: 13, color: '#666', marginBottom: 10 },
  audioItem: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  audioItemMuted: {
    backgroundColor: '#f5f5f5',
  },
  selectedAudioItem: {
    backgroundColor: '#ef9a9a',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  audioName: { fontSize: 14, fontWeight: '500' },
  detectButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F44336',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  detectedContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  detectedLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  detectedKeyword: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },
  noDetection: { textAlign: 'center', color: '#666', fontStyle: 'italic', padding: 16 },
  loadingOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 250,
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333', fontWeight: 'bold' },
  warningSection: { backgroundColor: '#FFF3E0', borderColor: '#FF9800', borderWidth: 1 },
  warningTitle: { fontSize: 16, fontWeight: 'bold', color: '#E65100', marginBottom: 8 },
  warningText: { fontSize: 13, color: '#BF360C', lineHeight: 18 },
});
