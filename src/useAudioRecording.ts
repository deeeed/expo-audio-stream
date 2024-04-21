import { NativeModulesProxy, EventEmitter, type Subscription } from 'expo-modules-core';

import { useCallback, useEffect, useState } from "react";
import ExpoAudioStreamModule from './ExpoAudioStreamModule';
import { AudioEventPayload, AudioStreamStatus, RecordingOptions } from "./ExpoAudioStream.types";
import { addChangeListener } from '.';
import * as FileSystem from 'expo-file-system';
import { decode as atob } from 'base-64';

const emitter = new EventEmitter(ExpoAudioStreamModule ?? NativeModulesProxy.ExpoAudioStream);

interface UseAudioRecorderState {
    startRecording: (_: RecordingOptions) => Promise<void>;
    stopRecording: () => Promise<number>;
    pauseRecording: () => void;
    isRecording: boolean;
    isPaused: boolean;
    duration: number;  // Duration of the recording
    size: number;      // Size in bytes of the recorded audio
}

export function useAudioRecorder({onAudioStream}: {onAudioStream?: (buffer:Uint8Array) => void}): UseAudioRecorderState {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [size, setSize] = useState(0);

    useEffect( () => {
        if(isRecording || isPaused) {
            const interval = setInterval(() => {
                const status: AudioStreamStatus = ExpoAudioStreamModule.status()
                setDuration(status.duration);
                setSize(status.size);
            }, 1000);
            return () => clearInterval(interval);
        }

        return () => null;
    }, [isRecording, isPaused])


  useEffect(() => {
    const subscribe = addChangeListener(async ({fileUri, deltaSize, totalSize, from, streamUuid, encoded}) => {
        console.debug(`Received audio event:`, {fileUri, deltaSize, totalSize, from, streamUuid, encodedLength: encoded?.length})
        if(deltaSize > 0) {
            // Fetch the audio data from the fileUri
            const options = {
                encoding: FileSystem.EncodingType.Base64,
                position: from,
                length: deltaSize,
              };

              try {
                const base64Content = await FileSystem.readAsStringAsync(fileUri, options);
                const binaryData = atob(base64Content);
                const content = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                  content[i] = binaryData.charCodeAt(i);
                }

                console.debug(`Read audio file (len: ${content.length}) vs ${deltaSize}`)
              } catch (error) {
                console.error('Error reading audio file:', error);
              }
        }
    //   onAudioStream?.(event.buffer);
    });
    return () => subscribe.remove();
  }, [isRecording, onAudioStream]);


    const startRecording = useCallback(async (recordingOptions: RecordingOptions) => {
        if (!isRecording) {
            setIsRecording(true);
            setIsPaused(false);
            setSize(0);
            setDuration(0);
            const startTime = Date.now();

            try {
                console.log(`start recoding`, recordingOptions)
                await ExpoAudioStreamModule.startRecording(recordingOptions);

            } catch (error) {
                console.error('Error starting recording:', error);
                setIsRecording(false);
            }
        }
    }, [isRecording]);

    const stopRecording = useCallback(async (): Promise<number> => {
        if (isRecording) {
            setIsRecording(false);
            setIsPaused(false);
            try {
                const recordedDuration = await ExpoAudioStreamModule.stopRecording();
                setDuration(recordedDuration);
                return recordedDuration;
            } catch (error) {
                console.error('Error stopping recording:', error);
                return 0;
            }
        }
        return 0;
    }, [isRecording]);

    const pauseRecording = useCallback(() => {
        if (isRecording) {
            ExpoAudioStreamModule.stopRecording().catch(console.error);
            setIsPaused(true);
            setIsRecording(false);
        }
    }, [isRecording]);

    // Cleanup listener on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (isRecording) {
                ExpoAudioStreamModule.stopRecording().catch(console.error);
            }
        };
    }, [isRecording]);

    return {
        startRecording,
        stopRecording,
        pauseRecording,
        isPaused,
        isRecording,
        duration,
        size
    };
}