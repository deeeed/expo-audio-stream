import { DataPoint } from "@siteed/expo-audio-stream";
import { useLogger } from "@siteed/react-native-logger";
import React, { useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SharedValue, runOnJS } from "react-native-reanimated";
import { CandleData } from "./AudioVisualiser.types";

interface GestureHandlerProps {
  playing: boolean;
  mode: "static" | "live";
  canvasWidth: number;
  candleWidth: number;
  candleSpace: number;
  totalCandleWidth: number;
  translateX: SharedValue<number>;
  maxTranslateX: number;
  activePoints: CandleData[];
  onSelection?: (dataPoint: DataPoint) => void;
  onDragEnd: (params: { newTranslateX: number }) => void;
  children: React.ReactNode;
}

export const GestureHandler: React.FC<GestureHandlerProps> = ({
  playing,
  mode,
  translateX,
  maxTranslateX,
  canvasWidth,
  candleSpace,
  candleWidth,
  totalCandleWidth,
  activePoints,
  onDragEnd,
  onSelection,
  children,
}) => {
  const { logger } = useLogger("GestureHandler");

  const initialTranslateX = useRef(0);

  if (playing || mode === "live") {
    return <>{children}</>;
  }

  const panGesture = Gesture.Pan()
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

    const tapGesture = Gesture.Tap()
    .onEnd((event) => {
      const { x, y } = event;
      if (x < 0 || x > canvasWidth) {
        logger.debug(`Touch started outside the canvas: (${x}, ${y})`);
        return;
      }

      const plotStart = canvasWidth / 2 + translateX.value;
      const plotEnd = plotStart + totalCandleWidth;

      logger.debug(
        `TouchEnd: ${x} canvasWidth=${canvasWidth} [${plotStart}, ${plotEnd}]`,
      );
      if (x < plotStart || x > plotEnd) {
        logger.debug(`NOT WITHIN RANGE ${x} [${plotStart}, ${plotEnd}]`);
        return;
      }

      const adjustedX = x - plotStart;
      const index = Math.floor(adjustedX / (candleWidth + candleSpace));
      const candle = activePoints[index];
      if (!candle) {
        logger.log(`No candle found at index: ${index}`);
        return;
      }
      logger.debug(`Index: ${index} AdjustedX: ${adjustedX}`);

      // Dispatch action to update the selected candle
      onSelection?.(candle);
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  return <GestureDetector gesture={composedGesture}>{children}</GestureDetector>;
};
