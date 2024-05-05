import {
  EventEmitter,
  NativeModulesProxy,
  type Subscription,
} from "expo-modules-core";

// Import the native module. On web, it will be resolved to ExpoAudioStream.web.ts
// and on native platforms to ExpoAudioStream.ts
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "./AudioRecorder.provider";
import { AudioEventPayload } from "./ExpoAudioStream.types";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";
import {
  AudioDataEvent,
  UseAudioRecorderState,
  useAudioRecorder,
} from "./useAudioRecording";

const emitter = new EventEmitter(
  ExpoAudioStreamModule ?? NativeModulesProxy.ExpoAudioStream,
);

export function test(): void {
  return ExpoAudioStreamModule.test();
}

export function addAudioEventListener(
  listener: (event: AudioEventPayload) => Promise<void>,
): Subscription {
  console.log(`addAudioEventListener`, listener);
  return emitter.addListener<AudioEventPayload>("AudioData", listener);
}

export { AudioRecorderProvider, useAudioRecorder, useSharedAudioRecorder };
export type { AudioDataEvent, AudioEventPayload, UseAudioRecorderState };
