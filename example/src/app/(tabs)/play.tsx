import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import { getWavFileInfo } from "../../../../src/utils";
import { WaveForm } from "../../component/waveform/waveform";
import { formatBytes } from "../../utils";
import { ScreenWrapper } from "@siteed/design-system";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      paddingBottom: 80,
    },
    audioPlayer: {},
    button: {},
  });
};

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

        // Fetch the audio file as an ArrayBuffer
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        setAudioBuffer(arrayBuffer);

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

  const loadAudioFile = async ({ audioUri }: { audioUri: string }) => {
    try {
      const response = await fetch(audioUri);
      const arrayBuffer = await response.arrayBuffer();
      setAudioBuffer(arrayBuffer);

      // Decode the audio file to get metadata
      const wavMetadata = await getWavFileInfo(arrayBuffer);
      console.log(`Decoded audio:`, wavMetadata);
      setAudioMetadata({
        sampleRate: wavMetadata.sampleRate,
        channels: wavMetadata.numChannels,
        bitDepth: wavMetadata.bitDepth,
      });
      setFileName(audioUri);
      setAudioUri(audioUri);
    } catch (error) {
      console.error("Error loading audio file:", error);
    }
  };

  const playAudio = useCallback(async () => {
    if (audioUri) {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(sound);
      await sound.playAsync();
    }
  }, [audioUri]);

  useEffect(() => {
    return sound
      ? () => {
        sound.unloadAsync();
      }
      : undefined;
  }, [sound]);

  return (
    <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
      <Text>Select and play audio file</Text>
      <Button title="Select Audio File" onPress={pickAudioFile} />
      <Button
        title="Auto Load"
        onPress={async () => {
          try {
            await loadAudioFile({ audioUri: "/recording_44100_32.wav" });
          } catch (error) {
            console.error("Error loading audio file:", error);
          }
        }}
      />
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
              debug
              visualizationType="candlestick"
              sampleRate={audioMetadata?.sampleRate}
              channels={audioMetadata?.channels}
              bitDepth={32}
            />
          )}
          <Button title="Play Audio" onPress={playAudio} />
        </View>
      )}
      {fileName && (
        <>
          {/* <Text style={styles.audioPlayer}>Selected File: {audioUri}</Text> */}
          <Text style={styles.audioPlayer}>Selected File: {fileName}</Text>
        </>
      )}
    </ScreenWrapper>
  );
};

export default TestPage;
