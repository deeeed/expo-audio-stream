import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Svg, { Line, Rect } from "react-native-svg";

import { TimeRuler } from "./time-ruler";
import { Bar, WaveformProps } from "./waveform.types";
import {
  amplitudeToDecibels,
  calculateMinMaxAverage,
  generateBars,
  getRulerInterval,
} from "./waveform.utils";
import { convertPCMToFloat32 } from "../../../../src";

const DEFAULT_CANDLE_WIDTH = 3;
const DEFAULT_CANDLE_SPACING = 2;
const waveHeaderSize = 44; // size to skip for header or invalid data
const startMargin = 0; // Margin to ensure 0 mark is visible

const isValidNumber = (value: number) => !isNaN(value) && isFinite(value);

export const WaveForm: React.FC<WaveformProps> = ({
  buffer,
  bitDepth = 16,
  sampleRate = 16000,
  channels = 1,
  visualizationType = "candlestick",
  currentTime = 0,
  zoomLevel = 1,
  waveformHeight = 100,
  candlesPerRulerInterval = 10,
  candleStickSpacing = DEFAULT_CANDLE_SPACING,
  candleStickWidth = DEFAULT_CANDLE_WIDTH,
  showRuler = false,
  candleColor = "#029CFD",
  mode = "static",
  debug = false,
}) => {
  const [bars, setBars] = useState<Bar[]>([]);
  const [parentWidth, setParentWidth] = useState<number>(0);
  const [minAvg, setMinAvg] = useState<number>(Infinity);
  const [maxAvg, setMaxAvg] = useState<number>(-Infinity);

  const maxDuration =
    mode === "live"
      ? 30
      : (buffer.byteLength - waveHeaderSize) /
      (sampleRate * channels * (bitDepth / 8));

  const scrollViewRef = useRef<ScrollView>(null);

  const { duration, data, rulerInterval, samplesPerCandle, totalCandles, totalSvgWidth, currentSampleIndex, currentSampleValue, currentDecibels, currentXPosition } = useMemo(() => {
    const duration = (buffer.byteLength - waveHeaderSize) / (sampleRate * channels * (bitDepth / 8));
    const rawData = buffer.slice(waveHeaderSize);
    const data = convertPCMToFloat32(rawData, bitDepth);
    const rulerInterval = getRulerInterval(zoomLevel, duration, parentWidth, mode);

    const samplesPerCandle = mode === "preview"
      ? Math.ceil(data.length / parentWidth)
      : (sampleRate * rulerInterval) / candlesPerRulerInterval;

    const totalCandles = mode === "preview"
      ? Math.floor(parentWidth / (candleStickWidth + candleStickSpacing))
      : Math.ceil((duration * sampleRate) / samplesPerCandle);

    const candlestickTotalWidth = candleStickWidth + candleStickSpacing;
    const totalSvgWidth = mode === "preview"
      ? parentWidth
      : totalCandles * candlestickTotalWidth + startMargin;

    const currentSampleIndex = Math.floor(currentTime * sampleRate);
    const currentSampleValue = data[currentSampleIndex] || 0;
    const currentDecibels = amplitudeToDecibels(currentSampleValue, bitDepth);

    const currentXPosition = duration > 0 && totalSvgWidth > 0
      ? (currentTime / duration) * (totalSvgWidth - startMargin) + startMargin
      : 0;

    return {
      duration,
      data,
      rulerInterval,
      samplesPerCandle,
      totalCandles,
      totalSvgWidth,
      currentSampleIndex,
      currentSampleValue,
      currentDecibels,
      currentXPosition,
    };
  }, [buffer, bitDepth, sampleRate, channels, parentWidth, zoomLevel, mode, currentTime, candleStickWidth, candleStickSpacing]);

  useEffect(() => {
    if (mode === "live") {
      const interval = setInterval(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 1000); // Update interval for live mode

      return () => clearInterval(interval);
    }
  }, [mode]);

  const updateBars = useCallback(() => {
    if (parentWidth > 0) {
      const [minAverage, maxAverage] = calculateMinMaxAverage({
        data,
        totalCandles,
        samplesPerCandle,
      });
      setMinAvg(minAverage);
      setMaxAvg(maxAverage);

      const newBars = generateBars({
        data,
        totalCandles,
        samplesPerCandle,
        minAverage,
        maxAverage,
        waveformHeight,
        parentWidth: totalSvgWidth,
      });
      setBars(newBars);

      if (scrollViewRef.current && mode === "static") {
        scrollViewRef.current.scrollTo({ x: 0, animated: false });
      }
    }
  }, [data, totalCandles, samplesPerCandle, waveformHeight, totalSvgWidth, parentWidth, mode]);

  useEffect(() => {
    updateBars();
  }, [updateBars]);

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
          <Text>candlesPerRulerInterval: {candlesPerRulerInterval}</Text>
          <Text>Total Candles: {totalCandles}</Text>
          <Text>Samples Per Candle: {samplesPerCandle}</Text>
          <Text>Interval: {rulerInterval}</Text>
          <Text>Bars: {bars.length}</Text>
          <Text>Min Avg: {minAvg}</Text>
          <Text>Max Avg: {maxAvg}</Text>
          <Text>Zoom Level: {zoomLevel}</Text>
          <Text>Current Time: {currentTime.toFixed(2)}s</Text>
          <Text>Current Decibels: {currentDecibels.toFixed(2)} dB</Text>
        </View>
      )}
      <ScrollView
        horizontal
        ref={scrollViewRef}
        style={styles.waveformContainer}
      >
        {parentWidth > 0 && (
          <Svg height={waveformHeight} width={totalSvgWidth}>
            {showRuler && mode !== "live" && (
              <TimeRuler
                duration={duration}
                width={totalSvgWidth}
                labelColor="white"
                startMargin={startMargin}
                interval={rulerInterval}
              />
            )}
            {bars.map((bar, index) => {
               if (isValidNumber(bar.x) && isValidNumber(bar.y) && isValidNumber(bar.height)) {
                return (
                  <Rect
                    key={index}
                    x={bar.x + startMargin}
                    y={bar.y}
                    width={candleStickWidth}
                    height={bar.height}
                    fill={candleColor}
                  />
                );
              }
              return null; // Skip rendering if any value is NaN
            })}
            {/* Vertical line for current playback position */}
            {mode !== "live" && (
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
