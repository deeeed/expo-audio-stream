import { Button } from "@siteed/design-system";
import { createWebWorker } from "@siteed/expo-audio-stream";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { WaveForm } from "../../component/waveform/waveform";

const getStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F5F5F5",
    },
    header: {
      fontSize: 24,
      marginBottom: 20,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "60%",
      marginVertical: 20,
    },
  });
};

export interface WaveScreenProps {
  label: string;
}
const WaveScreen = ({ label }: WaveScreenProps) => {
  const styles = useMemo(() => getStyles(), []);
  const [visualizationType, setVisualizationType] = useState<
    "line" | "candlestick"
  >("line");

  const exampleBuffer = new ArrayBuffer(1024);
  const view = new DataView(exampleBuffer);
  for (let i = 0; i < 1024; i += 2) {
    view.setInt16(i, Math.sin(i / 10) * 32767, true); // Example data
  }

  const testWebWorker = async () => {
    const worker = createWebWorker();
    worker.postMessage({ type: "test" });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Record</Text>
      <Button onPress={testWebWorker}>web worker test</Button>
      <View style={{ flex: 1, width: "100%" }}>
        <WaveForm
          buffer={exampleBuffer}
          bitDepth={16}
          sampleRate={16000}
          channels={1}
        />
      </View>
    </View>
  );
};

export default WaveScreen;
