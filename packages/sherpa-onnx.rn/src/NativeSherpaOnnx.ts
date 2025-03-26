import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

// Add type declaration to avoid TS errors for bridgeless mode detection
declare global {
  // Safe access to global in both web and React Native
  interface Window {
    RN$Bridgeless?: boolean;
    __turboModuleProxy?: unknown;
  }
}

// Safely check global properties
const getGlobal = (): any => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof global !== 'undefined') return global;
  if (typeof window !== 'undefined') return window;
  return {};
};

interface SherpaOnnxInterface {
  // TTS methods
  initTts: (config: any) => Promise<any>;
  generateTts: (config: {
    text: string;
    speakerId?: number;
    speakingRate?: number;
    playAudio?: boolean;
    fileNamePrefix?: string | null;
    lengthScale?: number | null;
    noiseScale?: number | null;
    noiseScaleW?: number | null;
  }) => Promise<any>;
  stopTts: () => Promise<any>;
  releaseTts: () => Promise<any>;
  // ASR methods
  initAsr: (config: any) => Promise<any>;
  recognizeFromSamples: (sampleRate: number, samples: number[]) => Promise<any>;
  recognizeFromFile: (filePath: string) => Promise<any>;
  releaseAsr: () => Promise<any>;
  // Audio tagging methods
  initAudioTagging: (config: any) => Promise<any>;
  processAudioSamples: (sampleRate: number, samples: number[]) => Promise<any>;
  computeAudioTagging: () => Promise<any>;
  processAndComputeAudioTagging: (filePath: string) => Promise<any>;
  processAndComputeAudioSamples: (
    sampleRate: number,
    samples: number[]
  ) => Promise<any>;
  processAudioFile: (filePath: string) => Promise<any>;
  releaseAudioTagging: () => Promise<any>;
  // Speaker ID methods
  initSpeakerId: (config: any) => Promise<any>;
  processSpeakerIdSamples: (
    sampleRate: number,
    samples: number[]
  ) => Promise<any>;
  computeSpeakerEmbedding: () => Promise<any>;
  registerSpeaker: (name: string, embedding: number[]) => Promise<any>;
  removeSpeaker: (name: string) => Promise<any>;
  getSpeakers: () => Promise<any>;
  identifySpeaker: (embedding: number[], threshold: number) => Promise<any>;
  verifySpeaker: (
    name: string,
    embedding: number[],
    threshold: number
  ) => Promise<any>;
  processSpeakerIdFile: (filePath: string) => Promise<any>;
  releaseSpeakerId: () => Promise<any>;
  // Utility methods
  extractTarBz2: (sourcePath: string, targetDir: string) => Promise<any>;
  validateLibraryLoaded: () => Promise<any>;
}

const LINKING_ERROR =
  `The package '@siteed/sherpa-onnx.rn' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// First try to get the TurboModule implementation for new architecture
// If that doesn't exist, fall back to NativeModules for old architecture
let SherpaOnnxModule: SherpaOnnxInterface | null = null;

// Check if we're in Bridgeless mode - safely
const globalObj = getGlobal();
const isBridgeless = !!globalObj.RN$Bridgeless;
console.log('Bridgeless mode detected:', isBridgeless);

// ===== NEW ARCHITECTURE APPROACH =====
// Try using TurboModuleRegistry first if available
// This works in both standard new architecture and some bridgeless configurations
try {
  if (
    typeof TurboModuleRegistry !== 'undefined' &&
    TurboModuleRegistry.get &&
    globalObj.__turboModuleProxy
  ) {
    console.log('Trying TurboModuleRegistry.get approach');
    // @ts-ignore - Type mismatch is expected since TurboModule API doesn't match our interface
    SherpaOnnxModule = TurboModuleRegistry.get('SherpaOnnx');

    if (SherpaOnnxModule) {
      console.log('SUCCESS: SherpaOnnx loaded via TurboModuleRegistry');
    }
  }
} catch (e) {
  console.warn('TurboModuleRegistry approach failed:', e);
}

// ===== BRIDGELESS DIRECT APPROACH =====
// If still not found and we're in bridgeless mode, try direct access
// In pure bridgeless mode, modules should be available directly in NativeModules
if (!SherpaOnnxModule && isBridgeless) {
  console.log('Trying direct NativeModules access for Bridgeless mode');
  SherpaOnnxModule = NativeModules.SherpaOnnx || null;

  if (SherpaOnnxModule) {
    console.log(
      'SUCCESS: SherpaOnnx loaded directly from NativeModules in Bridgeless mode'
    );
  } else {
    console.warn(
      'Failed to find SherpaOnnx in NativeModules in Bridgeless mode'
    );
  }
}

// ===== OLD ARCHITECTURE FALLBACK =====
// Finally fallback to old architecture approach
if (!SherpaOnnxModule) {
  console.log('Trying old architecture approach');

  // Deep debug what modules are available
  console.log('All NativeModules:', JSON.stringify(NativeModules, null, 2));

  // Check for both possible naming conventions
  SherpaOnnxModule = NativeModules.SherpaOnnx || null;

  if (SherpaOnnxModule) {
    console.log(
      'Found SherpaOnnx with methods:',
      Object.keys(SherpaOnnxModule)
    );
    // Explicitly check the validateLibraryLoaded method
    console.log(
      'validateLibraryLoaded exists?',
      typeof SherpaOnnxModule.validateLibraryLoaded === 'function'
    );
    console.log('Method type:', typeof SherpaOnnxModule.validateLibraryLoaded);
  }

  if (!SherpaOnnxModule) {
    SherpaOnnxModule = NativeModules.SherpaOnnxRnModule || null;

    if (SherpaOnnxModule) {
      console.log(
        'Found SherpaOnnxRnModule with methods:',
        Object.keys(SherpaOnnxModule)
      );
      // Explicitly check the validateLibraryLoaded method
      console.log(
        'validateLibraryLoaded exists?',
        typeof SherpaOnnxModule.validateLibraryLoaded === 'function'
      );
      console.log(
        'Method type:',
        typeof SherpaOnnxModule.validateLibraryLoaded
      );
    }
  }

  if (SherpaOnnxModule) {
    console.log(
      'SUCCESS: SherpaOnnx loaded via old architecture NativeModules as',
      NativeModules.SherpaOnnx ? 'SherpaOnnx' : 'SherpaOnnxRnModule'
    );
  } else {
    console.error(
      'FAILED: Could not find SherpaOnnx module in any architecture'
    );
    console.log('Available native modules:', Object.keys(NativeModules));
  }
}

// Create a default implementation that throws the linking error
const NativeSherpaOnnx: SherpaOnnxInterface = SherpaOnnxModule
  ? SherpaOnnxModule
  : new Proxy({} as SherpaOnnxInterface, {
      get() {
        console.error('SherpaOnnx module not found in either architecture');
        throw new Error(LINKING_ERROR);
      },
    });

export default NativeSherpaOnnx;
