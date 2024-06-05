import { AppTheme, Button, useTheme, useToast } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import * as Sharing from "expo-sharing";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AudioStreamResult } from "../../../src/ExpoAudioStream.types";
import { useAudio } from "../hooks/useAudio";
import { formatBytes, formatDuration } from "../utils";
import { WaveForm } from "./waveform/waveform";

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
  const { logger } = useLogger('AudioRecording');
  const { show } = useToast();
  const audioUri = webAudioUri ?? recording.fileUri;
  const theme = useTheme();
  const { arrayBuffer, isPlaying, position, togglePlayPause } = useAudio(audioUri, showWaveform);
  const styles = useMemo(() => getStyles({ isPlaying: isPlaying, theme }), [isPlaying, theme]);

  const handleShare = async () => {
    if (!audioUri) {
      show({ type: 'error', message: 'No file to share' });
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert('Sharing is not available on your platform');
        return;
      }

      await Sharing.shareAsync(audioUri);
    } catch (error) {
      logger.error('Error sharing the audio file:', error);
      show({ type: 'error', message: 'Failed to share the file' });
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
          waveformHeight={200}
          showRuler={true}
          debug
          visualizationType="line"
          candleStickSpacing={2}
          candleStickWidth={5}
          currentTime={position / 1000}
          bitDepth={recording.bitDepth}
          sampleRate={recording.sampleRate}
          channels={recording.channels}
          mode="static" // Adjust mode as needed
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
