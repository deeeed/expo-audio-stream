import React, { useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SharedValue, runOnJS } from "react-native-reanimated";

interface GestureHandlerProps {
  playing: boolean;
  mode: "static" | "live";
  translateX: SharedValue<number>;
  maxTranslateX: number;
  onDragEnd: (params: { newTranslateX: number }) => void;
  children: React.ReactNode;
}

export const GestureHandler: React.FC<GestureHandlerProps> = ({
  playing,
  mode,
  translateX,
  maxTranslateX,
  onDragEnd,
  children,
}) => {
  const initialTranslateX = useRef(0);

  if (playing || mode === "live") {
    return <>{children}</>;
  }

  const gesture = Gesture.Pan()
    .onStart((_e) => {
      initialTranslateX.current = translateX.value;
    })
    .onChange((e) => {
      const newTranslateX = translateX.value + e.changeX;
      const clampedTranslateX = Math.max(
        -maxTranslateX,
        Math.min(0, newTranslateX),
      ); // Clamping within bounds

      // compute distance since last update
      //   const distance = Math.abs(initialTranslateX.current - clampedTranslateX);
      //   const distanceItems = Math.floor(distance / (candleWidth + candleSpace));
      translateX.value = clampedTranslateX;
    })
    .onEnd((_e) => {
      runOnJS(onDragEnd)({
        newTranslateX: translateX.value,
      });
    });

  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
};