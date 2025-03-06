import { NativeEventEmitter, NativeModules } from 'react-native';
import EssentiaAPI from './EssentiaAPI';
import { EssentiaCategory } from './constants';

// Export types
export * from './types';
export { EssentiaCategory };

// Create an event emitter for progress updates
export const EssentiaEvents = new NativeEventEmitter(NativeModules.Essentia);

// Export the API instance
export default new EssentiaAPI();
