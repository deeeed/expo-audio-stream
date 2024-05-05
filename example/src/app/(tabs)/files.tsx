import { ScrollView, StyleSheet, View } from "react-native";

import { AudioRecording } from "../../component/AudioRecording";
import { useAudioFiles } from "../../context/AudioFilesProvider";

export default function Files() {
  const { files, removeFile } = useAudioFiles();

  const renderRecordings = () => (
    <View style={styles.recordingContainer}>
      {files?.map((recording, index) => (
        <AudioRecording
          key={index}
          recording={recording}
          onDelete={() => {
            return removeFile(recording.fileUri);
          }}
        />
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderRecordings()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    backgroundColor: "#fff",
    // alignItems: "center",
    // justifyContent: "center",
  },
  recordingContainer: {
    gap: 10,
    borderWidth: 1,
  },
});
