import { Canvas, Rect, Group } from '@shopify/react-native-skia'
import React, { useMemo } from 'react'
import { View, ViewStyle } from 'react-native'

interface CellData {
    x: number
    y: number
    width: number
    height: number
    color: string
}

export interface MelSpectrogramVisualizerProps {
    data: { spectrogram: number[][]; nMels: number; timeSteps: number } | null
    width: number
    height: number
    colorMap?: 'magma' | 'viridis' | 'grayscale'
    normalization?: 'global' | 'sliding'
    style?: ViewStyle
}

// Magma-like: dark -> purple -> red -> orange -> yellow
const MAGMA_STOPS: [number, number, number][] = [
    [0, 0, 4],
    [101, 0, 168],
    [207, 46, 49],
    [249, 142, 9],
    [252, 253, 191],
]

const VIRIDIS_STOPS: [number, number, number][] = [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
]

const GRAYSCALE_STOPS: [number, number, number][] = [
    [0, 0, 0],
    [64, 64, 64],
    [128, 128, 128],
    [192, 192, 192],
    [255, 255, 255],
]

const COLOR_MAPS = {
    magma: MAGMA_STOPS,
    viridis: VIRIDIS_STOPS,
    grayscale: GRAYSCALE_STOPS,
}

// Pre-compute a 256-entry LUT for a given color map
function buildLUT(stops: [number, number, number][]): Uint8Array {
    const lut = new Uint8Array(256 * 3)
    const segCount = stops.length - 1
    for (let i = 0; i < 256; i++) {
        const t = i / 255
        const segIdx = Math.min(Math.floor(t * segCount), segCount - 1)
        const segT = t * segCount - segIdx
        const s0 = stops[segIdx]!
        const s1 = stops[segIdx + 1]!
        lut[i * 3] = Math.round(s0[0] + (s1[0] - s0[0]) * segT)
        lut[i * 3 + 1] = Math.round(s0[1] + (s1[1] - s0[1]) * segT)
        lut[i * 3 + 2] = Math.round(s0[2] + (s1[2] - s0[2]) * segT)
    }
    return lut
}

const LUT_CACHE: Record<string, Uint8Array> = {}
function getLUT(colorMap: 'magma' | 'viridis' | 'grayscale'): Uint8Array {
    if (!LUT_CACHE[colorMap]) {
        LUT_CACHE[colorMap] = buildLUT(COLOR_MAPS[colorMap])
    }
    return LUT_CACHE[colorMap]!
}

function lutColor(lut: Uint8Array, idx: number): string {
    const o = idx * 3
    return `rgb(${lut[o]}, ${lut[o + 1]}, ${lut[o + 2]})`
}

export const MelSpectrogramVisualizer: React.FC<MelSpectrogramVisualizerProps> = ({
    data,
    width,
    height,
    colorMap = 'magma',
    normalization = 'global',
    style,
}) => {
    const cells = useMemo(() => {
        if (!data || data.timeSteps === 0 || width <= 0 || height <= 0) {
            return []
        }

        const { spectrogram, nMels, timeSteps } = data
        const lut = getLUT(colorMap)

        // Min/max for normalization (same logic for global and sliding -
        // sliding just means the input data is already a sliding window)
        let gMin = Infinity
        let gMax = -Infinity
        for (let t = 0; t < timeSteps; t++) {
            const frame = spectrogram[t]
            if (!frame) continue
            for (let m = 0; m < nMels; m++) {
                const v = frame[m]
                if (v == null || isNaN(v)) continue
                if (v < gMin) gMin = v
                if (v > gMax) gMax = v
            }
        }
        if (!isFinite(gMin)) gMin = 0
        if (!isFinite(gMax)) gMax = 1
        const range = gMax - gMin || 1

        // Downsample time axis if too many rects (keep under ~8000 for Skia perf)
        const MAX_RECTS = 8000
        const maxTimeBins = Math.floor(MAX_RECTS / nMels)
        const timeStep = timeSteps <= maxTimeBins ? 1 : Math.ceil(timeSteps / maxTimeBins)
        const displayTimeBins = Math.ceil(timeSteps / timeStep)

        const cellW = width / displayTimeBins
        const cellH = height / nMels

        const computed: CellData[] = new Array(displayTimeBins * nMels)
        let idx = 0
        for (let dt = 0; dt < displayTimeBins; dt++) {
            const t = dt * timeStep
            const frame = spectrogram[t]
            if (!frame) continue
            for (let m = 0; m < nMels; m++) {
                const raw = frame[m]
                const val = (raw == null || isNaN(raw)) ? gMin : raw
                const norm = (val - gMin) / range
                const lutIdx = Math.min(255, Math.max(0, Math.round(norm * 255)))
                computed[idx++] = {
                    x: dt * cellW,
                    y: (nMels - 1 - m) * cellH,
                    width: cellW,
                    height: cellH,
                    color: lutColor(lut, lutIdx),
                }
            }
        }
        return computed.slice(0, idx)
    }, [data, width, height, colorMap, normalization])

    if (!data || data.timeSteps === 0) {
        return <View style={{ width, height, ...(style || {}) }} />
    }

    return (
        <Canvas style={{ width, height, ...(style || {}) }}>
            <Group>
                {cells.map((cell, index) => (
                    <Rect
                        key={index}
                        x={cell.x}
                        y={cell.y}
                        width={cell.width}
                        height={cell.height}
                        color={cell.color}
                    />
                ))}
            </Group>
        </Canvas>
    )
}
