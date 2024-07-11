import { Canvas, Rect, Path, Skia } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useDerivedValue,
} from "react-native-reanimated";

export interface WavPoint {
  amplitude: number;
  activeSpeech?: boolean;
}

interface TestWaveformProps {
  candles: WavPoint[];
  canvasHeight: number;
}

export const TestWaveform: React.FC<TestWaveformProps> = ({
  candles,
  canvasHeight,
}) => {
  const { width } = Dimensions.get("window");
  const candleWidth = width / 50; // Assuming a max of 50 candles visible at a time
  const baseline = canvasHeight / 2;
  const animatedCandles = useSharedValue<WavPoint[]>([]);

  useEffect(() => {
    animatedCandles.value = candles;
  }, [candles]);

  const animatedPaths = useDerivedValue(() => {
    return animatedCandles.value.map((candle, index) => {
      const x = width - (index + 1) * candleWidth; // New data comes from the right
      const targetHeight = (candle.amplitude / 100) * canvasHeight;
      const y = baseline - targetHeight / 2;

      return {
        x,
        y,
        height: targetHeight,
        animatedHeight: withTiming(targetHeight, { duration: 500 }),
        animatedY: withTiming(y, { duration: 500 }),
      };
    });
  }, [animatedCandles.value]);

  const drawDottedLine = () => {
    const path = Skia.Path.Make();
    const dashLength = 10;
    const gapLength = 5;

    for (let x = 0; x < width; x += dashLength + gapLength) {
      path.moveTo(x, baseline);
      path.lineTo(x + dashLength, baseline);
    }

    return path;
  };

  return (
    <Canvas style={{ ...styles.canvas, height: canvasHeight }}>
      <Path
        path={drawDottedLine()}
        color="white"
        style="stroke"
        strokeWidth={1}
      />
      {/* Candles */}
      {animatedPaths.value &&
        animatedPaths.value.map((candle, index) => (
          <Rect
            key={index}
            x={candle.x}
            y={candle.animatedY}
            width={candleWidth - 2}
            height={candle.animatedHeight}
            color="#4A90E2"
          />
        ))}
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});

export default TestWaveform;
