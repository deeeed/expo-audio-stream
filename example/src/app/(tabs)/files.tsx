import { Button } from "@siteed/design-system";
import { clearAudioFiles, listAudioFiles } from "@siteed/expo-audio-stream";
import { Audio } from "expo-av";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

const isWeb = Platform.OS === "web";

if (isWeb) {
  localStorage.debug = "expo-audio-stream:*";
}

export default function Files() {
  const [files, setFiles] = useState<string[]>([]);

  const [playingIds, setPlayingIds] = useState<string[]>([]);
  const [soundObjects, setSoundObjects] = useState<{
    [key: string]: Audio.Sound;
  }>({});

  const handleListFiles = useCallback(async () => {
    const _files = await listAudioFiles();
    setFiles(_files);
  }, []);

  useEffect(() => {
    handleListFiles();
    return () => {
      // Unload all sound objects on cleanup
      Object.values(soundObjects).forEach((sound) => {
        sound.unloadAsync();
      });
    };
  }, [handleListFiles]);

  const handleClearStorage = useCallback(async () => {
    try {
      await clearAudioFiles();
      await handleListFiles();
      // Unload and reset sound objects
      Object.values(soundObjects).forEach((sound) => {
        sound.unloadAsync();
      });
      setSoundObjects({});
    } catch (error) {
      console.error(`Error while clearing storage`, error);
    }
  }, [soundObjects]);

  const togglePlay = useCallback(
    async ({ url, playing }: { url: string; playing: boolean }) => {
      let sound = soundObjects[url];
      if (!sound) {
        sound = new Audio.Sound();
        await sound.loadAsync({ uri: url });
        setSoundObjects((prev) => ({ ...prev, [url]: sound }));
      }
      if (!playing) {
        console.log(`Playing audio`, url);
        await sound.playAsync();
        setPlayingIds((prev) => [...prev, url]);
      } else {
        console.log(`Stopping audio`, url);
        await sound.stopAsync();
        setPlayingIds((prev) => prev.filter((id) => id !== url));
      }
    },
    [soundObjects],
  );

  const shareAudio = async (url: string) => {
    try {
      console.log(`Sharing audio`, url);
      await Sharing.shareAsync(url);
    } catch (error) {
      console.error(`error sharing audio`, error);
    }
  };
  const renderRecordings = () => (
    <View style={styles.recordingContainer}>
      {files?.map((file, index) => {
        const playing = playingIds.includes(file);
        return (
          <View key={index}>
            <Text>{file}</Text>
            <Button onPress={() => togglePlay({ url: file, playing })}>
              {playing ? "Stop" : "Play"}
            </Button>
            <Button onPress={() => shareAudio(file)}>Share</Button>
          </View>
        );
      })}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ gap: 10 }}>
        <Button onPress={handleListFiles}>Refresh</Button>
        <Button onPress={handleClearStorage}>Clear</Button>
      </View>
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
