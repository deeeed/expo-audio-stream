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
} from "./autio-visualizer.types";
import CanvasContainer from "./canvas-container";
import { GestureHandler } from "./gesture-handler";

export type AudioVisualiserAction =
  | { type: "SET_ACTIVE_POINTS"; payload: CandleData[] }
  | {
      type: "SET_RANGE";
      payload: {
        start: number;
        end: number;
        startVisibleIndex: number;
        endVisibleIndex: number;
      };
    }
  | { type: "SET_READY"; payload: boolean }
  | { type: "SET_TRIGGER_UPDATE"; payload: number }
  | { type: "SET_CANVAS_WIDTH"; payload: number }
  | { type: "SET_CURRENT_TIME"; payload: number }
  | { type: "SET_HAS_INITIALIZED"; payload: boolean }
  | { type: "SET_SELECTED_CANDLE"; payload: CandleData | null }
  | { type: "BATCH_UPDATE"; payload: Partial<AudioVisualizerState> };

const initialState: AudioVisualizerState = {
  activePoints: [],
  range: { start: 0, end: 0, startVisibleIndex: 0, endVisibleIndex: 0 },
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
    case "SET_ACTIVE_POINTS":
      return { ...state, activePoints: action.payload };
    case "SET_RANGE":
      return { ...state, range: action.payload };
    case "SET_READY":
      return { ...state, ready: action.payload };
    case "SET_TRIGGER_UPDATE":
      return { ...state, triggerUpdate: action.payload };
    case "SET_CANVAS_WIDTH":
      return { ...state, canvasWidth: action.payload };
    case "SET_CURRENT_TIME":
      return { ...state, currentTime: action.payload };
    case "SET_HAS_INITIALIZED":
      return { ...state, hasInitialized: action.payload };
    case "SET_SELECTED_CANDLE":
      return { ...state, selectedCandle: action.payload };
    case "BATCH_UPDATE":
      return { ...state, ...action.payload };
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

  const lastUpdatedTranslateX = useRef<number>(0);
  const { logger } = useLogger("AudioVisualizer");

  const {
    activePoints,
    range,
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
    dispatch({ type: "SET_CANVAS_WIDTH", payload: width });
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

  const activePointsRef = useRef([]);

  // Initialize activePoints
  useEffect(() => {
    logger.log("useEffect - Initialize activePoints");
    logger.log("maxDisplayedItems:", maxDisplayedItems);
    logger.log("hasInitialized:", hasInitialized);

    if (maxDisplayedItems === 0 || hasInitialized) return;

    if (mode !== "live") {
      // fill initialize activePoints with maxDisplayedItems * 3
      const initialActivePoints: CandleData[] = new Array(
        maxDisplayedItems * 3,
      ).fill({
        id: -1,
        amplitude: 0,
        visible: false,
      });
      dispatch({ type: "SET_ACTIVE_POINTS", payload: initialActivePoints });
    }
    dispatch({ type: "SET_HAS_INITIALIZED", payload: true });
  }, [maxDisplayedItems, mode, hasInitialized]);

  useEffect(() => {
    if (!hasInitialized) return;

    logger.log(
      `Updating active points... dataPoints.length: ${audioData.dataPoints.length} activePointsRef.length: ${activePointsRef.current.length}`,
      audioData.dataPoints,
    );
    const { activePoints: updatedActivePoints } = updateActivePoints({
      x: translateX.value,
      context: {
        dataPoints: audioData.dataPoints,
        maxDisplayedItems,
        activePoints: activePointsRef.current,
        ready,
        referenceLineX,
        mode,
        range,
        candleWidth,
        candleSpace,
        lastUpdatedTranslateX: lastUpdatedTranslateX.current,
      },
      dispatch,
    });
    logger.log(`Updated active points: ${updatedActivePoints.length}`);
    activePointsRef.current = updatedActivePoints;
  }, [audioData.dataPoints, hasInitialized, maxDisplayedItems, canvasWidth]);

  useEffect(() => {
    if (fullCurrentTime) {
      dispatch({ type: "SET_CURRENT_TIME", payload: fullCurrentTime });
    }
  }, [fullCurrentTime]);

  useEffect(() => {
    if (playing && currentTime && audioData.durationMs) {
      logger.log(`Syncing translateX... currentTime=${currentTime}`);
      syncTranslateX({
        currentTime,
        durationMs: audioData.durationMs,
        maxTranslateX,
        minTranslateX: 0,
        translateX,
      });
    }
  }, [playing, currentTime, audioData.durationMs, canvasWidth, translateX]);

  const handleDragEnd = ({ newTranslateX }: { newTranslateX: number }) => {
    if (audioData.durationMs && onSeekEnd) {
      const allowedTranslateX = maxTranslateX;
      const progressRatio = -newTranslateX / allowedTranslateX;
      const newTime = (progressRatio * audioData.durationMs) / 1000;
      onSeekEnd(newTime);
    }

    updateActivePoints({
      x: newTranslateX,
      context: {
        dataPoints: audioData.dataPoints,
        maxDisplayedItems,
        activePoints,
        referenceLineX,
        mode,
        range,
        candleWidth,
        candleSpace,
        lastUpdatedTranslateX: lastUpdatedTranslateX.current,
        ready,
      },
      dispatch,
    });
  };

  const handleReset = () => {
    updateActivePoints({
      x: 0,
      context: {
        dataPoints: audioData.dataPoints,
        maxDisplayedItems,
        activePoints,
        referenceLineX,
        mode,
        range,
        candleWidth,
        candleSpace,
        lastUpdatedTranslateX: lastUpdatedTranslateX.current,
        ready,
      },
      dispatch,
    });
    runOnUI(() => {
      translateX.value = 0;
    })();
    onSeekEnd?.(0);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Text style={styles.text}>dataPoints: {audioData.dataPoints.length}</Text>
      <Text>activePoints: {activePoints.length}</Text>
      <Text style={styles.text}>canvasHeight: {canvasHeight}</Text>
      <Text style={styles.text}>canvasWidth: {canvasWidth}</Text>
      <Text style={styles.text}>maxDisplayedItems: {maxDisplayedItems}</Text>
      <Text style={styles.text}>
        pointsPerSecond: {audioData.pointsPerSecond}
      </Text>
      <Text style={styles.text}>Range: {JSON.stringify(range)}</Text>
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
                currentTime={currentTime}
                canvasHeight={canvasHeight}
                candleWidth={candleWidth}
                candleSpace={candleSpace}
                showDottedLine={showDottedLine}
                showRuler={showRuler}
                mode={mode}
                playing={playing}
                dispatch={dispatch}
                startIndex={range.start}
                translateX={translateX}
                activePoints={activePoints}
                lastUpdatedTranslateX={lastUpdatedTranslateX.current}
                maxDisplayedItems={maxDisplayedItems}
                maxTranslateX={maxTranslateX}
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
