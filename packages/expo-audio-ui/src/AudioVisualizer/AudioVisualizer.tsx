// playground/src/component/audio-visualizer/audio-visualizer.tsx
import { SkFont } from '@shopify/react-native-skia'
import { AudioAnalysis, DataPoint } from '@siteed/expo-audio-stream'
import { getLogger } from '@siteed/react-native-logger'
import React, { useCallback, useEffect, useReducer, useRef } from 'react'
import { Button, LayoutChangeEvent, Text, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'

import {
    AudioVisualizerState,
    CandleData,
    UpdateActivePointsResult,
} from './AudioVisualiser.types'
import {
    calculateReferenceLinePosition,
    getStyles,
    syncTranslateX,
    updateActivePoints,
} from './AudioVisualizers.helpers'
import CanvasContainer from './CanvasContainer'
import { GestureHandler } from './GestureHandler'

export type AudioVisualiserAction = {
    type: 'UPDATE_STATE'
    state: Partial<AudioVisualizerState>
}

const initialState: AudioVisualizerState = {
    ready: false,
    triggerUpdate: 0,
    canvasWidth: 0,
    currentTime: undefined,
    hasInitialized: false,
    selectedCandle: null,
    selectedIndex: -1,
}

const reducer = (
    state: AudioVisualizerState,
    action: AudioVisualiserAction
): AudioVisualizerState => {
    switch (action.type) {
        case 'UPDATE_STATE':
            return { ...state, ...action.state }
        default:
            return state
    }
}

export interface AudioVisualizerProps {
    audioData: AudioAnalysis
    currentTime?: number
    canvasHeight?: number
    candleWidth?: number
    candleSpace?: number
    showDottedLine?: boolean
    showRuler?: boolean
    showYAxis?: boolean
    showSilence?: boolean
    showNavigation?: boolean
    font?: SkFont
    onSelection?: ({
        dataPoint,
        index,
    }: {
        dataPoint: DataPoint
        index: number
    }) => void
    mode?: 'static' | 'live'
    playing?: boolean
    onSeekEnd?: (newTime: number) => void
}

const logger = getLogger('AudioVisualizer')

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    audioData,
    canvasHeight = 100,
    candleWidth = 3,
    currentTime: fullCurrentTime,
    candleSpace = 2,
    playing = false,
    mode = 'static',
    showRuler = false,
    showNavigation = true,
    showDottedLine = true,
    showSilence = false,
    showYAxis = false,
    onSeekEnd,
    onSelection,
    font,
}) => {
    const translateX = useSharedValue(0)
    const [state, dispatch] = useReducer(reducer, initialState)

    const {
        ready,
        triggerUpdate,
        canvasWidth,
        currentTime,
        hasInitialized,
        selectedCandle,
        selectedIndex,
    } = state

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout
        logger.log(`Layout width: ${width}`)
        dispatch({ type: 'UPDATE_STATE', state: { canvasWidth: width } })
    }, [])

    const referenceLineX = calculateReferenceLinePosition({
        canvasWidth,
        referenceLinePosition: mode === 'live' ? 'RIGHT' : 'MIDDLE',
    })

    const styles = getStyles({
        canvasWidth,
        referenceLineX,
    })

    const maxDisplayedItems = Math.ceil(
        canvasWidth / (candleWidth + candleSpace)
    )
    const maxTranslateX =
        audioData.dataPoints.length * (candleWidth + candleSpace)
    const paddingLeft = canvasWidth / 2
    const totalCandleWidth =
        audioData.dataPoints.length * (candleWidth + candleSpace)

    const updateActivePointsResult = useRef<UpdateActivePointsResult>({
        activePoints: [],
        range: { start: 0, end: 0, startVisibleIndex: 0, endVisibleIndex: 0 },
        lastUpdatedTranslateX: 0,
    })

    // Initialize activePoints
    useEffect(() => {
        if (maxDisplayedItems === 0 || hasInitialized) return

        if (mode !== 'live') {
            const initialActivePoints: CandleData[] = new Array(
                maxDisplayedItems * 3
            ).fill({
                id: -1,
                amplitude: 0,
                visible: false,
            })
            updateActivePointsResult.current = {
                ...updateActivePointsResult.current,
                activePoints: initialActivePoints,
            }
        }
        dispatch({
            type: 'UPDATE_STATE',
            state: { hasInitialized: true, ready: true },
        })
    }, [maxDisplayedItems, mode, hasInitialized])

    useEffect(() => {
        if (!hasInitialized) return

        const {
            activePoints: updatedActivePoints,
            range: updatedRange,
            lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
        } = updateActivePoints({
            x: translateX.value,
            context: {
                dataPoints: audioData.dataPoints,
                maxDisplayedItems,
                activePoints: updateActivePointsResult.current.activePoints,
                range: updateActivePointsResult.current.range,
                referenceLineX,
                mode,
                candleWidth,
                candleSpace,
            },
        })
        logger.log(`Updated active points: ${updatedActivePoints.length}`)
        updateActivePointsResult.current = {
            activePoints: updatedActivePoints,
            range: updatedRange,
            lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
        }
        dispatch({
            type: 'UPDATE_STATE',
            state: {
                triggerUpdate: triggerUpdate + 1,
                selectedCandle: null,
                selectedIndex: -1,
            },
        })
    }, [
        audioData.dataPoints,
        dispatch,
        hasInitialized,
        maxDisplayedItems,
        canvasWidth,
    ])

    useEffect(() => {
        if (fullCurrentTime) {
            dispatch({
                type: 'UPDATE_STATE',
                state: { currentTime: fullCurrentTime },
            })
        }
    }, [fullCurrentTime])

    useEffect(() => {
        if (currentTime && audioData.durationMs) {
            logger.log(`Syncing translateX... currentTime=${currentTime}`)
            const newTranslateX = syncTranslateX({
                currentTime,
                durationMs: audioData.durationMs,
                maxTranslateX,
                minTranslateX: 0,
                translateX,
            })

            // Check if the translateX has moved by at least half of canvasWidth
            const movedDistance = Math.abs(
                newTranslateX -
                    updateActivePointsResult.current.lastUpdatedTranslateX
            )

            // Define a threshold to update active points
            const translateXThreshold = canvasWidth

            logger.log(
                `Moved distance: ${movedDistance} newTranslateX: ${newTranslateX} Threshold: ${translateXThreshold}`
            )
            if (movedDistance >= translateXThreshold) {
                const {
                    activePoints: updatedActivePoints,
                    range: updatedRange,
                    lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
                } = updateActivePoints({
                    x: newTranslateX,
                    context: {
                        dataPoints: audioData.dataPoints,
                        maxDisplayedItems,
                        activePoints:
                            updateActivePointsResult.current.activePoints,
                        referenceLineX,
                        mode,
                        range: updateActivePointsResult.current.range,
                        candleWidth,
                        candleSpace,
                    },
                })
                updateActivePointsResult.current = {
                    activePoints: updatedActivePoints,
                    range: updatedRange,
                    lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
                }

                dispatch({
                    type: 'UPDATE_STATE',
                    state: { triggerUpdate: triggerUpdate + 1 },
                })
            }
        }
    }, [playing, currentTime, audioData.durationMs, canvasWidth, translateX])

    const handleDragEnd = useCallback(
        ({ newTranslateX }: { newTranslateX: number }) => {
            if (audioData.durationMs && onSeekEnd) {
                const allowedTranslateX = maxTranslateX
                const progressRatio = -newTranslateX / allowedTranslateX
                const newTime = (progressRatio * audioData.durationMs) / 1000
                onSeekEnd(newTime)
            }

            const {
                activePoints: updatedActivePoints,
                range: updatedRange,
                lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
            } = updateActivePoints({
                x: newTranslateX,
                context: {
                    dataPoints: audioData.dataPoints,
                    maxDisplayedItems,
                    activePoints: updateActivePointsResult.current.activePoints,
                    referenceLineX,
                    mode,
                    range: updateActivePointsResult.current.range,
                    candleWidth,
                    candleSpace,
                },
            })
            updateActivePointsResult.current = {
                activePoints: updatedActivePoints,
                range: updatedRange,
                lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
            }

            dispatch({
                type: 'UPDATE_STATE',
                state: { triggerUpdate: triggerUpdate + 1 },
            })
        },
        [onSeekEnd, audioData.dataPoints, maxDisplayedItems]
    )

    const handleSelectionChange = useCallback(
        (candle: DataPoint) => {
            const currentIndex = audioData.dataPoints.findIndex(
                (point) => point.id === candle.id
            )

            dispatch({
                type: 'UPDATE_STATE',
                state: {
                    selectedCandle: { ...candle, visible: true },
                    selectedIndex: currentIndex,
                },
            })

            onSelection?.({ dataPoint: candle, index: currentIndex })
        },
        [onSelection, dispatch]
    )

    const handlePrevNextSelection = useCallback(
        (direction: 'prev' | 'next') => {
            logger.debug(
                `[${direction}] Selected index: ${selectedIndex}`,
                selectedCandle
            )
            if (!selectedCandle) return

            if (selectedIndex === -1) return

            const newIndex =
                direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1

            logger.debug(`New index: ${newIndex}`)
            if (newIndex < 0 || newIndex >= audioData.dataPoints.length) return

            const newSelectedCandle = audioData.dataPoints[newIndex]
            if (!newSelectedCandle) return
            dispatch({
                type: 'UPDATE_STATE',
                state: {
                    selectedCandle: { ...newSelectedCandle, visible: true },
                    selectedIndex: newIndex,
                },
            })

            logger.debug(
                `New selected candle: ${newSelectedCandle.id}`,
                onSelection
            )
            onSelection?.({ dataPoint: newSelectedCandle, index: newIndex })
        },
        [
            audioData.dataPoints,
            selectedIndex,
            selectedCandle,
            onSelection,
            dispatch,
        ]
    )

    const handleReset = useCallback(() => {
        translateX.value = 0
        const {
            activePoints: updatedActivePoints,
            range: updatedRange,
            lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
        } = updateActivePoints({
            x: translateX.value,
            context: {
                dataPoints: audioData.dataPoints,
                maxDisplayedItems,
                activePoints: updateActivePointsResult.current.activePoints,
                range: updateActivePointsResult.current.range,
                referenceLineX,
                mode,
                candleWidth,
                candleSpace,
            },
        })
        logger.log(`Updated active points: ${updatedActivePoints.length}`)
        updateActivePointsResult.current = {
            activePoints: updatedActivePoints,
            range: updatedRange,
            lastUpdatedTranslateX: updatedLastUpdatedTranslateX,
        }
        const newSelectedDataPoint = audioData.dataPoints[0]
        if (!newSelectedDataPoint) return
        dispatch({
            type: 'UPDATE_STATE',
            state: {
                selectedCandle: { ...newSelectedDataPoint, visible: true },
                selectedIndex: 0,
                triggerUpdate: Date.now(),
            },
        })
    }, [dispatch])

    return (
        <View
            style={[styles.container, { marginTop: 20 }]}
            onLayout={handleLayout}
        >
            {mode !== 'live' && showNavigation && (
                <View style={styles.navigationContainer}>
                    <Text>{audioData.samples} samples</Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            width: '100%',
                        }}
                    >
                        <View
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                alignItems: 'center',
                            }}
                        >
                            <Button
                                onPress={() => handlePrevNextSelection('prev')}
                                disabled={selectedCandle === null}
                                title="Prev"
                            />
                            {selectedCandle ? (
                                <Text>{`${selectedIndex + 1} / ${audioData.dataPoints.length}`}</Text>
                            ) : (
                                <Text>{audioData.dataPoints.length} items</Text>
                            )}
                            <Button
                                title="Next"
                                onPress={() => handlePrevNextSelection('next')}
                                disabled={selectedCandle === null}
                            />
                        </View>
                        <Button onPress={handleReset} title="Reset" />
                    </View>
                </View>
            )}
            <GestureHandler
                playing={playing}
                mode={mode}
                translateX={translateX}
                maxTranslateX={maxTranslateX}
                canvasWidth={canvasWidth}
                candleWidth={candleWidth}
                candleSpace={candleSpace}
                totalCandleWidth={totalCandleWidth}
                activePoints={updateActivePointsResult.current.activePoints}
                onDragEnd={handleDragEnd}
                onSelection={handleSelectionChange}
            >
                <View>
                    {ready && (
                        <>
                            <CanvasContainer
                                canvasHeight={canvasHeight}
                                candleWidth={candleWidth}
                                candleSpace={candleSpace}
                                showDottedLine={showDottedLine}
                                showYAxis={showYAxis}
                                showRuler={showRuler}
                                showSilence={showSilence}
                                mode={mode}
                                font={font}
                                startIndex={
                                    updateActivePointsResult.current.range.start
                                }
                                translateX={translateX}
                                activePoints={
                                    updateActivePointsResult.current
                                        .activePoints
                                }
                                algorithm={audioData.amplitudeAlgorithm}
                                maxDisplayedItems={maxDisplayedItems}
                                paddingLeft={paddingLeft}
                                totalCandleWidth={totalCandleWidth}
                                canvasWidth={canvasWidth}
                                selectedCandle={selectedCandle}
                                onSelection={handleSelectionChange}
                                durationMs={audioData.durationMs}
                                minAmplitude={audioData.amplitudeRange.min}
                                maxAmplitude={audioData.amplitudeRange.max}
                                containerStyle={styles.canvasContainer}
                            />
                            <View style={styles.referenceLine} />
                        </>
                    )}
                </View>
            </GestureHandler>
        </View>
    )
}
