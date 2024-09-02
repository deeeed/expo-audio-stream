import { Canvas, Circle, Group } from '@shopify/react-native-skia'
import React, { useEffect } from 'react'
import {
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated'

export interface CirclesProps {
    size?: number
}

export const Circles = ({ size = 256 }: CirclesProps) => {
    const r = useSharedValue(0)
    const c = useDerivedValue(() => size - r.value)
    useEffect(() => {
        r.value = withRepeat(withTiming(size * 0.33, { duration: 1000 }), 1)
    }, [r, size])
    return (
        <Canvas style={{ flex: 1 }}>
            <Group blendMode="multiply">
                <Circle cx={r} cy={r} r={r} color="cyan" />
                <Circle cx={c} cy={r} r={r} color="magenta" />
                <Circle cx={size / 2} cy={c} r={r} color="yellow" />
            </Group>
        </Canvas>
    )
}
