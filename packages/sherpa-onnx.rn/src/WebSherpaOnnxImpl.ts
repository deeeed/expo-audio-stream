import type { ApiInterface, ArchitectureInfo, SystemInfo } from './types/api';
import type {
  AsrInitResult,
  AsrModelConfig,
  AsrRecognizeResult,
  AudioTaggingInitResult,
  AudioTaggingModelConfig,
  AudioTaggingResult,
  GetSpeakersResult,
  IdentifySpeakerResult,
  RegisterSpeakerResult,
  RemoveSpeakerResult,
  SpeakerEmbeddingResult,
  SpeakerIdFileProcessResult,
  SpeakerIdInitResult,
  SpeakerIdModelConfig,
  SpeakerIdProcessResult,
  TestOnnxIntegrationResult,
  TtsGenerateConfig,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
  ValidateResult,
  VerifySpeakerResult,
} from './types/interfaces';

// ---------------------------------------------------------------------------
// WASM Module interfaces
// ---------------------------------------------------------------------------

interface SherpaOnnxWasmModule {
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  _CopyHeap: (src: number, size: number, dst: number) => void;
  HEAPF32: Float32Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;
  HEAP8: Int8Array;
  lengthBytesUTF8: (str: string) => number;
  stringToUTF8: (str: string, outPtr: number, maxBytesToWrite: number) => void;
  UTF8ToString: (ptr: number) => string;
  setValue: (ptr: number, value: number, type: string) => void;
  getValue: (ptr: number, type: string) => number;
  ccall: (
    name: string,
    returnType: string,
    argTypes: string[],
    args: (number | string)[]
  ) => number;
  FS: {
    mkdir: (path: string, mode?: number) => void;
    writeFile: (path: string, data: Uint8Array | string) => void;
    readFile: (path: string, opts?: { encoding: string }) => string | Uint8Array;
    stat: (path: string) => { size: number; isDir: boolean; mode: number };
    readdir: (path: string) => string[];
    unlink: (path: string) => void;
    rmdir: (path: string) => void;
    analyzePath: (path: string) => { exists: boolean };
  };
  onRuntimeInitialized?: () => void;
  calledRun?: boolean;
  setStatus?: (status: string) => void;
}

// ---------------------------------------------------------------------------
// JS helper interfaces (from sherpa-onnx-*.js modules)
// ---------------------------------------------------------------------------

interface VoiceActivityDetector {
  handle: number;
  acceptWaveform: (samples: Float32Array) => void;
  isEmpty: () => boolean;
  detected: () => boolean;
  front: () => { start: number; n: number; samples: Float32Array };
  pop: () => void;
  reset: () => void;
  free: () => void;
}

interface LoadedVadModel {
  modelDir: string;
  fileName: string;
  modelPath: string;
}

interface OfflineStream {
  handle: number;
  acceptWaveform: (sampleRate: number, samples: Float32Array) => void;
  getResult: () => { text: string; tokens?: string[]; timestamps?: number[] };
  free: () => void;
}

interface OfflineRecognizer {
  handle: number;
  createStream: () => OfflineStream;
  decode: (stream: OfflineStream) => void;
  free: () => void;
}

interface OnlineStream {
  handle: number;
  acceptWaveform: (sampleRate: number, samples: Float32Array) => void;
  inputFinished: () => void;
  free: () => void;
}

interface OnlineRecognizer {
  handle: number;
  createStream: () => OnlineStream;
  isReady: (stream: OnlineStream) => boolean;
  decode: (stream: OnlineStream) => void;
  isEndpoint: (stream: OnlineStream) => boolean;
  reset: (stream: OnlineStream) => void;
  getResult: (stream: OnlineStream) => { text: string; tokens?: string[] };
  free: () => void;
}

interface LoadedAsrModel {
  modelDir: string;
  type: string;
  actualPaths: {
    encoder?: string;
    decoder?: string;
    joiner?: string;
    tokens?: string;
  };
}

interface KwsStream {
  handle: number;
  acceptWaveform: (sampleRate: number, samples: Float32Array) => void;
  inputFinished: () => void;
  free: () => void;
}

interface KwsSpotter {
  handle: number;
  createStream: () => KwsStream;
  isReady: (stream: KwsStream) => boolean;
  decode: (stream: KwsStream) => void;
  reset: (stream: KwsStream) => void;
  getResult: (stream: KwsStream) => { keyword: string };
  free: () => void;
}

interface OfflineTtsInstance {
  handle: number;
  sampleRate: number;
  numSpeakers: number;
  generate: (config: { text: string; sid: number; speed: number }) => {
    samples: Float32Array;
    sampleRate: number;
  };
  free: () => void;
}

interface SherpaOnnxFileSystem {
  safeLoadFile: (
    url: string,
    localPath: string,
    debug?: boolean
  ) => Promise<{ success: boolean; path: string } | false>;
  extractZip: (
    zipData: ArrayBuffer,
    targetPath: string,
    debug?: boolean
  ) => Promise<{ success: boolean; files?: string[]; error?: string }>;
  fileExists: (path: string) => boolean;
  removePath: (path: string, debug?: boolean) => boolean;
}

interface SherpaOnnxVadModule {
  loadModel: (config: {
    model: string;
    modelDir?: string;
    fileName?: string;
    debug?: boolean;
    cleanStart?: boolean;
  }) => Promise<LoadedVadModel>;
  createVoiceActivityDetector: (
    loadedModel: LoadedVadModel,
    options?: {
      threshold?: number;
      minSilenceDuration?: number;
      minSpeechDuration?: number;
      windowSize?: number;
      maxSpeechDuration?: number;
      sampleRate?: number;
      numThreads?: number;
      bufferSizeInSeconds?: number;
      debug?: boolean;
    }
  ) => VoiceActivityDetector;
}

interface SherpaOnnxAsrModule {
  loadModel: (config: {
    type: string;
    encoder?: string;
    decoder?: string;
    joiner?: string;
    tokens?: string;
    modelDir?: string;
    debug?: boolean;
  }) => Promise<LoadedAsrModel>;
  createOfflineRecognizer: (
    loadedModel: LoadedAsrModel,
    options?: {
      sampleRate?: number;
      numThreads?: number;
      debug?: boolean;
    }
  ) => OfflineRecognizer;
  createOnlineRecognizer: (
    loadedModel: LoadedAsrModel,
    options?: {
      sampleRate?: number;
      numThreads?: number;
      debug?: boolean;
      decodingMethod?: string;
      maxActivePaths?: number;
      enableEndpoint?: number;
    }
  ) => OnlineRecognizer;
}

interface SherpaOnnxTtsModule {
  loadModel: (config: {
    type: string;
    model?: string;
    tokens?: string;
    lexicon?: string;
    espeakDataZip?: string;
    debug?: boolean;
    modelDir?: string;
  }) => Promise<{ modelDir: string; type: string; files: Record<string, string> }>;
  createOfflineTts: (
    loadedModel: { modelDir: string; type: string; files: Record<string, string> },
    options?: { numThreads?: number; debug?: boolean }
  ) => OfflineTtsInstance;
}

interface SherpaOnnxKwsModule {
  loadModel: (config: {
    encoder?: string;
    decoder?: string;
    joiner?: string;
    tokens?: string;
    keywordsFile?: string;
    modelDir?: string;
    debug?: boolean;
  }) => Promise<{ modelDir: string; paths: Record<string, string | object> }>;
  createKeywordSpotter: (
    loadedModel: { modelDir: string; paths: Record<string, string | object> },
    options?: {
      keywords?: string;
      sampleRate?: number;
      numThreads?: number;
      keywordsScore?: number;
      keywordsThreshold?: number;
      debug?: boolean;
    }
  ) => KwsSpotter;
}

interface OfflineSpeechDenoiserInstance {
  handle: number;
  sampleRate: number;
  run: (
    samples: Float32Array,
    sampleRate: number
  ) => { samples: Float32Array; sampleRate: number };
  free: () => void;
}

interface OfflineSpeakerDiarizationInstance {
  handle: number;
  sampleRate: number;
  process: (
    samples: Float32Array
  ) => Array<{ start: number; end: number; speaker: number }>;
  setConfig: (config: object) => void;
  free: () => void;
}

interface SherpaOnnxSpeechEnhancementModule {
  loadModel: (config: {
    model: string;
    modelDir?: string;
    debug?: boolean;
  }) => Promise<{ modelDir: string; modelPath: string }>;
  createDenoiser: (
    loadedModel: { modelDir: string; modelPath: string },
    options?: { debug?: boolean; numThreads?: number; provider?: string }
  ) => OfflineSpeechDenoiserInstance;
}

interface SherpaOnnxSpeakerDiarizationModule {
  loadModel: (config: {
    segmentation: string;
    embedding: string;
    modelDir?: string;
    debug?: boolean;
  }) => Promise<{
    modelDir: string;
    segmentationPath: string;
    embeddingPath: string;
  }>;
  createDiarization: (
    loadedModel: {
      modelDir: string;
      segmentationPath: string;
      embeddingPath: string;
    },
    options?: {
      debug?: boolean;
      numThreads?: number;
      provider?: string;
      numClusters?: number;
      threshold?: number;
      minDurationOn?: number;
      minDurationOff?: number;
    }
  ) => OfflineSpeakerDiarizationInstance;
}

interface AudioTaggingInstance {
  handle: number;
  topK: number;
  createStream: () => number;
  acceptWaveform: (stream: number, sampleRate: number, samples: Float32Array) => void;
  compute: (stream: number, topK: number) => Array<{ name: string; index: number; prob: number }>;
  free: () => void;
}

interface SherpaOnnxAudioTaggingModule {
  loadModel: (config: {
    ced?: string;
    labels?: string;
    modelDir?: string;
    debug?: boolean;
  }) => Promise<{ modelDir: string; modelPath: string; labelsPath: string }>;
  createAudioTagging: (
    loadedModel: { modelDir: string; modelPath: string; labelsPath: string },
    options?: { topK?: number; numThreads?: number; debug?: boolean }
  ) => AudioTaggingInstance;
}

interface SpokenLanguageIdInstance {
  handle: number;
  createStream: () => number;
  acceptWaveform: (stream: number, sampleRate: number, samples: Float32Array) => void;
  compute: (stream: number) => string;
  free: () => void;
}

interface SherpaOnnxLanguageIdModule {
  loadModel: (config: {
    encoder?: string;
    decoder?: string;
    modelDir?: string;
    debug?: boolean;
  }) => Promise<{ modelDir: string; encoderPath: string; decoderPath: string }>;
  createLanguageId: (
    loadedModel: { modelDir: string; encoderPath: string; decoderPath: string },
    options?: { numThreads?: number; debug?: boolean; tailPaddings?: number }
  ) => SpokenLanguageIdInstance;
}

interface SpeakerEmbeddingExtractorInstance {
  handle: number;
  dim: () => number;
  createStream: () => number;
  acceptWaveform: (stream: number, sampleRate: number, samples: Float32Array) => void;
  inputFinished: (stream: number) => void;
  isReady: (stream: number) => boolean;
  computeEmbedding: (stream: number) => Float32Array;
  destroyStream: (stream: number) => void;
  free: () => void;
}

interface SpeakerEmbeddingManagerInstance {
  handle: number;
  add: (name: string, embedding: Float32Array) => boolean;
  remove: (name: string) => boolean;
  search: (embedding: Float32Array, threshold: number) => string;
  verify: (name: string, embedding: Float32Array, threshold: number) => boolean;
  contains: (name: string) => boolean;
  numSpeakers: () => number;
  getAllSpeakers: () => string[];
  free: () => void;
}

interface SherpaOnnxSpeakerIdModule {
  loadModel: (config: {
    model?: string;
    modelDir?: string;
    debug?: boolean;
  }) => Promise<{ modelDir: string; modelPath: string }>;
  createExtractor: (
    loadedModel: { modelDir: string; modelPath: string },
    options?: { numThreads?: number; debug?: boolean }
  ) => SpeakerEmbeddingExtractorInstance;
  createManager: (dim: number) => SpeakerEmbeddingManagerInstance;
}

interface OnlinePunctuationInstance {
  handle: number;
  addPunct: (text: string) => string;
  free: () => void;
}

interface SherpaOnnxPunctuationModule {
  loadModel: (config: {
    cnnBilstm?: string;
    bpeVocab?: string;
    modelDir?: string;
    debug?: boolean;
  }) => Promise<{ modelDir: string; modelPath: string; vocabPath: string }>;
  createPunctuation: (
    loadedModel: { modelDir: string; modelPath: string; vocabPath: string },
    options?: { numThreads?: number; debug?: boolean }
  ) => OnlinePunctuationInstance;
}

interface SherpaOnnxNamespace {
  FileSystem: SherpaOnnxFileSystem;
  VAD: SherpaOnnxVadModule;
  ASR: SherpaOnnxAsrModule;
  TTS: SherpaOnnxTtsModule;
  KWS: SherpaOnnxKwsModule;
  SpeechEnhancement?: SherpaOnnxSpeechEnhancementModule;
  SpeakerDiarization?: SherpaOnnxSpeakerDiarizationModule;
  AudioTagging?: SherpaOnnxAudioTaggingModule;
  LanguageId?: SherpaOnnxLanguageIdModule;
  SpeakerId?: SherpaOnnxSpeakerIdModule;
  Punctuation?: SherpaOnnxPunctuationModule;
}

// ---------------------------------------------------------------------------
// Global window extensions
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    Module: SherpaOnnxWasmModule;
    SherpaOnnx: SherpaOnnxNamespace;
    createOfflineTts: (
      module: SherpaOnnxWasmModule,
      config?: object
    ) => OfflineTtsInstance;
    onSherpaOnnxReady?: (success: boolean) => void;
    _sherpaOnnxCombinedLoaded?: boolean;
    _sherpaOnnxLoadingPromise?: Promise<void> | undefined;
  }
}

// ---------------------------------------------------------------------------
// Script loader
// ---------------------------------------------------------------------------

function loadScriptTag(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${url}"]`
    );
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.async = false; // sequential loading required
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// Combined WASM loader (idempotent)
// ---------------------------------------------------------------------------

/** Return true if the WASM runtime and all feature JS modules are ready. */
function isSherpaOnnxReady(): boolean {
  return !!(
    window.Module &&
    window.Module.calledRun &&
    window.Module.FS &&
    window.SherpaOnnx &&
    window.SherpaOnnx.VAD &&
    window.SherpaOnnx.ASR &&
    window.SherpaOnnx.TTS &&
    window.SherpaOnnx.KWS
  );
}

async function loadCombinedWasm(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('WASM modules can only be loaded in a browser environment');
  }

  // Already confirmed loaded
  if (window._sherpaOnnxCombinedLoaded) return;

  // Fast-path: WASM + all feature modules are already present (e.g. page
  // reloaded the scripts but our flag was lost, or loading completed before
  // the timeout in a prior call).
  if (isSherpaOnnxReady()) {
    window._sherpaOnnxCombinedLoaded = true;
    return;
  }

  // If a load is in progress, wait for it — but if it already rejected (e.g.
  // due to a prior timeout) and the runtime is now ready, clear the stale
  // promise so we can re-enter.
  if (window._sherpaOnnxLoadingPromise) {
    try {
      return await window._sherpaOnnxLoadingPromise;
    } catch {
      // Prior attempt failed; if the runtime is now ready accept it.
      if (isSherpaOnnxReady()) {
        window._sherpaOnnxCombinedLoaded = true;
        window._sherpaOnnxLoadingPromise = undefined;
        return;
      }
      // Otherwise clear the stale promise and retry below.
      window._sherpaOnnxLoadingPromise = undefined;
    }
  }

  const promise = (async () => {
    // 1. Load the combined WASM binary + JS glue.
    //    This sets up window.Module (the Emscripten module object).
    await loadScriptTag('/wasm/sherpa-onnx-wasm-combined.js');

    // 2. Hook Module.onRuntimeInitialized so we know when the WASM binary
    //    finishes compiling.  We do this AFTER loading the glue JS (which
    //    creates window.Module) but BEFORE loading sherpa-onnx-combined.js
    //    (which may also hook it — we preserve the chain).
    const readyPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => {
          if (isSherpaOnnxReady()) resolve();
          else reject(new Error('Sherpa ONNX WASM loading timeout (180s)'));
        },
        180_000
      );

      // If Module.FS is already available the WASM already finished compiling
      // (e.g. cached, instantaneous — just poll to let feature modules load).
      const pollReady = () => {
        if (isSherpaOnnxReady()) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(pollReady, 300);
        }
      };

      if (window.Module && window.Module.FS) {
        // WASM binary already compiled; just wait for feature modules.
        pollReady();
      } else if (window.Module) {
        // Glue JS loaded, binary still compiling — wrap onRuntimeInitialized.
        const prev = window.Module.onRuntimeInitialized;
        window.Module.onRuntimeInitialized = () => {
          if (prev) prev();
          // Feature modules may need a tick to finish loading after runtime init.
          pollReady();
        };
      } else {
        // Should not happen after step 1, but fall back to polling.
        pollReady();
      }

      // Also accept the onSherpaOnnxReady callback fired by
      // sherpa-onnx-combined.js (for the case where it loaded first).
      window.onSherpaOnnxReady = (success: boolean) => {
        clearTimeout(timeout);
        if (success) resolve();
        else if (isSherpaOnnxReady()) resolve(); // partial load still OK
        else reject(new Error('Sherpa ONNX feature modules failed to load'));
      };
    });

    // 3. Load the combined module orchestrator which:
    //    - Hooks into Module.onRuntimeInitialized
    //    - Loads feature JS modules (core, vad, asr, tts, kws, etc.)
    //    - Calls window.onSherpaOnnxReady when done
    await loadScriptTag('/wasm/sherpa-onnx-combined.js');

    // 5. Wait for WASM runtime init + all feature modules ready
    await readyPromise;

    window._sherpaOnnxCombinedLoaded = true;
  })();

  window._sherpaOnnxLoadingPromise = promise;
  return promise;
}

// ---------------------------------------------------------------------------
// Audio utilities
// ---------------------------------------------------------------------------

function samplesToWav(samples: Float32Array, sampleRate: number): Blob {
  const intSamples = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] ?? 0;
    const clamped = s < -1 ? -1 : s > 1 ? 1 : s;
    intSamples[i] = Math.round(clamped * 32767);
  }

  const buffer = new ArrayBuffer(44 + intSamples.length * 2);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46464952, true);
  view.setUint32(4, 36 + intSamples.length * 2, true);
  view.setUint32(8, 0x45564157, true);
  view.setUint32(12, 0x20746d66, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x61746164, true);
  view.setUint32(40, intSamples.length * 2, true);
  for (let i = 0; i < intSamples.length; i++) {
    view.setInt16(44 + i * 2, intSamples[i] ?? 0, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function playAudioSamples(
  samples: Float32Array,
  sampleRate: number
): Promise<void> {
  type AudioContextType = typeof window.AudioContext;
  const AudioContext: AudioContextType =
    window.AudioContext ||
    (window as { webkitAudioContext?: AudioContextType }).webkitAudioContext;

  if (!AudioContext) {
    throw new Error('AudioContext not supported in this browser');
  }

  const audioContext = new AudioContext({ sampleRate });
  const buf = audioContext.createBuffer(1, samples.length, sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < samples.length; i++) ch[i] = samples[i] ?? 0;

  const source = audioContext.createBufferSource();
  source.buffer = buf;
  source.connect(audioContext.destination);
  source.start();

  return new Promise((resolve) => {
    source.onended = () => resolve();
  });
}

/**
 * Decode a 16-bit PCM WAV ArrayBuffer into Float32 samples.
 * Returns null if the format is not supported.
 */
function decodeWav(
  buffer: ArrayBuffer
): { samples: Float32Array; sampleRate: number } | null {
  const view = new DataView(buffer);
  // Basic WAV header validation
  if (view.getUint32(0, false) !== 0x52494646) return null; // "RIFF"
  if (view.getUint32(8, false) !== 0x57415645) return null; // "WAVE"
  if (view.getUint32(12, false) !== 0x666d7420) return null; // "fmt "
  const audioFormat = view.getUint16(20, true);
  if (audioFormat !== 1) return null; // PCM only
  const channels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  if (bitsPerSample !== 16) return null;

  // Find "data" chunk
  let dataOffset = 36;
  while (dataOffset < buffer.byteLength - 8) {
    const tag = view.getUint32(dataOffset, false);
    const chunkSize = view.getUint32(dataOffset + 4, true);
    if (tag === 0x64617461) {
      // "data"
      dataOffset += 8;
      break;
    }
    dataOffset += 8 + chunkSize;
  }

  const numSamples = Math.floor((buffer.byteLength - dataOffset) / 2 / channels);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    // Take first channel only for mono ASR
    const pcm = view.getInt16(dataOffset + i * channels * 2, true);
    samples[i] = pcm / 32768.0;
  }
  return { samples, sampleRate };
}

/**
 * Fetch an audio file and decode it to Float32 samples.
 * Tries WAV decoding first, falls back to AudioContext.decodeAudioData.
 */
async function fetchAndDecodeAudio(
  url: string
): Promise<{ samples: Float32Array; sampleRate: number }> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();

  // Try WAV decoding first (faster, no async overhead)
  const wav = decodeWav(buffer);
  if (wav) return wav;

  // Fall back to Web Audio API for other formats
  type AudioContextType = typeof window.AudioContext;
  const AudioContext: AudioContextType =
    window.AudioContext ||
    (window as { webkitAudioContext?: AudioContextType }).webkitAudioContext;

  if (!AudioContext) {
    throw new Error('Cannot decode audio: no AudioContext available');
  }

  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(buffer);
  const samples = audioBuffer.getChannelData(0); // mono
  const sampleRate = audioBuffer.sampleRate;
  ctx.close();
  return { samples: new Float32Array(samples), sampleRate };
}

// ---------------------------------------------------------------------------
// WebSherpaOnnxImpl
// ---------------------------------------------------------------------------

export class WebSherpaOnnxImpl implements ApiInterface {
  private tts: OfflineTtsInstance | null = null;
  private ttsSampleRate = 0;
  private ttsNumSpeakers = 0;

  private vad: VoiceActivityDetector | null = null;

  private asrRecognizer: OfflineRecognizer | null = null;
  private asrOnlineRecognizer: OnlineRecognizer | null = null;

  private kwsSpotter: KwsSpotter | null = null;
  private kwsStream: KwsStream | null = null;

  private denoiser: OfflineSpeechDenoiserInstance | null = null;
  private diarization: OfflineSpeakerDiarizationInstance | null = null;

  private audioTagger: AudioTaggingInstance | null = null;
  private languageId: SpokenLanguageIdInstance | null = null;
  private speakerExtractor: SpeakerEmbeddingExtractorInstance | null = null;
  private speakerManager: SpeakerEmbeddingManagerInstance | null = null;
  private punctuation: OnlinePunctuationInstance | null = null;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private get sherpaOnnx(): SherpaOnnxNamespace {
    return window.SherpaOnnx;
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  async testOnnxIntegration(): Promise<TestOnnxIntegrationResult> {
    try {
      await loadCombinedWasm();
      return {
        success: true,
        status: 'Sherpa ONNX combined WASM integration is working',
      };
    } catch (error) {
      return {
        success: false,
        status: `Sherpa ONNX WASM failed: ${(error as Error).message}`,
      };
    }
  }

  async validateLibraryLoaded(): Promise<ValidateResult> {
    try {
      await loadCombinedWasm();
      return {
        loaded: true,
        status: 'Sherpa ONNX combined WASM loaded successfully',
      };
    } catch (error) {
      return {
        loaded: false,
        status: `Sherpa ONNX WASM failed to load: ${(error as Error).message}`,
      };
    }
  }

  async getArchitectureInfo(): Promise<ArchitectureInfo> {
    return {
      architecture: 'web',
      jsiAvailable: false,
      turboModulesEnabled: false,
      libraryLoaded: !!window._sherpaOnnxCombinedLoaded,
      currentThread: 'main',
      threadId: 1,
      moduleType: 'WASM',
    };
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const isLibraryLoaded = !!window._sherpaOnnxCombinedLoaded;

    const memory: SystemInfo['memory'] = {
      maxMemoryMB: 0,
      totalMemoryMB: 0,
      freeMemoryMB: 0,
      usedMemoryMB: 0,
    };
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const pm = (performance as any).memory;
      if (pm) {
        memory.maxMemoryMB = (pm.jsHeapSizeLimit || 0) / 1048576;
        memory.totalMemoryMB = (pm.totalJSHeapSize || 0) / 1048576;
        memory.usedMemoryMB = (pm.usedJSHeapSize || 0) / 1048576;
        memory.freeMemoryMB = memory.totalMemoryMB - memory.usedMemoryMB;
      }
    }

    const userAgent = navigator.userAgent;
    const platformInfo =
      (navigator as any).userAgentData?.platform ||
      (navigator as any).platform ||
      'Unknown';
    const vendor = (navigator as any).vendor || 'Unknown';
    let brand = vendor;
    if (userAgent.includes('Chrome')) brand = 'Google';
    else if (userAgent.includes('Firefox')) brand = 'Mozilla';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
      brand = 'Apple';

    const gpu: SystemInfo['gpu'] = { webGLVersion: 'WebGL' };
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl instanceof WebGLRenderingContext) {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        if (info) {
          const renderer = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
          gpu.webGLVersion = `WebGL (${renderer})`;
        }
      }
    }

    return {
      architecture: {
        type: 'old',
        description: 'Web (WASM)',
        jsiAvailable: false,
        turboModulesEnabled: false,
        moduleType: 'WASM',
      },
      memory,
      cpu: {
        availableProcessors: navigator.hardwareConcurrency || 1,
        supportedAbis: ['wasm32'],
      },
      device: {
        brand,
        model: platformInfo,
        device: 'browser',
        manufacturer: brand,
        webPlatform: userAgent,
      },
      gpu,
      libraryLoaded: isLibraryLoaded,
      thread: { currentThread: 'main', threadId: 1 },
    };
  }

  // -------------------------------------------------------------------------
  // TTS
  // -------------------------------------------------------------------------

  async initTts(_config: TtsModelConfig): Promise<TtsInitResult> {
    try {
      await loadCombinedWasm();

      console.log('[TTS] Loading model from /wasm/tts/...');
      const loadedModel = await this.sherpaOnnx.TTS.loadModel({
        type: 'vits',
        model: '/wasm/tts/model.onnx',
        tokens: '/wasm/tts/tokens.txt',
        espeakDataZip: '/wasm/tts/espeak-ng-data.zip',
        debug: false,
      });

      this.tts = this.sherpaOnnx.TTS.createOfflineTts(loadedModel, {});
      this.ttsSampleRate = this.tts.sampleRate;
      this.ttsNumSpeakers = this.tts.numSpeakers;

      console.log(
        `[TTS] Initialized: sampleRate=${this.ttsSampleRate}, numSpeakers=${this.ttsNumSpeakers}`
      );

      return {
        success: true,
        sampleRate: this.ttsSampleRate,
        numSpeakers: this.ttsNumSpeakers,
      };
    } catch (error) {
      console.error('[TTS] initTts failed:', error);
      return {
        success: false,
        sampleRate: 0,
        numSpeakers: 0,
        error: (error as Error).message,
      };
    }
  }

  async generateTts(config: TtsGenerateConfig): Promise<TtsGenerateResult> {
    if (!this.tts) {
      return { success: false };
    }
    try {
      const audio = this.tts.generate({
        text: config.text,
        sid: config.speakerId,
        speed: config.speakingRate,
      });
      const samples = new Float32Array(audio.samples);
      const result: TtsGenerateResult = { success: true };

      if (config.playAudio) {
        await playAudioSamples(samples, audio.sampleRate);
      }
      if (config.fileNamePrefix) {
        const wav = samplesToWav(samples, audio.sampleRate);
        result.filePath = URL.createObjectURL(wav);
      }
      return result;
    } catch (error) {
      console.error('[TTS] generateTts failed:', error);
      return { success: false };
    }
  }

  async stopTts(): Promise<{ stopped: boolean; message?: string }> {
    return { stopped: true };
  }

  async releaseTts(): Promise<{ released: boolean }> {
    if (this.tts) {
      try {
        this.tts.free();
      } catch (_e) {
        // ignore
      }
      this.tts = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // VAD
  // -------------------------------------------------------------------------

  async initVad(_config: any): Promise<{ success: boolean; error?: string }> {
    try {
      await loadCombinedWasm();

      console.log('[VAD] Loading silero_vad model...');
      const loadedModel = await this.sherpaOnnx.VAD.loadModel({
        model: '/wasm/vad/silero_vad.onnx',
        modelDir: 'vad-models',
        fileName: 'silero_vad.onnx',
        debug: false,
      });

      this.vad = this.sherpaOnnx.VAD.createVoiceActivityDetector(
        loadedModel,
        {
          threshold: 0.5,
          minSilenceDuration: 0.3,
          minSpeechDuration: 0.1,
          windowSize: 512,
          maxSpeechDuration: 30.0,
          sampleRate: 16000,
          numThreads: 1,
          bufferSizeInSeconds: 5.0,
          debug: false,
        }
      );

      console.log('[VAD] Initialized');
      return { success: true };
    } catch (error) {
      console.error('[VAD] initVad failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async acceptVadWaveform(
    _sampleRate: number,
    samples: number[]
  ): Promise<{
    success: boolean;
    isSpeechDetected: boolean;
    segments: any[];
    error?: string;
  }> {
    if (!this.vad) {
      return {
        success: false,
        isSpeechDetected: false,
        segments: [],
        error: 'VAD not initialized',
      };
    }
    try {
      const float32 = new Float32Array(samples);
      this.vad.acceptWaveform(float32);
      const isSpeechDetected = this.vad.detected();

      // Extract completed speech segments
      const segments: any[] = [];
      while (!this.vad.isEmpty()) {
        const seg = this.vad.front();
        this.vad.pop();
        const startTime = seg.start / (_sampleRate || 16000);
        const endTime = startTime + seg.n / (_sampleRate || 16000);
        segments.push({
          startTime,
          endTime,
          samples: seg.samples,
        });
      }

      return { success: true, isSpeechDetected, segments };
    } catch (error) {
      return {
        success: false,
        isSpeechDetected: false,
        segments: [],
        error: (error as Error).message,
      };
    }
  }

  async resetVad(): Promise<{ success: boolean }> {
    if (this.vad) {
      try {
        this.vad.reset();
      } catch (_e) {
        // ignore
      }
    }
    return { success: true };
  }

  async releaseVad(): Promise<{ released: boolean }> {
    if (this.vad) {
      try {
        this.vad.free();
      } catch (_e) {
        // ignore
      }
      this.vad = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // ASR (online streaming transducer — preloaded /wasm/asr/ models are online)
  // -------------------------------------------------------------------------

  async initAsr(_config: AsrModelConfig): Promise<AsrInitResult> {
    try {
      await loadCombinedWasm();

      console.log('[ASR] Loading online transducer model...');
      const loadedModel = await this.sherpaOnnx.ASR.loadModel({
        type: 'transducer',
        encoder: '/wasm/asr/encoder.onnx',
        decoder: '/wasm/asr/decoder.onnx',
        joiner: '/wasm/asr/joiner.onnx',
        tokens: '/wasm/asr/tokens.txt',
        debug: false,
      });

      this.asrOnlineRecognizer = this.sherpaOnnx.ASR.createOnlineRecognizer(
        loadedModel,
        { sampleRate: 16000, numThreads: 1, debug: false, enableEndpoint: 0 }
      );

      console.log('[ASR] Initialized (online recognizer)');
      return { success: true };
    } catch (error) {
      console.error('[ASR] initAsr failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AsrRecognizeResult> {
    if (!this.asrOnlineRecognizer) {
      return { success: false, text: '', error: 'ASR not initialized' };
    }
    try {
      const float32 = new Float32Array(samples);
      const stream = this.asrOnlineRecognizer.createStream();
      stream.acceptWaveform(sampleRate, float32);
      stream.inputFinished();
      while (this.asrOnlineRecognizer.isReady(stream)) {
        this.asrOnlineRecognizer.decode(stream);
      }
      const result = this.asrOnlineRecognizer.getResult(stream);
      stream.free();
      return { success: true, text: result.text };
    } catch (error) {
      return {
        success: false,
        text: '',
        error: (error as Error).message,
      };
    }
  }

  async recognizeFromFile(filePath: string): Promise<AsrRecognizeResult> {
    if (!this.asrOnlineRecognizer) {
      return { success: false, text: '', error: 'ASR not initialized' };
    }
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      const decoded = decodeWav(buffer);
      if (!decoded) {
        throw new Error(
          'Unsupported audio format — only 16-bit PCM WAV is supported on web'
        );
      }
      const stream = this.asrOnlineRecognizer.createStream();
      stream.acceptWaveform(decoded.sampleRate, decoded.samples);
      stream.inputFinished();
      while (this.asrOnlineRecognizer.isReady(stream)) {
        this.asrOnlineRecognizer.decode(stream);
      }
      const result = this.asrOnlineRecognizer.getResult(stream);
      stream.free();
      return { success: true, text: result.text };
    } catch (error) {
      return {
        success: false,
        text: '',
        error: (error as Error).message,
      };
    }
  }

  async releaseAsr(): Promise<{ released: boolean }> {
    if (this.asrOnlineRecognizer) {
      try {
        this.asrOnlineRecognizer.free();
      } catch (_e) {
        // ignore
      }
      this.asrOnlineRecognizer = null;
    }
    if (this.asrRecognizer) {
      try {
        this.asrRecognizer.free();
      } catch (_e) {
        // ignore
      }
      this.asrRecognizer = null;
    }
    return { released: true };
  }

  async createAsrOnlineStream(): Promise<{ success: boolean }> {
    return { success: false };
  }

  async acceptAsrOnlineWaveform(
    _sampleRate: number,
    _samples: number[]
  ): Promise<{ success: boolean }> {
    return { success: false };
  }

  async isAsrOnlineEndpoint(): Promise<{ isEndpoint: boolean }> {
    return { isEndpoint: false };
  }

  async getAsrOnlineResult(): Promise<{
    text: string;
    tokens: string[];
    timestamps: number[];
  }> {
    return { text: '', tokens: [], timestamps: [] };
  }

  async resetAsrOnlineStream(): Promise<{ success: boolean }> {
    return { success: false };
  }

  // -------------------------------------------------------------------------
  // KWS (Keyword Spotting)
  // -------------------------------------------------------------------------

  async initKws(config: any): Promise<{ success: boolean; error?: string }> {
    try {
      await loadCombinedWasm();

      console.log('[KWS] Loading model...');
      const loadedModel = await this.sherpaOnnx.KWS.loadModel({
        encoder: '/wasm/kws/encoder.onnx',
        decoder: '/wasm/kws/decoder.onnx',
        joiner: '/wasm/kws/joiner.onnx',
        tokens: '/wasm/kws/tokens.txt',
        debug: false,
      });

      // Build keywords string from config or use defaults
      const keywords: string =
        config?.keywords ??
        'h e l l o @Hello\nc o m p u t e r @Computer\ns h e r p a @Sherpa';

      this.kwsSpotter = this.sherpaOnnx.KWS.createKeywordSpotter(
        loadedModel,
        {
          keywords,
          sampleRate: 16000,
          numThreads: 1,
          keywordsScore: 1.0,
          keywordsThreshold: 0.25,
          debug: false,
        }
      );

      // Create initial stream
      this.kwsStream = this.kwsSpotter.createStream();

      console.log('[KWS] Initialized');
      return { success: true };
    } catch (error) {
      console.error('[KWS] initKws failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async acceptKwsWaveform(
    sampleRate: number,
    samples: number[]
  ): Promise<{
    success: boolean;
    detected: boolean;
    keyword: string;
    error?: string;
  }> {
    if (!this.kwsSpotter || !this.kwsStream) {
      return {
        success: false,
        detected: false,
        keyword: '',
        error: 'KWS not initialized',
      };
    }
    try {
      const float32 = new Float32Array(samples);
      this.kwsStream.acceptWaveform(sampleRate, float32);

      let detectedKeyword = '';
      while (this.kwsSpotter.isReady(this.kwsStream)) {
        this.kwsSpotter.decode(this.kwsStream);
        const result = this.kwsSpotter.getResult(this.kwsStream);
        if (result.keyword && result.keyword.trim() !== '') {
          detectedKeyword = result.keyword;
          // Reset stream after detection
          this.kwsSpotter.reset(this.kwsStream);
          break;
        }
      }

      return {
        success: true,
        detected: detectedKeyword !== '',
        keyword: detectedKeyword,
      };
    } catch (error) {
      return {
        success: false,
        detected: false,
        keyword: '',
        error: (error as Error).message,
      };
    }
  }

  async resetKwsStream(): Promise<{ success: boolean }> {
    if (this.kwsSpotter && this.kwsStream) {
      try {
        this.kwsStream.free();
        this.kwsStream = this.kwsSpotter.createStream();
      } catch (_e) {
        // ignore
      }
    }
    return { success: true };
  }

  async releaseKws(): Promise<{ released: boolean }> {
    if (this.kwsStream) {
      try {
        this.kwsStream.free();
      } catch (_e) {
        // ignore
      }
      this.kwsStream = null;
    }
    if (this.kwsSpotter) {
      try {
        this.kwsSpotter.free();
      } catch (_e) {
        // ignore
      }
      this.kwsSpotter = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // Audio Tagging
  // -------------------------------------------------------------------------

  async initAudioTagging(
    _config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    try {
      await loadCombinedWasm();

      if (!this.sherpaOnnx.AudioTagging) {
        return { success: false, error: 'AudioTagging module not loaded' };
      }

      console.log('[AudioTagging] Loading model from /wasm/audio-tagging/...');
      const loadedModel = await this.sherpaOnnx.AudioTagging.loadModel({
        ced: '/wasm/audio-tagging/model.onnx',
        labels: '/wasm/audio-tagging/labels.txt',
        debug: false,
      });

      this.audioTagger = this.sherpaOnnx.AudioTagging.createAudioTagging(
        loadedModel,
        { topK: _config.topK || 5 }
      );

      console.log('[AudioTagging] Initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('[AudioTagging] initAudioTagging failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async processAndComputeAudioTagging(
    _filePath: string
  ): Promise<AudioTaggingResult> {
    if (!this.audioTagger) {
      return { success: false, durationMs: 0, events: [], error: 'Audio tagging not initialized' };
    }
    try {
      const startMs = performance.now();
      const { samples, sampleRate } = await fetchAndDecodeAudio(_filePath);

      const stream = this.audioTagger.createStream();
      this.audioTagger.acceptWaveform(stream, sampleRate, samples);
      const events = this.audioTagger.compute(stream, -1);
      const durationMs = performance.now() - startMs;

      return {
        success: true,
        durationMs,
        events: events.map((e) => ({ name: e.name, prob: e.prob, index: e.index })),
      };
    } catch (error) {
      console.error('[AudioTagging] processAndComputeAudioTagging failed:', error);
      return { success: false, durationMs: 0, events: [], error: (error as Error).message };
    }
  }

  async processAndComputeAudioSamples(
    _sampleRate: number,
    _samples: number[]
  ): Promise<AudioTaggingResult> {
    if (!this.audioTagger) {
      return { success: false, durationMs: 0, events: [], error: 'Audio tagging not initialized' };
    }
    try {
      const startMs = performance.now();
      const samples = new Float32Array(_samples);

      const stream = this.audioTagger.createStream();
      this.audioTagger.acceptWaveform(stream, _sampleRate, samples);
      const events = this.audioTagger.compute(stream, -1);
      const durationMs = performance.now() - startMs;

      return {
        success: true,
        durationMs,
        events: events.map((e) => ({ name: e.name, prob: e.prob, index: e.index })),
      };
    } catch (error) {
      console.error('[AudioTagging] processAndComputeAudioSamples failed:', error);
      return { success: false, durationMs: 0, events: [], error: (error as Error).message };
    }
  }

  async releaseAudioTagging(): Promise<{ released: boolean }> {
    if (this.audioTagger) {
      try { this.audioTagger.free(); } catch (_e) { /* ignore */ }
      this.audioTagger = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // Speaker ID
  // -------------------------------------------------------------------------

  private speakerIdStream: number | null = null;
  private speakerIdSamplesProcessed = 0;

  async initSpeakerId(
    _config: SpeakerIdModelConfig
  ): Promise<SpeakerIdInitResult> {
    try {
      await loadCombinedWasm();

      if (!this.sherpaOnnx.SpeakerId) {
        return { success: false, embeddingDim: 0, error: 'SpeakerId module not loaded' };
      }

      console.log('[SpeakerId] Loading model from /wasm/speaker-id/...');
      const loadedModel = await this.sherpaOnnx.SpeakerId.loadModel({
        model: '/wasm/speaker-id/model.onnx',
        debug: false,
      });

      this.speakerExtractor = this.sherpaOnnx.SpeakerId.createExtractor(loadedModel);
      const dim = this.speakerExtractor.dim();
      this.speakerManager = this.sherpaOnnx.SpeakerId.createManager(dim);

      console.log(`[SpeakerId] Initialized: dim=${dim}`);
      return { success: true, embeddingDim: dim };
    } catch (error) {
      console.error('[SpeakerId] initSpeakerId failed:', error);
      return { success: false, embeddingDim: 0, error: (error as Error).message };
    }
  }

  async processSpeakerIdSamples(
    _sampleRate: number,
    _samples: number[]
  ): Promise<SpeakerIdProcessResult> {
    if (!this.speakerExtractor) {
      return { success: false, samplesProcessed: 0, error: 'Speaker ID not initialized' };
    }
    try {
      if (!this.speakerIdStream) {
        this.speakerIdStream = this.speakerExtractor.createStream();
        this.speakerIdSamplesProcessed = 0;
      }
      const samples = new Float32Array(_samples);
      this.speakerExtractor.acceptWaveform(this.speakerIdStream, _sampleRate, samples);
      this.speakerIdSamplesProcessed += samples.length;
      return { success: true, samplesProcessed: this.speakerIdSamplesProcessed };
    } catch (error) {
      return { success: false, samplesProcessed: 0, error: (error as Error).message };
    }
  }

  async computeSpeakerEmbedding(): Promise<SpeakerEmbeddingResult> {
    if (!this.speakerExtractor || !this.speakerIdStream) {
      return { success: false, embedding: [], durationMs: 0, embeddingDim: 0, error: 'No audio processed' };
    }
    try {
      const startMs = performance.now();
      this.speakerExtractor.inputFinished(this.speakerIdStream);

      if (!this.speakerExtractor.isReady(this.speakerIdStream)) {
        return { success: false, embedding: [], durationMs: 0, embeddingDim: 0, error: 'Not enough audio for embedding' };
      }

      const embedding = this.speakerExtractor.computeEmbedding(this.speakerIdStream);
      const durationMs = performance.now() - startMs;

      // Clean up stream
      this.speakerExtractor.destroyStream(this.speakerIdStream);
      this.speakerIdStream = null;
      this.speakerIdSamplesProcessed = 0;

      return {
        success: true,
        embedding: Array.from(embedding),
        durationMs,
        embeddingDim: embedding.length,
      };
    } catch (error) {
      return { success: false, embedding: [], durationMs: 0, embeddingDim: 0, error: (error as Error).message };
    }
  }

  async registerSpeaker(
    _name: string,
    _embedding: number[]
  ): Promise<RegisterSpeakerResult> {
    if (!this.speakerManager) {
      return { success: false, error: 'Speaker ID not initialized' };
    }
    const ok = this.speakerManager.add(_name, new Float32Array(_embedding));
    return { success: ok, error: ok ? undefined : 'Failed to register speaker' };
  }

  async removeSpeaker(_name: string): Promise<RemoveSpeakerResult> {
    if (!this.speakerManager) {
      return { success: false, error: 'Speaker ID not initialized' };
    }
    const ok = this.speakerManager.remove(_name);
    return { success: ok, error: ok ? undefined : 'Speaker not found' };
  }

  async getSpeakers(): Promise<GetSpeakersResult> {
    if (!this.speakerManager) {
      return { success: false, speakers: [], count: 0, error: 'Speaker ID not initialized' };
    }
    const speakers = this.speakerManager.getAllSpeakers();
    return { success: true, speakers, count: speakers.length };
  }

  async identifySpeaker(
    _embedding: number[],
    _threshold: number
  ): Promise<IdentifySpeakerResult> {
    if (!this.speakerManager) {
      return { success: false, speakerName: '', identified: false, error: 'Speaker ID not initialized' };
    }
    const name = this.speakerManager.search(new Float32Array(_embedding), _threshold);
    return {
      success: true,
      speakerName: name,
      identified: name !== '',
    };
  }

  async verifySpeaker(
    _name: string,
    _embedding: number[],
    _threshold: number
  ): Promise<VerifySpeakerResult> {
    if (!this.speakerManager) {
      return { success: false, verified: false, error: 'Speaker ID not initialized' };
    }
    const verified = this.speakerManager.verify(_name, new Float32Array(_embedding), _threshold);
    return { success: true, verified };
  }

  async processSpeakerIdFile(
    _filePath: string
  ): Promise<SpeakerIdFileProcessResult> {
    if (!this.speakerExtractor) {
      return { success: false, durationMs: 0, embedding: [], embeddingDim: 0, sampleRate: 0, samples: 0, error: 'Speaker ID not initialized' };
    }
    try {
      const startMs = performance.now();
      const { samples, sampleRate } = await fetchAndDecodeAudio(_filePath);

      const stream = this.speakerExtractor.createStream();
      this.speakerExtractor.acceptWaveform(stream, sampleRate, samples);
      this.speakerExtractor.inputFinished(stream);

      if (!this.speakerExtractor.isReady(stream)) {
        this.speakerExtractor.destroyStream(stream);
        return { success: false, durationMs: 0, embedding: [], embeddingDim: 0, sampleRate, samples: samples.length, error: 'Not enough audio for embedding' };
      }

      const embedding = this.speakerExtractor.computeEmbedding(stream);
      this.speakerExtractor.destroyStream(stream);
      const durationMs = performance.now() - startMs;

      return {
        success: true,
        durationMs,
        embedding: Array.from(embedding),
        embeddingDim: embedding.length,
        sampleRate,
        samples: samples.length,
      };
    } catch (error) {
      return { success: false, durationMs: 0, embedding: [], embeddingDim: 0, sampleRate: 0, samples: 0, error: (error as Error).message };
    }
  }

  async releaseSpeakerId(): Promise<{ released: boolean }> {
    if (this.speakerIdStream && this.speakerExtractor) {
      try { this.speakerExtractor.destroyStream(this.speakerIdStream); } catch (_e) { /* ignore */ }
      this.speakerIdStream = null;
    }
    if (this.speakerManager) {
      try { this.speakerManager.free(); } catch (_e) { /* ignore */ }
      this.speakerManager = null;
    }
    if (this.speakerExtractor) {
      try { this.speakerExtractor.free(); } catch (_e) { /* ignore */ }
      this.speakerExtractor = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // Diarization
  // -------------------------------------------------------------------------

  async initDiarization(_config: any): Promise<{
    success: boolean;
    sampleRate: number;
    error?: string;
  }> {
    try {
      await loadCombinedWasm();

      if (!this.sherpaOnnx.SpeakerDiarization) {
        return {
          success: false,
          sampleRate: 0,
          error: 'SpeakerDiarization module not loaded',
        };
      }

      console.log('[Diarization] Loading models from /wasm/speakers/...');
      const loadedModel = await this.sherpaOnnx.SpeakerDiarization.loadModel({
        segmentation: '/wasm/speakers/segmentation.onnx',
        embedding: '/wasm/speakers/embedding.onnx',
        debug: false,
      });

      this.diarization = this.sherpaOnnx.SpeakerDiarization.createDiarization(
        loadedModel,
        {
          numClusters: _config?.numClusters || -1,
          threshold: _config?.threshold || 0.5,
        }
      );

      console.log(
        `[Diarization] Initialized: sampleRate=${this.diarization.sampleRate}`
      );

      return {
        success: true,
        sampleRate: this.diarization.sampleRate,
      };
    } catch (error) {
      console.error('[Diarization] initDiarization failed:', error);
      return {
        success: false,
        sampleRate: 0,
        error: (error as Error).message,
      };
    }
  }

  async processDiarizationFile(
    _filePath: string,
    _numClusters: number,
    _threshold: number
  ): Promise<{
    success: boolean;
    segments: Array<{ start: number; end: number; speaker: number }>;
    numSpeakers: number;
    durationMs: number;
    error?: string;
  }> {
    if (!this.diarization) {
      return {
        success: false,
        segments: [],
        numSpeakers: 0,
        durationMs: 0,
        error: 'Diarization not initialized',
      };
    }
    try {
      const startMs = performance.now();

      // Update clustering config if params changed
      if (_numClusters !== -1 || _threshold !== 0.5) {
        this.diarization.setConfig({
          clustering: { numClusters: _numClusters, threshold: _threshold },
        });
      }

      // On web, _filePath is a URL — fetch and decode
      const { samples } = await fetchAndDecodeAudio(_filePath);

      const segments = this.diarization.process(samples);
      const durationMs = performance.now() - startMs;

      // Count unique speakers
      const speakerSet = new Set(segments.map((s) => s.speaker));

      return {
        success: true,
        segments,
        numSpeakers: speakerSet.size,
        durationMs,
      };
    } catch (error) {
      console.error('[Diarization] processDiarizationFile failed:', error);
      return {
        success: false,
        segments: [],
        numSpeakers: 0,
        durationMs: 0,
        error: (error as Error).message,
      };
    }
  }

  async releaseDiarization(): Promise<{ released: boolean }> {
    if (this.diarization) {
      try {
        this.diarization.free();
      } catch (_e) {
        // ignore
      }
      this.diarization = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // Language ID
  // -------------------------------------------------------------------------

  async initLanguageId(_config: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await loadCombinedWasm();

      if (!this.sherpaOnnx.LanguageId) {
        return { success: false, error: 'LanguageId module not loaded' };
      }

      console.log('[LanguageId] Loading model from /wasm/language-id/...');
      const loadedModel = await this.sherpaOnnx.LanguageId.loadModel({
        encoder: '/wasm/language-id/tiny-encoder.onnx',
        decoder: '/wasm/language-id/tiny-decoder.onnx',
        debug: false,
      });

      this.languageId = this.sherpaOnnx.LanguageId.createLanguageId(loadedModel);
      console.log('[LanguageId] Initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('[LanguageId] initLanguageId failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async detectLanguage(
    _sampleRate: number,
    _samples: number[]
  ): Promise<{
    success: boolean;
    language: string;
    durationMs: number;
    error?: string;
  }> {
    if (!this.languageId) {
      return { success: false, language: '', durationMs: 0, error: 'Language ID not initialized' };
    }
    try {
      const startMs = performance.now();
      const samples = new Float32Array(_samples);
      const stream = this.languageId.createStream();
      this.languageId.acceptWaveform(stream, _sampleRate, samples);
      const lang = this.languageId.compute(stream);
      const durationMs = performance.now() - startMs;
      return { success: true, language: lang, durationMs };
    } catch (error) {
      return { success: false, language: '', durationMs: 0, error: (error as Error).message };
    }
  }

  async detectLanguageFromFile(_filePath: string): Promise<{
    success: boolean;
    language: string;
    durationMs: number;
    error?: string;
  }> {
    if (!this.languageId) {
      return { success: false, language: '', durationMs: 0, error: 'Language ID not initialized' };
    }
    try {
      const startMs = performance.now();
      const { samples, sampleRate } = await fetchAndDecodeAudio(_filePath);
      const stream = this.languageId.createStream();
      this.languageId.acceptWaveform(stream, sampleRate, samples);
      const lang = this.languageId.compute(stream);
      const durationMs = performance.now() - startMs;
      return { success: true, language: lang, durationMs };
    } catch (error) {
      return { success: false, language: '', durationMs: 0, error: (error as Error).message };
    }
  }

  async releaseLanguageId(): Promise<{ released: boolean }> {
    if (this.languageId) {
      try { this.languageId.free(); } catch (_e) { /* ignore */ }
      this.languageId = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // Punctuation
  // -------------------------------------------------------------------------

  async initPunctuation(_config: any): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await loadCombinedWasm();

      if (!this.sherpaOnnx.Punctuation) {
        return { success: false, error: 'Punctuation module not loaded' };
      }

      console.log('[Punctuation] Loading model from /wasm/punctuation/...');
      const loadedModel = await this.sherpaOnnx.Punctuation.loadModel({
        cnnBilstm: '/wasm/punctuation/model.onnx',
        bpeVocab: '/wasm/punctuation/bpe.vocab',
        debug: false,
      });

      this.punctuation = this.sherpaOnnx.Punctuation.createPunctuation(loadedModel);
      console.log('[Punctuation] Initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('[Punctuation] initPunctuation failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async addPunctuation(_text: string): Promise<{
    success: boolean;
    text: string;
    durationMs: number;
    error?: string;
  }> {
    if (!this.punctuation) {
      return { success: false, text: '', durationMs: 0, error: 'Punctuation not initialized' };
    }
    try {
      const startMs = performance.now();
      const result = this.punctuation.addPunct(_text);
      const durationMs = performance.now() - startMs;
      return { success: true, text: result, durationMs };
    } catch (error) {
      return { success: false, text: '', durationMs: 0, error: (error as Error).message };
    }
  }

  async releasePunctuation(): Promise<{ released: boolean }> {
    if (this.punctuation) {
      try { this.punctuation.free(); } catch (_e) { /* ignore */ }
      this.punctuation = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // Denoising
  // -------------------------------------------------------------------------

  async initDenoiser(_config: any): Promise<{
    success: boolean;
    sampleRate: number;
    error?: string;
  }> {
    try {
      await loadCombinedWasm();

      if (!this.sherpaOnnx.SpeechEnhancement) {
        return {
          success: false,
          sampleRate: 0,
          error: 'SpeechEnhancement module not loaded',
        };
      }

      console.log('[Denoiser] Loading model from /wasm/enhancement/...');
      const loadedModel = await this.sherpaOnnx.SpeechEnhancement.loadModel({
        model: '/wasm/enhancement/gtcrn.onnx',
        debug: false,
      });

      this.denoiser = this.sherpaOnnx.SpeechEnhancement.createDenoiser(
        loadedModel,
        {}
      );

      console.log(
        `[Denoiser] Initialized: sampleRate=${this.denoiser.sampleRate}`
      );

      return {
        success: true,
        sampleRate: this.denoiser.sampleRate,
      };
    } catch (error) {
      console.error('[Denoiser] initDenoiser failed:', error);
      return {
        success: false,
        sampleRate: 0,
        error: (error as Error).message,
      };
    }
  }

  async denoiseFile(_filePath: string): Promise<{
    success: boolean;
    outputPath: string;
    durationMs: number;
    error?: string;
  }> {
    if (!this.denoiser) {
      return {
        success: false,
        outputPath: '',
        durationMs: 0,
        error: 'Denoiser not initialized',
      };
    }
    try {
      const startMs = performance.now();

      // On web, _filePath is a URL — fetch the audio and decode it
      const { samples, sampleRate } = await fetchAndDecodeAudio(_filePath);

      const result = this.denoiser.run(samples, sampleRate);
      const durationMs = performance.now() - startMs;

      // Create a downloadable WAV blob
      const wav = samplesToWav(result.samples, result.sampleRate);
      const outputPath = URL.createObjectURL(wav);

      return {
        success: true,
        outputPath,
        durationMs,
      };
    } catch (error) {
      console.error('[Denoiser] denoiseFile failed:', error);
      return {
        success: false,
        outputPath: '',
        durationMs: 0,
        error: (error as Error).message,
      };
    }
  }

  async releaseDenoiser(): Promise<{ released: boolean }> {
    if (this.denoiser) {
      try {
        this.denoiser.free();
      } catch (_e) {
        // ignore
      }
      this.denoiser = null;
    }
    return { released: true };
  }

  // -------------------------------------------------------------------------
  // Archive — not applicable on web
  // -------------------------------------------------------------------------

  async extractTarBz2(
    _sourcePath: string,
    _targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
  }> {
    return {
      success: false,
      message: 'Archive extraction not applicable in web version',
      extractedFiles: [],
    };
  }
}
