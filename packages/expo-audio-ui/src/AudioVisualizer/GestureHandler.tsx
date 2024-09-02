// packages/expo-audio-ui/src/AudioVisualizer/GestureHandler.tsx
import { DataPoint } from '@siteed/expo-audio-stream'
import React, { useRef } from 'react'
import { Platform } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { SharedValue, runOnJS } from 'react-native-reanimated'

import { CandleData } from './AudioVisualiser.types'

interface GestureHandlerProps {
    playing: boolean
    mode: 'static' | 'live'
    canvasWidth: number
    candleWidth: number
    candleSpace: number
    totalCandleWidth: number
    translateX: SharedValue<number>
    maxTranslateX: number
    activePoints: CandleData[]
    onSelection: (dataPoint: DataPoint) => void
    onDragEnd: (params: { newTranslateX: number }) => void
    children: React.ReactNode
}

export const GestureHandler: React.FC<GestureHandlerProps> = ({
    playing,
    mode,
    translateX,
    maxTranslateX,
    canvasWidth,
    candleSpace,
    candleWidth,
    totalCandleWidth,
    activePoints,
    onDragEnd,
    onSelection,
    children,
}) => {
    const initialTranslateX = useRef(0)

    if (playing || mode === 'live') {
        return <>{children}</>
    }

    const panGesture = Gesture.Pan()
        .onStart((_e) => {
            initialTranslateX.current = translateX.value
        })
        .onChange((e) => {
            const newTranslateX = translateX.value + e.changeX
            const clampedTranslateX = Math.max(
                -maxTranslateX,
                Math.min(0, newTranslateX)
            ) // Clamping within bounds

            // compute distance since last update
            //   const distance = Math.abs(initialTranslateX.current - clampedTranslateX);
            //   const distanceItems = Math.floor(distance / (candleWidth + candleSpace));
            translateX.value = clampedTranslateX
        })
        .onEnd((_e) => {
            runOnJS(onDragEnd)({
                newTranslateX: translateX.value,
            })
        })

    const tapGesture = Gesture.Tap().onEnd((event) => {
        if (!onSelection) {
            return
        }

        const { x } = event
        if (x < 0 || x > canvasWidth) {
            return
        }

        const plotStart = canvasWidth / 2 + translateX.value
        const plotEnd = plotStart + totalCandleWidth

        if (x < plotStart || x > plotEnd) {
            return
        }

        const adjustedX = x - plotStart
        const index = Math.floor(adjustedX / (candleWidth + candleSpace))
        const candle = activePoints[index]
        if (!candle) {
            return
        }

        // Dispatch action to update the selected candle
        runOnJS(onSelection)(candle)
    })

    // FIXME: figure out why we cannot activate tapGesture on native
    const composedGesture = Platform.select({
        web: Gesture.Race(panGesture, tapGesture),
        default: Gesture.Race(panGesture),
    })

    return (
        <GestureDetector gesture={composedGesture}>{children}</GestureDetector>
    )
}
