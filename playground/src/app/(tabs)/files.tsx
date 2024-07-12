// playground/src/app/(tabs)/files.tsx
import { Button, Result, Skeleton, useToast } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AudioStreamResult } from "../../../../src/ExpoAudioStream.types";
import { AudioRecording } from "../../component/AudioRecording";
import { useAudioFiles } from "../../context/AudioFilesProvider";
import { formatBytes } from "../../utils/utils";

export default function Files() {
  const { logger } = useLogger("Files");
  const { show } = useToast();
  const router = useRouter();

  const {
    ready,
    files,
    totalAudioStorageSize,
    removeFile,
    clearFiles,
    refreshFiles,
  } = useAudioFiles();

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const handleDelete = useCallback(
    async (recording: AudioStreamResult) => {
      logger.debug(`Deleting recording: ${recording.fileUri}`);
      try {
        await removeFile(recording.fileUri);
        show({ type: "success", message: "Recording deleted" });
      } catch (error) {
        logger.error(`Failed to delete recording: ${recording.fileUri}`, error);
        show({ type: "error", message: "Failed to load audio data" });
      }
    },
    [removeFile],
  );

  const renderRecordings = () => (
    <View style={styles.recordingContainer}>
      {files?.map((recording, index) => (
        <AudioRecording
          key={index}
          recording={recording}
          showWaveform
          onDelete={() => handleDelete(recording)}
        />
      ))}
    </View>
  );

  if (!ready) {
    return (
      <Skeleton
        items={[
          { circles: 1, bars: 3 },
          { circles: 1, bars: 3 },
        ]}
      />
    );
  }

  if (!files || files.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Result
          title="No recordings found"
          status="info"
          buttonText="Record"
          onButtonPress={() => {
            router.push("/");
          }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button onPress={clearFiles} buttonColor="red" textColor="white">
        Clear Directory ({formatBytes(totalAudioStorageSize)})
      </Button>
      {renderRecordings()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    backgroundColor: "#fff",
    paddingTop: 10,
    marginBottom: 80,
    paddingHorizontal: 20,
    minHeight: "100%",
    justifyContent: "center",
  },
  recordingContainer: {
    gap: 10,
    borderWidth: 1,
  },
});
