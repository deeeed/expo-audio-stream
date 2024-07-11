// playground/src/app/(tabs)/files.tsx
import { Button, useToast } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AudioStreamResult } from "../../../../src/ExpoAudioStream.types";
import { AudioRecording } from "../../component/AudioRecording";
import { useAudioFiles } from "../../context/AudioFilesProvider";

export default function Files() {
  const { logger } = useLogger("Files");
  const { show } = useToast();

  const { files, removeFile, clearFiles } = useAudioFiles();

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button onPress={clearFiles}>Clear Directory</Button>
      {renderRecordings()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    backgroundColor: "#fff",
    marginBottom: 80,
    // alignItems: "center",
    // justifyContent: "center",
  },
  recordingContainer: {
    gap: 10,
    borderWidth: 1,
  },
});
