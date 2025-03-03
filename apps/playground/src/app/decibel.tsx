import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useFont , Canvas } from '@shopify/react-native-skia'
import { AppTheme, Button, ScreenWrapper, useConfirm, useTheme } from '@siteed/design-system'
import { useSharedAudioRecorder } from '@siteed/expo-audio-stream'
import { DecibelGauge } from '@siteed/expo-audio-ui'
import React, { useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { baseLogger } from '../config'
import { Ionicons } from '@expo/vector-icons'

const logger = baseLogger.extend('DecibelScreen')

const getStyles = ({ theme, insets }: { theme: AppTheme, insets?: { bottom: number, top: number } }) => {
    return StyleSheet.create({
        container: {
            gap: theme.spacing.gap || 16,
            paddingHorizontal: theme.padding.s,
            paddingBottom: insets?.bottom || 80,
            paddingTop: Math.max(insets?.top || 0, 10),
        },
        gaugeContainer: {
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
        },
    })
}

export default function DecibelScreen() {
    const theme = useTheme()
    const { bottom, top } = useSafeAreaInsets()
    const navigation = useNavigation()
    const styles = useMemo(() => getStyles({ theme, insets: { bottom, top } }), [theme, bottom, top])
    
    const font = useFont(require('@assets/Roboto/Roboto-Regular.ttf'), 24)
    
    const {
        startRecording,
        stopRecording,
        isRecording,
        analysisData
    } = useSharedAudioRecorder()

    const currentDb = useMemo(() => {
        if (!analysisData?.dataPoints.length) return -60
        const lastPoint = analysisData.dataPoints[analysisData.dataPoints.length - 1]
        return lastPoint.dB || -60
    }, [analysisData])

    const confirm = useConfirm()
    
    // Handle navigation state changes
    useFocusEffect(
        useCallback(() => {
            const unsubscribe = navigation.addListener('beforeRemove', (e) => {
                if (!isRecording) return

                // Prevent default behavior of leaving the screen
                e.preventDefault()

                // Show confirmation dialog
                confirm({
                    title: 'Stop Recording?',
                    notice: 'Leaving this screen will stop the current recording. Do you want to continue?',
                    confirmButton: {
                        label: 'Stop & Leave',
                        mode: 'contained',
                    },
                    cancelButton: {
                        label: 'Stay',
                    },
                    onConfirm: async () => {
                        try {
                            await stopRecording()
                            navigation.dispatch(e.data.action)
                        } catch (error) {
                            logger.error('Error stopping recording:', error)
                        }
                    }
                })
            })

            return unsubscribe
        }, [navigation, isRecording, stopRecording, confirm, theme])
    )

    const handleToggleRecording = async () => {
        if (isRecording) {
            await stopRecording()
        } else {
            await startRecording({
                sampleRate: 44100,
                enableProcessing: true,
                intervalAnalysis: 100, // Update every 100ms
                features: {
                    rms: true // Enable RMS calculation for dB values
                }
            })
        }
    }

    return (
        <ScreenWrapper 
            withScrollView 
            useInsets={false} 
            contentContainerStyle={styles.container}
        >
            <View style={styles.gaugeContainer}>
                <Canvas style={{ width: 300, height: 150 }}>
                    <DecibelGauge
                        db={currentDb}
                        theme={{
                            minDb: -60,
                            maxDb: 0,
                            backgroundColor: theme.colors.surfaceVariant,
                            colors: {
                                low: theme.colors.primary,
                                mid: theme.colors.warning,
                                high: theme.colors.error
                            },
                            size: {
                                width: 300,
                                height: 150
                            }
                        }}
                        showValue
                        font={font}
                    />
                </Canvas>
            </View>
            
            <Button 
                mode="contained"
                onPress={handleToggleRecording}
                color={isRecording ? theme.colors.error : theme.colors.primary}
                icon={() => (
                    <Ionicons 
                        name={isRecording ? "stop-circle" : "mic"} 
                        size={20} 
                        color="white"
                    />
                )}
            >
                {isRecording ? 'Stop' : 'Start'} Recording
            </Button>
        </ScreenWrapper>
    )
} 