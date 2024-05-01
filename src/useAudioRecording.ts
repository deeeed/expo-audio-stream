import { Platform } from "expo-modules-core";
import { useCallback, useEffect, useReducer, useState } from "react";

import { addAudioEventListener } from ".";
import {
  AudioEventPayload,
  AudioStreamResult,
  AudioStreamStatus,
  RecordingConfig,
  StartAudioStreamResult,
} from "./ExpoAudioStream.types";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";

export interface AudioDataEvent {
  data: string | Blob;
  position: number;
  fileUri: string;
  eventDataSize: number;
  totalSize: number;
}
export interface UseAudioRecorderState {
  startRecording: (_: RecordingConfig) => Promise<StartAudioStreamResult>;
  stopRecording: () => Promise<AudioStreamResult | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // Duration of the recording
  size: number; // Size in bytes of the recorded audio
}

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  size: number;
}

type RecorderAction =
  | { type: "START" | "STOP" | "PAUSE" | "RESUME" }
  | { type: "UPDATE_STATUS"; payload: { duration: number; size: number } };

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
        duration: 0,
        size: 0,
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
        duration: action.payload.duration,
        size: action.payload.size,
      };
    default:
      return state;
  }
}

export function useAudioRecorder({
  onAudioStream,
  debug = false,
}: {
  onAudioStream?: (_: AudioDataEvent) => Promise<void>;
  debug?: boolean;
}): UseAudioRecorderState {
  const [state, dispatch] = useReducer(recorderReducer, {
    isRecording: false,
    isPaused: false,
    duration: 0,
    size: 0,
  });

  const logDebug = (message: string, data?: any) => {
    if (debug) {
      console.log(`[useAudioRecorder] ${message}`, data);
    }
  };

  const TAG = "[ useAudioRecorder ] ";
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
      logDebug(`useAudioRecorder] Received audio event:`, {
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
      // Add more detailed handling here
      try {
        // Coming from native ( ios / android ) otherwise buffer is set
        if (Platform.OS !== "web") {
          // Read the audio file as a base64 string for comparison
          if (!encoded) {
            console.error("[useAudioRecorder] Encoded audio data is missing");
            throw new Error("Encoded audio data is missing");
          }
          await onAudioStream?.({
            data: encoded,
            position,
            fileUri,
            eventDataSize: deltaSize,
            totalSize,
          });

          // Below code is optional, used to compare encoded data to audio on file system
          // Fetch the audio data from the fileUri
          // const options = {
          //     encoding: FileSystem.EncodingType.Base64,
          //     position: lastEmittedSize,
          //     length: deltaSize,
          // };
          // const base64Content = await FileSystem.readAsStringAsync(fileUri, options);
          // const binaryData = atob(base64Content);
          // const content = new Uint8Array(binaryData.length);
          // for (let i = 0; i < binaryData.length; i++) {
          // content[i] = binaryData.charCodeAt(i);
          // }
          // const audioBlob = new Blob([content], { type: 'application/octet-stream' }); // Create a Blob from the byte array
          // console.debug(`Read audio file (len: ${content.length}) vs ${deltaSize}`)
        } else if (buffer) {
          // Coming from web
          await onAudioStream?.({
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
    [logDebug, onAudioStream],
  );

  const checkStatus = useCallback(async () => {
    try {
      if (!state.isRecording) {
        return;
      }

      const status: AudioStreamStatus = ExpoAudioStreamModule.status();
      if (debug) {
        logDebug("[useAudioRecorder] Status:", status);
      }

      if (!status.isRecording) {
        dispatch({ type: "STOP" });
      } else {
        dispatch({
          type: "UPDATE_STATUS",
          payload: { duration: status.duration, size: status.size },
        });
      }
    } catch (error) {
      console.error(`[useAudioRecorder] Error getting status:`, error);
    }
  }, [state.isRecording, logDebug]);

  useEffect(() => {
    const interval = state.isRecording ? setInterval(checkStatus, 1000) : null;
    return () => (interval ? clearInterval(interval) : undefined);
  }, [checkStatus, state.isRecording]);

  useEffect(() => {
    logDebug(`${TAG} Registering audio event listener`, onAudioStream);
    const subscribe = addAudioEventListener(handleAudioEvent);
    logDebug(`${TAG} Subscribed to audio event listener`, subscribe);

    return () => {
      logDebug(`${TAG} Removing audio event listener`);
      subscribe.remove();
    };
  }, [handleAudioEvent, logDebug]);

  const startRecording = useCallback(
    async (recordingOptions: RecordingConfig) => {
      if (debug) {
        logDebug(`${TAG} start recoding`, recordingOptions);
      }
      const startResult: StartAudioStreamResult =
        await ExpoAudioStreamModule.startRecording(recordingOptions);
      dispatch({ type: "START" });

      return startResult;
    },
    [logDebug],
  );

  const stopRecording = useCallback(async () => {
    logDebug(`${TAG} stop recording`);
    const stopResult: AudioStreamResult =
      await ExpoAudioStreamModule.stopRecording();
    dispatch({ type: "STOP" });
    return stopResult;
  }, [logDebug]);

  const pauseRecording = useCallback(async () => {
    logDebug(`${TAG} pause recording`);
    const pauseResult = await ExpoAudioStreamModule.pauseRecording();
    dispatch({ type: "PAUSE" });
    return pauseResult;
  }, [logDebug]);

  const resumeRecording = useCallback(async () => {
    logDebug(`${TAG} resume recording`);
    const resumeResult = await ExpoAudioStreamModule.resumeRecording();
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
    duration: state.duration,
    size: state.size,
  };
}
