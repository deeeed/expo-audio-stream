import { NativeModules } from 'react-native';
import type {
  TtsModelConfig,
  TtsInitResult,
  TtsGenerateResult,
  SttModelConfig,
  SttInitResult,
  SttRecognizeResult,
  ValidateResult,
} from './types/interfaces';

// Get the native module using the old architecture
const { SherpaOnnx } = NativeModules;

// Define the interface for type safety
interface SherpaOnnxInterface {
  // Library validation
  validateLibraryLoaded(): Promise<ValidateResult>;
  
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
  
  // Archive methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    extractedFiles?: string[];
    error?: string;
  }>;
}

// Create a safer version that doesn't crash if the module is missing
const SafeSherpaOnnx: SherpaOnnxInterface = SherpaOnnx
  ? SherpaOnnx
  : {
      validateLibraryLoaded: async () => ({
        loaded: false,
        status: 'SherpaOnnx native module is not available',
      }),
      // TTS methods
      initTts: async () => {
        throw new Error('SherpaOnnx native module is not available');
      },
      generateTts: async () => {
        throw new Error('SherpaOnnx native module is not available');
      },
      stopTts: async () => ({
        stopped: false,
        message: 'SherpaOnnx native module is not available',
      }),
      releaseTts: async () => ({
        released: false,
      }),
      // STT methods
      initStt: async () => {
        throw new Error('SherpaOnnx native module is not available');
      },
      recognizeFromSamples: async () => {
        throw new Error('SherpaOnnx native module is not available');
      },
      recognizeFromFile: async () => {
        throw new Error('SherpaOnnx native module is not available');
      },
      releaseStt: async () => ({
        released: false,
      }),
      // Archive methods
      extractTarBz2: async () => ({
        success: false,
        message: 'SherpaOnnx native module is not available',
        extractedFiles: [],
      }),
    };

export default SafeSherpaOnnx;
