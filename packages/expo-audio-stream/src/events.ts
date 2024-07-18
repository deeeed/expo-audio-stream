// packages/expo-audio-stream/src/events.ts

import { EventEmitter, type Subscription } from "expo-modules-core";

import { AudioAnalysisData } from "./AudioAnalysis/AudioAnalysis.types";
import { AudioEventPayload } from "./ExpoAudioStream.types";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";
import { getLogger } from "./logger";

const emitter = new EventEmitter(ExpoAudioStreamModule);
const logger = getLogger("events");

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
