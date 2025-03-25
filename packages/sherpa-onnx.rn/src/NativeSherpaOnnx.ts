import { NativeModules } from 'react-native';
import type {
  TtsModelConfig,
  TtsInitResult,
  TtsGenerateResult,
  SttModelConfig,
  SttInitResult,
  SttRecognizeResult,
  ValidateResult,
  AudioTaggingModelConfig,
  AudioTaggingInitResult,
  AudioTaggingResult,
} from './types/interfaces';

// Define the interface for type safety
interface SherpaOnnxInterface {
  // Library validation
  validateLibraryLoaded(): Promise<ValidateResult>;
  debugAssetLoading(): Promise<any>;
  
  // TTS methods
  initTts(config: TtsModelConfig): Promise<TtsInitResult>;
  generateTts(
    text: string,
    speakerId: number,
    speakingRate: number,
    playAudio: boolean
  ): Promise<TtsGenerateResult>;
  stopTts(): Promise<{ stopped: boolean; message?: string }>;
  releaseTts(): Promise<{ released: boolean }>;
  
  // STT methods
  initStt(config: SttModelConfig): Promise<SttInitResult>;
  recognizeFromSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<SttRecognizeResult>;
  recognizeFromFile(filePath: string): Promise<SttRecognizeResult>;
  releaseStt(): Promise<{ released: boolean }>;
  
  // Audio tagging methods
  initAudioTagging(config: AudioTaggingModelConfig): Promise<AudioTaggingInitResult>;
  processAndComputeAudioTagging(filePath: string): Promise<AudioTaggingResult>;
  processAndComputeAudioSamples(
    sampleRate: number,
    samples: number[]
  ): Promise<AudioTaggingResult>;
  releaseAudioTagging(): Promise<{ released: boolean }>;
  
  // Archive methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
  }>;
}

// Get the native module or create a fallback that logs errors
const { SherpaOnnx } = NativeModules;

// Log whether the module is available for debugging
if (!SherpaOnnx) {
  console.error(
    'SherpaOnnx native module is not available. This could be due to:' +
    '\n1. The native module has not been linked - run `npx pod-install` for iOS or rebuild for Android' +
    '\n2. The native code is crashing on initialization' +
    '\n3. The package is not correctly configured in your app'
  );
}

// Standard error message for not available module
const notAvailableError = 'SherpaOnnx native module is not available. Please check native module installation.';

// Create a safer version that doesn't crash if the module is missing
const SafeSherpaOnnx: SherpaOnnxInterface = SherpaOnnx
  ? SherpaOnnx
  : {
      // Library validation
      validateLibraryLoaded: async () => ({
        loaded: false,
        status: notAvailableError,
      }),
      debugAssetLoading: async () => {
        throw new Error(notAvailableError);
      },
      
      // TTS methods
      initTts: async () => ({
        success: false,
        error: notAvailableError,
        sampleRate: 0,
        numSpeakers: 0
      }),
      generateTts: async () => ({
        success: false,
        error: notAvailableError,
        filePath: '',
        durationMs: 0,
        sampleRate: 0
      }),
      stopTts: async () => ({
        stopped: false,
        message: notAvailableError,
      }),
      releaseTts: async () => ({
        released: false,
      }),
      
      // STT methods
      initStt: async () => ({
        success: false,
        error: notAvailableError,
        sampleRate: 0,
        modelType: ''
      }),
      recognizeFromSamples: async () => ({
        success: false,
        error: notAvailableError,
        text: '',
        durationMs: 0
      }),
      recognizeFromFile: async () => ({
        success: false,
        error: notAvailableError,
        text: '',
        durationMs: 0
      }),
      releaseStt: async () => ({
        released: false,
      }),
      
      // Audio tagging methods
      initAudioTagging: async () => ({
        success: false,
        error: notAvailableError,
        sampleRate: 0
      }),
      processAndComputeAudioTagging: async () => ({
        success: false,
        error: notAvailableError,
        events: [],
        durationMs: 0
      }),
      processAndComputeAudioSamples: async () => ({
        success: false,
        error: notAvailableError,
        events: [],
        durationMs: 0
      }),
      releaseAudioTagging: async () => ({
        released: false,
      }),
      
      // Archive methods
      extractTarBz2: async () => ({
        success: false,
        message: notAvailableError,
        extractedFiles: [],
      }),
    };

export default SafeSherpaOnnx;
