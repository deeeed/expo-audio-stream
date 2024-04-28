import { decode as atob } from "base-64";
import debug from "debug";
import { Platform } from "expo-modules-core";
import { useCallback, useEffect, useState } from "react";

import { addAudioEventListener } from ".";
import {
  AudioStreamResult,
  AudioStreamStatus,
  RecordingOptions,
} from "./ExpoAudioStream.types";
import ExpoAudioStreamModule from "./ExpoAudioStreamModule";

const log = debug("expo-audio-stream:useAudioRecording");

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
}: {
  onAudioStream?: (buffer: Blob) => void;
}): UseAudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (isRecording || isPaused) {
      const interval = setInterval(() => {
        const status: AudioStreamStatus = ExpoAudioStreamModule.status();
        setDuration(status.duration);
        setSize(status.size);
      }, 1000);
      return () => clearInterval(interval);
    }

    return () => null;
  }, [isRecording, isPaused]);

  useEffect(() => {
    const subscribe = addAudioEventListener(
      async ({
        fileUri,
        deltaSize,
        totalSize,
        from,
        streamUuid,
        encoded,
        mimeType,
        buffer,
      }) => {
        log(`Received audio event:`, {
          fileUri,
          deltaSize,
          totalSize,
          mimeType,
          from,
          streamUuid,
          encodedLength: encoded?.length,
        });
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

              onAudioStream?.(audioBlob);
            } catch (error) {
              console.error("Error reading audio file:", error);
            }
          } else if (buffer) {
            // Coming from web
            onAudioStream?.(buffer);
          }
        }
      },
    );
    return () => subscribe.remove();
  }, [isRecording, onAudioStream]);

  const startRecording = useCallback(
    async (recordingOptions: RecordingOptions) => {
      setIsRecording(true);
      setIsPaused(false);
      setSize(0);
      setDuration(0);
      try {
        log(`start recoding`, recordingOptions);
        const fileUrl =
          await ExpoAudioStreamModule.startRecording(recordingOptions);

        return fileUrl;
      } catch (error) {
        console.error("Error starting recording:", error);
        setIsRecording(false);
      }
    },
    [],
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
      console.error("Error pausing recording:", error);
    }
  }, []);

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
