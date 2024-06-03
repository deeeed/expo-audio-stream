import { Button } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import isBase64 from "is-base64";
import { useCallback, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { RadioButton } from "react-native-paper";
import { atob, btoa } from "react-native-quick-base64";

import { useSharedAudioRecorder } from "../../../../src";
import {
  AudioStreamResult,
  RecordingConfig,
  StartAudioStreamResult,
} from "../../../../src/ExpoAudioStream.types";
import { AudioDataEvent } from "../../../../src/useAudioRecording";
import { AudioRecording } from "../../component/AudioRecording";
import { WaveForm } from "../../component/waveform/waveform";
import { WaveformProps } from "../../component/waveform/waveform.types";
import { useAudioFiles } from "../../context/AudioFilesProvider";
import { formatBytes, formatDuration } from "../../utils";

const isWeb = Platform.OS === "web";

if (isWeb) {
  localStorage.debug = "expo-audio-stream:*";
}

const LIVE_WAVE_FORM_CHUNKS_LENGTH = 60;

const concatenateBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
  // Filter out any undefined or null buffers
  const validBuffers = buffers.filter((buffer) => buffer);
  const totalLength = validBuffers.reduce(
    (sum, buffer) => sum + buffer.byteLength,
    0,
  );
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const buffer of validBuffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return result.buffer;
};

export default function Record() {
  const [error, setError] = useState<string | null>(null);
  const [visualizationType, setVisualizationType] =
    useState<WaveformProps["visualizationType"]>("candlestick");
  const audioChunks = useRef<string[]>([]);
  const audioChunksBlobs = useRef<Blob[]>([]);
  const [streamConfig, setStreamConfig] =
    useState<StartAudioStreamResult | null>({
      sampleRate: 44100,
      mimeType: "audio/wav",
      channels: 1,
      bitDepth: 16,
      fileUri: "",
    });
  const [result, setResult] = useState<AudioStreamResult | null>(null);
  const currentSize = useRef(0);
  const { refreshFiles, removeFile } = useAudioFiles();
  const [webAudioUri, setWebAudioUri] = useState<string>();
  // Prevent displaying the entiere audio in the live visualization
  const liveWavFormBufferIndex = useRef(0);
  const liveWavFormBuffer = useRef<ArrayBuffer[]>(
    new Array(LIVE_WAVE_FORM_CHUNKS_LENGTH),
  ); // Circular buffer for live waveform visualization

  const { logger } = useLogger("Record");

  const onAudioData = useCallback(async (event: AudioDataEvent) => {
    try {
      console.log(`Received audio data event`, event);
      const { data, position, eventDataSize } = event;
      if (eventDataSize === 0) {
        console.log(`Invalid data`);
        return;
      }

      currentSize.current += eventDataSize;

      // console.log(
      //   `CHECK DATA position=${position} currentSize.current=${currentSize.current} vs ${totalSize} difference: ${totalSize - currentSize.current}`,
      // );
      if (typeof data === "string") {
        // Append the audio data to the audioRef
        audioChunks.current.push(data);
        if (!isBase64(data)) {
          logger.warn(
            `Invalid base64 data for chunks#${audioChunks.current.length} position=${position}`,
          );
        } else {
          const binaryString = atob(data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const wavAudioBuffer = bytes.buffer;
          liveWavFormBuffer.current[liveWavFormBufferIndex.current] =
            wavAudioBuffer;
          liveWavFormBufferIndex.current =
            (liveWavFormBufferIndex.current + 1) % LIVE_WAVE_FORM_CHUNKS_LENGTH;
        }
      } else if (data instanceof Blob) {
        // Append the audio data to the audioRef
        audioChunksBlobs.current.push(data);

        const wavAudioBuffer = await data.arrayBuffer();

        // Update the circular buffer
        liveWavFormBuffer.current[liveWavFormBufferIndex.current] =
          wavAudioBuffer;
        liveWavFormBufferIndex.current =
          (liveWavFormBufferIndex.current + 1) % LIVE_WAVE_FORM_CHUNKS_LENGTH;
      }
    } catch (error) {
      logger.error(`Error while processing audio data`, error);
    }
  }, []);

  const [recordingConfig, setRecordingConfig] = useState<RecordingConfig>({
    interval: 500,
    sampleRate: 44100,
    onAudioStream: (a) => onAudioData(a),
  });

  const { startRecording, stopRecording, duration, size, isRecording } =
    useSharedAudioRecorder();

  const handleStart = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError("Permission not granted!");
      }

      // Clear previous audio chunks
      audioChunks.current = [];
      audioChunksBlobs.current = [];
      liveWavFormBuffer.current = new Array(LIVE_WAVE_FORM_CHUNKS_LENGTH);
      liveWavFormBufferIndex.current = 0;
      currentSize.current = 0;
      const streamConfig: StartAudioStreamResult =
        await startRecording(recordingConfig);
      logger.debug(`Recording started `, streamConfig);
      setStreamConfig((prev) => ({ ...prev, ...streamConfig }));
    } catch (error) {
      logger.error(`Error while starting recording`, error);
    }
  };

  const handleStopRecording = useCallback(async () => {
    if (!isRecording) return;
    const result = await stopRecording();
    // TODO: compare accumulated audio chunks with the result
    logger.debug(`Recording stopped. `, result);
    setResult(result);

    if (!result) {
      logger.warn(`No result found`);
      return;
    }

    if (!isWeb && result) {
      try {
        const jsonPath = result.fileUri.replace(/\.wav$/, ".json"); // Assuming fileUri has a .wav extension
        await FileSystem.writeAsStringAsync(
          jsonPath,
          JSON.stringify(result, null, 2),
          {
            encoding: FileSystem.EncodingType.UTF8,
          },
        );
        logger.log(`Metadata saved to ${jsonPath}`);
        refreshFiles();
      } catch (error) {
        logger.error(`Error saving metadata`, error);
      }
    }

    if (isWeb) {
      const blob = new Blob(audioChunksBlobs.current, {
        type: "audio/webm",
      });
      const url = URL.createObjectURL(blob);
      setWebAudioUri(url);
    }

    // Verify data integrity to make sure we streamed the correct data
    if (audioChunks.current.length > 0) {
      try {
        // Remove padding, concatenate, then re-add padding if necessary
        const concatenatedBase64Chunks = audioChunks.current
          .map((chunk) => chunk.replace(/=*$/, ""))
          .join("");
        const padding = (4 - (concatenatedBase64Chunks.length % 4)) % 4;
        const paddedBase64Chunks =
          concatenatedBase64Chunks + "=".repeat(padding);

        if (!isBase64(paddedBase64Chunks)) {
          // FIXME: ios concatenation seems to sometime fail -- investigate
          logger.warn(`Invalid base64 data`);
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

        // Ignore first 44bytes (header) and compare the next 500 bytes
        const binaryChunkDataBase64 = btoa(binaryChunkData.slice(44, 500));
        const binaryFileDataBase64 = btoa(binaryFileData.slice(44, 500));
        // Perform binary comparison
        logger.log(`Binary data from chunks:`, binaryChunkDataBase64);
        logger.log(`Binary data from file:`, binaryFileDataBase64);

        const isEqual = binaryChunkDataBase64 === binaryFileDataBase64;
        logger.log(`Comparison result:`, isEqual);
      } catch (error) {
        logger.error(`Error while comparing audio data`, error);
      }
    }
  }, [isRecording, refreshFiles]);

  const visualBuffer = concatenateBuffers(liveWavFormBuffer.current);

  const renderRecording = () => (
    <View style={{ gap: 10, display: "flex" }}>
      {visualBuffer && (
        <View style={styles.waveformContainer}>
          <Text>len: {visualBuffer.byteLength}</Text>
          <WaveForm
            buffer={visualBuffer}
            // mode="live"
            showRuler
            debug
            visualizationType={visualizationType}
            sampleRate={streamConfig?.sampleRate}
            channels={streamConfig?.channels}
            bitDepth={streamConfig?.bitDepth}
          />
        </View>
      )}
      <Text>Duration: {formatDuration(duration)}</Text>
      <Text>Size: {formatBytes(size)}</Text>
      {streamConfig?.sampleRate ? (
        <Text>sampleRate: {streamConfig?.sampleRate}</Text>
      ) : null}
      {streamConfig?.bitDepth ? (
        <Text>bitDepth: {streamConfig?.bitDepth}</Text>
      ) : null}
      {streamConfig?.channels ? (
        <Text>channels: {streamConfig?.channels}</Text>
      ) : null}
      <Button mode="contained" onPress={() => handleStopRecording()}>
        Stop Recording
      </Button>
    </View>
  );

  const renderStopped = () => (
    <View style={{ gap: 10 }}>
      {/* <Picker
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
      /> */}
      {/* Choose between available sample rate via radio button */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <RadioButton.Group
          onValueChange={(value) =>
            setStreamConfig((prev) => {
              if (!prev) return prev;
              return { ...prev, sampleRate: parseInt(value, 10) };
            })
          }
          value={streamConfig?.sampleRate + ""}
        >
          {["16000", "44100", "48000"].map((rate) => (
            <RadioButton.Item key={rate} label={rate} value={rate} />
          ))}
        </RadioButton.Group>
      </View>
      <Button mode="contained" onPress={() => handleStart()}>
        Start Recording
      </Button>
    </View>
  );

  if (error) {
    return (
      <View style={{ gap: 10 }}>
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
        <View style={{ gap: 10 }}>
          <AudioRecording
            recording={result}
            showWaveform={false}
            webAudioUri={webAudioUri}
            onDelete={
              isWeb
                ? undefined
                : () => {
                    setResult(null);
                    return removeFile(result.fileUri);
                  }
            }
          />
          <Button mode="outlined" onPress={() => setResult(null)}>
            Record Again
          </Button>
        </View>
      )}
      {isRecording && renderRecording()}
      {!result && !isRecording && renderStopped()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    padding: 10,
    flex: 1,
    // alignItems: "center",
    justifyContent: "center",
  },
  waveformContainer: {
    borderRadius: 10,
  },
  recordingContainer: {
    gap: 10,
    borderWidth: 1,
  },
});
