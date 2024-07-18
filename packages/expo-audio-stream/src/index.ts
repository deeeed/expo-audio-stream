// src/index.ts

import { extractAudioAnalysis } from "./AudioAnalysis/extractAudioAnalysis";
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "./AudioRecorder.provider";
import { useAudioRecorder } from "./useAudioRecorder";

export * from "./utils/getWavFileInfo";
export * from "./utils/convertPCMToFloat32";
export * from "./utils/writeWavHeader";

export {
  AudioRecorderProvider,
  extractAudioAnalysis,
  useAudioRecorder,
  useSharedAudioRecorder,
};

export type * from "./AudioAnalysis/AudioAnalysis.types";
export type * from "./ExpoAudioStream.types";
