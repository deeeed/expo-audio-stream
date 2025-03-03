import {
    Group,
    Path,
    SkFont,
    Skia,
    Text as SkiaText,
} from '@shopify/react-native-skia'
import React, { useEffect, useMemo } from 'react'
import {
    useDerivedValue,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated'

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
        needle: string
        progress: string
        high: string
    }
    text?: {
        color?: string
        size?: number
        xOffset?: number
        yOffset?: number
    }
}

const DEFAULT_THEME: DecibelGaugeTheme = {
    minDb: -60,
    maxDb: 0,
    backgroundColor: '#666666', // Lighter gray for contrast
    strokeWidth: 10,
    size: {
        width: 300,
        height: 150,
        radius: 60,
    },
    colors: {
        needle: '#007AFF',
        progress: '#FFD60A',
        high: '#FF453A',
    },
    text: {
        color: '#FFFFFF',
        size: 16,
        xOffset: 0,
        yOffset: 50, // Fixed offset below gauge
    },
}

export interface DecibelGaugeProps {
    db: number
    theme?: Partial<DecibelGaugeTheme>
    showValue?: boolean
    font?: SkFont | null
}

export function DecibelGauge({
    db,
    theme,
    showValue = true,
    font,
}: DecibelGaugeProps) {
    const mergedTheme = useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme])
    const { minDb, maxDb } = mergedTheme

    const animatedDb = useSharedValue(db)
    const centerX = mergedTheme.size!.width / 2
    const centerY = mergedTheme.size!.height / 1.5
    const radius =
        mergedTheme.size!.radius ??
        Math.min(mergedTheme.size!.width, mergedTheme.size!.height) / 2.5

    const animatedText = useDerivedValue(() => {
        'worklet'
        return `${Math.round(animatedDb.value)} dB`
    })

    const animatedProgress = useDerivedValue(() => {
        'worklet'
        const normalizedValue = Math.max(
            minDb,
            Math.min(maxDb, animatedDb.value)
        )
        return (normalizedValue - minDb) / (maxDb - minDb)
    }, [minDb, maxDb])

    const GAUGE_START_ANGLE = 135
    const GAUGE_END_ANGLE = 45
    const NEEDLE_LENGTH = 0.9

    const needleRotation = useDerivedValue(() => {
        'worklet'
        const normalizedValue = Math.max(
            0,
            Math.min(
                1,
                (db - mergedTheme.minDb) /
                    (mergedTheme.maxDb - mergedTheme.minDb)
            )
        )
        return (
            GAUGE_START_ANGLE * (Math.PI / 180) -
            normalizedValue *
                (GAUGE_START_ANGLE - GAUGE_END_ANGLE) *
                (Math.PI / 180)
        )
    }, [db, mergedTheme.minDb, mergedTheme.maxDb])

    const needlePath = useMemo(() => {
        const path = Skia.Path.Make()
        path.moveTo(centerX, centerY)
        path.lineTo(centerX - 5, centerY - 30) // Wider needle
        path.lineTo(centerX, centerY + radius * NEEDLE_LENGTH)
        path.lineTo(centerX + 5, centerY - 30)
        path.close()
        return path
    }, [centerX, centerY, radius])

    const needleBaseDot = useMemo(() => {
        const path = Skia.Path.Make()
        const dotRadius = 5
        path.addCircle(centerX, centerY, dotRadius)
        return path
    }, [centerX, centerY])

    const currentDbText = animatedText.value

    const gaugePath = useMemo(() => {
        const path = Skia.Path.Make()
        path.addArc(
            {
                x: centerX - radius,
                y: centerY - radius,
                width: radius * 2,
                height: radius * 2,
            },
            GAUGE_START_ANGLE,
            GAUGE_START_ANGLE - GAUGE_END_ANGLE
        )
        return path
    }, [centerX, centerY, radius])

    // Tick marks
    const TICK_COUNT = 5
    const tickAngles = Array.from({ length: TICK_COUNT }, (_, i) => {
        const normalized = i / (TICK_COUNT - 1)
        return (
            GAUGE_START_ANGLE -
            normalized * (GAUGE_START_ANGLE - GAUGE_END_ANGLE)
        )
    })

    const tickPaths = tickAngles.map((angle) => {
        const tickStartRadius = radius - 5
        const tickEndRadius = radius + 5
        const startX =
            centerX + tickStartRadius * Math.cos(angle * (Math.PI / 180))
        const startY =
            centerY + tickStartRadius * Math.sin(angle * (Math.PI / 180))
        const endX = centerX + tickEndRadius * Math.cos(angle * (Math.PI / 180))
        const endY = centerY + tickEndRadius * Math.sin(angle * (Math.PI / 180))
        const tickPath = Skia.Path.Make()
        tickPath.moveTo(startX, startY)
        tickPath.lineTo(endX, endY)
        return tickPath
    })

    useEffect(() => {
        animatedDb.value = withSpring(db, {
            mass: 1,
            damping: 15,
            stiffness: 120,
            overshootClamping: true,
            restDisplacementThreshold: 0.01,
            restSpeedThreshold: 0.01,
        })
    }, [db])

    return (
        <Group>
            <Path
                path={gaugePath}
                strokeWidth={mergedTheme.strokeWidth}
                color={mergedTheme.backgroundColor}
                style="stroke"
            />
            <Path
                path={gaugePath}
                strokeWidth={mergedTheme.strokeWidth}
                color={mergedTheme.colors.progress}
                style="stroke"
                start={0}
                end={animatedProgress}
            />
            {tickPaths.map((path, index) => (
                <Path
                    key={index}
                    path={path}
                    color="white"
                    style="stroke"
                    strokeWidth={1}
                />
            ))}
            <Group
                origin={{ x: centerX, y: centerY }}
                transform={[{ rotate: needleRotation.value }]}
            >
                <Path
                    path={needlePath}
                    color={mergedTheme.colors.needle}
                    style="fill"
                />
                <Path
                    path={needleBaseDot}
                    color={mergedTheme.colors.needle}
                    style="fill"
                />
            </Group>
            {showValue && font && (
                <SkiaText
                    x={centerX + (mergedTheme.text?.xOffset ?? 0)}
                    y={centerY + (mergedTheme.text?.yOffset ?? 50)} // Fixed below gauge
                    text={currentDbText}
                    font={font}
                    color={mergedTheme.text?.color ?? '#FFFFFF'}
                />
            )}
        </Group>
    )
}
