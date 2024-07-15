// playground/src/component/AudioRecording.tsx
import { AppTheme, Button, useTheme, useToast } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import {
  AudioAnalysisData,
  AudioStreamResult,
  DataPoint,
} from "../../../../src/ExpoAudioStream.types";
import { useAudio } from "../../hooks/useAudio";
import { formatBytes, formatDuration, isWeb } from "../../utils/utils";
import { SelectedAudioVisualizerProps } from "../audio-recording-config/audio-recording-config-form";
import { AudioVisualizer } from "../audio-visualizer/audio-visualizer";
import { DataPointViewer } from "../data-viewer/data-viewer";

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
  audioAnalysis?: AudioAnalysisData;
  actionText?: string;
  visualConfig?: SelectedAudioVisualizerProps;
  onActionPress?: () => void;
  onDelete?: () => Promise<void>;
}
export const AudioRecording = ({
  recording,
  actionText,
  audioAnalysis,
  visualConfig,
  onActionPress,
  onDelete,
}: AudioRecordingProps) => {
  const { logger } = useLogger("AudioRecording");
  const { show } = useToast();
  const audioUri = recording.webAudioUri ?? recording.fileUri;
  const theme = useTheme();
  const {
    isPlaying,
    processing,
    position,
    play,
    pause,
    updatePlaybackOptions,
  } = useAudio({
    audioUri,
    recording,
    options: { extractAnalysis: false },
  });
  const styles = useMemo(
    () => getStyles({ isPlaying, theme }),
    [isPlaying, theme],
  );

  const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint>();
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

  const handleSaveToDisk = async () => {
    if (!isWeb || !recording.webAudioUri) {
      logger.warn(
        "Save to disk is only supported on web",
        recording.webAudioUri,
      );
      return;
    }

    const a = document.createElement("a");
    a.href = recording.webAudioUri;
    a.download = `rec_${recording.fileUri}_${recording?.sampleRate ?? "NOSAMPLE"}_${recording?.bitDepth ?? "NOBITDEPTH"}.wav`;
    a.click();
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    } catch (error) {
      logger.error("Error playing audio:", error);
    }
  };

  const handleOnSeekEnd = async (newtime: number) => {
    try {
      logger.log("Seeking to:", newtime);

      if (isPlaying) {
        await pause();
      }
      await updatePlaybackOptions({ position: newtime * 1000 });
    } catch (error) {
      logger.error("Error seeking audio:", error);
    }
  };

  const handleSelection = ({
    dataPoint,
    index,
  }: {
    dataPoint: DataPoint;
    index: number;
  }) => {
    logger.log(`Selected data point index=${index}`, dataPoint);
    setSelectedDataPoint(dataPoint);
  };

  logger.log("AudioRecording render", recording);
  return (
    <View style={styles.container}>
      <Text style={[styles.detailText, { fontWeight: "bold" }]}>
        {recording.fileUri}
      </Text>
      <Text style={styles.detailText}>
        Duration: {formatDuration(recording.durationMs)}
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

      {audioAnalysis && (
        <View>
          <AudioVisualizer
            {...visualConfig}
            playing={isPlaying}
            onSelection={handleSelection}
            currentTime={position / 1000}
            audioData={audioAnalysis}
            onSeekEnd={handleOnSeekEnd}
          />
        </View>
      )}

      {selectedDataPoint && <DataPointViewer dataPoint={selectedDataPoint} />}

      <View style={styles.buttons}>
        {onActionPress && (
          <Button onPress={onActionPress}>{actionText ?? "Action"}</Button>
        )}
        <Button onPress={handlePlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </Button>
        {isWeb ? (
          <Button onPress={handleSaveToDisk}>Save</Button>
        ) : (
          <Button onPress={handleShare}>Share</Button>
        )}
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
