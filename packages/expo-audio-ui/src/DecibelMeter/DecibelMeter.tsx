import { Line, Rect, SkFont, Text } from '@shopify/react-native-skia'
import React, { useMemo } from 'react'

import { DEFAULT_LABEL_COLOR, DEFAULT_TICK_COLOR, isWeb } from '../constants'

export interface DecibelMeterTheme {
    backgroundColor?: string
    meterWidth?: number
    colors: {
        low: string
        mid: string
        high: string
    }
    ruler?: {
        show: boolean
        tickColor?: string
        labelColor?: string
        tickHeight?: number
        labelFontSize?: number
        interval?: number // Interval for tick marks in dB
    }
}

const DEFAULT_THEME: DecibelMeterTheme = {
    backgroundColor: '#333333',
    meterWidth: 20,
    colors: {
        low: '#34C759',
        mid: '#FFD60A',
        high: '#FF453A',
    },
    ruler: {
        show: true,
        tickColor: DEFAULT_TICK_COLOR,
        labelColor: DEFAULT_LABEL_COLOR,
        tickHeight: 5,
        labelFontSize: 10,
        interval: 10,
    },
}

export interface DecibelMeterProps {
    db: number
    width: number
    height: number
    length?: number
    minDb?: number
    maxDb?: number
    orientation?: 'vertical' | 'horizontal'
    theme?: Partial<DecibelMeterTheme>
    font?: SkFont | null
}

export function DecibelMeter({
    db,
    width,
    height,
    minDb = -60,
    maxDb = 0,
    orientation = 'vertical',
    theme,
    font,
}: DecibelMeterProps) {
    const mergedTheme = useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme])

    const getColor = (value: number) => {
        if (value <= 0.6) return mergedTheme.colors.low
        if (value <= 0.8) return mergedTheme.colors.mid
        return mergedTheme.colors.high
    }

    const meterWidth = mergedTheme.meterWidth ?? DEFAULT_THEME.meterWidth ?? 20
    const isVertical = orientation === 'vertical'

    // Calculate fill height/width based on current db value directly
    const currentProgress =
        (Math.max(minDb, Math.min(maxDb, db)) - minDb) / (maxDb - minDb)
    const fillSize = isVertical
        ? height * currentProgress
        : width * currentProgress

    const renderRuler = () => {
        if (!mergedTheme.ruler?.show || !font) return null

        interface RulerConfig {
            interval: number
            tickHeight: number
            labelFontSize: number
            tickColor: string
            labelColor: string
        }

        const rulerConfig: RulerConfig = {
            interval:
                mergedTheme.ruler?.interval ?? DEFAULT_THEME.ruler!.interval!,
            tickHeight:
                mergedTheme.ruler?.tickHeight ??
                DEFAULT_THEME.ruler!.tickHeight!,
            labelFontSize:
                mergedTheme.ruler?.labelFontSize ??
                DEFAULT_THEME.ruler!.labelFontSize!,
            tickColor:
                mergedTheme.ruler?.tickColor ?? DEFAULT_THEME.ruler!.tickColor!,
            labelColor:
                mergedTheme.ruler?.labelColor ??
                DEFAULT_THEME.ruler!.labelColor!,
        }

        const numTicks = Math.floor((maxDb - minDb) / rulerConfig.interval) + 1
        const isVertical = orientation === 'vertical'
        const meterWidth =
            mergedTheme.meterWidth ?? DEFAULT_THEME.meterWidth ?? 20
        const spacing = isVertical
            ? (height - meterWidth) / (numTicks - 1)
            : (width - meterWidth) / (numTicks - 1)

        return Array.from({ length: numTicks }).map((_, i) => {
            const value = maxDb - i * rulerConfig.interval
            const label = `${value}`
            const labelWidth = !isWeb ? font.measureText(label).width : 20

            const position = i * spacing
            const tickStart = meterWidth
            const { tickHeight, labelFontSize } = rulerConfig
            const tickKey = `tick-${numTicks - i}`

            return (
                <React.Fragment key={tickKey}>
                    <Line
                        p1={{
                            x: isVertical ? tickStart : position,
                            y: isVertical ? position : tickStart,
                        }}
                        p2={{
                            x: isVertical ? tickStart + tickHeight : position,
                            y: isVertical ? position : tickStart + tickHeight,
                        }}
                        color={rulerConfig.tickColor}
                        strokeWidth={1}
                    />
                    <Text
                        text={label}
                        x={
                            isVertical
                                ? tickStart + tickHeight + 5
                                : position - labelWidth / 2
                        }
                        y={
                            isVertical
                                ? position + labelFontSize / 3
                                : tickStart + tickHeight + labelFontSize + 2
                        }
                        color={rulerConfig.labelColor}
                        font={font}
                    />
                </React.Fragment>
            )
        })
    }

    return (
        <>
            {/* Background */}
            <Rect
                x={0}
                y={0}
                width={isVertical ? meterWidth : width}
                height={isVertical ? height : meterWidth}
                color={mergedTheme.backgroundColor}
            />
            {/* Fill */}
            <Rect
                x={0}
                y={isVertical ? height - fillSize : 0}
                width={isVertical ? meterWidth : fillSize}
                height={isVertical ? fillSize : meterWidth}
                color={getColor(currentProgress)}
            />
            {renderRuler()}
        </>
    )
}
