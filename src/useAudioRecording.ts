// src/useAudioRecording.ts
import { Platform, Subscription } from "expo-modules-core";
import { useCallback, useEffect, useReducer, useRef } from "react";

import { addAudioAnalysisListener, addAudioEventListener } from ".";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";
import {
  AudioAnalysisData,
  AudioDataEvent,
  AudioEventPayload,
  AudioFeaturesOptions,
  AudioStreamResult,
  AudioStreamStatus,
  RecordingConfig,
  StartAudioStreamResult,
} from "./ExpoAudioStream.types";
import { WavFileInfo } from "./utils";

const MAX_VISUALIZATION_DURATION_MS = 10000; // Default maximum duration for visualization

export interface ExtractMetadataProps {
  fileUri?: string; // should provide either fileUri or arrayBuffer
  wavMetadata?: WavFileInfo;
  arrayBuffer?: ArrayBuffer;
  bitDepth?: number;
  skipWavHeader?: boolean;
  durationMs?: number;
  sampleRate?: number;
  numberOfChannels?: number;
  algorithm?: "peak" | "rms";
  position?: number; // Optional number of bytes to skip. Default is 0
  length?: number; // Optional number of bytes to read.
  pointsPerSecond?: number; // Optional number of points per second. Use to reduce the number of points and compute the number of datapoints to return.
  features?: AudioFeaturesOptions;
}

export interface UseAudioRecorderProps {
  debug?: boolean;
  audioWorkletUrl?: string;
  featuresExtratorUrl?: string;
}

export interface UseAudioRecorderState {
  startRecording: (_: RecordingConfig) => Promise<StartAudioStreamResult>;
  stopRecording: () => Promise<AudioStreamResult | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number; // Duration of the recording
  size: number; // Size in bytes of the recorded audio
  analysisData?: AudioAnalysisData;
}

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  size: number;
  analysisData?: AudioAnalysisData;
}

type RecorderAction =
  | { type: "START" | "STOP" | "PAUSE" | "RESUME" }
  | { type: "UPDATE_STATUS"; payload: { durationMs: number; size: number } }
  | { type: "UPDATE_ANALYSIS"; payload: AudioAnalysisData };

const defaultAnalysis: AudioAnalysisData = {
  pointsPerSecond: 20,
  bitDepth: 32,
  numberOfChannels: 1,
  durationMs: 0,
  sampleRate: 44100,
  samples: 0,
  dataPoints: [],
  amplitudeRange: {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  },
};

function recorderReducer(
  state: RecorderState,
  action: RecorderAction,
): RecorderState {
  switch (action.type) {
    case "START":
      return {
        ...state,
        isRecording: true,
        isPaused: false,
        durationMs: 0,
        size: 0,
        analysisData: defaultAnalysis, // Reset analysis data
      };
    case "STOP":
      return { ...state, isRecording: false, isPaused: false };
    case "PAUSE":
      return { ...state, isPaused: true, isRecording: false };
    case "RESUME":
      return { ...state, isPaused: false, isRecording: true };
    case "UPDATE_STATUS":
      return {
        ...state,
        durationMs: action.payload.durationMs,
        size: action.payload.size,
      };
    case "UPDATE_ANALYSIS":
      return {
        ...state,
        analysisData: action.payload,
      };
    default:
      return state;
  }
}
const TAG = "[ useAudioRecorder ] ";

export function useAudioRecorder({
  debug = false,
  audioWorkletUrl,
  featuresExtratorUrl,
}: UseAudioRecorderProps = {}): UseAudioRecorderState {
  const [state, dispatch] = useReducer(recorderReducer, {
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    size: 0,
    analysisData: undefined,
  });

  const analysisListenerRef = useRef<Subscription | null>(null);
  const analysisRef = useRef<AudioAnalysisData>({ ...defaultAnalysis });

  // Instantiate the module for web with URLs
  const ExpoAudioStream =
    Platform.OS === "web"
      ? ExpoAudioStreamModule({ audioWorkletUrl, featuresExtratorUrl })
      : ExpoAudioStreamModule;

  const onAudioStreamRef = useRef<
    ((_: AudioDataEvent) => Promise<void>) | null
  >(null);

  const logDebug = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        if (data) {
          console.log(`${TAG} ${message}`, data);
        } else {
          console.log(`${TAG} ${message}`);
        }
      }
    },
    [debug],
  );

  const handleAudioAnalysis = useCallback(
    async (analysis: AudioAnalysisData, visualizationDuration: number) => {
      const savedAnalysisData = analysisRef.current || { ...defaultAnalysis };

      const maxDuration = visualizationDuration;

      logDebug(
        `[handleAudioAnalysis] Received audio analysis: maxDuration=${maxDuration} analysis.dataPoints=${analysis.dataPoints.length} analysisData.dataPoints=${savedAnalysisData.dataPoints.length}`,
        analysis,
      );

      // Combine data points
      const combinedDataPoints = [
        ...savedAnalysisData.dataPoints,
        ...analysis.dataPoints,
      ];

      // Calculate the new duration
      const pointsPerSecond =
        analysis.pointsPerSecond || savedAnalysisData.pointsPerSecond;
      const maxDataPoints = (pointsPerSecond * visualizationDuration) / 1000;

      logDebug(
        `[handleAudioAnalysis] Combined data points before trimming: pointsPerSecond=${pointsPerSecond} visualizationDuration=${visualizationDuration} combinedDataPointsLength=${combinedDataPoints.length} vs maxDataPoints=${maxDataPoints}`,
      );

      // Trim data points to keep within the maximum number of data points
      if (combinedDataPoints.length > maxDataPoints) {
        combinedDataPoints.splice(0, combinedDataPoints.length - maxDataPoints);
      }

      savedAnalysisData.dataPoints = combinedDataPoints;
      savedAnalysisData.bitDepth =
        analysis.bitDepth || savedAnalysisData.bitDepth;
      savedAnalysisData.durationMs =
        combinedDataPoints.length * (1000 / pointsPerSecond);

      // Update amplitude range
      const newMin = Math.min(
        savedAnalysisData.amplitudeRange.min,
        analysis.amplitudeRange.min,
      );
      const newMax = Math.max(
        savedAnalysisData.amplitudeRange.max,
        analysis.amplitudeRange.max,
      );

      savedAnalysisData.amplitudeRange = {
        min: newMin,
        max: newMax,
      };

      logDebug(
        `[handleAudioAnalysis] Updated analysis data: durationMs=${savedAnalysisData.durationMs}`,
        savedAnalysisData,
      );

      // Update the ref
      analysisRef.current = savedAnalysisData;

      // Dispatch the updated analysis data to state to trigger re-render
      // need to use spread operator otherwise it doesnt trigger update.
      dispatch({ type: "UPDATE_ANALYSIS", payload: { ...savedAnalysisData } });
    },
    [logDebug],
  );

  const handleAudioEvent = useCallback(
    async (eventData: AudioEventPayload) => {
      const {
        fileUri,
        deltaSize,
        totalSize,
        lastEmittedSize,
        position,
        streamUuid,
        encoded,
        mimeType,
        buffer,
      } = eventData;
      logDebug(`[handleAudioEvent] Received audio event:`, {
        fileUri,
        deltaSize,
        totalSize,
        position,
        mimeType,
        lastEmittedSize,
        streamUuid,
        encodedLength: encoded?.length,
      });
      if (deltaSize === 0) {
        // Ignore packet with no data
        return;
      }
      try {
        // Coming from native ( ios / android ) otherwise buffer is set
        if (Platform.OS !== "web") {
          // Read the audio file as a base64 string for comparison
          if (!encoded) {
            console.error(`${TAG} Encoded audio data is missing`);
            throw new Error("Encoded audio data is missing");
          }
          onAudioStreamRef.current?.({
            data: encoded,
            position,
            fileUri,
            eventDataSize: deltaSize,
            totalSize,
          });
        } else if (buffer) {
          // Coming from web
          onAudioStreamRef.current?.({
            data: buffer,
            position,
            fileUri,
            eventDataSize: deltaSize,
            totalSize,
          });
        }
      } catch (error) {
        console.error(`${TAG} Error processing audio event:`, error);
      }
    },
    [logDebug],
  );

  const checkStatus = useCallback(async () => {
    try {
      if (!state.isRecording) {
        logDebug(`${TAG} Not recording, exiting status check.`);
        return;
      }

      const status: AudioStreamStatus = ExpoAudioStream.status();
      if (debug) {
        logDebug(`${TAG} Status:`, status);
      }

      if (!status.isRecording) {
        dispatch({ type: "STOP" });
      } else {
        dispatch({
          type: "UPDATE_STATUS",
          payload: { durationMs: status.durationMs, size: status.size },
        });
      }
    } catch (error) {
      console.error(`${TAG} Error getting status:`, error);
    }
  }, [state.isRecording, logDebug]);

  useEffect(() => {
    let interval: number;
    if (state.isRecording) {
      interval = setInterval(checkStatus, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [checkStatus, state.isRecording]);

  useEffect(() => {
    logDebug(`Registering audio event listener`);
    const subscribeAudio = addAudioEventListener(handleAudioEvent);

    logDebug(`Subscribed to audio event listener and analysis listener`, {
      subscribeAudio,
    });

    return () => {
      logDebug(`Removing audio event listener`);
      subscribeAudio.remove();
    };
  }, [handleAudioEvent, handleAudioAnalysis, logDebug]);

  const startRecording = useCallback(
    async (recordingOptions: RecordingConfig) => {
      if (debug) {
        logDebug(`start recoding`, recordingOptions);
      }

      analysisRef.current = { ...defaultAnalysis }; // Reset analysis data

      const { onAudioStream, ...options } = recordingOptions;
      const { maxRecentDataDuration = 10000, enableProcessing } = options;
      if (typeof onAudioStream === "function") {
        onAudioStreamRef.current = onAudioStream;
      } else {
        console.warn(`${TAG} onAudioStream is not a function`, onAudioStream);
        onAudioStreamRef.current = null;
      }
      const startResult: StartAudioStreamResult =
        await ExpoAudioStream.startRecording(options);
      dispatch({ type: "START" });

      if (enableProcessing) {
        logDebug(`Enabling audio analysis listener`);
        const listener = addAudioAnalysisListener(async (analysisData) => {
          try {
            await handleAudioAnalysis(analysisData, maxRecentDataDuration);
          } catch (error) {
            console.warn(`${TAG} Error processing audio analysis:`, error);
          }
        });

        analysisListenerRef.current = listener;
      }

      return startResult;
    },
    [logDebug],
  );

  const stopRecording = useCallback(async () => {
    logDebug(`${TAG} stoping recording`);

    if (analysisListenerRef.current) {
      analysisListenerRef.current.remove();
      analysisListenerRef.current = null;
    }

    const stopResult: AudioStreamResult = await ExpoAudioStream.stopRecording();
    onAudioStreamRef.current = null;
    logDebug(`${TAG} recording stopped`, stopResult);
    dispatch({ type: "STOP" });
    return stopResult;
  }, [logDebug]);

  const pauseRecording = useCallback(async () => {
    logDebug(`${TAG} pause recording`);
    const pauseResult = await ExpoAudioStream.pauseRecording();
    dispatch({ type: "PAUSE" });
    return pauseResult;
  }, [logDebug]);

  const resumeRecording = useCallback(async () => {
    logDebug(`${TAG} resume recording`);
    const resumeResult = await ExpoAudioStream.resumeRecording();
    dispatch({ type: "RESUME" });
    return resumeResult;
  }, [logDebug]);

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isPaused: state.isPaused,
    isRecording: state.isRecording,
    durationMs: state.durationMs,
    size: state.size,
    analysisData: state.analysisData,
  };
}
