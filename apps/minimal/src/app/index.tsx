import { useAudioRecorder } from "@siteed/expo-audio-stream";
import { Button, StyleSheet, Text, View } from "react-native";

const STOP_BUTTON_COLOR = "red";

const styles = StyleSheet.create({
  container: {
    gap: 10,
    margin: 40,
    padding: 20,
  },
  stopButton: {
    backgroundColor: "red",
  },
});

export default function App() {
  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    durationMs,
    size,
    isRecording,
    isPaused,
  } = useAudioRecorder({
    debug: true,
  });

  const handleStart = async () => {
    const startResult = await startRecording({
      interval: 500,
      enableProcessing: false,
      onAudioStream: async (_) => {
        console.log(`onAudioStream`, _);
      },
    });
    return startResult;
  };

  const handleStop = async () => {
    const result = await stopRecording();
    console.log(`handleStop`, result);
  };

  const renderRecording = () => (
    <View style={styles.container}>
      <Text>Duration: {durationMs / 1000} seconds</Text>
      <Text>Size: {size} bytes</Text>
      <Button title="Pause Recording" onPress={pauseRecording} />
      <Button
        title="Stop Recording"
        onPress={handleStop}
        color={STOP_BUTTON_COLOR}
      />
    </View>
  );

  const renderPaused = () => (
    <View style={styles.container}>
      <Text>Duration: {durationMs / 1000} seconds</Text>
      <Text>Size: {size} bytes</Text>
      <Button title="Resume Recording" onPress={resumeRecording} />
      <Button
        title="Stop Recording"
        color={STOP_BUTTON_COLOR}
        onPress={handleStop}
      />
    </View>
  );

  const renderStopped = () => (
    <View style={styles.container}>
      <Button title="Start Recording" onPress={handleStart} />
    </View>
  );

  return (
    <>
      {isRecording
        ? renderRecording()
        : isPaused
          ? renderPaused()
          : renderStopped()}
    </>
  );
}
