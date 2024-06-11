import { useTheme } from "@siteed/design-system";
import React, { useState } from "react";
import { Button, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { AudioAnalysisData } from "../../../../src/useAudioRecording";
import { AudioVisualizer } from "../../component/audio-visualizer/audio-visualizer";

const getStyles = () => {
  return StyleSheet.create({
    container: {},
  });
};

const ViewPage: React.FC = () => {
  const [audioData, setAudioData] = useState<AudioAnalysisData>();
  const { colors } = useTheme();
  const [canvasHeight, setCanvasHeight] = useState(300);

  const addNewCandle = () => {
    // const newCandle: WavPoint = { amplitude: 0.3, activeSpeech: true };
    // setCandles((prevCandles) => [...prevCandles, newCandle]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Text>color: {colors.text}</Text>
      {/* <AudioVisualizer
        audioData={audioData}
        candleWidth={10}
        candleSpace={3}
        showDottedLine
        canvasHeight={canvasHeight}
      /> */}
      {/* <AnimatedCanvas items={items} /> */}
      {/* <AnimatedCandle
        candle={{ height: 50 }}
        candleWidth={50}
        margin={10}
        canvasHeight={300}
        index={0}
      /> */}
      <Button title="Add Candle" onPress={addNewCandle} />
    </SafeAreaView>
  );
};

export default ViewPage;
