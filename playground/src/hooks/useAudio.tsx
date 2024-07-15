// playground/src/hooks/useAudio.tsx
import { useToast } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import { Audio } from "expo-av";
import { useCallback, useEffect, useState } from "react";

import { extractAudioAnalysis } from "../../../src";
import {
  AudioAnalysisData,
  AudioStreamResult,
} from "../../../src/ExpoAudioStream.types";
import { SelectedAnalysisConfig } from "../component/audio-recording-analysis-config/audio-recording-analysis-config";
import { fetchArrayBuffer } from "../utils/utils";

interface PlayOptions {
  position?: number;
}

interface UpdatePlaybackOptions {
  position?: number;
  speed?: number;
}

interface UseAudioOptions {
  loadArrayBuffer?: boolean;
  extractAnalysis?: boolean;
  analysisOptions?: SelectedAnalysisConfig;
}

export interface UseAudioProps {
  audioUri?: string | undefined;
  recording?: AudioStreamResult;
  options: UseAudioOptions;
}

export const useAudio = ({ audioUri, recording, options }: UseAudioProps) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1); // Add state for speed
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer>();
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysisData | null>(
    null,
  );
  const { logger } = useLogger("useAudio");
  const { show } = useToast();

  logger.log(`analysisOptions:`, options);
  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    if (!audioUri) return;

    const processAudioData = async () => {
      try {
        setProcessing(true);
        let actualAudioBuffer: ArrayBuffer | undefined;

        if (options.loadArrayBuffer) {
          if (!audioUri) return;
          logger.debug(`Fetching audio array buffer from ${audioUri}`);
          const buffer = await fetchArrayBuffer(audioUri);
          actualAudioBuffer = buffer.slice(0);
          setArrayBuffer(actualAudioBuffer);
          logger.debug(
            `Fetched audio array buffer from ${audioUri} --> length: ${buffer.byteLength} bytes`,
          );
        }

        if (options.extractAnalysis) {
          const analysis = await extractAudioAnalysis({
            fileUri: actualAudioBuffer ? undefined : audioUri, // Priority to audioBuffer if provided
            arrayBuffer: actualAudioBuffer,
            sampleRate: recording?.sampleRate,
            bitDepth: recording?.bitDepth,
            durationMs: recording?.durationMs,
            numberOfChannels: recording?.channels,
            pointsPerSecond: options.analysisOptions?.pointsPerSecond,
            features: options.analysisOptions?.features,
          });
          setAudioAnalysis(analysis);
          // logger.debug(`Extracted audio analysis from ${audioUri}`, analysis);
        }
      } catch (error) {
        logger.error(`Failed to process audio ${audioUri}:`, error);
        show({ type: "error", message: "Failed to load audio data" });
      } finally {
        setProcessing(false);
      }
    };

    processAudioData().catch(logger.error);
  }, [
    audioUri,
    options.loadArrayBuffer,
    options.extractAnalysis,
    options.analysisOptions?.pointsPerSecond,
    logger,
    show,
  ]);

  const updatePlaybackStatus = useCallback(
    ({ isLoaded, didJustFinish, positionMillis, error }: any) => {
      if (error) {
        logger.error(`Playback Error: ${error}`);
        return;
      }
      if (!isLoaded) {
        return;
      }
      setPosition(positionMillis);
      if (didJustFinish) {
        setIsPlaying(false);
        setPosition(0); // Reset position when playback finishes
      }
    },
    [logger],
  );

  const play = async (options?: PlayOptions) => {
    if (!audioUri) return;
    try {
      if (!sound) {
        console.log(`Playing audio from ${audioUri}`);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true, positionMillis: options?.position || position },
        );
        newSound.setOnPlaybackStatusUpdate(updatePlaybackStatus);
        setSound(newSound);
        setIsPlaying(true);

        // Apply stored options
        if (speed !== 1) {
          await newSound.setRateAsync(speed, false);
        }
      } else {
        if (options?.position !== undefined) {
          await sound.setPositionAsync(options.position);
        }
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      logger.error("Failed to play the audio:", error);
      show({ type: "error", message: "Failed to play the audio" });
    }
  };

  const pause = async () => {
    if (!audioUri || !sound) return;
    try {
      await sound.pauseAsync();
      setIsPlaying(false);
    } catch (error) {
      logger.error("Failed to pause the audio:", error);
      show({ type: "error", message: "Failed to pause the audio" });
    }
  };

  const updatePlaybackOptions = async (options: UpdatePlaybackOptions) => {
    logger.debug("Updating playback options:", options);
    if (options.position !== undefined) {
      logger.debug(`Set playback position to ${options.position}`);
      setPosition(options.position);
      if (sound) {
        await sound.setPositionAsync(options.position);
      }
    }
    if (options.speed !== undefined) {
      logger.debug(`Set playback speed to ${options.speed}`);
      setSpeed(options.speed);
      if (sound) {
        await sound.setRateAsync(options.speed, false);
      }
    }
  };

  return {
    arrayBuffer,
    audioAnalysis,
    isPlaying,
    position,
    processing,
    play,
    pause,
    updatePlaybackOptions,
  };
};
