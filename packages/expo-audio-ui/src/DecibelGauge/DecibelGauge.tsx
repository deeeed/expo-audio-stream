import { Path, SkFont, Text as SkiaText } from '@shopify/react-native-skia'
import React, { useCallback, useEffect, useMemo } from 'react'
import {
    useDerivedValue,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated'

import { isWeb } from '../constants'

export interface DecibelGaugeTheme {
    minDb: number
    maxDb: number
    backgroundColor?: string
    strokeWidth?: number
    size?: {
        width: number
        height: number
        radius?: number
    }
    colors: {
        low: string
        mid: string
        high: string
    }
    text?: {
        color?: string
        size?: number
        xOffset?: number // Horizontal offset for web
        yOffset?: number // Vertical offset from center
    }
}

const DEFAULT_THEME: DecibelGaugeTheme = {
    minDb: -60,
    maxDb: 0,
    backgroundColor: '#333333',
    strokeWidth: 10,
    size: {
        width: 200,
        height: 120,
        radius: 30,
    },
    colors: {
        low: '#34C759',
        mid: '#FFD60A',
        high: '#FF453A',
    },
    text: {
        color: '#FFFFFF',
        size: 12,
    },
}

interface DecibelGaugeProps {
    db: number
    theme?: Partial<DecibelGaugeTheme>
    showValue?: boolean
    font?: SkFont
}

export function DecibelGauge({
    db,
    theme,
    showValue = true,
    font,
}: DecibelGaugeProps) {
    const mergedTheme = useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme])
    const { minDb, maxDb } = mergedTheme

    const animatedDb = useSharedValue(minDb)

    // Mark as worklet
    const getColor = useCallback(
        (value: number) => {
            'worklet'
            if (value <= 0.6) return mergedTheme.colors.low
            if (value <= 0.8) return mergedTheme.colors.mid
            return mergedTheme.colors.high
        },
        [mergedTheme.colors]
    )

    // Convert to worklet
    const animatedProgress = useDerivedValue(() => {
        'worklet'
        const normalizedValue = Math.max(
            minDb,
            Math.min(maxDb, animatedDb.value)
        )
        return (normalizedValue - minDb) / (maxDb - minDb)
    }, [minDb, maxDb])

    const animatedColor = useDerivedValue(() => {
        'worklet'
        return getColor(animatedProgress.value)
    }, [getColor])

    useEffect(() => {
        animatedDb.value = withSpring(db)
    }, [db, animatedDb])

    const centerX = mergedTheme.size!.width / 2
    const centerY = mergedTheme.size!.height / 2
    const radius =
        mergedTheme.size!.radius ??
        Math.min(mergedTheme.size!.width, mergedTheme.size!.height) / 4

    const gradientPath = useMemo(() => {
        const startX = centerX - radius
        const endX = centerX + radius

        return `M ${startX} ${centerY} A ${radius} ${radius} 0 0 1 ${endX} ${centerY}`
    }, [centerX, centerY, radius])

    return (
        <>
            <Path
                path={gradientPath}
                strokeWidth={mergedTheme.strokeWidth}
                color={mergedTheme.backgroundColor}
            />
            <Path
                path={gradientPath}
                strokeWidth={mergedTheme.strokeWidth}
                color={animatedColor}
                start={0}
                end={animatedProgress}
            />
            {showValue && font && (
                <SkiaText
                    x={
                        centerX -
                        (!isWeb
                            ? font.measureText(
                                  `${Math.round(animatedDb.value)}dB`
                              ).width / 2
                            : (mergedTheme.text?.xOffset ?? 15))
                    }
                    y={centerY + (mergedTheme.text?.yOffset ?? 5)}
                    text={`${Math.round(animatedDb.value)}dB`}
                    font={font}
                    color={mergedTheme.text?.color ?? '#FFFFFF'}
                />
            )}
        </>
    )
}
