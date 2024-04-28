import {
  EventEmitter,
  NativeModulesProxy,
  type Subscription,
} from "expo-modules-core";

// Import the native module. On web, it will be resolved to ExpoAudioStream.web.ts
// and on native platforms to ExpoAudioStream.ts
import { AudioEventPayload } from "./ExpoAudioStream.types";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";
import {
  useAudioRecorder,
  UseAudioRecorderState,
  AudioDataEvent,
} from "./useAudioRecording";

const emitter = new EventEmitter(
  ExpoAudioStreamModule ?? NativeModulesProxy.ExpoAudioStream,
);

export function listAudioFiles(): Promise<string[]> {
  return ExpoAudioStreamModule.listAudioFiles();
}

export function clearAudioFiles(): Promise<void> {
  return ExpoAudioStreamModule.clearAudioFiles();
}

export function addAudioEventListener(
  listener: (event: AudioEventPayload) => Promise<void>,
): Subscription {
  return emitter.addListener<AudioEventPayload>("AudioData", listener);
}

export type { AudioEventPayload, UseAudioRecorderState, AudioDataEvent };
export { useAudioRecorder };
