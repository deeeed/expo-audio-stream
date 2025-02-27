import React, { useCallback, useState, useEffect } from 'react'
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated'

interface AudioTimeRangeSelectorTheme {
    container: {
        backgroundColor: string
        height: number
        borderRadius: number
    }
    selectedRange: {
        backgroundColor: string
        opacity: number
    }
    handle: {
        backgroundColor: string
        width: number
    }
}

const DEFAULT_THEME: AudioTimeRangeSelectorTheme = {
    container: {
        backgroundColor: '#E5E5E5',
        height: 40,
        borderRadius: 8,
    },
    selectedRange: {
        backgroundColor: '#007AFF',
        opacity: 0.5,
    },
    handle: {
        backgroundColor: '#007AFF',
        width: 16,
    },
}

interface AudioTimeRangeSelectorProps {
    durationMs: number
    startTime: number
    endTime: number
    onRangeChange: (start: number, end: number) => void
    onRangeChangeComplete?: (start: number, end: number) => void
    disabled?: boolean
    theme?: Partial<AudioTimeRangeSelectorTheme>
}

interface TimeLabel {
    time: number
    handle: 'start' | 'end' | null
    position?: number
}

export function AudioTimeRangeSelector({
    durationMs,
    startTime,
    endTime,
    onRangeChange,
    onRangeChangeComplete,
    disabled,
    theme: customTheme,
}: AudioTimeRangeSelectorProps) {
    const theme = {
        container: { ...DEFAULT_THEME.container, ...customTheme?.container },
        selectedRange: {
            ...DEFAULT_THEME.selectedRange,
            ...customTheme?.selectedRange,
        },
        handle: { ...DEFAULT_THEME.handle, ...customTheme?.handle },
    }
    const [containerWidth, setContainerWidth] = useState(0)
    const [activeLabel, setActiveLabel] = useState<TimeLabel | null>(null)
    const isDragging = useSharedValue(false)
    const activeHandle = useSharedValue<'start' | 'end' | null>(null)

    const startPosition = useSharedValue(0)
    const endPosition = useSharedValue(0)

    const lastUpdate = useSharedValue({ start: startTime, end: endTime })

    const updateTimeout = useSharedValue<number | null>(null)

    useEffect(() => {
        if (containerWidth === 0 || durationMs === 0 || isDragging.value) return

        // Clear any existing timeout
        if (updateTimeout.value) {
            clearTimeout(updateTimeout.value)
        }

        // Set a new timeout to update positions after a delay
        updateTimeout.value = setTimeout(() => {
            // Check if the time range is valid
            const isValidRange =
                startTime >= 0 &&
                endTime > startTime &&
                endTime <= durationMs &&
                endTime - startTime >= 100

            // If range is invalid, default to full range
            const validStartTime = isValidRange ? startTime : 0
            const validEndTime = isValidRange ? endTime : durationMs

            lastUpdate.value = { start: validStartTime, end: validEndTime }
            startPosition.value = (validStartTime / durationMs) * containerWidth
            endPosition.value = (validEndTime / durationMs) * containerWidth

            // Notify of the range change if using default values
            if (!isValidRange) {
                runOnJS(onRangeChange)(validStartTime, validEndTime)
            }
        }, 100) as unknown as number

        // Cleanup timeout
        return () => {
            if (updateTimeout.value) {
                clearTimeout(updateTimeout.value)
            }
        }
    }, [startTime, endTime, durationMs, containerWidth])

    const createHandleGesture = (isStart: boolean) => {
        return Gesture.Pan()
            .enabled(!disabled)
            .activeOffsetX([-5, 5])
            .activateAfterLongPress(0)
            .onStart(() => {
                'worklet'
                isDragging.value = true
                activeHandle.value = isStart ? 'start' : 'end'
                const currentTime = isStart
                    ? lastUpdate.value.start
                    : lastUpdate.value.end
                runOnJS(setActiveLabel)({
                    time: currentTime,
                    handle: isStart ? 'start' : 'end',
                })
            })
            .onChange((event) => {
                'worklet'
                const position = isStart ? startPosition : endPosition
                const handleWidth = theme.handle.width
                const maxX = containerWidth - handleWidth

                const newPosition = position.value + event.changeX
                const clampedX = Math.min(Math.max(0, newPosition), maxX)

                position.value = isStart
                    ? Math.min(clampedX, endPosition.value - handleWidth - 20)
                    : Math.max(clampedX, startPosition.value + handleWidth + 20)

                const newTimeMs = Math.round(
                    (position.value / containerWidth) * durationMs
                )
                const clampedTimeMs = isStart
                    ? Math.min(
                          Math.max(0, newTimeMs),
                          lastUpdate.value.end - 100
                      )
                    : Math.min(
                          Math.max(lastUpdate.value.start + 100, newTimeMs),
                          durationMs
                      )

                if (isStart) {
                    lastUpdate.value = {
                        ...lastUpdate.value,
                        start: clampedTimeMs,
                    }
                } else {
                    lastUpdate.value = {
                        ...lastUpdate.value,
                        end: clampedTimeMs,
                    }
                }

                runOnJS(setActiveLabel)({
                    time: clampedTimeMs,
                    handle: isStart ? 'start' : 'end',
                })
            })
            .onFinalize(() => {
                'worklet'
                const finalStart = lastUpdate.value.start
                const finalEnd = lastUpdate.value.end

                isDragging.value = false
                activeHandle.value = null
                runOnJS(setActiveLabel)(null)

                // Emit both range change and complete at the end
                runOnJS(onRangeChange)(finalStart, finalEnd)
                if (onRangeChangeComplete) {
                    runOnJS(onRangeChangeComplete)(finalStart, finalEnd)
                }
            })
    }

    const startHandleGesture = createHandleGesture(true)
    const endHandleGesture = createHandleGesture(false)

    const formatTime = useCallback((ms: number) => {
        if (typeof ms !== 'number' || isNaN(ms)) {
            return '0:00' // Safe fallback
        }
        const seconds = Math.floor(ms / 1000)
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }, [])

    const labelStyle = useAnimatedStyle(() => ({
        opacity: isDragging.value ? 1 : 0,
        transform: [
            { translateX: -20 },
            { translateY: isDragging.value ? 0 : 10 },
        ],
    }))

    const startHandleAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: startPosition.value }],
        backgroundColor:
            activeHandle.value === 'start'
                ? withTiming('#0056b3')
                : withTiming(theme.handle.backgroundColor),
    }))

    const endHandleAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: endPosition.value - theme.handle.width }],
        backgroundColor:
            activeHandle.value === 'end'
                ? withTiming('#0056b3')
                : withTiming(theme.handle.backgroundColor),
    }))

    const selectedRangeStyle = useAnimatedStyle(() => ({
        left: startPosition.value,
        right: containerWidth - endPosition.value,
        backgroundColor: theme.selectedRange.backgroundColor,
        opacity: theme.selectedRange.opacity,
    }))

    const handleLayout = useCallback(
        (event: LayoutChangeEvent) => {
            const width = event.nativeEvent.layout.width
            setContainerWidth(width)

            startPosition.value = (lastUpdate.value.start / durationMs) * width
            endPosition.value = (lastUpdate.value.end / durationMs) * width
        },
        [durationMs]
    )

    return (
        <View
            onLayout={handleLayout}
            style={[styles.container, { height: theme.container.height + 30 }]}
        >
            <View
                style={[
                    styles.rangeContainer,
                    {
                        backgroundColor: theme.container.backgroundColor,
                        height: theme.container.height,
                        borderRadius: theme.container.borderRadius,
                    },
                ]}
            >
                <View style={styles.gestureContainer}>
                    <Animated.View
                        style={[styles.selectedRange, selectedRangeStyle]}
                    />
                    <GestureDetector gesture={startHandleGesture}>
                        <Animated.View
                            pointerEvents="auto"
                            hitSlop={{
                                left: 32,
                                right: 32,
                                top: 32,
                                bottom: 32,
                            }}
                            style={[
                                styles.handle,
                                { width: theme.handle.width },
                                startHandleAnimatedStyle,
                                styles.handleTouchable,
                            ]}
                        />
                    </GestureDetector>
                    <GestureDetector gesture={endHandleGesture}>
                        <Animated.View
                            pointerEvents="auto"
                            hitSlop={{
                                left: 32,
                                right: 32,
                                top: 32,
                                bottom: 32,
                            }}
                            style={[
                                styles.handle,
                                { width: theme.handle.width },
                                endHandleAnimatedStyle,
                                styles.handleTouchable,
                            ]}
                        />
                    </GestureDetector>
                </View>
            </View>
            {activeLabel && typeof activeLabel.time === 'number' && (
                <Animated.View
                    style={[
                        styles.timeLabel,
                        labelStyle,
                        activeLabel.handle === 'start'
                            ? styles.leftLabel
                            : styles.rightLabel,
                    ]}
                >
                    <Text style={styles.timeLabelText}>
                        {formatTime(activeLabel.time)}
                    </Text>
                </Animated.View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    rangeContainer: {
        overflow: 'hidden',
    },
    gestureContainer: {
        flex: 1,
        position: 'relative',
    },
    selectedRange: {
        position: 'absolute',
        top: 0,
        bottom: 0,
    },
    handle: {
        position: 'absolute',
        height: '100%',
    },
    handleTouchable: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    timeLabel: {
        position: 'absolute',
        top: -25,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 4,
        borderRadius: 4,
    },
    timeLabelText: {
        color: 'white',
        fontSize: 12,
    },
    leftLabel: {
        left: 0,
    },
    rightLabel: {
        right: 0,
    },
})
