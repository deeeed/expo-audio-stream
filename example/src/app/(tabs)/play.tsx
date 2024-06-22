import { ScreenWrapper } from "@siteed/design-system";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

import { extractAudioAnalysis } from "../../../../src";
import { AudioAnalysisData } from "../../../../src/useAudioRecording";
import { WavFileInfo, getWavFileInfo } from "../../../../src/utils";
import { AudioVisualizer } from "../../component/audio-visualizer/audio-visualizer";
import { RawWaveForm } from "../../component/waveform/rawwaveform";
import { formatBytes } from "../../utils";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      paddingBottom: 80,
    },
    audioPlayer: {},
    button: {},
  });
};
const isWeb = Platform.OS === "web";

export const TestPage = () => {
  const styles = useMemo(() => getStyles(), []);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<ArrayBuffer>();
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysisData>();
  const [audioMetadata, setAudioMetadata] = useState<WavFileInfo>();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/wav",
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const name = result.assets[0].name;
        setAudioUri(uri);
        setFileName(name);
        setIsPlaying(false);
        setCurrentTime(0);
        // Fetch the audio file as an ArrayBuffer
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        setAudioBuffer(arrayBuffer);

        // Unload any existing sound
        if (sound) {
          setSound(null);
        }

        setProcessing(true);
        // Decode the audio file to get metadata
        const wavMetadata = await getWavFileInfo(arrayBuffer);
        setAudioMetadata(wavMetadata);

        const audioAnalysis = await extractAudioAnalysis({
          fileUri: uri,
          wavMetadata,
          pointsPerSecond: 5,
          algorithm: "rms",
        });
        console.log(`AudioAnalysis:`, audioAnalysis);
        setAudioAnalysis(audioAnalysis);
      }
    } catch (error) {
      console.error("Error picking audio file:", error);
    } finally {
      setProcessing(false);
    }
  };

  const loadWebAudioFile = async ({ audioUri }: { audioUri: string }) => {
    try {
      const timings: { [key: string]: number } = {};

      const startOverall = performance.now();

      const startUnloadSound = performance.now();
      // Unload any existing sound
      if (sound) {
        setSound(null);
      }
      timings["Unload Sound"] = performance.now() - startUnloadSound;

      const startResetPlayback = performance.now();
      // Reset playback position and stop playback
      setCurrentTime(0);
      setIsPlaying(false);
      timings["Reset Playback"] = performance.now() - startResetPlayback;

      const startFetchAudio = performance.now();
      const response = await fetch(audioUri);
      const arrayBuffer = await response.arrayBuffer();
      setAudioBuffer(arrayBuffer);
      timings["Fetch and Convert Audio"] = performance.now() - startFetchAudio;

      const startDecodeAudio = performance.now();
      // Decode the audio file to get metadata
      const wavMetadata = await getWavFileInfo(arrayBuffer);
      setAudioMetadata(wavMetadata);
      timings["Decode Audio"] = performance.now() - startDecodeAudio;

      const startExtractFileName = performance.now();
      // extract filename from audioUri and remove any query params
      const fileName = audioUri.split("/").pop()?.split("?")[0] ?? "Unknown";
      setFileName(fileName);
      setAudioUri(audioUri);
      timings["Extract Filename"] = performance.now() - startExtractFileName;

      const startAudioAnalysis = performance.now();
      const audioAnalysis = await extractAudioAnalysis({
        fileUri: audioUri,
        wavMetadata,
        pointsPerSecond: 5,
        algorithm: "rms",
      });
      setAudioAnalysis(audioAnalysis);
      timings["Audio Analysis"] = performance.now() - startAudioAnalysis;

      timings["Total Time"] = performance.now() - startOverall;

      console.log("Timings:", timings);
      console.log(`AudioAnalysis:`, audioAnalysis);
      console.log(`wavMetadata:`, wavMetadata);
    } catch (error) {
      console.error("Error loading audio file:", error);
    }
  };

  const handleSeekEnd = (newTime: number) => {
    if (sound && sound._loaded) {
      sound.setPositionAsync(newTime * 1000);
    }
  };

  const playPauseAudio = useCallback(async () => {
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } else if (audioUri) {
      const { sound: newSound } = await Audio.Sound.createAsync({
        uri: audioUri,
      });
      setSound(newSound);
      await newSound.playAsync();
      setIsPlaying(true);

      // Track playback position
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setCurrentTime(status.positionMillis / 1000);
          setIsPlaying(status.isPlaying);
        }
      });
    }
  }, [audioUri, sound]);

  useEffect(() => {
    return sound
      ? () => {
          console.log("Unloading sound");
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
      <Text>Select and play audio file</Text>
      <Button title="Select Audio File" onPress={pickAudioFile} />
      {isWeb && (
        <Button
          title="Auto Load"
          onPress={async () => {
            try {
              // await loadWebAudioFile({ audioUri: "/arthurdanette.wav" });
              // await loadWebAudioFile({ audioUri: "/arthurdanette.wav" });
              await loadWebAudioFile({ audioUri: "/sdk_sample.wav" });
            } catch (error) {
              console.error("Error loading audio file:", error);
            }
          }}
        />
      )}
      {processing && <ActivityIndicator size="large" />}
      {audioUri && (
        <View>
          {/* {audioBuffer && audioMetadata && (
            <RawWaveForm
              buffer={audioBuffer}
              mode="static"
              showRuler
              currentTime={currentTime}
              debug
              visualizationType="candlestick"
              sampleRate={audioMetadata?.sampleRate}
              channels={audioMetadata?.numChannels}
              bitDepth={audioMetadata.bitDepth}
            />
          )} */}
          {audioAnalysis && (
            <>
              <Button
                title="Change Time"
                onPress={() => {
                  setCurrentTime(currentTime + 1);
                }}
              />
              <Text>currentTime: {currentTime}</Text>
              <AudioVisualizer
                candleSpace={2}
                mode="scaled"
                showRuler
                showDottedLine
                playing={isPlaying}
                candleWidth={5}
                currentTime={currentTime}
                canvasHeight={300}
                audioData={audioAnalysis}
                onSeekEnd={handleSeekEnd}
              />
            </>
          )}
          <Button
            title={isPlaying ? "Pause Audio" : "Play Audio"}
            onPress={playPauseAudio}
          />
        </View>
      )}
      {fileName && (
        <>
          <Text style={styles.audioPlayer}>Selected File: {fileName}</Text>
        </>
      )}
    </ScreenWrapper>
  );
};

export default TestPage;
