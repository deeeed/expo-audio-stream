import {
    Canvas,
    Image as SkiaImage,
    Skia,
    ColorType,
    AlphaType,
} from '@shopify/react-native-skia'
import React, { useEffect, useMemo, useRef } from 'react'
import { View, ViewStyle } from 'react-native'

import type { SkImage } from '@shopify/react-native-skia'

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

// Max pixel dimensions for the image buffer (same purpose as old MAX_RECTS)
const MAX_PIXELS = 8000

export const MelSpectrogramVisualizer: React.FC<MelSpectrogramVisualizerProps> = ({
    data,
    width,
    height,
    colorMap = 'magma',
    style,
}) => {
    const pixelBufRef = useRef<Uint8Array | null>(null)
    const prevImageRef = useRef<SkImage | null>(null)

    const skImage = useMemo((): SkImage | null => {
        if (!data || data.timeSteps === 0) {
            return null
        }

        const { spectrogram, nMels, timeSteps } = data
        const lut = getLUT(colorMap)

        // Min/max for normalization
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

        // Downsample time axis if too many pixels
        const maxTimeBins = Math.floor(MAX_PIXELS / nMels)
        const timeStep = timeSteps <= maxTimeBins ? 1 : Math.ceil(timeSteps / maxTimeBins)
        const displayTimeBins = Math.ceil(timeSteps / timeStep)

        // Reuse pixel buffer to reduce GC pressure
        const bufSize = displayTimeBins * nMels * 4
        if (!pixelBufRef.current || pixelBufRef.current.length !== bufSize) {
            pixelBufRef.current = new Uint8Array(bufSize)
        }
        const pixels = pixelBufRef.current

        // Fill RGBA pixel buffer
        // Mel bins go low→high (m=0 is lowest freq), but pixels go top→bottom
        // So row 0 in the image = highest mel bin (nMels-1)
        for (let dt = 0; dt < displayTimeBins; dt++) {
            const t = dt * timeStep
            const frame = spectrogram[t]
            for (let m = 0; m < nMels; m++) {
                const raw = frame ? frame[m] : undefined
                const val = (raw == null || isNaN(raw)) ? gMin : raw
                const norm = (val - gMin) / range
                const lutIdx = Math.min(255, Math.max(0, Math.round(norm * 255)))
                // Flip Y: mel bin m → pixel row (nMels - 1 - m)
                const pixelRow = nMels - 1 - m
                const offset = (pixelRow * displayTimeBins + dt) * 4
                const lutOffset = lutIdx * 3
                pixels[offset] = lut[lutOffset]!
                pixels[offset + 1] = lut[lutOffset + 1]!
                pixels[offset + 2] = lut[lutOffset + 2]!
                pixels[offset + 3] = 255 // alpha
            }
        }

        // ColorType.RGBA_8888 = 4, AlphaType.Opaque = 1
        const imageInfo = {
            width: displayTimeBins,
            height: nMels,
            colorType: ColorType?.RGBA_8888 ?? 4,
            alphaType: AlphaType?.Opaque ?? 1,
        }
        const skData = Skia.Data.fromBytes(new Uint8Array(pixels))
        const img = Skia.Image.MakeImage(imageInfo, skData, displayTimeBins * 4)

        // Dispose previous image after a frame delay so CanvasKit's
        // async render loop is done with it (avoids "deleted object" on web)
        const prev = prevImageRef.current
        if (prev && 'dispose' in prev) {
            setTimeout(() => {
                try { (prev as any).dispose() } catch { /* noop */ }
            }, 100)
        }
        prevImageRef.current = img
        return img
    }, [data, colorMap])

    // Dispose CanvasKit image on unmount (web WASM cleanup)
    useEffect(() => {
        return () => {
            if (prevImageRef.current && 'dispose' in prevImageRef.current) {
                try { (prevImageRef.current as any).dispose() } catch { /* noop */ }
            }
        }
    }, [])

    if (!data || data.timeSteps === 0) {
        return <View style={{ width, height, ...(style || {}) }} />
    }

    return (
        <Canvas style={{ width, height, ...(style || {}) }}>
            {skImage && (
                <SkiaImage
                    image={skImage}
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fit="fill"
                />
            )}
        </Canvas>
    )
}
