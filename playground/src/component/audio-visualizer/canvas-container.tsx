// playground/src/component/audio-visualizer/canvas-container.tsx
import {
  Canvas,
  ExtendedTouchInfo,
  Group,
  Path,
  useTouchHandler,
} from "@shopify/react-native-skia";
import { useLogger } from "@siteed/react-native-logger";
import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { useDerivedValue } from "react-native-reanimated";

import AnimatedCandle, {
  CANDLE_ACTIVE_AUDIO_COLOR,
  CANDLE_ACTIVE_SPEECH_COLOR,
  CANDLE_OFFCANVAS_COLOR,
  CANDLE_SELECTED_COLOR,
} from "./animated-candle";
import { drawDottedLine } from "./audio-visualiser.helpers";
import { CanvasContainerProps } from "./autio-visualizer.types";
import { SkiaTimeRuler } from "./skia-time-ruler";

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
  dispatch,
  durationMs,
  minAmplitude,
  maxAmplitude,
  containerStyle,
}) => {
  const groupTransform = useDerivedValue(() => {
    return [{ translateX: translateX.value }];
  });
  const [dragging, setDragging] = useState(false);
  const { logger } = useLogger("CanvasContainer");

  const touchHandler = useTouchHandler({
    onStart: () => {
      setDragging(false);
    },
    onActive: () => setDragging(true),
    onEnd: useCallback(
      (event: ExtendedTouchInfo) => {
        // disable in live mode
        if (dragging || mode === "live") return;
        const { x } = event;
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
        logger.debug(`Index: ${index} AdjustedX: ${adjustedX}`, candle);

        // Dispatch action to update the selected candle
        dispatch({
          type: "UPDATE_STATE",
          state: { selectedCandle: candle },
        });

        const RMS_THRESHOLD = 0.02;
        const ZCR_THRESHOLD = 0.1;
        const rms = candle.features?.rms ?? 0;
        const zcr = candle.features?.zcr ?? 0;
        const dynActiveSpeech = rms > RMS_THRESHOLD && zcr > ZCR_THRESHOLD;
        logger.log(
          `Detected=${candle.activeSpeech} ActiveSpeech: ${dynActiveSpeech} rms=${rms} > (${RMS_THRESHOLD}) --> ${rms > RMS_THRESHOLD} zcr=${zcr} > (${ZCR_THRESHOLD}) --> ${zcr > ZCR_THRESHOLD}`,
        );
        if (!durationMs) return;

        // Compute time from index
        const canvasSize = plotEnd - plotStart; // --> 100%
        const position = adjustedX / canvasSize; // --> x%
        const time = position * durationMs;
        logger.log(
          `Time: ${time} Index: ${index} totalCandles=${activePoints.length}`,
        );
      },
      [
        dragging,
        mode,
        canvasWidth,
        translateX,
        dispatch,
        totalCandleWidth,
        candleWidth,
        candleSpace,
        activePoints,
        durationMs,
      ],
    ),
  });

  const memoizedCandles = useMemo(() => {
    return activePoints.map(
      ({ id, amplitude, visible, activeSpeech, silent }, index) => {
        if (id === -1 || silent) return null;

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
          <AnimatedCandle
            key={`${key}`}
            animated
            x={x}
            y={canvasHeight / 2 - scaledAmplitude / 2}
            startY={canvasHeight / 2}
            width={candleWidth}
            height={scaledAmplitude}
            color={color}
          />
        );
      },
    );
  }, [
    activePoints,
    canvasHeight,
    minAmplitude,
    maxAmplitude,
    maxDisplayedItems,
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
        onTouch={touchHandler}
      >
        <Group transform={groupTransform}>
          {showRuler && (
            <SkiaTimeRuler
              duration={durationMs ?? 0 / 1000}
              paddingLeft={paddingLeft}
              width={totalCandleWidth}
            />
          )}
          {memoizedCandles}
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
