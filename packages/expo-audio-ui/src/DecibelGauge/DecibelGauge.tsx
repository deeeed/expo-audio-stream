import { Path } from '@shopify/react-native-skia'
import React, { useEffect, useMemo } from 'react'
import {
    useDerivedValue,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated'

interface DecibelGaugeTheme {
    minDb?: number
    maxDb?: number
    backgroundColor?: string
    strokeWidth?: number
    colors: {
        low: string
        mid: string
        high: string
    }
}

const DEFAULT_THEME: DecibelGaugeTheme = {
    minDb: -60,
    maxDb: 0,
    backgroundColor: '#333333',
    strokeWidth: 10,
    colors: {
        low: '#34C759',
        mid: '#FFD60A',
        high: '#FF453A',
    },
}

interface DecibelGaugeProps {
    db: number
    theme?: Partial<DecibelGaugeTheme>
}

export function DecibelGauge({ db, theme }: DecibelGaugeProps) {
    const mergedTheme = { ...DEFAULT_THEME, ...theme }
    const { minDb, maxDb } = mergedTheme

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

    const gradientPath = useMemo(() => {
        const radius = 30
        const centerX = 100
        const centerY = 60
        const startX = centerX - radius
        const endX = centerX + radius

        return `M ${startX} ${centerY} A ${radius} ${radius} 0 0 1 ${endX} ${centerY}`
    }, [])

    const getColor = (value: number) => {
        if (value <= 0.6) return mergedTheme.colors.low
        if (value <= 0.8) return mergedTheme.colors.mid
        return mergedTheme.colors.high
    }

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
        </>
    )
}
