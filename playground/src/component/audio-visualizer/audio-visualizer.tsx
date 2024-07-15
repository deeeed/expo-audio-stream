// playground/src/component/audio-visualizer/audio-visualizer.tsx
import { Button } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import React, { useCallback, useEffect, useReducer, useRef } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { Text } from "react-native-paper";
import { useSharedValue } from "react-native-reanimated";

import {
  calculateReferenceLinePosition,
  getStyles,
  syncTranslateX,
  updateActivePoints,
} from "./audio-visualiser.helpers";
import {
  AudioVisualizerProps,
  AudioVisualizerState,
  CandleData,
  UpdateActivePointsResult,
} from "./autio-visualizer.types";
import CanvasContainer from "./canvas-container";
import { GestureHandler } from "./gesture-handler";
import { DataPoint } from "../../../../src";

export type AudioVisualiserAction = {
  type: "UPDATE_STATE";
  state: Partial<AudioVisualizerState>;
};

const initialState: AudioVisualizerState = {
  ready: false,
  triggerUpdate: 0,
  canvasWidth: 0,
  currentTime: undefined,
  hasInitialized: false,
  selectedCandle: null,
  selectedIndex: -1,
};

const reducer = (
  state: AudioVisualizerState,
  action: AudioVisualiserAction,
): AudioVisualizerState => {
  switch (action.type) {
    case "UPDATE_STATE":
      return { ...state, ...action.state };
    default:
      return state;
  }
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioData,
  canvasHeight = 100,
  candleWidth = 3,
  currentTime: fullCurrentTime,
  candleSpace = 2,
  playing = false,
  mode = "static",
  showRuler = false,
  showDottedLine = true,
  showSilence = false,
  onSeekEnd,
  onSelection,
}) => {
  const translateX = useSharedValue(0);
  const [state, dispatch] = useReducer(reducer, initialState);

  const { logger } = useLogger("AudioVisualizer");

  const {
    ready,
    triggerUpdate,
    canvasWidth,
    currentTime,
    hasInitialized,
    selectedCandle,
    selectedIndex,
  } = state;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    logger.log(`Layout width: ${width}`);
    dispatch({ type: "UPDATE_STATE", state: { canvasWidth: width } });
  }, []);

  const referenceLineX = calculateReferenceLinePosition({
    canvasWidth,
    referenceLinePosition: mode === "live" ? "RIGHT" : "MIDDLE",
  });

  const styles = getStyles({
    screenWidth: canvasWidth,
    canvasWidth,
    referenceLineX,
  });

  const maxDisplayedItems = Math.ceil(
    canvasWidth / (candleWidth + candleSpace),
  );
  const maxTranslateX =
    audioData.dataPoints.length * (candleWidth + candleSpace);
  const paddingLeft = canvasWidth / 2;
  const totalCandleWidth =
    audioData.dataPoints.length * (candleWidth + candleSpace);

  const updateActivePointsResult = useRef<UpdateActivePointsResult>({
    activePoints: [],
    range: { start: 0, end: 0, startVisibleIndex: 0, endVisibleIndex: 0 },
    lastUpdatedTranslateX: 0,
  });

  // Initialize activePoints
  useEffect(() => {
    if (maxDisplayedItems === 0 || hasInitialized) return;

    if (mode !== "live") {
      const initialActivePoints: CandleData[] = new Array(
        maxDisplayedItems * 3,
      ).fill({
        id: -1,
        amplitude: 0,
        visible: false,
      });
      updateActivePointsResult.current = {
        ...updateActivePointsResult.current,
        activePoints: initialActivePoints,
      };
    }
    dispatch({
      type: "UPDATE_STATE",
      state: { hasInitialized: true, ready: true },
    });
  }, [maxDisplayedItems, mode, hasInitialized]);

  useEffect(() => {
    if (!hasInitialized) return;

    const {
      activePoints: updatedActivePoints,
      range: updatedRange,
      lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
    } = updateActivePoints({
      x: translateX.value,
      context: {
        dataPoints: audioData.dataPoints,
        maxDisplayedItems,
        activePoints: updateActivePointsResult.current.activePoints,
        range: updateActivePointsResult.current.range,
        referenceLineX,
        mode,
        candleWidth,
        candleSpace,
      },
    });
    logger.log(`Updated active points: ${updatedActivePoints.length}`);
    updateActivePointsResult.current = {
      activePoints: updatedActivePoints,
      range: updatedRange,
      lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
    };
    dispatch({
      type: "UPDATE_STATE",
      state: { triggerUpdate: triggerUpdate + 1 },
    });
  }, [
    audioData.dataPoints,
    dispatch,
    hasInitialized,
    maxDisplayedItems,
    canvasWidth,
  ]);

  useEffect(() => {
    if (fullCurrentTime) {
      dispatch({
        type: "UPDATE_STATE",
        state: { currentTime: fullCurrentTime },
      });
    }
  }, [fullCurrentTime]);

  useEffect(() => {
    if (playing && currentTime && audioData.durationMs) {
      logger.log(`Syncing translateX... currentTime=${currentTime}`);
      const newTranslateX = syncTranslateX({
        currentTime,
        durationMs: audioData.durationMs,
        maxTranslateX,
        minTranslateX: 0,
        translateX,
      });

      // Check if the translateX has moved by at least half of canvasWidth
      const movedDistance = Math.abs(
        newTranslateX - updateActivePointsResult.current.lastUpdatedTranslateX,
      );

      // Define a threshold to update active points
      const translateXThreshold = canvasWidth;

      logger.log(
        `Moved distance: ${movedDistance} newTranslateX: ${newTranslateX} Threshold: ${translateXThreshold}`,
      );
      if (movedDistance >= translateXThreshold) {
        const {
          activePoints: updatedActivePoints,
          range: updatedRange,
          lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
        } = updateActivePoints({
          x: newTranslateX,
          context: {
            dataPoints: audioData.dataPoints,
            maxDisplayedItems,
            activePoints: updateActivePointsResult.current.activePoints,
            referenceLineX,
            mode,
            range: updateActivePointsResult.current.range,
            candleWidth,
            candleSpace,
          },
        });
        updateActivePointsResult.current = {
          activePoints: updatedActivePoints,
          range: updatedRange,
          lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
        };

        dispatch({
          type: "UPDATE_STATE",
          state: { triggerUpdate: triggerUpdate + 1 },
        });
      }
    }
  }, [playing, currentTime, audioData.durationMs, canvasWidth, translateX]);

  const handleDragEnd = useCallback(
    ({ newTranslateX }: { newTranslateX: number }) => {
      if (audioData.durationMs && onSeekEnd) {
        const allowedTranslateX = maxTranslateX;
        const progressRatio = -newTranslateX / allowedTranslateX;
        const newTime = progressRatio * audioData.durationMs;
        onSeekEnd(newTime);
      }

      const {
        activePoints: updatedActivePoints,
        range: updatedRange,
        lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
      } = updateActivePoints({
        x: newTranslateX,
        context: {
          dataPoints: audioData.dataPoints,
          maxDisplayedItems,
          activePoints: updateActivePointsResult.current.activePoints,
          referenceLineX,
          mode,
          range: updateActivePointsResult.current.range,
          candleWidth,
          candleSpace,
        },
      });
      updateActivePointsResult.current = {
        activePoints: updatedActivePoints,
        range: updatedRange,
        lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
      };

      dispatch({
        type: "UPDATE_STATE",
        state: { triggerUpdate: triggerUpdate + 1 },
      });
    },
    [onSeekEnd, audioData.dataPoints, maxDisplayedItems],
  );

  const handleSelectionChange = useCallback(
    (candle: DataPoint) => {
      const currentIndex = audioData.dataPoints.findIndex(
        (point) => point.id === candle.id,
      );

      dispatch({
        type: "UPDATE_STATE",
        state: {
          selectedCandle: { ...candle, visible: true },
          selectedIndex: currentIndex,
        },
      });

      onSelection?.({ dataPoint: candle, index: currentIndex });
    },
    [onSelection, dispatch],
  );

  const handlePrevNextSelection = useCallback(
    (direction: "prev" | "next") => {
      logger.debug(
        `[${direction}] Selected index: ${selectedIndex}`,
        selectedCandle,
      );
      if (!selectedCandle) return;

      if (selectedIndex === -1) return;

      const newIndex =
        direction === "prev" ? selectedIndex - 1 : selectedIndex + 1;

      logger.debug(`New index: ${newIndex}`);
      if (newIndex < 0 || newIndex >= audioData.dataPoints.length) return;

      const newSelectedCandle = audioData.dataPoints[newIndex];
      dispatch({
        type: "UPDATE_STATE",
        state: {
          selectedCandle: { ...newSelectedCandle, visible: true },
          selectedIndex: newIndex,
        },
      });

      logger.debug(`New selected candle: ${newSelectedCandle.id}`, onSelection);
      onSelection?.({ dataPoint: newSelectedCandle, index: newIndex });
    },
    [
      audioData.dataPoints,
      selectedIndex,
      selectedCandle,
      onSelection,
      dispatch,
    ],
  );

  const handleReset = useCallback(() => {
    translateX.value = 0;
    const {
      activePoints: updatedActivePoints,
      range: updatedRange,
      lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
    } = updateActivePoints({
      x: translateX.value,
      context: {
        dataPoints: audioData.dataPoints,
        maxDisplayedItems,
        activePoints: updateActivePointsResult.current.activePoints,
        range: updateActivePointsResult.current.range,
        referenceLineX,
        mode,
        candleWidth,
        candleSpace,
      },
    });
    logger.log(`Updated active points: ${updatedActivePoints.length}`);
    updateActivePointsResult.current = {
      activePoints: updatedActivePoints,
      range: updatedRange,
      lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
    };
    dispatch({
      type: "UPDATE_STATE",
      state: {
        selectedCandle: null,
        selectedIndex: -1,
        triggerUpdate: Date.now(),
      },
    });
  }, [dispatch]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <GestureHandler
        playing={playing}
        mode={mode}
        translateX={translateX}
        maxTranslateX={maxTranslateX}
        onDragEnd={handleDragEnd}
      >
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <Button
                onPress={() => handlePrevNextSelection("prev")}
                disabled={selectedCandle === null}
              >
                Prev
              </Button>
              <Button
                onPress={() => handlePrevNextSelection("next")}
                disabled={selectedCandle === null}
              >
                Next
              </Button>
              {selectedCandle && (
                <Text>{`${selectedIndex + 1} / ${audioData.dataPoints.length}`}</Text>
              )}
            </View>
            <Button onPress={handleReset}>Reset</Button>
          </View>
          {ready && (
            <>
              <CanvasContainer
                canvasHeight={canvasHeight}
                candleWidth={candleWidth}
                candleSpace={candleSpace}
                showDottedLine={showDottedLine}
                showRuler={showRuler}
                showSilence={showSilence}
                mode={mode}
                onSelection={handleSelectionChange}
                startIndex={updateActivePointsResult.current.range.start}
                translateX={translateX}
                activePoints={updateActivePointsResult.current.activePoints}
                maxDisplayedItems={maxDisplayedItems}
                paddingLeft={paddingLeft}
                totalCandleWidth={totalCandleWidth}
                canvasWidth={canvasWidth}
                selectedCandle={selectedCandle}
                durationMs={audioData.durationMs}
                minAmplitude={audioData.amplitudeRange.min}
                maxAmplitude={audioData.amplitudeRange.max}
                containerStyle={styles.canvasContainer}
              />
              <View style={styles.referenceLine} />
            </>
          )}
        </View>
      </GestureHandler>
    </View>
  );
};
