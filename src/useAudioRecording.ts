import { decode as atob } from "base-64";
import { Platform } from "expo-modules-core";
import { useCallback, useEffect, useState } from "react";

import { addAudioEventListener } from ".";
import {
  AudioStreamResult,
  AudioStreamStatus,
  RecordingOptions,
} from "./ExpoAudioStream.types";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";

export interface AudioDataEvent {
  buffer: Blob;
  position: number;
}
export interface UseAudioRecorderState {
  startRecording: (_: RecordingOptions) => Promise<string | null>;
  stopRecording: () => Promise<AudioStreamResult | null>;
  pauseRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // Duration of the recording
  size: number; // Size in bytes of the recorded audio
}

export function useAudioRecorder({
  onAudioStream,
  debug = false,
}: {
  onAudioStream?: (_: AudioDataEvent) => Promise<void>;
  debug?: boolean;
}): UseAudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (debug) {
      console.log(
        `[useAudioRecorder] isRecording: ${isRecording}, isPaused: ${isPaused}`,
      );
    }
    if (isRecording || isPaused) {
      const interval = setInterval(() => {
        try {
          if (debug) console.log(`[useAudioRecorder] Getting status`);
          const status: AudioStreamStatus = ExpoAudioStreamModule.status();
          if (debug) {
            console.log(`[useAudioRecorder] Status:`, status);
          }
          setDuration(status.duration);
          setSize(status.size);
        } catch (error) {
          console.error(`[useAudioRecorder] Error getting status:`, error);
        }
      }, 1000);
      return () => clearInterval(interval);
    }

    return () => null;
  }, [isRecording, isPaused, debug]);

  useEffect(() => {
    if (debug) {
      console.log(
        `[useAudioRecorder] Registering audio event listener`,
        onAudioStream,
      );
    }
    const subscribe = addAudioEventListener(
      async ({
        fileUri,
        deltaSize,
        totalSize,
        lastEmittedSize,
        position,
        streamUuid,
        encoded,
        mimeType,
        buffer,
      }) => {
        try {
          if (debug) {
            console.log(`[useAudioRecorder] Received audio event:`, {
              fileUri,
              deltaSize,
              totalSize,
              mimeType,
              lastEmittedSize,
              streamUuid,
              encodedLength: encoded?.length,
            });
          }
          if (deltaSize > 0) {
            // Coming from native ( ios / android ) otherwise buffer is set
            if (Platform.OS !== "web") {
              // Read the audio file as a base64 string for comparison
              try {
                // convert encoded string to binary data
                const binaryData = atob(encoded);
                const content = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                  content[i] = binaryData.charCodeAt(i);
                }
                const audioBlob = new Blob([content], { type: mimeType });

                // Below code is optional, used to compare encoded data to audio on file system
                // Fetch the audio data from the fileUri
                // const options = {
                //     encoding: FileSystem.EncodingType.Base64,
                //     position: from,
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

                onAudioStream?.({ buffer: audioBlob, position });
              } catch (error) {
                console.error(
                  "[useAudioRecorder] Error reading audio file:",
                  error,
                );
              }
            } else if (buffer) {
              // Coming from web
              onAudioStream?.({ buffer, position });
            }
          }
        } catch (error) {
          console.error(
            "[useAudioRecorder] Error processing audio event:",
            error,
          );
        }
      },
    );
    return () => {
      if (debug) {
        console.log(`[useAudioRecorder] Removing audio event listener`);
      }
      subscribe.remove();
    };
  }, [isRecording, onAudioStream, debug]);

  const startRecording = useCallback(
    async (recordingOptions: RecordingOptions) => {
      setIsRecording(true);
      setIsPaused(false);
      setSize(0);
      setDuration(0);
      try {
        if (debug) {
          console.log(`[useAudioRecorder] start recoding`, recordingOptions);
        }

        const fileUrl =
          await ExpoAudioStreamModule.startRecording(recordingOptions);

        return fileUrl;
      } catch (error) {
        console.error("[useAudioRecorder] Error starting recording:", error);
        setIsRecording(false);
      }
    },
    [debug],
  );

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    setIsPaused(false);
    const result: AudioStreamResult =
      await ExpoAudioStreamModule.stopRecording();
    return result;
  }, []);

  const pauseRecording = useCallback(async () => {
    try {
      await ExpoAudioStreamModule.stopRecording();
      setIsPaused(true);
      setIsRecording(false);
    } catch (error) {
      console.error("[useAudioRecorder] Error pausing recording:", error);
    }
  }, [debug]);

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    isPaused,
    isRecording,
    duration,
    size,
  };
}
