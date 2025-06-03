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

// Define proper WASM interfaces
interface SherpaOnnxWasmModule {
  _SherpaOnnxCreateOfflineTts: (configPtr: number) => number;
  _SherpaOnnxOfflineTtsSampleRate: (handle: number) => number;
  _SherpaOnnxOfflineTtsNumSpeakers: (handle: number) => number;
  _SherpaOnnxOfflineTtsGenerate: (
    handle: number,
    textPtr: number,
    sid: number,
    speed: number
  ) => number;
  _SherpaOnnxDestroyOfflineTts: (handle: number) => void;
  _SherpaOnnxDestroyOfflineTtsGeneratedAudio: (audioPtr: number) => void;
  _SherpaOnnxWriteWave: (
    samplesPtr: number,
    numSamples: number,
    sampleRate: number,
    filePathPtr: number
  ) => void;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  _CopyHeap: (src: number, size: number, dst: number) => void;

  // Memory access
  HEAPF32: Float32Array;
  HEAP32: Int32Array;

  // String utilities
  lengthBytesUTF8: (str: string) => number;
  stringToUTF8: (str: string, outPtr: number, maxBytesToWrite: number) => void;

  // Runtime
  onRuntimeInitialized?: () => void;

  // Status management
  setStatus?: (status: string) => void;
}

// Interface for audio generation result
interface GeneratedAudio {
  samples: Float32Array;
  sampleRate: number;
}

// Interface for TTS instance
interface OfflineTts {
  handle: number;
  sampleRate: number;
  numSpeakers: number;
  generate: (config: {
    text: string;
    sid: number;
    speed: number;
  }) => GeneratedAudio;
  free: () => void;
  save?: (filename: string, audio: GeneratedAudio) => void;
}

// WASM configuration interfaces
interface WasmTtsVitsConfig {
  model: string;
  lexicon: string;
  tokens: string;
  dataDir: string;
  dictDir: string;
  noiseScale: number;
  noiseScaleW: number;
  lengthScale: number;
}

interface WasmTtsMatchaConfig {
  acousticModel: string;
  vocoder: string;
  lexicon: string;
  tokens: string;
  dataDir: string;
  dictDir: string;
  noiseScale: number;
  lengthScale: number;
}

interface WasmTtsKokoroConfig {
  model: string;
  voices: string;
  tokens: string;
  dataDir: string;
  dictDir: string;
  lexicon: string;
  lengthScale: number;
}

interface WasmTtsModelConfig {
  offlineTtsVitsModelConfig: WasmTtsVitsConfig;
  offlineTtsMatchaModelConfig: WasmTtsMatchaConfig;
  offlineTtsKokoroModelConfig: WasmTtsKokoroConfig;
  numThreads: number;
  debug: number; // 0 or 1
  provider: string;
}

interface WasmTtsConfig {
  offlineTtsModelConfig: WasmTtsModelConfig;
  ruleFsts: string;
  ruleFars: string;
  maxNumSentences: number;
  silenceScale: number;
}

// Define global types for the WASM module
declare global {
  interface Window {
    Module: SherpaOnnxWasmModule;
    createOfflineTts: (
      module: SherpaOnnxWasmModule,
      config?: WasmTtsConfig
    ) => OfflineTts;
  }
}

/**
 * Load the Sherpa ONNX WASM scripts
 */
async function loadSherpaOnnxWasm(): Promise<SherpaOnnxWasmModule> {
  // Use the public folder for web WASM files
  const baseUrl = '/wasm/tts/';
  const scriptUrls = [
    `${baseUrl}sherpa-onnx-tts.js`,
    `${baseUrl}sherpa-onnx-wasm-main-tts.js`,
  ];

  // Only load if window is defined (browser environment)
  if (typeof window === 'undefined') {
    throw new Error('WASM modules can only be loaded in a browser environment');
  }

  // Don't reload if already loaded
  if (window.Module && typeof window.createOfflineTts === 'function') {
    return window.Module;
  }

  // Create a loader for each script
  const loaders = scriptUrls.map((url) => {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    });
  });

  // Load all scripts in parallel
  await Promise.all(loaders);

  // Return the global Module once it's initialized
  return new Promise<SherpaOnnxWasmModule>((resolve) => {
    // If Module is already initialized
    if (window.Module && window.Module.onRuntimeInitialized) {
      resolve(window.Module);
      return;
    }

    // Set up a handler for when the runtime is initialized
    const originalOnRuntimeInitialized = window.Module?.onRuntimeInitialized;
    window.Module = window.Module || ({} as SherpaOnnxWasmModule);
    window.Module.onRuntimeInitialized = () => {
      if (originalOnRuntimeInitialized) {
        originalOnRuntimeInitialized();
      }
      resolve(window.Module);
    };
  });
}

/**
 * Convert samples to a WAV file blob
 */
function samplesToWav(samples: Float32Array, sampleRate: number): Blob {
  // Convert float samples to Int16
  const intSamples = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    // Ensure we have a valid sample by defaulting to 0 if undefined
    const sample = samples[i] ?? 0;
    // Clamp value between -1 and 1, then scale to Int16 range
    const clampedSample = sample < -1 ? -1 : sample > 1 ? 1 : sample;
    intSamples[i] = Math.round(clampedSample * 32767);
  }

  // Create WAV file header and data
  const buffer = new ArrayBuffer(44 + intSamples.length * 2);
  const view = new DataView(buffer);

  // "RIFF" chunk descriptor
  view.setUint32(0, 0x46464952, true);
  view.setUint32(4, 36 + intSamples.length * 2, true);
  view.setUint32(8, 0x45564157, true);

  // "fmt " sub-chunk
  view.setUint32(12, 0x20746d66, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // "data" sub-chunk
  view.setUint32(36, 0x61746164, true);
  view.setUint32(40, intSamples.length * 2, true);

  // Write the PCM samples
  for (let i = 0; i < intSamples.length; i++) {
    const sample = intSamples[i] ?? 0;
    view.setInt16(44 + i * 2, sample, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Play audio samples using Web Audio API
 */
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

  const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Copy samples to the buffer
  for (let i = 0; i < samples.length; i++) {
    channelData[i] = samples[i] ?? 0;
  }

  // Create and play the source
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();

  // Return a promise that resolves when playback ends
  return new Promise((resolve) => {
    source.onended = () => {
      resolve();
    };
  });
}

/**
 * Web implementation of the Sherpa ONNX API
 */
export class WebSherpaOnnxImpl implements ApiInterface {
  private module: SherpaOnnxWasmModule | null = null;
  private tts: OfflineTts | null = null;
  private isGenerating = false;
  private sampleRate = 0;
  private numSpeakers = 0;

  constructor() {
    // In a browser environment, we could initialize here,
    // but we defer to explicit initialization for API consistency
  }

  /**
   * Test integration with ONNX Runtime
   */
  async testOnnxIntegration(): Promise<TestOnnxIntegrationResult> {
    try {
      await loadSherpaOnnxWasm();
      return {
        success: true,
        status: 'ONNX Runtime WASM integration is working',
      };
    } catch (error) {
      return {
        success: false,
        status: `ONNX Runtime WASM integration failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate that the library is loaded
   */
  async validateLibraryLoaded(): Promise<ValidateResult> {
    try {
      await loadSherpaOnnxWasm();
      return {
        loaded: true,
        status: 'Sherpa ONNX WASM library loaded successfully',
      };
    } catch (error) {
      return {
        loaded: false,
        status: `Sherpa ONNX WASM library failed to load: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get architecture information for debugging and diagnostics
   */
  async getArchitectureInfo(): Promise<ArchitectureInfo> {
    try {
      const isLibraryLoaded = this.module !== null;
      
      return {
        architecture: 'web',
        jsiAvailable: false,
        turboModulesEnabled: false,
        libraryLoaded: isLibraryLoaded,
        currentThread: 'main',
        threadId: 1,
        moduleType: 'WASM',
      };
    } catch (error) {
      return {
        architecture: 'web',
        jsiAvailable: false,
        turboModulesEnabled: false,
        libraryLoaded: false,
        currentThread: 'main',
        threadId: 1,
        moduleType: 'WASM',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get comprehensive system information for web environment
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const isLibraryLoaded = this.module !== null;
      
      // Architecture information
      const architecture = {
        type: 'old' as const,
        description: 'Web (WASM)',
        jsiAvailable: false,
        turboModulesEnabled: false,
        moduleType: 'WASM',
      };
      
      // Memory information (using performance API if available)
      const memory: SystemInfo['memory'] = {
        maxMemoryMB: 0,
        totalMemoryMB: 0,
        freeMemoryMB: 0,
        usedMemoryMB: 0,
      };
      
      // Try to get memory info from performance API
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const perfMemory = (performance as any).memory;
        if (perfMemory) {
          memory.maxMemoryMB = (perfMemory.jsHeapSizeLimit || 0) / 1024 / 1024;
          memory.totalMemoryMB = (perfMemory.totalJSHeapSize || 0) / 1024 / 1024;
          memory.usedMemoryMB = (perfMemory.usedJSHeapSize || 0) / 1024 / 1024;
          memory.freeMemoryMB = memory.totalMemoryMB - memory.usedMemoryMB;
        }
      }
      
      // CPU information
      const cpu = {
        availableProcessors: navigator.hardwareConcurrency || 1,
        supportedAbis: ['wasm32'],
      };
      
      // Device information from user agent
      const userAgent = navigator.userAgent;
      let device: SystemInfo['device'];
      
      // Try to detect device info from user agent
      if (typeof navigator !== 'undefined') {
        // Use userAgentData if available (newer API), fallback to deprecated platform
        const platformInfo = (navigator as any).userAgentData?.platform || 
                            (navigator as any).platform || 
                            'Unknown';
        const vendor = (navigator as any).vendor || 'Unknown';
        
        device = {
          brand: vendor,
          model: platformInfo,
          device: 'browser',
          manufacturer: vendor,
          webPlatform: userAgent,
        };
        
        // Try to extract more specific info from user agent
        if (userAgent.includes('Chrome')) {
          device.brand = 'Google';
          device.manufacturer = 'Google';
        } else if (userAgent.includes('Firefox')) {
          device.brand = 'Mozilla';
          device.manufacturer = 'Mozilla';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
          device.brand = 'Apple';
          device.manufacturer = 'Apple';
        }
      } else {
        device = {
          brand: 'Unknown',
          model: 'Unknown',
          device: 'browser',
          manufacturer: 'Unknown',
          webPlatform: 'Unknown',
        };
      }
      
      // GPU information
      const gpu: SystemInfo['gpu'] = {
        webGLVersion: 'WebGL',
      };
      
      // Check WebGL support
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && gl instanceof WebGLRenderingContext) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            gpu.webGLVersion = `WebGL (${renderer})`;
          }
        }
      }
      
      // Thread information
      const thread = {
        currentThread: 'main',
        threadId: 1,
      };
      
      return {
        architecture,
        memory,
        cpu,
        device,
        gpu,
        libraryLoaded: isLibraryLoaded,
        thread,
      };
    } catch (error) {
      return {
        architecture: {
          type: 'old',
          description: 'Web (WASM)',
          jsiAvailable: false,
          turboModulesEnabled: false,
          moduleType: 'WASM',
        },
        memory: {
          maxMemoryMB: 0,
          totalMemoryMB: 0,
          freeMemoryMB: 0,
          usedMemoryMB: 0,
        },
        cpu: {
          availableProcessors: 1,
          supportedAbis: ['wasm32'],
        },
        device: {
          brand: 'Unknown',
          model: 'Unknown',
          device: 'browser',
          manufacturer: 'Unknown',
          webPlatform: 'Unknown',
        },
        gpu: {
          webGLVersion: 'WebGL',
        },
        libraryLoaded: false,
        thread: {
          currentThread: 'main',
          threadId: 1,
        },
        error: (error as Error).message,
      };
    }
  }

  // TTS METHODS

  /**
   * Initialize the TTS engine
   */
  async initTts(_config: TtsModelConfig): Promise<TtsInitResult> {
    try {
      // Load the WASM module if not already loaded
      this.module = await loadSherpaOnnxWasm();

      // For web version, ignore the model configuration
      // and use the built-in models
      console.log('Initializing TTS with web version - using built-in models');

      // Create the TTS instance WITHOUT passing model config
      this.tts = window.createOfflineTts(this.module);

      // Store the sample rate and number of speakers
      this.sampleRate = this.tts.sampleRate;
      this.numSpeakers = this.tts.numSpeakers;

      console.log(
        `TTS initialized: sampleRate=${this.sampleRate}, numSpeakers=${this.numSpeakers}`
      );

      return {
        success: true,
        sampleRate: this.sampleRate,
        numSpeakers: this.numSpeakers,
      };
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
      return {
        success: false,
        sampleRate: 0,
        numSpeakers: 0,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Generate speech from text
   */
  async generateTts(config: TtsGenerateConfig): Promise<TtsGenerateResult> {
    if (!this.tts) {
      return {
        success: false,
      };
    }

    try {
      this.isGenerating = true;

      // Generate speech
      const generationConfig = {
        text: config.text,
        sid: config.speakerId,
        speed: config.speakingRate,
      };

      console.log('Generating speech with config:', generationConfig);

      // Call the WASM TTS generate method
      const audio = this.tts.generate(generationConfig);

      // Create a Float32Array from the samples
      const samples = new Float32Array(audio.samples);

      // Store the result
      const result: TtsGenerateResult = {
        success: true,
      };

      // Play audio if requested
      if (config.playAudio) {
        await playAudioSamples(samples, audio.sampleRate);
      }

      // Create a WAV file from the samples and save it if a filename is provided
      if (config.fileNamePrefix) {
        const wavBlob = samplesToWav(samples, audio.sampleRate);

        // Create a temporary URL for the WAV blob
        const url = URL.createObjectURL(wavBlob);

        // Store the URL in the result
        result.filePath = url;
      }

      this.isGenerating = false;
      return result;
    } catch (error) {
      console.error('Failed to generate speech:', error);
      this.isGenerating = false;
      return {
        success: false,
      };
    }
  }

  /**
   * Stop TTS generation
   */
  async stopTts(): Promise<{ stopped: boolean; message?: string }> {
    if (!this.isGenerating) {
      return { stopped: true };
    }

    try {
      // In the WASM version, we don't have a specific method to stop generation,
      // but we can set the flag to indicate it's no longer generating
      this.isGenerating = false;
      return { stopped: true };
    } catch (error) {
      return {
        stopped: false,
        message: (error as Error).message,
      };
    }
  }

  /**
   * Release TTS resources
   */
  async releaseTts(): Promise<{ released: boolean }> {
    if (!this.tts) {
      return { released: true };
    }

    try {
      // Call the free method to release resources
      this.tts.free();
      this.tts = null;
      return { released: true };
    } catch (error) {
      console.error('Failed to release TTS resources:', error);
      return { released: false };
    }
  }

  // ASR METHODS - Stubs for now, to be implemented later

  async initAsr(_config: AsrModelConfig): Promise<AsrInitResult> {
    return {
      success: false,
      error: 'ASR not implemented in web version yet',
    };
  }

  async recognizeFromSamples(
    _sampleRate: number,
    _samples: number[]
  ): Promise<AsrRecognizeResult> {
    return {
      success: false,
      text: '',
      error: 'ASR not implemented in web version yet',
    };
  }

  async recognizeFromFile(_filePath: string): Promise<AsrRecognizeResult> {
    return {
      success: false,
      text: '',
      error: 'ASR not implemented in web version yet',
    };
  }

  async releaseAsr(): Promise<{ released: boolean }> {
    return { released: true };
  }

  // AUDIO TAGGING METHODS - Stubs for now

  async initAudioTagging(
    _config: AudioTaggingModelConfig
  ): Promise<AudioTaggingInitResult> {
    return {
      success: false,
      error: 'Audio tagging not implemented in web version yet',
    };
  }

  async processAndComputeAudioTagging(
    _filePath: string
  ): Promise<AudioTaggingResult> {
    return {
      success: false,
      durationMs: 0,
      events: [],
      error: 'Audio tagging not implemented in web version yet',
    };
  }

  async processAndComputeAudioSamples(
    _sampleRate: number,
    _samples: number[]
  ): Promise<AudioTaggingResult> {
    return {
      success: false,
      durationMs: 0,
      events: [],
      error: 'Audio tagging not implemented in web version yet',
    };
  }

  async releaseAudioTagging(): Promise<{ released: boolean }> {
    return { released: true };
  }

  // SPEAKER ID METHODS - Stubs for now

  async initSpeakerId(
    _config: SpeakerIdModelConfig
  ): Promise<SpeakerIdInitResult> {
    return {
      success: false,
      embeddingDim: 0,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async processSpeakerIdSamples(
    _sampleRate: number,
    _samples: number[]
  ): Promise<SpeakerIdProcessResult> {
    return {
      success: false,
      samplesProcessed: 0,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async computeSpeakerEmbedding(): Promise<SpeakerEmbeddingResult> {
    return {
      success: false,
      embedding: [],
      durationMs: 0,
      embeddingDim: 0,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async registerSpeaker(
    _name: string,
    _embedding: number[]
  ): Promise<RegisterSpeakerResult> {
    return {
      success: false,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async removeSpeaker(_name: string): Promise<RemoveSpeakerResult> {
    return {
      success: false,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async getSpeakers(): Promise<GetSpeakersResult> {
    return {
      success: false,
      speakers: [],
      count: 0,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async identifySpeaker(
    _embedding: number[],
    _threshold: number
  ): Promise<IdentifySpeakerResult> {
    return {
      success: false,
      speakerName: '',
      identified: false,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async verifySpeaker(
    _name: string,
    _embedding: number[],
    _threshold: number
  ): Promise<VerifySpeakerResult> {
    return {
      success: false,
      verified: false,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async processSpeakerIdFile(
    _filePath: string
  ): Promise<SpeakerIdFileProcessResult> {
    return {
      success: false,
      durationMs: 0,
      embedding: [],
      embeddingDim: 0,
      sampleRate: 0,
      samples: 0,
      error: 'Speaker ID not implemented in web version yet',
    };
  }

  async releaseSpeakerId(): Promise<{ released: boolean }> {
    return { released: true };
  }

  // ARCHIVE METHODS

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
      message: 'Archive extraction not implemented in web version yet',
      extractedFiles: [],
    };
  }
}
