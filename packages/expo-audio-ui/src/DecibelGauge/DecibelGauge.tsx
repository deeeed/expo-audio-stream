import {
    Group,
    Path,
    SkFont,
    Skia,
    Text as SkiaText,
} from '@shopify/react-native-skia'
import React, { useEffect, useMemo } from 'react'
import { useDerivedValue, useSharedValue } from 'react-native-reanimated'

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
    backgroundColor: '#666666',
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
        yOffset: 50,
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
    // Merge themes
    const mergedTheme = useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme])
    const { minDb, maxDb } = mergedTheme

    // Animation setup
    const dbShared = useSharedValue(db)

    // Gauge dimensions
    const radius =
        mergedTheme.size!.radius ??
        Math.min(mergedTheme.size!.width, mergedTheme.size!.height) / 2.5
    const centerX = mergedTheme.size!.width / 2
    const centerY = mergedTheme.size!.height - radius // Center at bottom

    // Animated text and progress
    const animatedText = useDerivedValue(() => {
        'worklet'
        return `${Math.round(dbShared.value)} dB`
    })

    const animatedProgress = useDerivedValue(() => {
        'worklet'
        const normalizedValue = Math.max(minDb, Math.min(maxDb, dbShared.value))
        return (normalizedValue - minDb) / (maxDb - minDb)
    }, [minDb, maxDb])

    // Gauge angles: 180° (left) to 360° (right), top at 270°
    const GAUGE_START_ANGLE = 180 // Left
    const GAUGE_END_ANGLE = 270   // Top (maximum)

    // Needle rotation: 180° to 270° as dB goes from minDb to maxDb
    const needleRotation = useDerivedValue(() => {
        'worklet'
        const normalizedValue = Math.max(
            0,
            Math.min(
                1,
                (dbShared.value - minDb) / (maxDb - minDb)
            )
        )
        return (
            (GAUGE_START_ANGLE +
                normalizedValue * (GAUGE_END_ANGLE - GAUGE_START_ANGLE)) *
            (Math.PI / 180)
        )
    }, [dbShared.value, minDb, maxDb])

    // Needle path: single line pointing right initially
    const needlePath = useMemo(() => {
        const path = Skia.Path.Make()
        path.moveTo(centerX, centerY)
        path.lineTo(centerX + radius, centerY) // Initial position at 0°
        return path
    }, [centerX, centerY, radius])

    // Needle base dot
    const needleBaseDot = useMemo(() => {
        const path = Skia.Path.Make()
        path.addCircle(centerX, centerY, 5)
        return path
    }, [centerX, centerY])

    // Gauge arc path: semi-circle from 180° to 360°
    const gaugePath = useMemo(() => {
        const path = Skia.Path.Make()
        path.addArc(
            {
                x: centerX - radius,
                y: centerY - radius,
                width: radius * 2,
                height: radius * 2,
            },
            GAUGE_START_ANGLE, // 180°
            180                // Sweep to 360° for full bottom arc
        )
        return path
    }, [centerX, centerY, radius])

    // Tick marks (e.g., at 180°, 225°, 270°, 315°, 360°)
    const TICK_COUNT = 5
    const tickAngles = Array.from({ length: TICK_COUNT }, (_, i) => {
        const normalized = i / (TICK_COUNT - 1)
        return GAUGE_START_ANGLE + normalized * 180 // Full arc from 180° to 360°
    })

    const tickPaths = tickAngles.map((angle) => {
        const tickStartRadius = radius - 5
        const tickEndRadius = radius + 5
        const startX = centerX + tickStartRadius * Math.cos((angle * Math.PI) / 180)
        const startY = centerY + tickStartRadius * Math.sin((angle * Math.PI) / 180)
        const endX = centerX + tickEndRadius * Math.cos((angle * Math.PI) / 180)
        const endY = centerY + tickEndRadius * Math.sin((angle * Math.PI) / 180)
        const tickPath = Skia.Path.Make()
        tickPath.moveTo(startX, startY)
        tickPath.lineTo(endX, endY)
        return tickPath
    })

    // Update shared value
    useEffect(() => {
        dbShared.value = db
    }, [db])

    return (
        <Group>
            {/* Background arc */}
            <Path
                path={gaugePath}
                strokeWidth={mergedTheme.strokeWidth}
                color={mergedTheme.backgroundColor}
                style="stroke"
            />
            {/* Progress fill */}
            <Path
                path={gaugePath}
                strokeWidth={mergedTheme.strokeWidth}
                color={mergedTheme.colors.progress}
                style="stroke"
                start={0}
                end={animatedProgress}
            />
            {/* Tick marks */}
            {tickPaths.map((path, index) => (
                <Path
                    key={index}
                    path={path}
                    color="white"
                    style="stroke"
                    strokeWidth={1}
                />
            ))}
            {/* Needle with rotation */}
            <Group
                origin={{ x: centerX, y: centerY }}
                transform={[{ rotate: needleRotation.value }]}
            >
                <Path
                    path={needlePath}
                    color={mergedTheme.colors.needle}
                    style="stroke"
                    strokeWidth={2}
                />
                <Path
                    path={needleBaseDot}
                    color={mergedTheme.colors.needle}
                    style="fill"
                />
            </Group>
            {/* Decibel value text */}
            {showValue && font && (
                <SkiaText
                    x={centerX + (mergedTheme.text?.xOffset ?? 0)}
                    y={centerY + (mergedTheme.text?.yOffset ?? 50)}
                    text={animatedText.value}
                    font={font}
                    color={mergedTheme.text?.color ?? '#FFFFFF'}
                />
            )}
        </Group>
    )
}