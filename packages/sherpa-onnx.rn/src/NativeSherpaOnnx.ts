import { NativeModules } from 'react-native';
import type {
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
  SttInitResult,
  SttModelConfig,
  SttRecognizeResult,
} from './types/interfaces';

// Get the native module using the old architecture
const { SherpaOnnx } = NativeModules;

// Define the interface for type safety
interface SherpaOnnxInterface {
  validateLibraryLoaded(): Promise<{
    loaded: boolean;
    status: string;
  }>;
  
  // TTS methods
  initTts(modelConfig: TtsModelConfig): Promise<TtsInitResult>;
  generateTts(
    text: string,
    speakerId: number,
    speakingRate: number,
    playAudio: boolean
  ): Promise<TtsGenerateResult>;
  stopTts(): Promise<{ stopped: boolean; message?: string }>;
  releaseTts(): Promise<{ released: boolean }>;
  
  // STT methods
  initStt(modelConfig: SttModelConfig): Promise<SttInitResult>;
  recognizeFromSamples(
    sampleRate: number,
    audioBuffer: number[]
  ): Promise<SttRecognizeResult>;
  recognizeFromFile(
    filePath: string
  ): Promise<SttRecognizeResult>;
  releaseStt(): Promise<{ released: boolean }>;
  
  // Debug & Utility methods
  debugAssetLoading(): Promise<any>;
  // Archive utility method
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
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
      // Debug & Utility methods
      debugAssetLoading: async () => {
        throw new Error('SherpaOnnx native module is not available');
      },
      extractTarBz2: async () => ({
        success: false,
        message: 'SherpaOnnx native module is not available',
        extractedFiles: [],
      }),
    };

export default SafeSherpaOnnx;
