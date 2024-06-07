import { ScreenWrapper } from "@siteed/design-system";
import { Asset, useAssets } from "expo-asset";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Platform, StyleSheet, Text, View } from "react-native";
import { atob, btoa } from "react-native-quick-base64";

import { getWavFileInfo } from "../../../../src/utils";
import { WaveForm } from "../../component/waveform/waveform";
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

  const [audioMetadata, setAudioMetadata] = useState<{
    sampleRate: number;
    channels: number;
    bitDepth: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const pickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
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

        // Decode the audio file to get metadata
        const wavMetadata = await getWavFileInfo(arrayBuffer);
        setAudioMetadata({
          sampleRate: wavMetadata.sampleRate,
          channels: wavMetadata.numChannels,
          bitDepth: wavMetadata.bitDepth,
        });
      }
    } catch (error) {
      console.error("Error picking audio file:", error);
    }
  };

  const loadWebAudioFile = async ({ audioUri }: { audioUri: string }) => {
    try {
      const response = await fetch(audioUri);
      const arrayBuffer = await response.arrayBuffer();

      // Unload any existing sound
      if (sound) {
        setSound(null);
      }

      // // Decode the audio file to get metadata
      const wavMetadata = await getWavFileInfo(arrayBuffer);
      console.log(`Decoded audio:`, wavMetadata);
      setAudioMetadata({
        sampleRate: wavMetadata.sampleRate,
        channels: wavMetadata.numChannels,
        bitDepth: wavMetadata.bitDepth,
      });
      setAudioBuffer(arrayBuffer);
      setFileName(fileName);
      setAudioUri(audioUri);
      // Reset playback position and stop playback
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (error) {
      console.error("Error loading audio file:", error);
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
              await loadWebAudioFile({ audioUri: "/test.wav" });
            } catch (error) {
              console.error("Error loading audio file:", error);
            }
          }}
        />
      )}
      {audioUri && (
        <View>
          <Text>{JSON.stringify(audioMetadata)}</Text>
          <Text>size: {formatBytes(audioBuffer?.byteLength ?? 0, 2)}</Text>
          <Text>metadata.sampleRate: {audioMetadata?.sampleRate}</Text>
          <Text>metadata.channels: {audioMetadata?.channels}</Text>
          <Text>metadata.bitDepth: {audioMetadata?.bitDepth}</Text>
          {audioBuffer && audioMetadata && (
            <WaveForm
              buffer={audioBuffer}
              mode="static"
              showRuler
              currentTime={currentTime}
              debug
              visualizationType="candlestick"
              sampleRate={audioMetadata?.sampleRate}
              channels={audioMetadata?.channels}
              bitDepth={audioMetadata.bitDepth}
            />
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
