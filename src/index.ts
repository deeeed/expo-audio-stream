import { EventEmitter, type Subscription } from "expo-modules-core";
import { Platform } from "react-native";

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
import { writeWavHeader, convertPCMToFloat32 } from "./utils";

const emitter = new EventEmitter(ExpoAudioStreamModule);

export function test(): void {
  return ExpoAudioStreamModule.test();
}

export function addAudioEventListener(
  listener: (event: AudioEventPayload) => Promise<void>,
): Subscription {
  console.log(`addAudioEventListener`, listener);
  return emitter.addListener<AudioEventPayload>("AudioData", listener);
}

let createWebWorker: () => Worker;

if (Platform.OS === "web") {
  createWebWorker = require("./WebWorker.web").default;
} else {
  createWebWorker = () => {
    throw new Error("Web Workers are not supported on this platform.");
  };
}

export {
  AudioRecorderProvider,
  writeWavHeader as writeWaveHeader,
  convertPCMToFloat32,
  useAudioRecorder,
  useSharedAudioRecorder,
  createWebWorker,
};
export type { AudioDataEvent, AudioEventPayload, UseAudioRecorderState };
