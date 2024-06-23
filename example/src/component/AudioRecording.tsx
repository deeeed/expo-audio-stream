import { AppTheme, Button, useTheme, useToast } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { AudioVisualizer } from "./audio-visualizer/audio-visualizer";
import { RawWaveForm } from "./waveform/rawwaveform";
import { AudioStreamResult } from "../../../src/ExpoAudioStream.types";
import { useAudio } from "../hooks/useAudio";
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
  const { logger } = useLogger("AudioRecording");
  const { show } = useToast();
  const audioUri = webAudioUri ?? recording.fileUri;
  const theme = useTheme();
  const {
    audioAnalysis,
    isPlaying,
    processing,
    position,
    play,
    pause,
    updatePlaybackOptions,
  } = useAudio(audioUri, { extractAnalysis: showWaveform });
  const styles = useMemo(
    () => getStyles({ isPlaying, theme }),
    [isPlaying, theme],
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

  useEffect(() => {
    return () => {
      logger.debug("AudioRecording unmounted");
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
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

      {processing && <ActivityIndicator />}

      {!processing && audioAnalysis && (
        <AudioVisualizer
          canvasHeight={150}
          playing={isPlaying}
          showRuler
          currentTime={position / 1000}
          audioData={audioAnalysis}
          showDottedLine
          onSeekEnd={(newtime) =>
            updatePlaybackOptions({ position: newtime * 1000 })
          }
        />
      )}

      <View style={styles.buttons}>
        <Button onPress={handlePlayPause}>
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
