import { Line as SkiaLine, Text, useFont } from "@shopify/react-native-skia";
import React from "react";
import { DEFAULT_LABEL_COLOR, DEFAULT_TICK_COLOR, isWeb } from "../constants";

export interface TimeRulerProps {
  duration: number;
  width: number;
  paddingLeft?: number;
  interval?: number; // Interval for tick marks and labels in seconds
  tickHeight?: number; // Height of the tick marks
  tickColor?: string; // Color of the tick marks
  labelColor?: string; // Color of the labels
  labelFontSize?: number; // Font size of the labels
  labelFormatter?: (value: number) => string; // Formatter function for labels
  startMargin?: number; // Margin at the start to ensure 0 mark is visible
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  } else {
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
};

import defaultFont from "./Roboto-Regular.ttf";

export const SkiaTimeRuler: React.FC<TimeRulerProps> = ({
  duration,
  width,
  interval = 1,
  tickHeight = 10,
  paddingLeft = 0,
  tickColor,
  labelColor,
  labelFontSize = 10,
  labelFormatter = formatTime, // Use the new formatter function
  startMargin = 0,
}) => {
  const font = useFont(
    defaultFont,
    labelFontSize,
  );
  const finalTickColor = tickColor ?? DEFAULT_TICK_COLOR;
  const finalLabelColor = labelColor ?? DEFAULT_LABEL_COLOR;
  const numTicks = Math.floor(duration / 1000 / interval);
  const minLabelSpacing = 50; // Minimum spacing in pixels between labels

  if (width <= 0 || numTicks <= 0) return null; // Early return if width or numTicks is invalid

  const tickSpacing = (width - startMargin) / numTicks;
  const labelInterval = Math.ceil(minLabelSpacing / tickSpacing);

  return (
    <>
      {Array.from({ length: numTicks + 1 }).map((_, i) => {
        const xPosition =
          startMargin + (i * (width - startMargin)) / numTicks + paddingLeft;
        const label = labelFormatter(i * interval);
        let labelWidth = 0;
        if (!isWeb) {
          labelWidth = font?.measureText(label)?.width || 0;
        }
        const shouldDrawLabel = i % labelInterval === 0;
        const shouldDrawTick =
          shouldDrawLabel || tickSpacing >= minLabelSpacing;

        return (
          <React.Fragment key={i}>
            {shouldDrawTick && (
              <SkiaLine
                p1={{ x: xPosition, y: 0 }}
                p2={{ x: xPosition, y: tickHeight }}
                color={finalTickColor}
                strokeWidth={1}
              />
            )}
            {shouldDrawLabel && (
              <Text
                text={label}
                x={xPosition - labelWidth / 2}
                color={finalLabelColor}
                y={tickHeight + labelFontSize}
                font={font}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
