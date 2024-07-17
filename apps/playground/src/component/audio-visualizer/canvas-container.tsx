// playground/src/component/audio-visualizer/canvas-container.tsx
import {
  Canvas,
  ExtendedTouchInfo,
  Group,
  Path,
  useTouchHandler,
} from "@shopify/react-native-skia";
import { useLogger } from "@siteed/react-native-logger";
import React, { useCallback, useMemo, useRef } from "react";
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
  showSilence,
  onSelection,
  durationMs,
  minAmplitude,
  maxAmplitude,
  containerStyle,
}) => {
  const groupTransform = useDerivedValue(() => {
    return [{ translateX: translateX.value }];
  });
  const { logger } = useLogger("CanvasContainer");

  const hasProcessedEvent = useRef(false);

  const processEvent = useCallback(
    (event: ExtendedTouchInfo) => {
      if (mode === "live" || hasProcessedEvent.current) return;

      const { x, y } = event;
      if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
        logger.debug(`Touch started outside the canvas: (${x}, ${y})`);
        return;
      }

      hasProcessedEvent.current = true;

      setTimeout(() => {
        hasProcessedEvent.current = false;
      }, 300);

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
      onSelection?.(candle);
    },
    [
      mode,
      canvasWidth,
      canvasHeight,
      translateX,
      totalCandleWidth,
      candleWidth,
      candleSpace,
      activePoints,
      onSelection,
      logger,
    ],
  );

  const touchHandler = useTouchHandler({
    onStart: () => {},
    onEnd: processEvent,
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
        onTouch={touchHandler}
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
