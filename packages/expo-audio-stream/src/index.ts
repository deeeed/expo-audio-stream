// src/index.ts

import { extractAudioAnalysis } from "./AudioAnalysis/extractAudioAnalysis";
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "./AudioRecorder.provider";
import { useAudioRecorder } from "./useAudioRecorder";

export {
  AudioRecorderProvider,
  extractAudioAnalysis,
  useAudioRecorder,
  useSharedAudioRecorder,
};

export type * from "./AudioAnalysis/AudioAnalysis.types";
export type * from "./ExpoAudioStream.types";
