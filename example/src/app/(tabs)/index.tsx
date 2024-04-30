import { Button, Picker } from "@siteed/design-system";
import { useAudioRecorder } from "@siteed/expo-audio-stream";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import isBase64 from "is-base64";
import { useCallback, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { atob, btoa } from "react-native-quick-base64";

import {
  AudioStreamResult,
  RecordingConfig,
  StartAudioStreamResult,
} from "../../../../src/ExpoAudioStream.types";
import { AudioDataEvent } from "../../../../src/useAudioRecording";
import { formatBytes, formatDuration } from "../../utils";

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
  const [recordingConfig, setRecordingConfig] = useState<RecordingConfig>({
    interval: 500,
    sampleRate: 16000,
  });

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
    const streamConfig: StartAudioStreamResult =
      await startRecording(recordingConfig);
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

  const renderRecording = () => (
    <View>
      <Text>Duration: {formatDuration(duration)}</Text>
      <Text>Size: {formatBytes(size)}</Text>
      <Button mode="contained" onPress={() => handleStopRecording()}>
        Stop Recording
      </Button>
    </View>
  );

  const renderStopped = () => (
    <View>
      <Picker
        label="Sample Rate"
        multi={false}
        options={[
          {
            label: "16000",
            value: "16000",
            selected: recordingConfig.sampleRate === 16000,
          },
          {
            label: "44100",
            value: "44100",
            selected: recordingConfig.sampleRate === 44100,
          },
          {
            label: "48000",
            value: "48000",
            selected: recordingConfig.sampleRate === 48000,
          },
        ]}
        onFinish={(options) => {
          const selected = options.find((option) => option.selected);
          if (!selected) return;
          setRecordingConfig((prev) => ({
            ...prev,
            sampleRate: parseInt(selected.value, 10) as 16000 | 44100 | 48000,
          }));
        }}
      />
      <Button onPress={() => handleStart()}>Start Recording</Button>
    </View>
  );

  if (error) {
    return (
      <View>
        <Text>{error}</Text>
        <Button onPress={() => handleStart}>Try Again</Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* {audioUri && (
        <View>
          <Text>Audio URI: {audioUri}</Text>
        </View>
      )} */}
      {result && (
        <View>
          <Text>{JSON.stringify(result, null, 2)}</Text>
          <Text>size: {currentSize.current}</Text>
        </View>
      )}
      {isRecording && renderRecording()}
      {!isRecording && renderStopped()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    // alignItems: "center",
    // justifyContent: "center",
  },
  recordingContainer: {
    gap: 10,
    borderWidth: 1,
  },
});
