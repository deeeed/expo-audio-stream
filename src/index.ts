// src/index.ts
import { EventEmitter, type Subscription } from "expo-modules-core";
import { Platform } from "react-native";

// Import the native module. On web, it will be resolved to ExpoAudioStream.web.ts
// and on native platforms to ExpoAudioStream.ts
import {
  AudioRecorderProvider,
  useSharedAudioRecorder,
} from "./AudioRecorder.provider";
import { AudioAnalysisData, AudioEventPayload } from "./ExpoAudioStream.types";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";
import { ExtractMetadataProps, useAudioRecorder } from "./useAudioRecording";
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

export function addAudioAnalysisListener(
  listener: (event: AudioAnalysisData) => Promise<void>,
): Subscription {
  console.log(`addAudioAnalysisListener`, listener);
  return emitter.addListener<AudioAnalysisData>("AudioAnalysis", listener);
}

export const extractAudioAnalysis = async ({
  fileUri,
  pointsPerSecond = 20,
  arrayBuffer,
  bitDepth,
  durationMs,
  sampleRate,
  numberOfChannels,
  algorithm = "rms",
  features,
}: ExtractMetadataProps): Promise<AudioAnalysisData> => {
  if (Platform.OS === "web") {
    if (!arrayBuffer && !fileUri) {
      throw new Error("Either arrayBuffer or fileUri must be provided");
    }

    if (!arrayBuffer) {
      console.log(`fetching fileUri`, fileUri);
      const response = await fetch(fileUri!);
      arrayBuffer = await response.arrayBuffer();
    }

    console.log(
      `extractAudioAnalysis len=${arrayBuffer.byteLength}`,
      arrayBuffer,
    );

    let copyChannelData: Float32Array;
    try {
      const audioContext = new (window.AudioContext ||
        // @ts-ignore
        window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0); // Use only the first channel
      copyChannelData = channelData.slice(0); // Copy channel data
    } catch (error) {
      // ignore error
      console.warn("Failed to decode audio data", error);
      copyChannelData = new Float32Array(arrayBuffer);
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("/audio-features-extractor.js", window.location.href),
      );

      worker.onmessage = (event) => {
        resolve(event.data.result);
      };

      worker.onerror = (error) => {
        reject(error);
      };

      worker.postMessage({
        command: "process",
        channelData: copyChannelData,
        sampleRate,
        pointsPerSecond,
        algorithm,
        bitDepth,
        durationMs,
        numberOfChannels,
      });
    });
  } else {
    if (!fileUri) {
      throw new Error("fileUri is required");
    }
    console.log(`extractAudioAnalysis`, {
      fileUri,
      pointsPerSecond,
      algorithm,
    });
    const res = await ExpoAudioStreamModule.extractAudioAnalysis({
      fileUri,
      pointsPerSecond,
      algorithm,
      features,
    });
    console.log(`extractAudioAnalysis`, res);
    return res;
  }
};

export interface ExtractWaveformProps {
  fileUri: string;
  numberOfSamples: number;
  offset?: number;
  length?: number;
}
export const extractWaveform = async ({
  fileUri,
  numberOfSamples,
  offset = 0,
  length,
}: ExtractWaveformProps): Promise<unknown> => {
  const res = await ExpoAudioStreamModule.extractAudioAnalysis({
    fileUri,
    numberOfSamples,
    offset,
    length,
  });
  console.log(`extractWaveform`, res);
  return res;
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
  getWavFileInfo,
  useAudioRecorder,
  useSharedAudioRecorder,
  writeWavHeader as writeWaveHeader,
};

export * from "./ExpoAudioStream.types";
