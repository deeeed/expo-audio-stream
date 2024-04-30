import {
  clearAudioFiles,
  listAudioFiles,
  test,
  useAudioRecorder,
} from "@siteed/expo-audio-stream";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import isBase64 from "is-base64";
import { useCallback, useRef, useState } from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { atob, btoa } from "react-native-quick-base64";

import { formatBytes, formatDuration } from "./utils";
import {
  AudioStreamResult,
  StartAudioStreamResult,
} from "../../src/ExpoAudioStream.types";
import { AudioDataEvent } from "../../src/useAudioRecording";

const isWeb = Platform.OS === "web";

if (isWeb) {
  localStorage.debug = "expo-audio-stream:*";
}

export default function App() {
  const [, requestPermission] = Audio.usePermissions();
  const [error, setError] = useState<string | null>(null);
  const audioChunks = useRef<string[]>([]);
  const audioChunksBlobs = useRef<Blob[]>([]);
  const [streamConfig, setStreamConfig] =
    useState<StartAudioStreamResult | null>(null);
  const [result, setResult] = useState<AudioStreamResult | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const currentSize = useRef(0);

  const onAudioData = useCallback(
    async ({ data, position, eventDataSize, totalSize }: AudioDataEvent) => {
      try {
        if (eventDataSize === 0) {
          console.log(`Invalid data`);
          return;
        }

        currentSize.current += eventDataSize;

        console.log(
          `CHECK DATA ${currentSize.current} vs ${totalSize} difference: ${totalSize - currentSize.current}`,
        );
        if (typeof data === "string") {
          // Append the audio data to the audioRef
          audioChunks.current.push(data);
        } else if (data instanceof Blob) {
          // Append the audio data to the audioRef
          audioChunksBlobs.current.push(data);
        }
      } catch (error) {
        console.error(`Error while processing audio data`, error);
      }
    },
    [],
  );

  const { startRecording, stopRecording, duration, size, isRecording } =
    useAudioRecorder({ debug: true, onAudioStream: onAudioData });

  const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      setError("Permission not granted!");
    }
    // Clear previous audio chunks
    audioChunks.current = [];
    currentSize.current = 0;
    const streamConfig: StartAudioStreamResult = await startRecording({
      encoding: "opus",
      interval: 500,
    });
    console.debug(`Recording started `, streamConfig);
    setStreamConfig(streamConfig);
  };

  const handleStopRecording = useCallback(async () => {
    if (!isRecording) return;
    const result = await stopRecording();
    // TODO: compare accumulated audio chunks with the result
    console.debug(`Recording stopped. `, result);
    setResult(result);

    if (!result) {
      console.warn(`No result found`);
      return;
    }

    // Compare the first 100 bytes of the audio data vs the file
    if (audioChunks.current.length > 0) {
      try {
        // Remove padding, concatenate, then re-add padding if necessary
        const concatenatedBase64Chunks = audioChunks.current
          .map((chunk) => chunk.replace(/=*$/, ""))
          .join("");
        const padding = (4 - (concatenatedBase64Chunks.length % 4)) % 4;
        const paddedBase64Chunks =
          concatenatedBase64Chunks + "=".repeat(padding);
        console.log(
          `Padded base64 chunks padding=${padding}:`,
          paddedBase64Chunks,
        );

        if (!isBase64(paddedBase64Chunks)) {
          console.error(`Invalid base64 data`);
          return;
        }
        const binaryChunkData = atob(paddedBase64Chunks);

        // Read the equivalent length of data from the file, skipping the header
        const fileDataInBase64 = await FileSystem.readAsStringAsync(
          result.fileUri,
          {
            encoding: FileSystem.EncodingType.Base64,
            position: 0,
            length: 5000,
          },
        );
        const binaryFileData = atob(fileDataInBase64);

        const binaryChunkDataBase64 = btoa(binaryChunkData.slice(3000, 5000));
        const binaryFileDataBase64 = btoa(binaryFileData.slice(3000, 5000));
        // Perform binary comparison
        console.log(`Binary data from chunks:`, binaryChunkDataBase64);
        console.log(`Binary data from file:`, binaryFileDataBase64);

        const isEqual = binaryChunkDataBase64 === binaryFileDataBase64;
        console.log(`Comparison result:`, isEqual);
      } catch (error) {
        console.error(`Error while comparing audio data`, error);
      }
    }
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

  const handleTestFfmpeg = async () => {
    try {
      test();
    } catch (error) {
      console.error(`Error while testing ffmpeg`, error);
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
        <Button title="Test FFmpeg" onPress={handleTestFfmpeg} />
      </View>
      {/* {audioUri && (
        <View>
          <Text>Audio URI: {audioUri}</Text>
        </View>
      )} */}
      {result && (
        <View>
          <Text>{JSON.stringify(result, null, 2)}</Text>
          <Text>size: {currentSize.current}</Text>
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
