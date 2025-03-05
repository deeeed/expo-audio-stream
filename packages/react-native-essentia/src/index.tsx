import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-essentia' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Define the interface for the native module
interface EssentiaInterface {
  multiply(a: number, b: number): Promise<number>;
  initialize(): Promise<boolean>;
  getVersion(): Promise<string>;
}

// Correctly type the Proxy object to match EssentiaInterface
const Essentia: EssentiaInterface = (
  NativeModules.Essentia
    ? NativeModules.Essentia
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      )
) as EssentiaInterface;

export function multiply(a: number, b: number): Promise<number> {
  return Essentia.multiply(a, b);
}

export function initialize(): Promise<boolean> {
  return Essentia.initialize();
}

export function getVersion(): Promise<string> {
  return Essentia.getVersion();
}

// Default export for easier imports
export default {
  multiply,
  initialize,
  getVersion,
};
