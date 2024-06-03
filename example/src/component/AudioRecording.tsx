import { AppTheme, Button, useTheme, useToast } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import { Audio } from "expo-av";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { WaveForm } from "./waveform/waveform";
import { AudioStreamResult } from "../../../src/ExpoAudioStream.types";
import { formatBytes, formatDuration } from "../utils";

const getStyles = ({
  isPlaying,
  theme,
}: {
  isPlaying: boolean;
  theme: AppTheme;
}) => {
  return StyleSheet.create({
    container: {
      padding: 20,
      borderBottomWidth: 3,
      borderColor: isPlaying ? theme.colors.primary : theme.colors.border,
      backgroundColor: "#fff",
    },
    detailText: {
      fontSize: 16,
      marginBottom: 5,
    },
    positionText: {
      fontSize: 16,
      marginBottom: 5,
      fontWeight: isPlaying ? "bold" : "normal",
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 10,
    },
  });
};

const fetchArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  const response = await fetch(uri);
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
};

export interface AudioRecordingProps {
  recording: AudioStreamResult;
  webAudioUri?: string; // Allow to overwrite the audioUri for web since it cannot load from file
  showWaveform?: boolean;
  onDelete?: () => Promise<void>;
}
export const AudioRecording = ({
  recording,
  webAudioUri,
  showWaveform = true,
  onDelete,
}: AudioRecordingProps) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const { logger } = useLogger("AudioRecording");
  const { show } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null); // State for ArrayBuffer

  const audioUri = webAudioUri ?? recording.fileUri;

  const theme = useTheme();
  const styles = useMemo(
    () => getStyles({ isPlaying, theme }),
    [isPlaying, theme],
  );
  useEffect(() => {
    return () => {
      sound?.unloadAsync();
    };
  }, [sound]);

  useEffect(() => {
    if (!showWaveform) return;
    // Fetch the ArrayBuffer when the component mounts
    const loadArrayBuffer = async () => {
      if (audioUri) {
        try {
          const buffer = await fetchArrayBuffer(audioUri);
          setArrayBuffer(buffer);
          logger.debug(
            `Fetched audio array buffer from ${audioUri} --> length: ${buffer.byteLength} bytes`,
          );
        } catch (error) {
          logger.error(
            `Failed to fetch audio ${recording.fileUri} array buffer:`,
            error,
          );
          show({ type: "error", message: "Failed to load audio data" });
        }
      }
    };

    loadArrayBuffer();
  }, [audioUri, showWaveform]);

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
    [],
  );

  const handleShare = async () => {
    if (!audioUri) {
      show({ type: "error", message: "No file to share" });
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert("Sharing is not available on your platform");
        return;
      }

      await Sharing.shareAsync(audioUri);
    } catch (error) {
      logger.error("Error sharing the audio file:", error);
      show({ type: "error", message: "Failed to share the file" });
    }
  };

  const togglePlayPause = async () => {
    try {
      if (!sound) {
        // No sound object, create a new one and play
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true },
        );
        newSound.setOnPlaybackStatusUpdate(updatePlaybackStatus);
        setSound(newSound);
        setIsPlaying(true);
      } else {
        // Sound object exists
        if (isPlaying) {
          // If already playing, pause it
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          // Not playing, make sure we start from the beginning
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

  return (
    <View style={styles.container}>
      <Text style={[styles.detailText, { fontWeight: "bold" }]}>
        {recording.fileUri}
      </Text>
      <Text style={styles.detailText}>
        Duration: {formatDuration(recording.duration)}
      </Text>
      <Text style={styles.detailText}>Size: {formatBytes(recording.size)}</Text>
      <Text style={styles.detailText}>Format: {recording.mimeType}</Text>

      {recording.sampleRate ? (
        <Text style={styles.detailText}>
          Sample Rate: {recording.sampleRate} Hz
        </Text>
      ) : null}

      {recording.channels ? (
        <Text style={styles.detailText}>Channels: {recording.channels}</Text>
      ) : null}

      {recording.bitDepth ? (
        <Text style={styles.detailText}>Bit Depth: {recording.bitDepth}</Text>
      ) : null}

      <Text style={[styles.positionText]}>Position: {position} ms</Text>

      {arrayBuffer && (
        <WaveForm
          buffer={arrayBuffer}
          waveformHeight={50}
          showRuler={false}
          candleStickSpacing={0}
          candleStickWidth={1}
          currentTime={position / 1000}
          bitDepth={recording.bitDepth}
          sampleRate={recording.sampleRate}
          channels={recording.channels}
          mode="preview" // Adjust mode as needed
        />
      )}

      <View style={styles.buttons}>
        <Button onPress={togglePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Button onPress={handleShare}>Share</Button>
        {onDelete && (
          <Button
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            onPress={onDelete}
          >
            Delete
          </Button>
        )}
      </View>
    </View>
  );
};
