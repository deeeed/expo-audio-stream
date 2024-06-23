import {
  Canvas,
  Group,
  Path,
  SkPath,
  Skia,
  useTouchHandler,
} from "@shopify/react-native-skia";
import { Button } from "@siteed/design-system";
import { AudioAnalysisData, DataPoint } from "@siteed/expo-audio-stream";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import {
  SharedValue,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import AnimatedCandle, { ACTIVE_SPEECH_COLOR } from "./animated-candle";
import { SkiaTimeRuler } from "./skia-time-ruler";

const getStyles = (screenWidth: number, canvasWidth: number) => {
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
      borderWidth: 1,
    },
    centeredLine: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: screenWidth / 2,
      width: 2,
      backgroundColor: "red",
    },
    canvas: {},
    text: {
      // color: "white"
    },
  });
};

interface AudioVisualizerProps {
  audioData: AudioAnalysisData;
  currentTime?: number;
  canvasHeight?: number;
  candleWidth?: number;
  candleSpace?: number;
  showDottedLine?: boolean;
  showRuler?: boolean;
  mode?: "static" | "live" | "scaled";
  playing?: boolean;
  onSeekEnd?: (newTime: number) => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioData,
  canvasHeight = 100,
  candleWidth = 5,
  currentTime: fullCurrentTime,
  candleSpace = 2,
  playing = false,
  mode = "static",
  showRuler = false,
  showDottedLine = false,
  onSeekEnd,
}) => {
  const [screenWidth, setScreenWidth] = useState(0);
  const translateX = useSharedValue(0);
  const [currentTime, setCurrentTime] = useState<number | undefined>(
    fullCurrentTime,
  );
  const rulerOptions = {
    tickHeight: 10,
    labelFontSize: 10,
  };
  const rulerHeight = rulerOptions.tickHeight + rulerOptions.labelFontSize;

  const drawDottedLine = useCallback((): SkPath => {
    if (!screenWidth) return Skia.Path.Make();
    const path = Skia.Path.Make();
    const dashLength = 3;
    const gapLength = 5;
    const baseline = canvasHeight / 2;

    for (let x = 0; x < canvasWidth; x += dashLength + gapLength) {
      path.moveTo(x, baseline);
      path.lineTo(x + dashLength, baseline);
    }

    return path;
  }, [canvasHeight, screenWidth]);

  const [dataPoints, setDataPoints] = useState<DataPoint[]>(
    audioData.dataPoints,
  );

  const totalCandleWidth = dataPoints.length * (candleWidth + candleSpace);
  const paddingLeft = screenWidth / 2; // padding from left side
  const canvasWidth = screenWidth;

  const [selectedCandle, setSelectedCandle] = useState<DataPoint | null>(null);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setScreenWidth(width);
  }, []);
  const [startIndex, setStartIndex] = useState(0);
  const [ready, setReady] = useState(false);

  const styles = React.useMemo(
    () => getStyles(screenWidth, canvasWidth),
    [screenWidth, canvasWidth],
  );

  const maxTranslateX = totalCandleWidth;

  const maxDisplayedItems = Math.ceil(
    screenWidth / (candleWidth + candleSpace),
  );

  const [activePoints, setActivePoints] = useState<
    { amplitude: number; id: number; visible: boolean }[]
  >([]);

  const lastUpdatedTranslateX = useRef<number>(0);
  const updateActivePoints = (x: number) => {
    if (x === lastUpdatedTranslateX.current && activePoints.length > 0) return; // Exit if x has not changed
    lastUpdatedTranslateX.current = x;

    if (mode === "live") {
      const totalItems = dataPoints.length;
      // Only display items on the left of the middle line
      const liveMaxDisplayedItems = Math.floor(maxDisplayedItems / 2);
      const startIndex = Math.max(0, totalItems - liveMaxDisplayedItems);
      console.log(
        `\nupdateActivePoints (live) startIndex=${startIndex}, totalItems=${totalItems}, maxDisplayedItems=${maxDisplayedItems}`,
      );

      const updatedPoints = [];
      for (let i = 0; i < liveMaxDisplayedItems; i++) {
        const itemIndex = startIndex + i;
        if (itemIndex < totalItems) {
          updatedPoints.push({
            id: itemIndex,
            amplitude: dataPoints[itemIndex].amplitude,
            visible: true,
          });
        }
      }

      console.log(`Updated points (live):`, updatedPoints);
      setActivePoints(updatedPoints);
      setStartIndex(0);
    } else {
      const translateX = Math.abs(x);
      console.log(`x: ${x} translateX: ${translateX}`);
      const hiddenItemsLeft = Math.floor(
        translateX / (candleWidth + candleSpace),
      );
      const startIndex = Math.max(0, hiddenItemsLeft - maxDisplayedItems);
      console.log(
        `hiddenItemsLeft: ${hiddenItemsLeft}  maxDisplayedItems=${maxDisplayedItems} dataPoints.length=${dataPoints.length} `,
      );

      const loopTo = maxDisplayedItems * 3;
      for (let i = 0; i < loopTo; i++) {
        const itemIndex = startIndex + i;
        if (itemIndex < dataPoints.length) {
          activePoints[i] = {
            id: itemIndex,
            amplitude: dataPoints[itemIndex].amplitude,
            visible:
              itemIndex >= hiddenItemsLeft &&
              itemIndex < hiddenItemsLeft + maxDisplayedItems,
          };
        } else {
          activePoints[i] = {
            id: -1,
            amplitude: 0,
            visible: false,
          };
        }
        // console.log(`itemIndex: ${itemIndex} `, activePoints[i]);
      }

      console.log(`Updated points:`, activePoints);
      setActivePoints(activePoints);
      setStartIndex(startIndex);
    }
    setReady(true);
  };

  useEffect(() => {
    if (maxDisplayedItems === 0) return;
    updateActivePoints(translateX.value);
  }, [dataPoints, maxDisplayedItems]);

  useEffect(() => {
    setDataPoints(audioData.dataPoints);
  }, [audioData.dataPoints]);

  useEffect(() => {
    setCurrentTime(fullCurrentTime);
  }, [fullCurrentTime]);

  const gesture = Gesture.Pan()
    .onChange((e) => {
      if (playing || mode === "live") {
        return;
      }

      const newTranslateX = translateX.value + e.changeX;
      const clampedTranslateX = Math.max(
        -maxTranslateX,
        Math.min(0, newTranslateX),
      ); // Clamping within bounds
      translateX.value = clampedTranslateX;
    })
    .onEnd((_e) => {
      if (mode === "live") return;

      // console.log(`Velocity: ${e.velocityX} newValue: ${translateX.value}`);
      // Reverse ratio to get currentTime
      console.log(`onEnd: translateX: ${translateX.value} `, _e);
      runOnJS(updateActivePoints)(translateX.value);

      if (audioData.durationMs && onSeekEnd) {
        const allowedTranslateX = maxTranslateX;
        const progressRatio = -translateX.value / allowedTranslateX;
        const newTime = (progressRatio * audioData.durationMs) / 1000;
        console.log(`NewTime: ${newTime}`);
        runOnJS(onSeekEnd)(newTime);
      }
    });

  const SYNC_DURATION = 100; // Duration for the timing animation

  const syncTranslateX = ({
    currentTime,
    durationMs,
    maxTranslateX,
    minTranslateX,
    translateX,
  }: {
    currentTime: number;
    durationMs: number;
    maxTranslateX: number;
    minTranslateX: number;
    translateX: SharedValue<number>;
  }) => {
    if (durationMs) {
      const currentTimeInMs = currentTime * 1000; // Convert currentTime to milliseconds
      const progressRatio = currentTimeInMs / durationMs;
      const allowedTranslateX = maxTranslateX;
      const x = -(progressRatio * allowedTranslateX);
      console.log(
        `SyncTranslateX: ${x} progressRatio: ${progressRatio} allowedTranslateX: ${allowedTranslateX} other=${-maxTranslateX + screenWidth}`,
      );
      translateX.value = withTiming(x, { duration: SYNC_DURATION }); // Smooth transition
    }
  };

  useEffect(() => {
    if (currentTime && audioData.durationMs) {
      syncTranslateX({
        currentTime,
        durationMs: audioData.durationMs,
        maxTranslateX,
        minTranslateX: 0,
        translateX,
      });
    }
  }, [currentTime, audioData.durationMs, canvasWidth, screenWidth, translateX]);

  const touchHandler = useTouchHandler({
    onEnd: (event) => {
      // disable in live mode
      if (mode === "live") return;
      const { x } = event;
      // const adjustedX = x - paddingLeft + translateX.value;
      const paddingValue = 10;
      const plotStart = screenWidth / 2 + translateX.value + paddingValue;
      const plotEnd = plotStart + totalCandleWidth;

      console.log(
        `TouchEnd: ${x} screenWidth=${screenWidth} [${plotStart}, ${plotEnd}]`,
      );
      if (x < plotStart || x > plotEnd) {
        console.log(`NOT WITHIN RANGE ${x} [${plotStart}, ${plotEnd}]`);
        return;
      }

      const adjustedX = x - plotStart;
      const index = Math.floor(adjustedX / (candleWidth + candleSpace));
      const candle = audioData.dataPoints[index];
      console.log(`Index: ${index} AdjustedX: ${adjustedX}`, candle);

      // recompute active speech and silence detection
      setSelectedCandle(candle);

      const RMS_THRESHOLD = 0.02;
      const ZCR_THRESHOLD = 0.1;
      const rms = candle.features?.rms ?? 0;
      const zcr = candle.features?.zcr ?? 0;
      const dynActiveSpeech = rms > RMS_THRESHOLD && zcr > ZCR_THRESHOLD;
      console.log(
        `Detected=${candle.activeSpeech} ActiveSpeech: ${dynActiveSpeech} rms=${rms} > (${RMS_THRESHOLD}) --> ${rms > RMS_THRESHOLD} zcr=${zcr} > (${ZCR_THRESHOLD}) --> ${zcr > ZCR_THRESHOLD}`,
      );
      if (!audioData.durationMs) return;

      // Compute time from index
      const canvasSize = plotEnd - plotStart; // --> 100%
      const position = adjustedX / canvasSize; // --> x%
      const time = position * audioData.durationMs;
      console.log(
        `Time: ${time} Index: ${index} totalCandles=${audioData.dataPoints.length}`,
      );
    },
  });

  const groupTransform = useDerivedValue(() => {
    return [{ translateX: translateX.value }];
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Text style={styles.text}>dataPoints: {dataPoints.length}</Text>
      <Text>activePoints: {activePoints.length}</Text>
      <Text style={styles.text}>canvasHeight: {canvasHeight}</Text>
      <Text style={styles.text}>canvasWidth: {canvasWidth}</Text>
      <Text style={styles.text}>maxDisplayedItems: {maxDisplayedItems}</Text>
      <Text style={styles.text}>
        pointsPerSecond: {audioData.pointsPerSecond}
      </Text>
      <Text style={styles.text}>
        Amplitude: [ {audioData.amplitudeRange.min},
        {audioData.amplitudeRange.max} ]{" "}
      </Text>
      <Text>canvasHeight: {canvasHeight}</Text>
      <Text>{JSON.stringify(selectedCandle, null, 2)}</Text>
      <Text style={styles.text}>currentTime: {currentTime}</Text>
      <Text style={styles.text}>durationMs: {audioData.durationMs}</Text>
      <Text style={styles.text}>TranslateX: {translateX.value}</Text>
      <Button
        onPress={() => {
          translateX.value = 0;
          updateActivePoints(0);
        }}
      >
        Reset
      </Button>
      <GestureDetector gesture={gesture}>
        <View style={styles.canvasContainer}>
          <Canvas
            style={{
              height: canvasHeight,
              width: screenWidth,
              borderWidth: 1,
            }}
            onTouch={touchHandler}
          >
            <Group transform={groupTransform}>
              {showRuler && (
                <SkiaTimeRuler
                  duration={audioData.durationMs ?? 0 / 1000}
                  paddingLeft={paddingLeft}
                  width={totalCandleWidth}
                />
              )}
              {ready &&
                activePoints.map((candle, index) => {
                  // let scaledAmplitude = candle.amplitude * canvasHeight;
                  // audioData.amplitudeRange.max ==> canvasHeight
                  // candle.amplitude ==> scaledAmplitude
                  // const scalingFactor = 3; // randomly chosen to better display the candle
                  const scaledAmplitude =
                    (candle.amplitude * (canvasHeight - 10)) /
                    audioData.amplitudeRange.max;
                  // console.log(`scaledAmplitude: ${scaledAmplitude}`);
                  if (candle.amplitude === 0) return null;

                  let delta =
                    Math.ceil(maxDisplayedItems / 2) *
                    (candleWidth + candleSpace);
                  if (mode === "live") {
                    delta = 0;
                  }
                  const x =
                    (candleWidth + candleSpace) * index +
                    startIndex * (candleWidth + candleSpace) +
                    // paddingLeft +
                    delta;

                  // console.log(
                  //   `Index: ${index} x=${x} amplitude: ${scaledAmplitude}`,
                  //   candle,
                  // );

                  return (
                    <AnimatedCandle
                      key={"ca" + index}
                      color={ACTIVE_SPEECH_COLOR}
                      animated={false}
                      startY={canvasHeight / 2}
                      height={scaledAmplitude}
                      width={candleWidth}
                      // x={index * (candleWidth + candleSpace) + paddingLeft}
                      x={x}
                      y={canvasHeight / 2 - scaledAmplitude / 2}
                    />
                  );
                })}
            </Group>
            {showDottedLine && (
              <Path
                path={drawDottedLine()}
                color="grey"
                style="stroke"
                strokeWidth={1}
              />
            )}
          </Canvas>
          <View
            style={[
              {
                position: "absolute",
                top: showRuler ? 10 + canvasHeight / 6 : canvasHeight / 6,
                left: screenWidth / 2,
                width: 2,
                height: canvasHeight / 1.5,
                backgroundColor: "red",
              },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
};
