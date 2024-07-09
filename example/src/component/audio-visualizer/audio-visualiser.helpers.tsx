// example/src/component/audio-visualizer/audio-visualiser.helpers.tsx
import { Skia, SkPath } from "@shopify/react-native-skia";
import { getLogger } from "@siteed/react-native-logger";
import { StyleSheet } from "react-native";
import { withTiming } from "react-native-reanimated";

import {
  AudioVisualizerState,
  CalculateReferenceLinePositionParams,
  DrawDottedLineParams,
  GetStylesParams,
  SyncTranslateXParams,
  UpdateActivePointsParams,
} from "./autio-visualizer.types";

const logger = getLogger("audio-visualiser.helpers");

export const calculateReferenceLinePosition = ({
  canvasWidth,
  referenceLinePosition,
}: CalculateReferenceLinePositionParams): number => {
  if (referenceLinePosition === "RIGHT") {
    return canvasWidth - 15;
  }
  return canvasWidth / 2; // Default to MIDDLE
};

export const getStyles = ({
  screenWidth,
  canvasWidth,
  referenceLineX,
}: GetStylesParams) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    canvasContainer: {
      width: canvasWidth,
      backgroundColor: "#292a2d",
      justifyContent: "center",
      alignItems: "center",
      gap: 5,
      borderWidth: 3,
      borderColor: "red",
    },
    referenceLine: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: referenceLineX,
      width: 2,
      backgroundColor: "red",
    },
    canvas: {},
    text: {
      // color: "white"
    },
  });
};

const SYNC_DURATION = 100; // Duration for the timing animation
export const syncTranslateX = ({
  currentTime,
  durationMs,
  maxTranslateX,
  minTranslateX,
  translateX,
}: SyncTranslateXParams) => {
  if (durationMs) {
    const currentTimeInMs = currentTime * 1000; // Convert currentTime to milliseconds
    const progressRatio = currentTimeInMs / durationMs;
    const allowedTranslateX = maxTranslateX;
    const x = -(progressRatio * allowedTranslateX);
    translateX.value = withTiming(x, { duration: SYNC_DURATION }); // Smooth transition
    return x;
  }
  return translateX.value;
};

export const drawDottedLine = ({
  canvasWidth,
  canvasHeight,
}: DrawDottedLineParams): SkPath => {
  const path = Skia.Path.Make();
  const dashLength = 3;
  const gapLength = 5;
  const baseline = canvasHeight / 2;

  for (let x = 0; x < canvasWidth; x += dashLength + gapLength) {
    path.moveTo(x, baseline);
    path.lineTo(x + dashLength, baseline);
  }

  return path;
};

export const updateActivePoints = ({
  x,
  dataPoints,
  activePoints,
  maxDisplayedItems,
  dispatch,
  referenceLineX,
  mode,
  range,
  candleWidth,
  candleSpace,
  lastUpdatedTranslateX,
  ready,
}: UpdateActivePointsParams) => {
  if (dataPoints.length === 0) {
    logger.debug(
      `No data points to update or already updated. Skipping... lastUpdatedTranslateX=${lastUpdatedTranslateX}, x=${x}, ready=${ready}`,
    );
    return;
  }

  logger.debug(
    `Updating active points x=${x}, mode=${mode}, dataPoints.length=${dataPoints.length}, activePoints.length=${activePoints.length}, referenceLineX=${referenceLineX}, maxDisplayedItems=${maxDisplayedItems}`,
  );

  const updates: Partial<AudioVisualizerState> = {
    ready: true,
    triggerUpdate: 0,
    range: { ...range }, // Initialize range to avoid it being undefined
  };

  if (mode === "live") {
    const totalItems = activePoints.length;
    const liveMaxDisplayedItems = Math.floor(
      referenceLineX / (candleWidth + candleSpace),
    );
    const startIndex = Math.max(0, totalItems - liveMaxDisplayedItems);

    const updatedPoints = [];
    for (let i = 0; i < liveMaxDisplayedItems; i++) {
      const itemIndex = startIndex + i;
      if (itemIndex < totalItems) {
        updatedPoints.push({
          ...dataPoints[itemIndex],
          visible: true,
        });
      }
    }
    logger.log(`Live mode: Updated ${updatedPoints.length} active points`);
    updates.activePoints = [...updatedPoints];
  } else {
    const translateX = Math.abs(x);
    const rawHiddenItemsLeft = Math.floor(
      translateX / (candleWidth + candleSpace),
    );
    // We always display from middle of screen
    const itemsOffset = Math.floor(maxDisplayedItems / 2);
    const hiddenItemsLeft = Math.max(0, rawHiddenItemsLeft - itemsOffset); // Can't be negative

    // allow for maxDisplayedItems to be hidden on the left
    const startIndex = Math.max(0, hiddenItemsLeft - maxDisplayedItems);
    const startVisibleIndex =
      startIndex + Math.min(hiddenItemsLeft, maxDisplayedItems);

    const endIndex = startIndex + maxDisplayedItems * 3;
    const endVisibleIndex = startVisibleIndex + maxDisplayedItems;

    // Ensure loopTo does not exceed the maximum number of active points
    const loopTo = maxDisplayedItems * 3;

    for (let i = 0; i < loopTo; i++) {
      const itemIndex = startIndex + i;

      if (itemIndex < dataPoints.length) {
        const visible =
          itemIndex >= startVisibleIndex && itemIndex <= endVisibleIndex;
        activePoints[i] = {
          ...dataPoints[itemIndex],
          visible,
        };
      } else {
        activePoints[i] = {
          amplitude: 0,
          id: -1,
          visible: false,
        };
      }
    }
    updates.activePoints = [...activePoints];
    updates.range = {
      start: startIndex,
      end: endIndex,
      startVisibleIndex,
      endVisibleIndex,
    };
    logger.debug(
      `Range updated: start=${startIndex}, end=${endIndex}, startVisibleIndex=${startVisibleIndex}, endVisibleIndex=${endVisibleIndex}`,
    );
  }
  lastUpdatedTranslateX = x;

  // Batch state updates
  dispatch({ type: "BATCH_UPDATE", payload: updates });

  logger.debug(
    `Active points updated. First point ID: ${activePoints[0]?.id}, Last point ID: ${activePoints[activePoints.length - 1]?.id}`,
  );
};
