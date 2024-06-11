import { Line as SkiaLine, Text, useFont } from "@shopify/react-native-skia";
import React from "react";
import { Platform } from "react-native";

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

export const SkiaTimeRuler: React.FC<TimeRulerProps> = ({
  duration,
  width,
  interval = 1,
  tickHeight = 10,
  paddingLeft = 0,
  tickColor,
  labelColor,
  labelFontSize = 10,
  labelFormatter = (value) =>
    value < 10 ? value.toFixed(1) : Math.round(value).toString(), // Format to 1 decimal place
  startMargin = 0,
}) => {
  const font = useFont(
    require("../../../assets/Roboto/Roboto-Regular.ttf"),
    labelFontSize,
  );
  const finalTickColor = tickColor || "white";
  const finalLabelColor = labelColor || "white";
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
        if (Platform.OS !== "web") {
          labelWidth = font?.measureText(label)?.width || 0;
        }
        return (
          <React.Fragment key={i}>
            <SkiaLine
              p1={{ x: xPosition, y: 0 }}
              p2={{ x: xPosition, y: tickHeight }}
              color={finalTickColor}
              strokeWidth={1}
            />
            {i % labelInterval === 0 && (
              <Text
                text={labelFormatter(i * interval)}
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
