import { MaterialIcons } from '@expo/vector-icons'
import React, { useEffect } from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import Animated, {
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    useSharedValue,
} from 'react-native-reanimated'

interface StyleProps {
    size?: number
    backgroundColor?: string
    activeBackgroundColor?: string
    pulseColor?: string
    shadowProps?: {
        color?: string
        offset?: { width: number; height: number }
        opacity?: number
        radius?: number
    }
    iconSize?: number
    iconColor?: string
}

export interface RecordButtonProps {
    isRecording: boolean
    isProcessing: boolean
    onPress: () => void
    styles?: StyleProps
}

export const RecordButton = ({
    isRecording,
    isProcessing,
    onPress,
    styles: customStyles,
}: RecordButtonProps) => {
    const scale = useSharedValue(1)
    const pulseScale = useSharedValue(1)
    const pulseOpacity = useSharedValue(0)

    useEffect(() => {
        if (isRecording) {
            scale.value = withSpring(0.9)

            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 100 }),
                    withTiming(2, { duration: 500 })
                ),
                -1,
                false
            )
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 100 }),
                    withTiming(0, { duration: 500 })
                ),
                -1,
                false
            )
        } else {
            scale.value = withSpring(1)
            pulseScale.value = 1
            pulseOpacity.value = 0
        }
    }, [isRecording, scale, pulseScale, pulseOpacity])

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }))

    const styles = getStyles(customStyles)

    return (
        <Animated.View style={buttonStyle}>
            {isRecording && (
                <Animated.View style={[styles.pulseContainer, pulseStyle]} />
            )}
            <TouchableOpacity
                style={[
                    styles.recordButton,
                    (isRecording || isProcessing) && styles.recordingButton,
                ]}
                onPress={onPress}
                disabled={isRecording || isProcessing}
            >
                <MaterialIcons
                    name={isRecording ? 'stop' : 'mic'}
                    size={customStyles?.iconSize ?? 30}
                    color={customStyles?.iconColor ?? 'white'}
                />
            </TouchableOpacity>
        </Animated.View>
    )
}

const getStyles = (customStyles?: StyleProps) => {
    const size = customStyles?.size ?? 80
    const borderRadius = size / 2

    return StyleSheet.create({
        recordButton: {
            width: size,
            height: size,
            borderRadius,
            backgroundColor: customStyles?.backgroundColor ?? '#ff4444',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: customStyles?.shadowProps?.color ?? '#000',
            shadowOffset: customStyles?.shadowProps?.offset ?? {
                width: 0,
                height: 2,
            },
            shadowOpacity: customStyles?.shadowProps?.opacity ?? 0.25,
            shadowRadius: customStyles?.shadowProps?.radius ?? 3.84,
            elevation: 5,
        },
        recordingButton: {
            backgroundColor: customStyles?.activeBackgroundColor ?? '#ff0000',
        },
        pulseContainer: {
            position: 'absolute',
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: customStyles?.pulseColor ?? '#ff4444',
            opacity: 0.3,
            top: -10,
            left: -10,
        },
    })
}
