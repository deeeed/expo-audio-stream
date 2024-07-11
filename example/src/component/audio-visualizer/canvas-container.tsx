// example/src/component/audio-visualizer/canvas-container.tsx
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
  ACTIVE_SPEECH_COLOR,
  INACTIVE_SPEECH_COLOR,
} from "./animated-candle";
import { drawDottedLine } from "./audio-visualiser.helpers";
import { CanvasContainerProps } from "./autio-visualizer.types";
import { SkiaTimeRuler } from "./skia-time-ruler";

const CanvasContainer: React.FC<CanvasContainerProps> = ({
  currentTime,
  canvasHeight,
  candleWidth,
  candleSpace,
  showDottedLine,
  showRuler,
  mode,
  playing,
  translateX,
  activePoints,
  lastUpdatedTranslateX,
  maxDisplayedItems,
  maxTranslateX,
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
      console.log("TouchStart");
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
          type: "SET_SELECTED_CANDLE",
          payload: candle,
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
    return activePoints.map(({ id, amplitude, visible }, index) => {
      if (amplitude === 0 && id === -1) return null;

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

      let color = visible ? ACTIVE_SPEECH_COLOR : INACTIVE_SPEECH_COLOR;
      if (selectedCandle && selectedCandle.id === id) {
        color = "red";
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
    });
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
    ACTIVE_SPEECH_COLOR,
    INACTIVE_SPEECH_COLOR,
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
