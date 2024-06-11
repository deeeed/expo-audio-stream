import {
  Canvas,
  Path,
  SkPath,
  Skia,
  useTouchHandler,
} from "@shopify/react-native-skia";
import { Button } from "@siteed/design-system";
import { set } from "lodash";
import React, { useCallback, useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text } from "react-native-paper";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import AnimatedCandle, {
  ACTIVE_SPEECH_COLOR,
  INACTIVE_SPEECH_COLOR,
} from "./animated-candle";
import { SkiaTimeRuler } from "./skia-time-ruler";
import {
  AudioAnalysisData,
  DataPoint,
} from "../../../../src/useAudioRecording";

interface AudioVisualizerProps {
  audioData: AudioAnalysisData;
  currentTime?: number;
  canvasHeight: number;
  candleWidth: number;
  candleSpace: number;
  showDottedLine?: boolean;
  playing?: boolean;
  onSeekEnd?: (newTime: number) => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioData,
  canvasHeight,
  candleWidth,
  currentTime: fullCurrentTime,
  candleSpace,
  playing = false,
  showDottedLine = false,
  onSeekEnd,
}) => {
  const [width, setWidth] = useState<number>(0);
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
    if (!width) return Skia.Path.Make();
    const path = Skia.Path.Make();
    const dashLength = 3;
    const gapLength = 5;
    const baseline = canvasHeight / 2;

    for (let x = 0; x < canvasWidth; x += dashLength + gapLength) {
      path.moveTo(x, baseline);
      path.lineTo(x + dashLength, baseline);
    }

    return path;
  }, [canvasHeight, width]);

  const totalCandleWidth =
    audioData.dataPoints.length * (candleWidth + candleSpace);
  const paddingLeft = width / 2; // padding from left side
  const paddingRight = width / 2; // padding from right side
  // const canvasWidth = Math.min(totalCandleWidth, width);
  const canvasWidth = totalCandleWidth + paddingLeft + paddingRight;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setWidth(width);
  }, []);

  const maxTranslateX = Math.max(0, -(canvasWidth - width));
  const minTranslateX = -Math.max(0, canvasWidth - width);

  const gesture = Gesture.Pan()
    .onChange((e) => {
      if (playing || canvasWidth <= width) {
        return;
      }

      const newTranslateX = translateX.value + e.changeX;
      // console.log(`NewTranslateX: ${newTranslateX}`);
      if (newTranslateX > 0) {
        translateX.value = 0;
      } else if (newTranslateX < minTranslateX) {
        translateX.value = minTranslateX;
      } else {
        translateX.value = newTranslateX;
      }
    })
    .onEnd((_e) => {
      // console.log(`Velocity: ${e.velocityX} newValue: ${translateX.value}`);
      // Reverse ratio to get currentTime
      if (audioData.durationMs) {
        const allowedTranslateX = Math.abs(maxTranslateX - minTranslateX);
        const progressRatio = -translateX.value / allowedTranslateX;
        const newTime = (progressRatio * audioData.durationMs) / 1000;
        // console.log(`NewTime: ${newTime}`);
        onSeekEnd?.(newTime);
      }
    });

  useEffect(() => {
    setCurrentTime(fullCurrentTime);
  }, [fullCurrentTime]);

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
      const allowedTranslateX = Math.abs(maxTranslateX - minTranslateX);
      const x = -(progressRatio * allowedTranslateX);
      translateX.value = withTiming(x, { duration: SYNC_DURATION }); // Smooth transition
    }
  };

  useEffect(() => {
    if (currentTime && audioData.durationMs) {
      syncTranslateX({
        currentTime,
        durationMs: audioData.durationMs,
        maxTranslateX,
        minTranslateX,
        translateX,
      });
    }
  }, [currentTime, audioData.durationMs, canvasWidth, width, translateX]);

  const animatedStyle = useAnimatedStyle(() => {
    // console.log(`TranslateX: ${translateX.value}`);
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const touchHandler = useTouchHandler({
    onEnd: (event) => {
      const { x } = event;
      // const adjustedX = x - paddingLeft + translateX.value;
      const plotStart = width / 2;
      const plotEnd = plotStart + totalCandleWidth;

      if (x < plotStart || x > plotEnd) {
        console.log(`NOT WITHIN RANGE ${x} [${plotStart}, ${plotEnd}]`);
        return;
      }

      const adjustedX = x - plotStart;
      const index = Math.floor(adjustedX / (candleWidth + candleSpace));
      const candle = audioData.dataPoints[index];
      console.log(`Index: ${index} AdjustedX: ${adjustedX}`, candle);

      // recompute active speech and silence detection

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

  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);

  useEffect(() => {
    setDataPoints(audioData.dataPoints);
  }, [audioData.dataPoints]);

  // useDerivedValue(() => {
  //   // Allow full width hidden on both sides
  //   const maxVisibleCandles = Math.floor(width / (candleWidth + candleSpace));

  //   const extraCandles = Math.floor(
  //     Math.abs(translateX.value) / (candleWidth + candleSpace),
  //   );

  //   let startIndex = 0;

  //   const visibleCandles =
  //     maxVisibleCandles / 2 + translateX.value * (candleWidth + candleSpace);

  //   console.log(
  //     `candle=${candleSpace + candleWidth} translateX=${translateX.value} visibleCandles=${visibleCandles} extraCandles: ${extraCandles} maxVisibleCandles: ${maxVisibleCandles}`,
  //   );
  //   // compute how many candles left and right of the middle line
  //   const leftSideCandles =
  //     Math.abs(translateX.value) / (candleWidth + candleSpace);
  //   const rightSideCandles = audioData.dataPoints.length - leftSideCandles;

  //   const hiddenLeft = Math.max(
  //     0,
  //     leftSideCandles - Math.floor(maxVisibleCandles / 2),
  //   );
  //   const hiddenRight = Math.max(
  //     0,
  //     rightSideCandles - Math.floor(maxVisibleCandles / 2),
  //   );

  //   console.log(
  //     `LeftSideCandles: ${leftSideCandles} RightSideCandles: ${rightSideCandles} hiddenLeft: ${hiddenLeft} hiddenRight: ${hiddenRight}`,
  //   );

  //   if (leftSideCandles > maxVisibleCandles / 2) {
  //     console.log(
  //       `AAAAAAAAA: ${extraCandles} MaxVisibleCandles: ${maxVisibleCandles} length=${audioData.dataPoints.length}`,
  //     );
  //     startIndex = Math.floor(leftSideCandles - maxVisibleCandles / 2);
  //   }

  //   // Never load more than available
  //   const endIndex = Math.max(
  //     audioData.dataPoints.length,
  //     startIndex + maxVisibleCandles,
  //   );

  //   console.log(`startIndex: ${startIndex} endIndex: ${endIndex}`);

  //   const candles = audioData.dataPoints.slice(startIndex, endIndex);
  //   setDataPoints(candles);
  // });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Text style={styles.text}>candles: {audioData.dataPoints.length}</Text>
      <Text style={styles.text}>canvasHeight: {canvasHeight}</Text>
      <Text style={styles.text}>canvasWidth: {canvasWidth}</Text>
      <Text style={styles.text}>
        pointsPerSecond: {audioData.pointsPerSecond}
      </Text>
      <Text style={styles.text}>
        Amplitude: [ {audioData.amplitudeRange.min},
        {audioData.amplitudeRange.max} ]{" "}
      </Text>
      <Text>canvasHeight: {canvasHeight}</Text>
      <Text style={styles.text}>currentTime: {currentTime}</Text>
      <Text style={styles.text}>durationMs: {audioData.durationMs}</Text>
      <Text style={styles.text}>TranslateX: {translateX.value}</Text>
      <Button
        onPress={() => {
          translateX.value = 0;
        }}
      >
        Reset
      </Button>
      <GestureDetector gesture={gesture}>
        <View style={styles.canvasContainer}>
          <Animated.View style={[animatedStyle]}>
            <Canvas
              style={{
                ...styles.canvas,
                height: canvasHeight,
                width: canvasWidth,
              }}
              onTouch={touchHandler}
            >
              {/* <SkiaTimeRuler
                duration={audioData.durationMs ?? 0 / 1000}
                paddingLeft={paddingLeft}
                width={totalCandleWidth}
              /> */}

              {dataPoints.map((candle, index) => {
                // let scaledAmplitude = candle.amplitude * canvasHeight;
                const scaledAmplitude =
                  (candle.amplitude * 100) / audioData.amplitudeRange.max;
                return (
                  <AnimatedCandle
                    key={"ca" + index}
                    color={
                      candle.activeSpeech
                        ? ACTIVE_SPEECH_COLOR
                        : INACTIVE_SPEECH_COLOR
                    }
                    startY={canvasHeight / 2}
                    height={scaledAmplitude}
                    width={candleWidth}
                    x={index * (candleWidth + candleSpace) + paddingLeft}
                    y={canvasHeight / 2 - scaledAmplitude / 2}
                  />
                );
              })}

              {showDottedLine && (
                <Path
                  path={drawDottedLine()}
                  color="grey"
                  style="stroke"
                  strokeWidth={1}
                />
              )}
            </Canvas>
          </Animated.View>
          <View
            style={[
              {
                position: "absolute",
                top: 10 + canvasHeight / 4,
                left: width / 2 + 10,
                // bottom: 0,
                width: 2,
                height: canvasHeight / 2,
                backgroundColor: "red",
              },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 10,
    // justifyContent: "center",
  },
  text: {
    // color: "white"
  },
  canvasContainer: {
    backgroundColor: "#292a2d",
    padding: 10,
  },
  canvas: {
    height: 300,
    borderWidth: 1,
    borderColor: "green",
    // backgroundColor: 'lightblue',
    marginBottom: 20,
  },
});
