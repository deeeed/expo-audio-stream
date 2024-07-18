// playground/src/component/AudioRecording.tsx
import {
  AppTheme,
  Button,
  EditableInfoCard,
  useBottomModal,
  useTheme,
  useToast,
} from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { atob } from "react-native-quick-base64";

import {
  AudioAnalysisData,
  AudioStreamResult,
  DataPoint,
} from "@siteed/expo-audio-stream";
import { useAudio } from "../../hooks/useAudio";
import { formatBytes, formatDuration, isWeb } from "../../utils/utils";
import {
  AudioRecordingAnalysisConfig,
  SelectedAnalysisConfig,
} from "../audio-recording-analysis-config/audio-recording-analysis-config";
import { SelectedAudioVisualizerProps } from "../audio-recording-config/audio-recording-config-form";
import { AudioVisualizer } from "../audio-visualizer/audio-visualizer";
import { DataPointViewer } from "../data-viewer/data-viewer";
import { HexDataViewer } from "../data-viewer/hex-data-viewer";

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
    attributeContainer: {
      flexDirection: "row",
      gap: 5,
    },
    label: { fontWeight: "bold" },
    value: {},
  });
};

export interface AudioRecordingProps {
  recording: AudioStreamResult;
  audioAnalysis?: AudioAnalysisData;
  actionText?: string;
  visualConfig?: SelectedAudioVisualizerProps;
  extractAnalysis?: boolean;
  onActionPress?: () => void;
  onDelete?: () => Promise<void>;
}
export const AudioRecording = ({
  recording,
  actionText,
  audioAnalysis: _audioAnalysis,
  extractAnalysis,
  visualConfig,
  onActionPress,
  onDelete,
}: AudioRecordingProps) => {
  const { logger } = useLogger("AudioRecording");
  const { show } = useToast();
  const audioUri = recording.webAudioUri ?? recording.fileUri;
  const theme = useTheme();
  const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint>();
  const [selectedAnalysisConfig, setSelectedAnalysisConfig] =
    useState<SelectedAnalysisConfig>({
      pointsPerSecond: 10,
      skipWavHeader: true,
      features: {
        energy: true,
        spectralCentroid: true,
        spectralFlatness: true,
        chromagram: true,
        hnr: true,
        spectralBandwidth: true,
        spectralRolloff: true,
        tempo: true,
        zcr: true,
        rms: true,
        mfcc: false,
      },
    });

  const {
    isPlaying,
    audioAnalysis: actualAnalysis,
    processing,
    position,
    play,
    pause,
    updatePlaybackOptions,
  } = useAudio({
    audioUri,
    recording,
    options: {
      extractAnalysis: extractAnalysis && !_audioAnalysis,
      analysisOptions: selectedAnalysisConfig,
    },
  });
  const [hexByteArray, setHexByteArray] = useState<Uint8Array>();

  const audioAnalysis = actualAnalysis ?? _audioAnalysis;

  const styles = useMemo(
    () => getStyles({ isPlaying, theme }),
    [isPlaying, theme],
  );
  const { openDrawer, dismiss } = useBottomModal();

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

  useEffect(() => {
    if (!selectedDataPoint) return;

    // Use expo file system api to load 200bytes of string as unicode
    const loadHexData = async () => {
      try {
        const position = selectedDataPoint.startPosition ?? 0;
        const length =
          (selectedDataPoint.endPosition ?? 0) -
          (selectedDataPoint.startPosition ?? 0);
        // Load hex data from uri
        if (isWeb) {
          const response = await fetch(audioUri, {
            headers: {
              Range: `bytes=${position}-${position + length - 1}`,
            },
          });
          const step = await response.text();
          const byteArray = Uint8Array.from(step, (c) => c.charCodeAt(0));
          setHexByteArray(byteArray);
        } else {
          const fileData = await FileSystem.readAsStringAsync(audioUri, {
            encoding: FileSystem.EncodingType.Base64,
            position: selectedDataPoint.startPosition,
            length,
          });
          console.debug(`Loaded file data:`, fileData);
          const step = atob(fileData);
          const byteArray = Uint8Array.from(step, (c) => c.charCodeAt(0));
          setHexByteArray(byteArray);
        }
      } catch (error) {
        logger.error("Failed to load hex data", error);
      }
    };

    loadHexData();
  }, [recording, selectedDataPoint, audioAnalysis]);

  return (
    <View style={styles.container}>
      <Text style={[styles.detailText, { fontWeight: "bold" }]}>
        {recording.fileUri}
      </Text>
      <Text style={styles.detailText}>
        Duration: {formatDuration(recording.durationMs)}
      </Text>
      <Text style={styles.detailText}>
        Size: {formatBytes(recording.size)} ({recording.size})
      </Text>
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

      <Text style={[styles.positionText]}>Position: {position / 1000}</Text>

      {processing && <ActivityIndicator />}

      {audioAnalysis && (
        <View>
          <EditableInfoCard
            label="Analysis Config"
            value={JSON.stringify(selectedAnalysisConfig)}
            containerStyle={{ margin: 0 }}
            editable
            onEdit={async () => {
              logger.log("Edit analysis config");
              openDrawer({
                bottomSheetProps: {
                  enableDynamicSizing: true,
                },
                render: () => (
                  <AudioRecordingAnalysisConfig
                    config={selectedAnalysisConfig}
                    onChange={(newConfig) => {
                      dismiss();
                      setSelectedAnalysisConfig(newConfig);
                      setSelectedDataPoint(undefined);
                    }}
                  />
                ),
              });
            }}
          />
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

      {selectedDataPoint && (
        <View>
          <DataPointViewer dataPoint={selectedDataPoint} />
          <View style={styles.attributeContainer}>
            <Text style={styles.label}>Byte Range:</Text>
            <Text style={styles.value}>
              {selectedDataPoint.startPosition} to{" "}
              {selectedDataPoint.endPosition}
            </Text>
          </View>
          {hexByteArray && <HexDataViewer byteArray={hexByteArray} />}
        </View>
      )}

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
