import { Path } from '@shopify/react-native-skia'
import React, { useMemo } from 'react'

import {
    CandleData,
    AudioVisualizerTheme,
} from '../AudioVisualizer/AudioVisualiser.types'

export interface WaveformProps {
    activePoints: CandleData[]
    canvasHeight: number
    canvasWidth: number
    minAmplitude: number
    maxAmplitude: number
    theme?: AudioVisualizerTheme
}

const Waveform: React.FC<WaveformProps> = ({
    activePoints,
    canvasHeight,
    canvasWidth,
    minAmplitude,
    maxAmplitude,
}) => {
    const path = useMemo(() => {
        if (activePoints.length === 0) {
            return ''
        }

        const centerY = canvasHeight / 2
        const totalPoints = activePoints.length
        const pathData = activePoints.map(({ amplitude }, index) => {
            const x = (index / (totalPoints - 1)) * canvasWidth
            const normalizedAmplitude =
                (amplitude - minAmplitude) / (maxAmplitude - minAmplitude)
            const y = centerY - normalizedAmplitude * (canvasHeight / 2)
            return { x, y }
        })

        // Ensure pathData has at least one point
        if (!pathData[0]) {
            return ''
        }

        let waveformPath = `M${pathData[0].x},${pathData[0].y}`
        pathData.slice(1).forEach((point) => {
            waveformPath += ` L${point.x},${point.y}`
        })

        return waveformPath
    }, [activePoints, canvasHeight, canvasWidth, minAmplitude, maxAmplitude])

    return path ? (
        <Path path={path} color="blue" style="stroke" strokeWidth={2} />
    ) : null
}

export default Waveform
