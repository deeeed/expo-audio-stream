// playground/src/component/audio-visualizer/animated-candle.tsx
import { Rect } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";

interface AnimatedCandleProps {
  height: number;
  x: number;
  y: number;
  startY: number;
  width: number;
  color: string;
  animated?: boolean;
}

export const CANDLE_ACTIVE_AUDIO_COLOR = "rgba(74, 144, 226, 1)";
export const CANDLE_ACTIVE_SPEECH_COLOR = "rgba(114, 191, 106, 1)";
export const CANDLE_SELECTED_COLOR = "rgba(255, 99, 71, 1)";
export const CANDLE_OFFCANVAS_COLOR = "rgba(211, 211, 211, 1)";

const AnimatedCandle: React.FC<AnimatedCandleProps> = ({
  color: targetColor,
  x: targetX,
  y: targetY,
  startY,
  height: targetHeight,
  width,
  animated = true,
}) => {
  const y = useSharedValue(startY);
  const height = useSharedValue(0);
  const x = useSharedValue(targetX);
  const color = useSharedValue(CANDLE_OFFCANVAS_COLOR);

  useEffect(() => {
    if (animated) {
      y.value = withTiming(targetY, { duration: 500 });
      height.value = withTiming(targetHeight, { duration: 500 });
      x.value = withTiming(targetX, { duration: 500 });
      color.value = withTiming(targetColor, { duration: 500 });
    } else {
      y.value = targetY;
      height.value = targetHeight;
      x.value = targetX;
      color.value = targetColor;
    }
  }, [targetY, targetHeight, targetX, targetColor, animated]);

  return <Rect x={targetX} y={y} width={width} height={height} color={color} />;
};

export default React.memo(AnimatedCandle);
