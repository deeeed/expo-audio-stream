import {
  Canvas,
  Group,
  Path
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { View } from "react-native";
import { SharedValue, useDerivedValue } from "react-native-reanimated";

import { DataPoint } from "@siteed/expo-audio-stream";
import { StyleProp, ViewStyle } from "react-native";
import { CANDLE_ACTIVE_AUDIO_COLOR, CANDLE_ACTIVE_SPEECH_COLOR, CANDLE_OFFCANVAS_COLOR, CANDLE_SELECTED_COLOR } from "../constants";
import AnimatedCandle from "./AnimatedCandle";
import { CandleData } from "./AudioVisualiser.types";
import { drawDottedLine } from "./AudioVisualizers.helpers";
import { SkiaTimeRuler } from "./SkiaTimeRuler";

export interface CanvasContainerProps {
  canvasHeight: number;
  candleWidth: number;
  candleSpace: number;
  showDottedLine: boolean;
  showRuler: boolean;
  showSilence: boolean;
  mode: "static" | "live" | "scaled";
  translateX: SharedValue<number>;
  activePoints: CandleData[];
  maxDisplayedItems: number;
  paddingLeft: number;
  totalCandleWidth: number;
  startIndex: number;
  canvasWidth: number;
  selectedCandle: DataPoint | null;
  durationMs?: number;
  minAmplitude: number;
  maxAmplitude: number;
  containerStyle?: StyleProp<ViewStyle>;
}

const CanvasContainer: React.FC<CanvasContainerProps> = ({
  canvasHeight,
  candleWidth,
  candleSpace,
  showDottedLine,
  showRuler,
  mode,
  translateX,
  activePoints,
  maxDisplayedItems,
  paddingLeft,
  totalCandleWidth,
  startIndex,
  canvasWidth,
  selectedCandle,
  showSilence,
  durationMs,
  minAmplitude,
  maxAmplitude,
  containerStyle,
}) => {
  const groupTransform = useDerivedValue(() => {
    return [{ translateX: translateX.value }];
  });
  const memoizedCandles = useMemo(() => {
    return activePoints.map(
      ({ id, amplitude, visible, activeSpeech, silent }, index) => {
        if (id === -1) return null;

        const scaledAmplitude =
          ((amplitude - minAmplitude) * (canvasHeight - 10)) /
          (maxAmplitude - minAmplitude);
        let delta =
          Math.ceil(maxDisplayedItems / 2) * (candleWidth + candleSpace);
        if (mode === "live") {
          delta = 0;
        }
        const x =
          (candleWidth + candleSpace) * index +
          startIndex * (candleWidth + candleSpace) +
          delta;

        let color = CANDLE_ACTIVE_AUDIO_COLOR;
        if (!visible) {
          color = CANDLE_OFFCANVAS_COLOR;
        } else if (selectedCandle && selectedCandle.id === id) {
          color = CANDLE_SELECTED_COLOR;
        } else if (activeSpeech) {
          color = CANDLE_ACTIVE_SPEECH_COLOR;
        }

        const key = `${id}`;

        return (
          <React.Fragment key={key}>
            {selectedCandle && selectedCandle.id === id && (
              <Path
                path={`M${x},0 L${x + candleWidth},0 L${x + candleWidth},${canvasHeight} L${x},${canvasHeight} Z`}
                color="red"
                style="stroke"
                strokeWidth={2}
                // strokeDash={[4, 4]}
              />
            )}
            {(!silent || showSilence) && (
              <AnimatedCandle
                animated
                x={x}
                y={canvasHeight / 2 - scaledAmplitude / 2}
                startY={canvasHeight / 2}
                width={candleWidth}
                height={scaledAmplitude}
                color={color}
              />
            )}
          </React.Fragment>
        );
      },
    );
  }, [
    activePoints,
    canvasHeight,
    minAmplitude,
    maxAmplitude,
    maxDisplayedItems,
    showSilence,
    candleWidth,
    candleSpace,
    mode,
    startIndex,
    selectedCandle,
  ]);

  return (
    <View style={containerStyle}>
      <Canvas
        style={{ height: canvasHeight, width: canvasWidth }}
      >
        <Group transform={groupTransform}>
          {memoizedCandles}
          {showRuler && (
            <SkiaTimeRuler
              duration={durationMs ?? 0 / 1000}
              paddingLeft={paddingLeft}
              width={totalCandleWidth}
            />
          )}
        </Group>
        {showDottedLine && (
          <Path
            path={drawDottedLine({ canvasWidth, canvasHeight })}
            color="grey"
            style="stroke"
            strokeWidth={1}
          />
        )}
      </Canvas>
    </View>
  );
};

export default React.memo(CanvasContainer);
