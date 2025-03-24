import { NativeModules } from 'react-native';
import type {
  AssetListResult,
  TtsGenerateResult,
  TtsInitResult,
  TtsModelConfig,
} from './types/interfaces';

// Get the native module using the old architecture
const { SherpaOnnx } = NativeModules;

// Define the interface for type safety
interface SherpaOnnxInterface {
  validateLibraryLoaded(): Promise<{
    loaded: boolean;
    status: string;
  }>;
  initTts(modelConfig: TtsModelConfig): Promise<TtsInitResult>;
  generateTts(
    text: string,
    speakerId: number,
    speakingRate: number,
    playAudio: boolean
  ): Promise<TtsGenerateResult>;
  stopTts(): Promise<{ stopped: boolean; message?: string }>;
  releaseTts(): Promise<{ released: boolean }>;
  debugAssetLoading(): Promise<any>;
  listAllAssets(): Promise<{
    assets: string[];
    count: number;
  }>;
  debugAssetPath(path: string): Promise<AssetListResult>;
  
  // New archive utility methods
  extractTarBz2(
    sourcePath: string,
    targetDir: string
  ): Promise<{
    success: boolean;
    message: string;
    extractedFiles: string[];
  }>;
  
  createMockModelFiles(
    targetDir: string,
    modelId: string
  ): Promise<{
    success: boolean;
    message: string;
    createdFiles: string[];
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
      debugAssetLoading: async () => {
        throw new Error('SherpaOnnx native module is not available');
      },
      listAllAssets: async () => ({
        assets: [],
        count: 0,
      }),
      debugAssetPath: async () => ({
        exists: false,
        isDirectory: false,
        contents: [],
        error: 'SherpaOnnx native module is not available',
      }),
      // New archive utility methods
      extractTarBz2: async () => ({
        success: false,
        message: 'SherpaOnnx native module is not available',
        extractedFiles: [],
      }),
      createMockModelFiles: async () => ({
        success: false,
        message: 'SherpaOnnx native module is not available',
        createdFiles: [],
      }),
    };

export default SafeSherpaOnnx;
