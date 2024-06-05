import React, { useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from "react-native";
import { RadioButton, Text } from "react-native-paper";
import Svg, { Line, Polyline, Rect } from "react-native-svg";

import { convertPCMToFloat32 } from "../../../../src";
import { useWaveformVisualization } from "../../hooks/useWaveFormVisualization";
import { TimeRuler } from "./time-ruler";
import { WaveformProps } from "./waveform.types";
import { amplitudeToDecibels } from "./waveform.utils";

const DEFAULT_CANDLE_WIDTH = 3;
const DEFAULT_CANDLE_SPACING = 2;
const waveHeaderSize = 44; // size to skip for header or invalid data
const startMargin = 0; // Margin to ensure 0 mark is visible
const RULER_HEIGHT = 10; // Height of the ruler

const MAX_POINTS = 100; // Maximum number of points or bars in preview mode

const isValidNumber = (value: number) => !isNaN(value) && isFinite(value);

export const WaveForm: React.FC<WaveformProps> = ({
  buffer,
  bitDepth = 16,
  sampleRate = 16000,
  channels = 1,
  visualizationType = "candlestick",
  currentTime = 0,
  waveformHeight = 100,
  pointsPerSecond = 5, // Default points per second
  candleStickSpacing = DEFAULT_CANDLE_SPACING,
  candleStickWidth = DEFAULT_CANDLE_WIDTH,
  showRuler = false,
  candleColor = "#029CFD",
  mode = "static",
  debug = false,
}) => {
  const marginTop = showRuler ? RULER_HEIGHT : 0;
  const marginBottom = 0;
  const effectiveHeight = waveformHeight - marginTop - marginBottom;

  const [parentWidth, setParentWidth] = useState<number>(0);
  const [activeVisualizationType, setVisualizationType] = useState<"line" | "candlestick">(visualizationType);
  const [activeMode, setMode] = useState<"static" | "live" | "preview">(mode);

  const scrollViewRef = useRef<ScrollView>(null);

  const computedPointsPerSecond = useMemo(() => {
    if (activeMode === "preview") {
      return MAX_POINTS / ((buffer.byteLength - waveHeaderSize) / (sampleRate * channels * (bitDepth / 8)));
    }
    if (pointsPerSecond) return pointsPerSecond;
    const duration = (buffer.byteLength - waveHeaderSize) / (sampleRate * channels * (bitDepth / 8));
    const totalPoints = parentWidth / (candleStickWidth + candleStickSpacing);
    return totalPoints / duration;
  }, [buffer, bitDepth, sampleRate, channels, parentWidth, candleStickWidth, candleStickSpacing, pointsPerSecond, activeMode]);

  const totalSvgWidth = useMemo(() => {
    if (activeMode === "preview" || activeMode === "live") {
      return parentWidth;
    }
    const duration = (buffer.byteLength - waveHeaderSize) / (sampleRate * channels * (bitDepth / 8));
    return Math.ceil(duration * computedPointsPerSecond * (candleStickWidth + candleStickSpacing));
  }, [activeMode, parentWidth, buffer, bitDepth, sampleRate, channels, computedPointsPerSecond, candleStickWidth, candleStickSpacing]);


  const data = useMemo(() => {
    const rawData = buffer.slice(waveHeaderSize);
    return convertPCMToFloat32(rawData, bitDepth);
  }, [buffer, bitDepth]);


  const duration = useMemo(() => {
    return (buffer.byteLength - waveHeaderSize) / (sampleRate * channels * (bitDepth / 8));
  }, [buffer, sampleRate, channels, bitDepth]);
 

  const currentXPosition = useMemo(() => {
    return duration > 0 && totalSvgWidth > 0
      ? (currentTime / duration) * (totalSvgWidth - startMargin) + startMargin
      : 0;
  }, [duration, totalSvgWidth, currentTime]);
  
  useEffect(() => {
    if (activeMode === "live") {
      const interval = setInterval(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 1000); // Update interval for live mode

      return () => clearInterval(interval);
    }
  }, [activeMode]);

  const { bars, points } = useWaveformVisualization({
    data,
    pointsPerSecond: computedPointsPerSecond,
    waveformHeight: effectiveHeight,
    totalWidth: totalSvgWidth,
    candleStickSpacing,
    candleStickWidth,
    duration,
    visualizationType: activeVisualizationType,
    mode: activeMode,
    sampleRate,
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setParentWidth(width);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {debug && (
        <View>
          <Text>Buffer: {buffer.byteLength}</Text>
          <Text>Data: {data.length}</Text>
          <Text>Duration: {duration}</Text>
          <Text>SampleRate: {sampleRate}</Text>
          <Text>bitDepth: {bitDepth}</Text>
          <Text>Channels: {channels}</Text>
          <Text>PointsPerSeconds: {computedPointsPerSecond}</Text>
          <Text>CanvasWidth: {totalSvgWidth}</Text>
          {/* <Text>Points: {points?.length} {JSON.stringify(points?.slice(-3))}</Text>
          <Text>Bars: {bars?.length} {JSON.stringify(bars?.slice(-3))}</Text> */}
          <View style={{ flexDirection: "column", gap: 10 }}>
            <RadioButton.Group
              onValueChange={(value) =>
                setVisualizationType(value as "line" | "candlestick")
              }
              value={activeVisualizationType}
            >
              {["line", "candlestick"].map((type) => (
                <RadioButton.Item key={type} label={type} value={type} />
              ))}
            </RadioButton.Group>
            <RadioButton.Group
              onValueChange={(value) => setMode(value as "static" | "live" | "preview")}
              value={activeMode}
            >
              {["static", "live", "preview"].map((mode) => (
                <RadioButton.Item key={mode} label={mode} value={mode} />
              ))}
            </RadioButton.Group>
          </View>
        </View>
      )}
      <ScrollView
        horizontal
        ref={scrollViewRef}
        style={styles.waveformContainer}
      >
        {parentWidth > 0 && (
          <View style={[{ backgroundColor: 'black', paddingHorizontal: 10 }]}>
            <Svg height={waveformHeight} width={totalSvgWidth}>
              {showRuler && activeMode !== "live" && (
                <TimeRuler
                  duration={duration}
                  width={totalSvgWidth}
                  labelColor="white"
                  startMargin={startMargin}
                />
              )}
              {/* Dotted line in the middle of the display area */}
              <Line
                x1="0"
                y1={effectiveHeight / 2 + marginTop}
                x2={totalSvgWidth}
                y2={effectiveHeight / 2 + marginTop}
                stroke="white"
                strokeWidth="2"
                strokeDasharray="5, 5"
              />
              {activeVisualizationType === "candlestick" &&
                bars?.map((bar, index) => {
                  if (isValidNumber(bar.x) && isValidNumber(bar.y) && isValidNumber(bar.height)) {
                    const rectX = activeMode === "preview" ? index * (parentWidth / MAX_POINTS) : bar.x + startMargin; // Adjusting for proper order
                    const rectY = bar.y + marginTop;
                    const rectWidth = activeMode === "preview" ? parentWidth / MAX_POINTS : candleStickWidth; // Adjust width in preview mode
                    const rectHeight = bar.height;

                    console.log(`Rendering Bar ${index}: x=${rectX}, y=${rectY}, width=${rectWidth}, height=${rectHeight}`);

                    return (
                      <Rect
                        key={index}
                        x={rectX}
                        y={rectY}
                        width={rectWidth}
                        height={rectHeight}
                        fill={candleColor}
                      />
                    );
                  }
                  return null; // Skip rendering if any value is NaN
                })}
              {activeVisualizationType === "line" && (
                <Polyline
                  points={points?.map((p, index) => `${activeMode === "preview" ? index * (parentWidth / MAX_POINTS) : p.x + startMargin},${p.y + marginTop}`).join(" ")} // Adjust for marginTop
                  fill="none"
                  stroke={candleColor}
                  strokeWidth="2"
                />
              )}
              {activeMode !== "live" && (
                <Line
                  x1={currentXPosition}
                  y1="0"
                  x2={currentXPosition}
                  y2={waveformHeight}
                  stroke="red"
                  strokeWidth="2"
                />
              )}
            </Svg>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
  },
  waveformContainer: {
    backgroundColor: "black",
    borderRadius: 10,
  },
});
