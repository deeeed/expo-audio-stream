import { Platform } from "expo-modules-core";
import { useCallback, useEffect, useReducer, useRef } from "react";

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

export interface UseAudioRecorderProps {
  debug?: boolean;
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
const TAG = "[ useAudioRecorder ] ";

export function useAudioRecorder({
  debug = false,
}: UseAudioRecorderProps = {}): UseAudioRecorderState {
  const [state, dispatch] = useReducer(recorderReducer, {
    isRecording: false,
    isPaused: false,
    duration: 0,
    size: 0,
  });

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

      const status: AudioStreamStatus = ExpoAudioStreamModule.status();
      if (debug) {
        logDebug(`${TAG} Status:`, status);
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
    logDebug(`${TAG} Registering audio event listener`);
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

      // remove onAudioStream from recordingOptions
      const { onAudioStream, ...options } = recordingOptions;
      if (typeof onAudioStream === "function") {
        onAudioStreamRef.current = onAudioStream;
      } else {
        console.warn(`${TAG} onAudioStream is not a function`, onAudioStream);
        onAudioStreamRef.current = null;
      }
      const startResult: StartAudioStreamResult =
        await ExpoAudioStreamModule.startRecording(options);
      dispatch({ type: "START" });

      return startResult;
    },
    [logDebug],
  );

  const stopRecording = useCallback(async () => {
    logDebug(`${TAG} stoping recording`);
    const stopResult: AudioStreamResult =
      await ExpoAudioStreamModule.stopRecording();
    onAudioStreamRef.current = null;
    logDebug(`${TAG} recording stopped`, stopResult);
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
