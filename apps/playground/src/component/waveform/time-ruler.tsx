import { useTheme } from '@siteed/design-system'
import React from 'react'
import { Line, Text as SvgText } from 'react-native-svg'

export interface TimeRulerProps {
    duration: number
    width: number
    interval?: number // Interval for tick marks and labels in seconds
    tickHeight?: number // Height of the tick marks
    tickColor?: string // Color of the tick marks
    labelColor?: string // Color of the labels
    labelFontSize?: number // Font size of the labels
    labelFormatter?: (value: number) => string // Formatter function for labels
    startMargin?: number // Margin at the start to ensure 0 mark is visible
}

export const TimeRuler = ({
    duration,
    width,
    interval = 1,
    tickHeight = 10,
    tickColor,
    labelColor,
    labelFontSize = 10,
    labelFormatter = (value) =>
        value < 10 ? value.toFixed(1) : Math.round(value).toString(), // Format to 1 decimal place
    startMargin = 0,
}: TimeRulerProps) => {
    const { colors } = useTheme()

    const finalTickColor = tickColor || colors.text
    const finalLabelColor = labelColor || colors.text
    const numTicks = Math.floor(duration / interval)
    const minLabelSpacing = 50 // Minimum spacing in pixels between labels

    if (width <= 0 || numTicks <= 0) return null // Early return if width or numTicks is invalid

    const tickSpacing = (width - startMargin) / numTicks
    const labelInterval = Math.ceil(minLabelSpacing / tickSpacing)

    return (
        <>
            {Array.from({ length: numTicks + 1 }).map((_, i) => {
                const xPosition =
                    startMargin + (i * (width - startMargin)) / numTicks
                return (
                    <React.Fragment key={i}>
                        <Line
                            x1={xPosition}
                            y1="0"
                            x2={xPosition}
                            y2={tickHeight}
                            stroke={finalTickColor}
                            strokeWidth="1"
                        />
                        {i % labelInterval === 0 && (
                            <SvgText
                                x={xPosition}
                                y={tickHeight + labelFontSize}
                                fill={finalLabelColor}
                                fontSize={labelFontSize}
                                textAnchor="middle"
                            >
                                {labelFormatter(i * interval)}
                            </SvgText>
                        )}
                    </React.Fragment>
                )
            })}
        </>
    )
}
