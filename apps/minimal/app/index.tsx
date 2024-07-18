import { useAudioRecorder } from "@siteed/expo-audio-stream";
import { Button, Text, View } from "react-native";

export default function App() {
  const { startRecording, stopRecording, durationMs, size, isRecording } =
    useAudioRecorder({
      debug: true,
      // audioWorkletUrl: "/audioworklet.js",
      // featuresExtratorUrl: "/audio-features-extractor.js",
    });

  const handleStart = async () => {
    const fileUri = await startRecording({
      interval: 500,
      enableProcessing: false,
      onAudioStream: async (_) => {
        console.log(`onAudioStream`, _);
      },
    });
  };

  const handleStop = async () => {
    const result = await stopRecording();
    console.log(`handleStop`, result);
  };

  const renderRecording = () => (
    <View>
      <Text>Duration: {durationMs / 1000}</Text>
      <Text>Size: {size} bytes</Text>
      <Button title="Stop Recording" onPress={handleStop} />
    </View>
  );

  const renderStopped = () => (
    <View>
      <Button title="Start Recording" onPress={handleStart} />
    </View>
  );

  return (
    <View>
      {/* <Button
        title="Request Permission"
        onPress={() => Audio.requestPermissionsAsync()}
      /> */}
      {isRecording ? renderRecording() : renderStopped()}
    </View>
  );
}
