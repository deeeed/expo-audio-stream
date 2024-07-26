import {
    Canvas,
    ExtendedTouchInfo,
    Group,
    Path,
    useTouchHandler,
} from '@shopify/react-native-skia'
import React, { useCallback, useMemo, useRef } from 'react'
import { Platform, View } from 'react-native'
import { SharedValue, useDerivedValue } from 'react-native-reanimated'

import { AmplitudeAlgorithm, DataPoint } from '@siteed/expo-audio-stream'
import { StyleProp, ViewStyle } from 'react-native'
import {
    CANDLE_ACTIVE_AUDIO_COLOR,
    CANDLE_ACTIVE_SPEECH_COLOR,
    CANDLE_OFFCANVAS_COLOR,
    CANDLE_SELECTED_COLOR,
} from '../constants'
import AnimatedCandle from './AnimatedCandle'
import { CandleData } from './AudioVisualiser.types'
import { drawDottedLine } from './AudioVisualizers.helpers'
import { SkiaTimeRuler } from './SkiaTimeRuler'
import { YAxis } from './YAxis'

export interface CanvasContainerProps {
    canvasHeight: number
    candleWidth: number
    candleSpace: number
    showDottedLine: boolean
    showRuler: boolean
    showSilence: boolean
    showYAxis: boolean
    mode: 'static' | 'live' | 'scaled'
    algorithm: AmplitudeAlgorithm
    translateX: SharedValue<number>
    activePoints: CandleData[]
    maxDisplayedItems: number
    paddingLeft: number
    totalCandleWidth: number
    startIndex: number
    canvasWidth: number
    selectedCandle: DataPoint | null
    durationMs?: number
    minAmplitude: number
    maxAmplitude: number
    onSelection: (dataPoint: DataPoint) => void
    containerStyle?: StyleProp<ViewStyle>
}

const CanvasContainer: React.FC<CanvasContainerProps> = ({
    canvasHeight,
    candleWidth,
    candleSpace,
    showDottedLine,
    showYAxis,
    showRuler,
    mode,
    translateX,
    activePoints,
    maxDisplayedItems,
    paddingLeft,
    algorithm,
    totalCandleWidth,
    startIndex,
    canvasWidth,
    selectedCandle,
    showSilence,
    durationMs,
    onSelection,
    minAmplitude,
    maxAmplitude,
    containerStyle,
}) => {
    const groupTransform = useDerivedValue(() => {
        return [{ translateX: translateX.value }]
    })
    const memoizedCandles = useMemo(() => {
        return activePoints.map(
            ({ id, amplitude, visible, activeSpeech, silent }, index) => {
                if (id === -1) return null

                const centerY = canvasHeight / 2;
                const scaledAmplitude =
                    ((amplitude - minAmplitude) * (canvasHeight - 10)) /
                    (maxAmplitude - minAmplitude)

                // const scaledAmplitude = amplitude;
                let delta =
                    Math.ceil(maxDisplayedItems / 2) *
                    (candleWidth + candleSpace)
                if (mode === 'live') {
                    delta = 0
                }
                const x =
                    (candleWidth + candleSpace) * index +
                    startIndex * (candleWidth + candleSpace) +
                    delta

                let color = CANDLE_ACTIVE_AUDIO_COLOR
                if (!visible) {
                    color = CANDLE_OFFCANVAS_COLOR
                } else if (selectedCandle && selectedCandle.id === id) {
                    color = CANDLE_SELECTED_COLOR
                } else if (activeSpeech) {
                    color = CANDLE_ACTIVE_SPEECH_COLOR
                }

                const key = `${id}`

                return (
                    <React.Fragment key={key}>
                        {selectedCandle && selectedCandle.id === id && (
                            <Path
                                path={`M${x},0 L${x + candleWidth},0 L${x + candleWidth},${canvasHeight} L${x},${canvasHeight} Z`}
                                color="red"
                                style="stroke"
                                strokeWidth={2}
                                // strokeDash={[4, 4]}
                            />
                        )}
                        {(!silent || showSilence) && (
                            <AnimatedCandle
                                animated
                                x={x}
                                y={centerY - scaledAmplitude / 2}
                                startY={centerY}
                                width={candleWidth}
                                height={scaledAmplitude}
                                color={color}
                            />
                        )}
                    </React.Fragment>
                )
            }
        )
    }, [
        activePoints,
        canvasHeight,
        minAmplitude,
        maxAmplitude,
        maxDisplayedItems,
        showSilence,
        candleWidth,
        candleSpace,
        mode,
        startIndex,
        selectedCandle,
    ])

    const hasProcessedEvent = useRef(false)

    const processEvent = useCallback(
        (event: ExtendedTouchInfo) => {
            if (mode === 'live' || hasProcessedEvent.current) return

            const { x, y } = event
            if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
                return
            }

            hasProcessedEvent.current = true

            setTimeout(() => {
                hasProcessedEvent.current = false
            }, 300)

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
            onSelection?.(candle)
        },
        [
            mode,
            canvasWidth,
            canvasHeight,
            translateX,
            totalCandleWidth,
            candleWidth,
            candleSpace,
            activePoints,
            onSelection,
        ]
    )

    const touchHandler = useTouchHandler({
        onStart: () => {},
        onEnd: processEvent,
    })

    return (
        <View style={containerStyle}>
            <Canvas
                style={{ height: canvasHeight, width: canvasWidth }}
                onTouch={Platform.OS !== 'web' ? touchHandler : undefined}
            >
                <Group transform={groupTransform}>
                    {memoizedCandles}
                    {showRuler && (
                        <SkiaTimeRuler
                            duration={durationMs ?? 0 / 1000}
                            paddingLeft={paddingLeft}
                            width={totalCandleWidth}
                        />
                    )}
                </Group>
                {showDottedLine && (
                    <Path
                        path={drawDottedLine({ canvasWidth, canvasHeight })}
                        color="grey"
                        style="stroke"
                        strokeWidth={1}
                    />
                )}
                {showYAxis && (
                  <YAxis
                    canvasHeight={canvasHeight}
                    canvasWidth={canvasWidth}
                    minAmplitude={minAmplitude}
                    maxAmplitude={maxAmplitude}
                    algorithm={algorithm}
                    padding={10} // Adjust the padding as needed
                  />
                )}
            </Canvas>
        </View>
    )
}

export default React.memo(CanvasContainer)
