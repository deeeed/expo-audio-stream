import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module. On web, it will be resolved to ExpoAudioStream.web.ts
// and on native platforms to ExpoAudioStream.ts
import ExpoAudioStreamModule from './ExpoAudioStreamModule';
import ExpoAudioStreamView from './ExpoAudioStreamView';
import { ChangeEventPayload, ExpoAudioStreamViewProps } from './ExpoAudioStream.types';

// Get the native constant value.
export const PI = ExpoAudioStreamModule.PI;

export function hello(): string {
  return ExpoAudioStreamModule.hello();
}

export async function setValueAsync(value: string) {
  return await ExpoAudioStreamModule.setValueAsync(value);
}

const emitter = new EventEmitter(ExpoAudioStreamModule ?? NativeModulesProxy.ExpoAudioStream);

export function addChangeListener(listener: (event: ChangeEventPayload) => void): Subscription {
  return emitter.addListener<ChangeEventPayload>('onChange', listener);
}

export { ExpoAudioStreamView, ExpoAudioStreamViewProps, ChangeEventPayload };
