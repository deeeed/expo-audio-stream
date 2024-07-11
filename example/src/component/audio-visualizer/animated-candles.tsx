import { Canvas, Rect } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";

interface Candle {
  height: number;
}

interface AnimatedCandleProps {
  candle: Candle;
  canvasHeight: number;
}

export const AnimatedCandles: React.FC<AnimatedCandleProps> = ({
  candle,
  canvasHeight,
}) => {
  const { width } = Dimensions.get("window");
  const candleWidth = width / 50; // Width of the single candle
  const baseline = canvasHeight / 2;
  const animatedHeight = useSharedValue(0);
  const animatedY = useSharedValue(baseline);

  useEffect(() => {
    const targetHeight = (candle.height / 100) * canvasHeight;
    animatedHeight.value = withTiming(targetHeight, { duration: 500 });
    animatedY.value = withTiming(baseline - targetHeight / 2, {
      duration: 500,
    });
  }, [candle]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Canvas style={styles.canvas}>
        <Rect
          x={0}
          y={animatedY}
          width={candleWidth - 2}
          height={animatedHeight}
          color="#4A90E2" // Adjust the color to match the image
        />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    width: 300,
    height: 300,
  },
});

export default AnimatedCandles;
