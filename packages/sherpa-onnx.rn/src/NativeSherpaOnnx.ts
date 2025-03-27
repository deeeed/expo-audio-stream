import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { NativeSherpaOnnxInterface } from './types/interfaces';

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

const LINKING_ERROR =
  `The package '@siteed/sherpa-onnx.rn' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// First try to get the TurboModule implementation for new architecture
// If that doesn't exist, fall back to NativeModules for old architecture
let SherpaOnnxModule: NativeSherpaOnnxInterface | null = null;

// Check if we're in Bridgeless mode - safely
const globalObj = getGlobal();
const isBridgeless = !!globalObj.RN$Bridgeless;
console.log('Bridgeless mode detected:', isBridgeless);

// ===== NEW ARCHITECTURE APPROACH =====
// Try using TurboModuleRegistry first if available
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
if (!SherpaOnnxModule) {
  console.log('Trying old architecture approach');
  SherpaOnnxModule = NativeModules.SherpaOnnx || null;
}

// Create a default implementation that throws the linking error
const NativeSherpaOnnx: NativeSherpaOnnxInterface = SherpaOnnxModule
  ? SherpaOnnxModule
  : new Proxy({} as NativeSherpaOnnxInterface, {
      get() {
        console.error('SherpaOnnx module not found in either architecture');
        throw new Error(LINKING_ERROR);
      },
    });

export default NativeSherpaOnnx;
