import {
  clearAudioFiles,
  listAudioFiles,
  useAudioRecorder,
} from "expo-audio-stream";
import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatBytes, formatDuration } from "./utils";
import { AudioStreamResult } from "../../src/ExpoAudioStream.types";

const audioChunks: Blob[] = [];
const isWeb = Platform.OS === "web";

if (isWeb) {
  localStorage.debug = "expo-audio-stream:*";
}

export default function App() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<Blob | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [result, setResult] = useState<AudioStreamResult | null>(null);
  const [files, setFiles] = useState<string[]>([]);

  const onAudioData = (audioData: Blob) => {
    console.log(`audio event ${typeof audioData}`, audioData);
    // Append the audio data to the audioRef
    audioChunks.push(audioData);
  };

  const { startRecording, stopRecording, duration, size, isRecording } =
    useAudioRecorder({ onAudioStream: onAudioData });

  const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      setError("Permission not granted!");
    }
    const url = await startRecording({ interval: 500 });
    console.debug(`Recording started at ${url}`);
    if (url) setAudioUri(url);
  };

  const handleStopRecording = useCallback(async () => {
    if (!isRecording) return;
    const result = await stopRecording();
    console.debug(`Recording stopped. `, result);
    setResult(result);
  }, [isRecording]);

  const handleListFiles = async () => {
    const _files = await listAudioFiles();
    setFiles(_files);
  };

  const handleClearStorage = async () => {
    try {
      await clearAudioFiles();
      await handleListFiles();
    } catch (error) {
      console.error(`Error while clearing storage`, error);
    }
  };

  const renderRecording = () => (
    <View>
      <Text>Duration: {formatDuration(duration)}</Text>
      <Text>Size: {formatBytes(size)}</Text>
      <Button title="Stop Recording" onPress={() => handleStopRecording()} />
    </View>
  );

  const renderStopped = () => (
    <View>
      <Button title="Start Recording" onPress={() => handleStart()} />
    </View>
  );

  if (error) {
    return (
      <View>
        <Text>{error}</Text>
        <Button onPress={() => handleStart} title="Try Again" />
      </View>
    );
  }

  const renderRecordings = () => (
    <View>{files?.map((file, index) => <Text key={index}>{file}</Text>)}</View>
  );
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ gap: 10 }}>
        <Button title="Request Permission" onPress={requestPermission} />
        <Button title="Find existing Recordings" onPress={handleListFiles} />
        <Button title="Clear Storage" onPress={handleClearStorage} />
      </View>
      {audioUri && (
        <View>
          <Text>Audio URI: {audioUri}</Text>
        </View>
      )}
      {result && (
        <View>
          <Text>{JSON.stringify(result, null, 2)}</Text>
          <Button
            title="Play Recording"
            onPress={async () => {
              try {
                let url = result.fileUri;
                if (isWeb) {
                  const blob = new Blob(audioChunks, { type: "audio/webm" });
                  url = URL.createObjectURL(blob);
                }
                const sound = new Audio.Sound();
                console.log(`playing file uri ${result.fileUri}`, url);
                await sound.loadAsync({ uri: url });
                await sound.playAsync();
              } catch (error) {
                console.error(`error playing audio`, error);
              }
            }}
          />
        </View>
      )}
      {isRecording && renderRecording()}
      {!isRecording && renderStopped()}
      {renderRecordings()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
