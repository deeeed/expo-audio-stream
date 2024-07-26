import { useEffect, useState } from 'react'

import { Bar, Point } from '../component/waveform/waveform.types'

export const calculateMinMax = (
    data: Float32Array,
    start: number,
    end: number
) => {
    let min = Infinity
    let max = -Infinity
    for (let i = start; i < end; i++) {
        if (data[i] < min) min = data[i]
        if (data[i] > max) max = data[i]
    }
    return { min, max }
}

export const calculateMinMaxAverage = (
    data: Float32Array,
    start: number,
    end: number
) => {
    const { min, max } = calculateMinMax(data, start, end)
    const average = (min + max) / 2
    return { min, max, average }
}

export const DownsamplingStrategy = {
    NONE: 'none',
    AVERAGE: 'average',
    PEAK: 'peak',
    RMS: 'rms',
} as const

export type DownsamplingStrategyType =
    (typeof DownsamplingStrategy)[keyof typeof DownsamplingStrategy]

interface GenerateCandlesParams {
    data: Float32Array
    pointsPerSecond: number
    waveformHeight: number
    sampleRate: number
    channels: number
    duration: number
    candleStickWidth: number
    candleStickSpacing: number
    downsamplingStrategy: DownsamplingStrategyType
    downsampledPeakData?: { min: Float32Array; max: Float32Array }
}

export const generateCandles = ({
    data,
    pointsPerSecond,
    waveformHeight,
    duration,
    candleStickWidth,
    candleStickSpacing,
    downsamplingStrategy,
    downsampledPeakData,
}: GenerateCandlesParams) => {
    let totalPoints: number
    let samplesPerPoint: number = 1

    if (
        downsamplingStrategy === DownsamplingStrategy.PEAK &&
        downsampledPeakData
    ) {
        // Use downsampled peak data directly
        totalPoints = Math.min(data.length, downsampledPeakData.min.length)
    } else {
        // Calculate totalPoints and samplesPerPoint based on provided data
        totalPoints = Math.min(
            data.length,
            Math.ceil(duration * pointsPerSecond)
        ) // Ensure totalPoints does not exceed data length
        samplesPerPoint = Math.max(1, Math.floor(data.length / totalPoints))
    }

    const candles: Bar[] = []

    console.log(
        `Total points: ${totalPoints}, samplesPerPoint: ${samplesPerPoint}, data.length: ${data.length}`
    )

    for (let i = 0; i < totalPoints; i++) {
        let min, max

        if (
            downsamplingStrategy === DownsamplingStrategy.PEAK &&
            downsampledPeakData
        ) {
            // Use downsampled min and max directly
            min = downsampledPeakData.min[i]
            max = downsampledPeakData.max[i]
        } else {
            // Calculate min and max from provided data
            const start = i * samplesPerPoint
            const end = Math.min(start + samplesPerPoint, data.length)
            min = Math.min(...data.slice(start, end))
            max = Math.max(...data.slice(start, end))
        }

        const normalizedMin = (min + 1) / 2
        const normalizedMax = (max + 1) / 2

        candles.push({
            x: i * (candleStickWidth + candleStickSpacing),
            y: (1 - normalizedMax) * waveformHeight,
            height: Math.max(
                1,
                (normalizedMax - normalizedMin) * waveformHeight
            ),
        })
    }

    console.log(`candles.length: ${candles.length}`, candles)
    return candles
}

interface GenerateLinePointsParams {
    data: Float32Array
    pointsPerSecond: number
    waveformHeight: number
    totalWidth: number
    sampleRate: number
    channels: number
    duration: number
    downsamplingStrategy: DownsamplingStrategyType
    downsampledPeakData?: { min: Float32Array; max: Float32Array }
}

export const generateLinePoints = ({
    data,
    pointsPerSecond,
    waveformHeight,
    totalWidth,
    duration,
    downsamplingStrategy,
    downsampledPeakData,
}: GenerateLinePointsParams) => {
    let totalPoints: number
    let samplesPerPoint: number = 1

    if (
        downsamplingStrategy === DownsamplingStrategy.PEAK &&
        downsampledPeakData
    ) {
        // Use downsampled peak data directly
        totalPoints = Math.min(data.length, downsampledPeakData.min.length)
    } else {
        // Calculate totalPoints and samplesPerPoint based on provided data
        totalPoints = Math.min(
            data.length,
            Math.ceil(duration * pointsPerSecond)
        ) // Ensure totalPoints does not exceed data length
        samplesPerPoint = Math.max(1, Math.floor(data.length / totalPoints))
    }

    const points: Point[] = []

    console.log(
        `Total points: ${totalPoints}, samplesPerPoint: ${samplesPerPoint}, data.length: ${data.length}`
    )

    for (let i = 0; i < totalPoints; i++) {
        let average: number

        if (
            downsamplingStrategy === DownsamplingStrategy.PEAK &&
            downsampledPeakData
        ) {
            // Use downsampled data directly
            const min = downsampledPeakData.min[i]
            const max = downsampledPeakData.max[i]
            average = (min + max) / 2
        } else {
            // Calculate min, max, and average from provided data
            const start = Math.floor(i * samplesPerPoint)
            const end = Math.min(
                Math.floor(start + samplesPerPoint),
                data.length
            )
            if (start >= data.length || end > data.length) {
                console.error(
                    `Invalid range: start=${start}, end=${end}, data.length=${data.length}`
                )
                continue
            }

            const { average: avg } = calculateMinMaxAverage(data, start, end)
            average = avg
        }

        const normalizedAverage = (average + 1) / 2

        if (isNaN(normalizedAverage)) {
            console.error(
                `NaN detected: average=${average}, normalizedAverage=${normalizedAverage}`
            )
        }

        points.push({
            x: i * (totalWidth / totalPoints), // Distribute points evenly across the total width
            y: (1 - normalizedAverage) * waveformHeight,
        })
    }

    // Normalization
    const maxVal = Math.max(...points.map((p) => p.y))
    const minVal = Math.min(...points.map((p) => p.y))
    const range = maxVal - minVal

    return points.map((p) => ({
        x: p.x,
        y: ((p.y - minVal) / range) * waveformHeight,
    }))
}

interface WaveformVisualizationParams {
    data: Float32Array // Full audio WaveForm
    pointsPerSecond: number
    waveformHeight: number
    candleStickWidth: number
    candleStickSpacing: number
    totalWidth: number
    duration: number
    visualizationType: string
    mode: string
    sampleRate: number
    channels?: number // Optional, default to mono
    downsamplingStrategy: DownsamplingStrategyType
    downsampledPeakData?: { min: Float32Array; max: Float32Array }
}
export const useWaveformVisualization = ({
    data,
    pointsPerSecond,
    waveformHeight,
    totalWidth,
    visualizationType,
    candleStickSpacing,
    candleStickWidth,
    mode,
    duration,
    sampleRate,
    channels = 1,
    downsamplingStrategy,
    downsampledPeakData,
}: WaveformVisualizationParams): { bars?: Bar[]; points?: Point[] } => {
    const [bars, setBars] = useState<Bar[] | undefined>(undefined)
    const [points, setPoints] = useState<Point[] | undefined>(undefined)

    useEffect(() => {
        console.log(
            `useWaveformVisualization[${visualizationType}][${mode}]: data.length=${data.length}, pointsPerSecond=${pointsPerSecond}, waveformHeight=${waveformHeight}, totalWidth=${totalWidth}, visualizationType=${visualizationType}, mode=${mode}, sampleRate=${sampleRate}, channels=${channels}, downsampledPeakData=${downsampledPeakData}`
        )
        if (data.length === 0) {
            setBars([])
            setPoints([])
            return
        }

        if (visualizationType === 'candlestick') {
            const generatedBars = generateCandles({
                data,
                pointsPerSecond,
                waveformHeight,
                sampleRate,
                channels,
                duration,
                candleStickWidth,
                candleStickSpacing,
                downsamplingStrategy,
                downsampledPeakData,
            })
            console.log(`Generated ${generatedBars.length} bars`)
            setBars(generatedBars)
        } else if (visualizationType === 'line') {
            const generatedPoints = generateLinePoints({
                data,
                pointsPerSecond,
                waveformHeight,
                totalWidth,
                sampleRate,
                channels,
                duration,
                downsamplingStrategy,
                downsampledPeakData,
            })
            console.log(
                `Generated ${generatedPoints.length} line points`,
                generatedPoints?.slice(-10)
            )
            setPoints(generatedPoints)
        }
    }, [
        data,
        pointsPerSecond,
        waveformHeight,
        totalWidth,
        visualizationType,
        mode,
        sampleRate,
        channels,
        downsampledPeakData,
    ])

    return { bars, points }
}
