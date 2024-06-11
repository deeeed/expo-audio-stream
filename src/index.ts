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
  AudioAnalysisData,
  AudioDataEvent,
  ExtractMetadataProps,
  UseAudioRecorderState,
  useAudioRecorder,
} from "./useAudioRecording";
import { convertPCMToFloat32, getWavFileInfo, writeWavHeader } from "./utils";

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

export const extractAudioAnalysis = async ({
  fileUri,
  wavMetadata,
  pointsPerSecond = 5,
  arrayBuffer,
  algorithm = "rms",
}: ExtractMetadataProps): Promise<AudioAnalysisData> => {
  if (Platform.OS === "web") {
    if (!arrayBuffer) {
      const response = await fetch(fileUri);
      arrayBuffer = await response.arrayBuffer();
    }

    const audioContext = new (window.AudioContext ||
      // @ts-ignore
      window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0); // Use only the first channel

    if (!wavMetadata) {
      wavMetadata = await getWavFileInfo(arrayBuffer);
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("/wavextractor.js", window.location.href),
      );

      worker.onmessage = (event) => {
        resolve(event.data);
      };

      worker.onerror = (error) => {
        reject(error);
      };

      console.log(`before posting wavmetadata`, wavMetadata)
      console.log("Posting message to worker", arrayBuffer?.byteLength);
      worker.postMessage({
        channelData,
        sampleRate: wavMetadata?.sampleRate,
        pointsPerSecond,
        bitDepth: wavMetadata?.bitDepth,
        numberOfChannels: wavMetadata?.numChannels,
        durationMs: (wavMetadata?.duration ?? 0) * 1000, // Convert to milliseconds
        algorithm,
      });
    });
  } else {
    throw new Error("Not implemented");
  }
};

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
  convertPCMToFloat32,
  createWebWorker,
  useAudioRecorder,
  useSharedAudioRecorder,
  writeWavHeader as writeWaveHeader,
};
export type { AudioDataEvent, AudioEventPayload, UseAudioRecorderState };
