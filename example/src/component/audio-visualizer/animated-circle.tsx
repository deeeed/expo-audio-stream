import { Circle } from "@shopify/react-native-skia";
import React, { useEffect } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";

export type AnimatedCircleProps = {
  color?: string;
  cx: number;
  cy: number;
  r: number;
};

export const AnimatedCircle: React.FC<AnimatedCircleProps> = ({
  cx,
  cy,
  color = "red",
  r: initialR,
}) => {
  const r = useSharedValue(0);

  useEffect(() => {
    r.value = withTiming(initialR * 0.5, { duration: 1000 });
  }, [r, initialR]);

  return <Circle cx={cx} cy={cy} r={r} color={color} />;
};
