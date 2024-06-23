import { useToast } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import { Audio } from "expo-av";
import { useCallback, useEffect, useState } from "react";

import { extractAudioAnalysis } from "../../../src";
import { AudioAnalysisData } from "../../../src/ExpoAudioStream.types";
import { fetchArrayBuffer } from "../utils";

interface UseAudioOptions {
  loadArrayBuffer?: boolean;
  extractAnalysis?: boolean;
}

export const useAudio = (
  audioUri: string | undefined,
  options: UseAudioOptions = { loadArrayBuffer: false, extractAnalysis: false },
) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysisData | null>(
    null,
  );
  const { logger } = useLogger("useAudio");
  const { show } = useToast();

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    if (!audioUri) return;

    const processAudioData = async () => {
      try {
        if (options.loadArrayBuffer) {
          logger.debug(`Fetching audio array buffer from ${audioUri}`);
          const buffer = await fetchArrayBuffer(audioUri);
          setArrayBuffer(buffer);
          logger.debug(
            `Fetched audio array buffer from ${audioUri} --> length: ${buffer.byteLength} bytes`,
          );
        }

        logger.debug(`Loading audio from ${audioUri}`);
        if (options.extractAnalysis) {
          logger.debug(`Extracting audio analysis from ${audioUri}`);
          const analysis = await extractAudioAnalysis({ fileUri: audioUri });
          setAudioAnalysis(analysis);
          logger.debug(`Extracted audio analysis from ${audioUri}`, analysis);
        }
      } catch (error) {
        logger.error(`Failed to process audio ${audioUri}:`, error);
        show({ type: "error", message: "Failed to load audio data" });
      }
    };

    processAudioData().catch(logger.error);
  }, [
    audioUri,
    options.loadArrayBuffer,
    options.extractAnalysis,
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

  const togglePlayPause = async () => {
    if (!audioUri) return;
    try {
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
        );
        newSound.setOnPlaybackStatusUpdate(updatePlaybackStatus);
        setSound(newSound);
        setIsPlaying(true);
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.setPositionAsync(0); // Reset the position to the start
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      logger.error("Failed to play or pause the audio:", error);
      show({ type: "error", message: "Failed to play or pause the audio" });
    }
  };

  return {
    arrayBuffer,
    audioAnalysis,
    isPlaying,
    position,
    togglePlayPause,
  };
};
