// playground/src/component/audio-visualizer/audio-visualizer.tsx
import { Button } from "@siteed/design-system";
import { useLogger } from "@siteed/react-native-logger";
import React, { useCallback, useEffect, useReducer, useRef } from "react";
import { LayoutChangeEvent, View } from "react-native";
import { Text } from "react-native-paper";
import { runOnUI, useSharedValue } from "react-native-reanimated";

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
  onSeekEnd,
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
        const newTime = (progressRatio * audioData.durationMs) / 1000;
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

  const handleReset = useCallback(() => {
    const {
      activePoints: updatedActivePoints,
      range: updatedRange,
      lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
    } = updateActivePoints({
      x: 0,
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

    runOnUI(() => {
      translateX.value = 0;
    })();
    onSeekEnd?.(0);

    dispatch({
      type: "UPDATE_STATE",
      state: { triggerUpdate: triggerUpdate + 1 },
    });
  }, [onSeekEnd, audioData.dataPoints, maxDisplayedItems]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Text style={styles.text}>dataPoints: {audioData.dataPoints.length}</Text>
      <Text>
        activePoints: {updateActivePointsResult.current.activePoints.length}
      </Text>
      <Text style={styles.text}>canvasHeight: {canvasHeight}</Text>
      <Text style={styles.text}>canvasWidth: {canvasWidth}</Text>
      <Text style={styles.text}>maxDisplayedItems: {maxDisplayedItems}</Text>
      <Text style={styles.text}>
        pointsPerSecond: {audioData.pointsPerSecond}
      </Text>
      <Text style={styles.text}>
        Range: {JSON.stringify(updateActivePointsResult.current.range)}
      </Text>
      <Text style={styles.text}>
        Amplitude: [ {audioData.amplitudeRange.min},
        {audioData.amplitudeRange.max} ]
      </Text>
      <Text>triggerUpdate: {triggerUpdate}</Text>
      <Text>canvasHeight: {canvasHeight}</Text>
      <Text>{JSON.stringify(selectedCandle, null, 2)}</Text>
      <Text style={styles.text}>currentTime: {currentTime}</Text>
      <Text style={styles.text}>durationMs: {audioData.durationMs}</Text>
      <Text style={styles.text}>TranslateX: {translateX.value}</Text>
      <Button onPress={handleReset}>Reset</Button>
      <GestureHandler
        playing={playing}
        mode={mode}
        translateX={translateX}
        maxTranslateX={maxTranslateX}
        onDragEnd={handleDragEnd}
      >
        <View>
          {ready && (
            <>
              <CanvasContainer
                canvasHeight={canvasHeight}
                candleWidth={candleWidth}
                candleSpace={candleSpace}
                showDottedLine={showDottedLine}
                showRuler={showRuler}
                mode={mode}
                dispatch={dispatch}
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
