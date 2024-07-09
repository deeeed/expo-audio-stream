import { AudioAnalysisData, DataPoint } from "@siteed/expo-audio-stream";
import React, { useRef } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SharedValue, runOnJS } from "react-native-reanimated";

import { updateActivePoints } from "./audio-visualiser.helpers";
import { AudioVisualiserAction } from "./audio-visualizer";
import { CandleData } from "./autio-visualizer.types";

interface GestureHandlerProps {
  dispatch: React.Dispatch<AudioVisualiserAction>;
  playing: boolean;
  mode: "static" | "live";
  translateX: SharedValue<number>;
  maxTranslateX: number;
  onSeekEnd?: (newTime: number) => void;
  audioData: AudioAnalysisData;
  dataPoints: DataPoint[];
  activePoints: CandleData[];
  maxDisplayedItems: number;
  referenceLineX: number;
  candleWidth: number;
  candleSpace: number;
  lastUpdatedTranslateX: number;
  ready: boolean;
  range: {
    start: number;
    end: number;
    startVisibleIndex: number;
    endVisibleIndex: number;
  };
  children: React.ReactNode;
}

export const GestureHandler: React.FC<GestureHandlerProps> = ({
  playing,
  mode,
  dispatch,
  translateX,
  maxTranslateX,
  onSeekEnd,
  audioData,
  activePoints,
  dataPoints,
  maxDisplayedItems,
  referenceLineX,
  candleWidth,
  candleSpace,
  lastUpdatedTranslateX,
  ready,
  range,
  children,
}) => {
  const initialTranslateX = useRef(0);

  const gesture = Gesture.Pan()
    .onStart((_e) => {
      if (playing || mode === "live") {
        return;
      }
      initialTranslateX.current = translateX.value;
    })
    .onChange((e) => {
      if (playing || mode === "live") {
        return;
      }

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
      if (mode === "live") return;

      if (audioData.durationMs && onSeekEnd) {
        const allowedTranslateX = maxTranslateX;
        const progressRatio = -translateX.value / allowedTranslateX;
        const newTime = (progressRatio * audioData.durationMs) / 1000;
        runOnJS(onSeekEnd)(newTime);
      }

      runOnJS(updateActivePoints)({
        x: translateX.value,
        dataPoints,
        maxDisplayedItems,
        activePoints,
        referenceLineX,
        dispatch,
        range,
        mode,
        candleWidth,
        candleSpace,
        lastUpdatedTranslateX,
        ready,
      });
    });

  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
};
