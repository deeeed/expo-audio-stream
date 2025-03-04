// packages/expo-audio-ui/src/AudioVisualizer/GestureHandler.tsx
import { DataPoint } from '@siteed/expo-audio-studio'
import React, { useRef } from 'react'
import { Platform } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import {
    SharedValue,
    cancelAnimation,
    runOnJS,
    useSharedValue,
} from 'react-native-reanimated'

import { CandleData } from './AudioVisualiser.types'

export interface GestureHandlerProps {
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
    enableInertia?: boolean
    disableTapSelection?: boolean
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
    enableInertia = false,
    disableTapSelection = false,
}) => {
    const initialTranslateX = useRef(0)
    const velocity = useSharedValue(0)
    const isDecelerating = useSharedValue(false)

    if (playing || mode === 'live') {
        return <>{children}</>
    }

    const panGesture = Gesture.Pan()
        .onStart((_e) => {
            cancelAnimation(translateX)
            initialTranslateX.current = translateX.value
            velocity.value = 0
            isDecelerating.value = false
        })
        .onChange((e) => {
            const newTranslateX = translateX.value + e.changeX
            translateX.value = Math.max(
                -maxTranslateX,
                Math.min(0, newTranslateX)
            )
            velocity.value = e.velocityX
        })
        .onEnd((_e) => {
            if (enableInertia) {
                isDecelerating.value = true
                const decelerate = () => {
                    if (!isDecelerating.value) return

                    const newVelocity = velocity.value * 0.85 // decreasing velocity value to make it slower
                    const newTranslateX = translateX.value + newVelocity * 0.016 // Assuming 60fps

                    if (Math.abs(newVelocity) < 5) {
                        isDecelerating.value = false
                        runOnJS(onDragEnd)({ newTranslateX: translateX.value })
                        return
                    }

                    translateX.value = Math.max(
                        -maxTranslateX,
                        Math.min(0, newTranslateX)
                    )
                    velocity.value = newVelocity

                    requestAnimationFrame(decelerate)
                }

                requestAnimationFrame(decelerate)
            } else {
                runOnJS(onDragEnd)({ newTranslateX: translateX.value })
            }
            runOnJS(onDragEnd)({ newTranslateX: translateX.value })
        })

    const tapGesture = Gesture.Tap().onEnd((event) => {
        if (disableTapSelection || !onSelection) {
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

    // Modify the composedGesture to include the tapGesture only if tap selection is not disabled
    const composedGesture = Platform.select({
        web: Gesture.Race(
            panGesture,
            disableTapSelection ? Gesture.Tap() : tapGesture
        ),
        default: Gesture.Race(panGesture),
    })

    return (
        <GestureDetector gesture={composedGesture}>{children}</GestureDetector>
    )
}
