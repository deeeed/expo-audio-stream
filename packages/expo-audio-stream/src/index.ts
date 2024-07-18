// src/index.ts
import { EventEmitter, type Subscription } from "expo-modules-core";

import { AudioAnalysisData } from "./AudioAnalysis/AudioAnalysis.types";
import { extractAudioAnalysis } from "./AudioAnalysis/extractAudioAnalysis";
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "./AudioRecorder.provider";
import { AudioEventPayload } from "./ExpoAudioStream.types";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";
import { getLogger } from "./logger";
import { useAudioRecorder } from "./useAudioRecorder";
const emitter = new EventEmitter(ExpoAudioStreamModule);
const logger = getLogger("ExpoAudioStream");

export function addAudioEventListener(
  listener: (event: AudioEventPayload) => Promise<void>,
): Subscription {
  logger.log("Adding listener for AudioData event");
  return emitter.addListener<AudioEventPayload>("AudioData", listener);
}

export function addAudioAnalysisListener(
  listener: (event: AudioAnalysisData) => Promise<void>,
): Subscription {
  logger.log("Adding listener for AudioAnalysis event");
  return emitter.addListener<AudioAnalysisData>("AudioAnalysis", listener);
}

export {
  AudioRecorderProvider,
  extractAudioAnalysis,
  useAudioRecorder,
  useSharedAudioRecorder,
};

export type * from "./AudioAnalysis/AudioAnalysis.types";
export type * from "./ExpoAudioStream.types";
