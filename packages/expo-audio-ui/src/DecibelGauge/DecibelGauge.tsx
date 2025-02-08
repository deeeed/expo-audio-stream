import { Path, SkFont, Text as SkiaText } from '@shopify/react-native-skia'
import React, { useCallback, useEffect, useMemo } from 'react'
import {
    useDerivedValue,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated'

import { isWeb } from '../constants'

interface DecibelGaugeTheme {
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
    const mergedTheme = useMemo(() => {
        const defaulted = { ...DEFAULT_THEME, ...theme }
        return {
            ...defaulted,
            size: defaulted.size ?? DEFAULT_THEME.size,
        } satisfies DecibelGaugeTheme
    }, [theme])
    const { minDb, maxDb, size } = mergedTheme as Required<
        Pick<DecibelGaugeTheme, 'size'>
    > &
        DecibelGaugeTheme

    const animatedDb = useSharedValue(minDb)
    const animatedProgress = useDerivedValue(() => {
        const normalizedValue = Math.max(
            minDb,
            Math.min(maxDb, animatedDb.value)
        )
        return (normalizedValue - minDb) / (maxDb - minDb)
    })

    useEffect(() => {
        animatedDb.value = withSpring(db)
    }, [db])

    const centerX = size.width / 2
    const centerY = size.height / 2
    const radius = size.radius ?? Math.min(size.width, size.height) / 4

    const gradientPath = useMemo(() => {
        const startX = centerX - radius
        const endX = centerX + radius

        return `M ${startX} ${centerY} A ${radius} ${radius} 0 0 1 ${endX} ${centerY}`
    }, [centerX, centerY, radius])

    const getColor = useCallback(
        (value: number) => {
            if (value <= 0.6) return mergedTheme.colors.low
            if (value <= 0.8) return mergedTheme.colors.mid
            return mergedTheme.colors.high
        },
        [mergedTheme.colors]
    )

    const animatedColor = useDerivedValue(() => {
        return getColor(animatedProgress.value)
    })

    return (
        <>
            <Path
                path={gradientPath}
                strokeWidth={mergedTheme.strokeWidth}
                style="stroke"
                color={mergedTheme.backgroundColor}
            />
            <Path
                path={gradientPath}
                strokeWidth={mergedTheme.strokeWidth}
                style="stroke"
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
