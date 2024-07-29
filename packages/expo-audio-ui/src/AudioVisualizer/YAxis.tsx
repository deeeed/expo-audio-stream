import { Line as SkiaLine, Text, useFont } from '@shopify/react-native-skia'
import type { AmplitudeAlgorithm } from '@siteed/expo-audio-stream'
import React from 'react'
import { DEFAULT_LABEL_COLOR, DEFAULT_TICK_COLOR } from '../constants'

export interface YAxisProps {
    canvasHeight: number
    canvasWidth: number
    minAmplitude: number
    maxAmplitude: number
    padding: number
    algorithm?: AmplitudeAlgorithm
    tickInterval?: number // Interval for tick marks and labels
    tickLength?: number // Length of the tick marks
    tickColor?: string // Color of the tick marks
    labelColor?: string // Color of the labels
    labelFontSize?: number // Font size of the labels
    labelFormatter?: (value: number) => string // Formatter function for labels
}

const formatLabel = (value: number): string => {
    return value.toFixed(2)
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const defaultFont = require('./Roboto-Regular.ttf')

export const YAxis: React.FC<YAxisProps> = ({
    canvasHeight,
    minAmplitude,
    maxAmplitude,
    padding,
    tickInterval = 0.1, // Default tick interval
    tickLength = 10,
    tickColor,
    labelColor,
    labelFontSize = 10,
    labelFormatter = formatLabel,
}) => {
    const font = useFont(defaultFont, labelFontSize)
    const finalTickColor = tickColor ?? DEFAULT_TICK_COLOR
    const finalLabelColor = labelColor ?? DEFAULT_LABEL_COLOR
    const numTicks = Math.floor((maxAmplitude - minAmplitude) / tickInterval)
    const tickSpacing = (canvasHeight - 2 * padding) / numTicks

    if (canvasHeight <= 0 || numTicks <= 0) return null // Early return if height or numTicks is invalid

    return (
        <>
            {Array.from({ length: numTicks + 1 }).map((_, i) => {
                const yPosition = canvasHeight - padding - i * tickSpacing
                const label = labelFormatter(minAmplitude + i * tickInterval)

                return (
                    <React.Fragment key={i}>
                        <SkiaLine
                            p1={{ x: padding, y: yPosition }}
                            p2={{ x: padding + tickLength, y: yPosition }}
                            color={finalTickColor}
                            strokeWidth={1}
                        />
                        <Text
                            text={label}
                            x={padding + tickLength + 5}
                            color={finalLabelColor}
                            y={yPosition + labelFontSize / 2}
                            font={font}
                        />
                    </React.Fragment>
                )
            })}
        </>
    )
}
