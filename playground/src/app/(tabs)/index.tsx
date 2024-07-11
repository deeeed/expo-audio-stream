// playground/src/app/(tabs)/index.tsx
import { Button, Picker, ScreenWrapper } from "@siteed/design-system";
import {
  AudioDataEvent,
  AudioStreamResult,
  RecordingConfig,
  SampleRate,
  StartAudioStreamResult,
  getWavFileInfo,
  useSharedAudioRecorder,
  writeWaveHeader,
} from "@siteed/expo-audio-stream";
import { useLogger } from "@siteed/react-native-logger";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import isBase64 from "is-base64";
import { useCallback, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { atob, btoa } from "react-native-quick-base64";

import { AudioRecording } from "../../component/AudioRecording";
import { AudioVisualizer } from "../../component/audio-visualizer/audio-visualizer";
import { WaveformProps } from "../../component/waveform/waveform.types";
import { useAudioFiles } from "../../context/AudioFilesProvider";
import { formatBytes, formatDuration } from "../../utils";

const isWeb = Platform.OS === "web";

if (isWeb) {
  localStorage.debug = "expo-audio-stream:*";
}

const LIVE_WAVE_FORM_CHUNKS_LENGTH = 5000;

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

const baseRecordingConfig: RecordingConfig = {
  interval: 500,
  sampleRate: 44100,
  encoding: "pcm_32bit",
  pointsPerSecond: 20,
  enableProcessing: true,
};

if (Platform.OS === "ios") {
  baseRecordingConfig.sampleRate = 48000;
} else if (Platform.OS === "android") {
  baseRecordingConfig.sampleRate = 16000;
}

export default function Record() {
  const [error, setError] = useState<string | null>(null);
  const [visualizationType, setVisualizationType] =
    useState<WaveformProps["visualizationType"]>("candlestick");
  const audioChunks = useRef<string[]>([]);
  const audioChunksBlobs = useRef<ArrayBuffer[]>([]);
  const [streamConfig, setStreamConfig] =
    useState<StartAudioStreamResult | null>(null);
  const [startRecordingConfig, setStartRecordingConfig] =
    useState<RecordingConfig>({
      ...baseRecordingConfig,
      onAudioStream: (a) => onAudioData(a),
    });
  const [result, setResult] = useState<AudioStreamResult | null>(null);
  const currentSize = useRef(0);
  const { refreshFiles, removeFile } = useAudioFiles();
  const [webAudioUri, setWebAudioUri] = useState<string>();

  // Ref for full WAV audio buffer
  const fullWavAudioBuffer = useRef<ArrayBuffer | null>(null);

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
      } else if (data instanceof ArrayBuffer) {
        audioChunksBlobs.current.push(data);

        // Store the arrayBuffer
        fullWavAudioBuffer.current = concatenateBuffers([
          ...(fullWavAudioBuffer.current ? [fullWavAudioBuffer.current] : []),
          data,
        ]);

        // Update the circular buffer for visualization
        liveWavFormBuffer.current[liveWavFormBufferIndex.current] = data;
        liveWavFormBufferIndex.current =
          (liveWavFormBufferIndex.current + 1) % LIVE_WAVE_FORM_CHUNKS_LENGTH;
      }
    } catch (error) {
      logger.error(`Error while processing audio data`, error);
    }
  }, []);

  const {
    startRecording,
    stopRecording,
    duration,
    size,
    isRecording,
    analysisData,
  } = useSharedAudioRecorder();

  const handleSaveFile = () => {
    if (webAudioUri) {
      const a = document.createElement("a");
      a.href = webAudioUri;
      a.download = `recording_${result?.sampleRate ?? "NOSAMPLE"}_${result?.bitDepth ?? "NOBITDEPTH"}.wav`;
      a.click();
    }
  };

  const handleFileInfo = async (uri: string) => {
    logger.debug(`Getting file info...`, uri);
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      // Decode the audio file to get metadata
      const wavMetadata = await getWavFileInfo(arrayBuffer);
      console.log(`Decoded audio:`, wavMetadata);
    } catch (error) {
      console.error("Error picking audio file:", error);
    }
  };

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
      fullWavAudioBuffer.current = null;
      currentSize.current = 0;
      console.log(`Starting recording...`, startRecordingConfig);
      const streamConfig: StartAudioStreamResult =
        await startRecording(startRecordingConfig);
      logger.debug(`Recording started `, streamConfig);
      setStreamConfig(streamConfig);

      // // Debug Only with fixed audio buffer
      // setTimeout(async () => {
      //   console.log("AUTO Stopping recording");
      //   await handleStopRecording();
      // }, 3000);
    } catch (error) {
      logger.error(`Error while starting recording`, error);
    }
  };

  const handleStopRecording = useCallback(async () => {
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

    if (isWeb && fullWavAudioBuffer.current) {
      const wavConfig = {
        buffer: fullWavAudioBuffer.current,
        sampleRate: result?.sampleRate || 44100,
        numChannels: result?.channels || 1,
        bitDepth: result?.bitDepth || 32,
      };
      logger.debug(`Writing wav header`, wavConfig);
      const wavBuffer = writeWaveHeader(wavConfig);

      const blob = new Blob([wavBuffer], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      console.log(`Generated URL: ${url}`);
      setWebAudioUri(url);

      await handleFileInfo(url);
      return;
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

  const renderRecording = () => (
    <View style={{ gap: 10, display: "flex" }}>
      {analysisData && (
        <AudioVisualizer
          candleSpace={2}
          candleWidth={5}
          canvasHeight={200}
          mode="live"
          audioData={analysisData}
        />
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
      <Picker
        label="Sample Rate"
        multi={false}
        options={[
          {
            label: "16000",
            value: "16000",
            selected: startRecordingConfig.sampleRate === 16000,
          },
          {
            label: "44100",
            value: "44100",
            selected: startRecordingConfig.sampleRate === 44100,
          },
          {
            label: "48000",
            value: "48000",
            selected: startRecordingConfig.sampleRate === 48000,
          },
        ]}
        onFinish={(options) => {
          console.log(`Selected options`, options);
          const selected = options?.find((option) => option.selected);
          if (!selected) return;
          setStartRecordingConfig((prev) => ({
            ...prev,
            sampleRate: parseInt(selected.value, 10) as SampleRate,
          }));
        }}
      />
      <Picker
        label="Encoding"
        multi={false}
        options={[
          {
            label: "pcm_16bit",
            value: "pcm_16bit",
            selected: startRecordingConfig.encoding === "pcm_16bit",
          },
          {
            label: "pcm_32bit",
            value: "pcm_32bit",
            selected: startRecordingConfig.encoding === "pcm_32bit",
          },
          {
            label: "pcm_8bit",
            value: "pcm_8bit",
            selected: startRecordingConfig.encoding === "pcm_8bit",
          },
        ]}
        onFinish={(options) => {
          const selected = options?.find((option) => option.selected);
          if (!selected) return;
          setStartRecordingConfig((prev) => ({
            ...prev,
            encoding: selected.value as RecordingConfig["encoding"],
          }));
        }}
      />
      <Picker
        label="Visualization Type"
        multi={false}
        options={[
          {
            label: "Candlestick",
            value: "candlestick",
            selected: visualizationType === "candlestick",
          },
          {
            label: "Line",
            value: "line",
            selected: visualizationType === "line",
          },
        ]}
        onFinish={(options) => {
          const selected = options?.find((option) => option.selected);
          if (!selected) return;
          setVisualizationType(
            selected.value as WaveformProps["visualizationType"],
          );
        }}
      />
      <Picker
        label="Points Per Second"
        multi={false}
        options={[
          {
            label: "20",
            value: "20",
            selected: startRecordingConfig.pointsPerSecond === 20,
          },
          {
            label: "10",
            value: "10",
            selected: startRecordingConfig.pointsPerSecond === 10,
          },
          {
            label: "1",
            value: "1",
            selected: startRecordingConfig.pointsPerSecond === 1,
          },
        ]}
        onFinish={(options) => {
          const selected = options?.find((option) => option.selected);
          if (!selected) return;
          setStartRecordingConfig((prev) => ({
            ...prev,
            pointsPerSecond: parseInt(selected.value, 10),
          }));
        }}
      />
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
    <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
      {/* {audioUri && (
        <View>
          <Text>Audio URI: {audioUri}</Text>
        </View>
      )} */}
      {result && (
        <View style={{ gap: 10, paddingBottom: 100 }}>
          <AudioRecording
            recording={result}
            webAudioUri={webAudioUri}
            showWaveform
            wavAudioBuffer={isWeb ? fullWavAudioBuffer.current! : undefined}
            onDelete={
              isWeb
                ? undefined
                : () => {
                    setResult(null);
                    return removeFile(result.fileUri);
                  }
            }
          />
          {isWeb && webAudioUri && (
            <>
              <Button mode="contained" onPress={handleSaveFile}>
                Save to Disk
              </Button>
              <Button
                mode="contained"
                onPress={() => handleFileInfo(webAudioUri)}
              >
                Get Wav Info
              </Button>
            </>
          )}
          <Button mode="contained" onPress={() => setResult(null)}>
            Record Again
          </Button>
        </View>
      )}
      {isRecording && renderRecording()}
      {!result && !isRecording && renderStopped()}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    padding: 10,
    // flex: 1,
    // alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  waveformContainer: {
    borderRadius: 10,
  },
  recordingContainer: {
    gap: 10,
    borderWidth: 1,
  },
});
