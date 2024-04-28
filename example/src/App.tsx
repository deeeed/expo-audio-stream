import {
  clearAudioFiles,
  listAudioFiles,
  useAudioRecorder,
} from "@siteed/expo-audio-stream";
import { Audio } from "expo-av";
import * as Sharing from "expo-sharing";
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
import { AudioDataEvent } from "../../src/useAudioRecording";

const isWeb = Platform.OS === "web";

if (isWeb) {
  localStorage.debug = "expo-audio-stream:*";
}

export default function App() {
  const [, requestPermission] = Audio.usePermissions();
  const [error, setError] = useState<string | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [result, setResult] = useState<AudioStreamResult | null>(null);
  const [files, setFiles] = useState<string[]>([]);

  const onAudioData = async ({ buffer, position }: AudioDataEvent) => {
    try {
      console.log(`audio event ${typeof buffer} position=${position}`, buffer);
      // Append the audio data to the audioRef
      audioChunks.current.push(buffer);
    } catch (error) {
      console.error(`Error while processing audio data`, error);
    }
  };

  const { startRecording, stopRecording, duration, size, isRecording } =
    useAudioRecorder({ debug: true, onAudioStream: onAudioData });

  const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      setError("Permission not granted!");
    }
    // Clear previous audio chunks
    audioChunks.current = [];
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

  const handleListFiles = useCallback(async () => {
    const _files = await listAudioFiles();
    setFiles(_files);
  }, []);

  const handleClearStorage = useCallback(async () => {
    try {
      await clearAudioFiles();
      await handleListFiles();
    } catch (error) {
      console.error(`Error while clearing storage`, error);
    }
  }, []);

  const renderRecording = () => (
    <View>
      <Text>Duration: {formatDuration(duration)}</Text>
      <Text>Size: {formatBytes(size)}</Text>
      <Button title="Stop Recording" onPress={() => handleStopRecording()} />
    </View>
  );

  const playAudio = useCallback(async (url: string) => {
    try {
      const sound = new Audio.Sound();
      console.log(`Playing audio`, url);
      await sound.loadAsync({ uri: url });
      await sound.playAsync();
    } catch (error) {
      console.error(`error playing audio`, error);
    }
  }, []);

  const shareAudio = async (url: string) => {
    try {
      console.log(`Sharing audio`, url);
      await Sharing.shareAsync(url);
    } catch (error) {
      console.error(`error sharing audio`, error);
    }
  };

  const renderStopped = () => (
    <View>
      <Button title="Start Recording" onPress={() => handleStart()} />
    </View>
  );

  const renderRecordings = () => (
    <View style={styles.recordingContainer}>
      {files?.map((file, index) => (
        <View key={index}>
          <Text>{file}</Text>
          <Button title="Play" onPress={() => playAudio(file)} />
          <Button title="Share" onPress={() => shareAudio(file)} />
        </View>
      ))}
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ gap: 10 }}>
        <Button title="Find existing Recordings" onPress={handleListFiles} />
        <Button title="Clear Storage" onPress={handleClearStorage} />
      </View>
      {/* {audioUri && (
        <View>
          <Text>Audio URI: {audioUri}</Text>
        </View>
      )} */}
      {result && (
        <View>
          <Text>{JSON.stringify(result, null, 2)}</Text>
          <Button
            title="Share Recording"
            onPress={async () => {
              try {
                let url = result.fileUri;
                if (isWeb) {
                  const blob = new Blob(audioChunks.current, {
                    type: "audio/webm",
                  });
                  url = URL.createObjectURL(blob);
                }
                shareAudio(url);
              } catch (error) {
                console.error(`error playing audio`, error);
              }
            }}
          />
          <Button
            title="Play Recording"
            onPress={async () => {
              try {
                let url = result.fileUri;
                if (isWeb) {
                  const blob = new Blob(audioChunks.current, {
                    type: "audio/webm",
                  });
                  url = URL.createObjectURL(blob);
                }
                console.log(`Playing audio`, url);
                playAudio(url);
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
  recordingContainer: {
    gap: 10,
    borderWidth: 1,
  },
});
