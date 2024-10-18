// packages/expo-audio-ui/src/AudioVisualizer/CanvasContainer.tsx
import {
    Canvas,
    ExtendedTouchInfo,
    Group,
    Path,
    SkFont,
    useTouchHandler,
} from '@shopify/react-native-skia'
import { AmplitudeAlgorithm, DataPoint } from '@siteed/expo-audio-stream'
import React, { useCallback, useMemo, useRef, useEffect } from 'react'
import { Platform, View } from 'react-native'
import { SharedValue, useDerivedValue } from 'react-native-reanimated'

import { AudioVisualizerTheme, CandleData } from './AudioVisualiser.types'
import { drawDottedLine } from './AudioVisualizers.helpers'
import AnimatedCandle from '../AnimatedCandle/AnimatedCandle'
import { SkiaTimeRuler } from '../SkiaTimeRuler/SkiaTimeRuler'
import { YAxis } from '../YAxis/YAxis'
import { defaultCandleColors } from '../constants'

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
    theme: AudioVisualizerTheme
    font?: SkFont
    scaleToHumanVoice: boolean
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
    font,
    theme,
    onSelection,
    minAmplitude,
    maxAmplitude,
    scaleToHumanVoice,
}) => {
    const candleColors = {
        ...defaultCandleColors,
        ...theme.candle,
    }

    const groupTransform = useDerivedValue(() => {
        return [{ translateX: translateX.value }]
    })

    // Use refs to store the scaling factors
    const scalingFactorRef = useRef<number>(1)
    const humanVoiceScalingFactorRef = useRef<number>(1)

    // Define reference values for human voice range
    const humanVoiceMin = 0.01 // Adjust based on your typical minimum amplitude for speech
    const humanVoiceMax = 0.2 // Maximum amplitude for normal speech
    const absoluteMax = 0.8 // Maximum possible amplitude

    // Define the proportion of canvas height for normal speech
    const normalSpeechHeightProportion = 0.95 // 95% of canvas height for normal speech

    // Update scaling factors when maxAmplitude changes
    useEffect(() => {
        scalingFactorRef.current = canvasHeight / maxAmplitude
        humanVoiceScalingFactorRef.current =
            canvasHeight / (humanVoiceMax - humanVoiceMin)
    }, [maxAmplitude, canvasHeight])

    const memoizedCandles = useMemo(() => {
        return activePoints.map(
            ({ id, amplitude, visible, activeSpeech, silent }, index) => {
                if (id === -1) return null

                const centerY = canvasHeight / 2

                let scaledAmplitude: number
                if (scaleToHumanVoice) {
                    if (amplitude <= humanVoiceMax) {
                        // Scale normally within the human voice range
                        scaledAmplitude =
                            ((amplitude - humanVoiceMin) /
                                (humanVoiceMax - humanVoiceMin)) *
                            (canvasHeight * normalSpeechHeightProportion)
                    } else {
                        // For amplitudes above humanVoiceMax, use a logarithmic scale
                        const baseHeight =
                            canvasHeight * normalSpeechHeightProportion
                        const extraHeight =
                            canvasHeight * (1 - normalSpeechHeightProportion)
                        const logFactor =
                            Math.log(amplitude / humanVoiceMax) /
                            Math.log(absoluteMax / humanVoiceMax)
                        scaledAmplitude = baseHeight + extraHeight * logFactor
                    }
                } else {
                    // Use the full amplitude range from 0 to absoluteMax when not scaling to human voice
                    scaledAmplitude = (amplitude / absoluteMax) * canvasHeight
                }

                // Clamp the scaled amplitude to ensure it stays within the canvas
                const clampedAmplitude = Math.max(
                    0,
                    Math.min(scaledAmplitude, canvasHeight)
                )

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

                let color = candleColors.activeAudioColor
                if (!visible) {
                    color = candleColors.offcanvasColor
                } else if (selectedCandle && selectedCandle.id === id) {
                    color = candleColors.selectedColor
                } else if (activeSpeech) {
                    color = candleColors.activeSpeechColor
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
                                y={centerY - clampedAmplitude / 2}
                                startY={centerY}
                                width={candleWidth}
                                height={clampedAmplitude}
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
        candleColors,
        mode,
        startIndex,
        selectedCandle,
        scaleToHumanVoice,
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
        <View style={theme.canvasContainer}>
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
                            font={font}
                            tickColor={theme.timeRuler.tickColor}
                            labelColor={theme.timeRuler.labelColor}
                        />
                    )}
                </Group>
                {showDottedLine && (
                    <Path
                        path={drawDottedLine({ canvasWidth, canvasHeight })}
                        color={theme.dottedLineColor || 'grey'}
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
                        font={font}
                        padding={10}
                        tickColor={theme.yAxis.tickColor}
                        labelColor={theme.yAxis.labelColor}
                    />
                )}
            </Canvas>
        </View>
    )
}

export default React.memo(CanvasContainer)
