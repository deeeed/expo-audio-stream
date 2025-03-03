import { Ionicons } from '@expo/vector-icons'
import { Canvas, useFont } from '@shopify/react-native-skia'
import { AppTheme, Button, ScreenWrapper, useTheme } from '@siteed/design-system'
import { useSharedAudioRecorder } from '@siteed/expo-audio-studio'
import { DecibelGauge } from '@siteed/expo-audio-ui'
import React, { useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { baseLogger } from '../config'

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
        metersContainer: {
            marginTop: 20,
            width: '100%',
            alignItems: 'center',
        },
        verticalMeterCanvas: {
            width: 80,
            height: 200,
        },
        horizontalMeterCanvas: {
            width: 300,
            height: 50,
        },
        meterLabel: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.onSurface,
            marginTop: 10,
        },
        visualizationContainer: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        segmentedButtonContainer: {
            marginBottom: 16,
        },
        gaugeCanvas: {
            width: 300,
            height: 180,
        },
    })
}

export default function DecibelScreen() {
    const theme = useTheme()
    const { bottom, top } = useSafeAreaInsets()
    const styles = useMemo(() => getStyles({ theme, insets: { bottom, top } }), [theme, bottom, top])
    
    const font = useFont(require('@assets/Roboto/Roboto-Regular.ttf'), 30)

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
    

    const handleToggleRecording = useCallback(async () => {
        logger.info('handleToggleRecording', { isRecording })
        if (isRecording) {
            await stopRecording()
        } else {
            await startRecording({
                sampleRate: 16000,
                enableProcessing: true,
                intervalAnalysis: 100, // Update every 100ms
            })
        }
    }, [isRecording, startRecording, stopRecording])

    return (
        <ScreenWrapper 
            withScrollView 
            useInsets={false} 
            contentContainerStyle={styles.container}
        >
            <View style={styles.gaugeContainer}>                
                <View style={styles.visualizationContainer}>
                    <Canvas style={styles.gaugeCanvas}>
                        <DecibelGauge
                            db={currentDb}
                            showTickMarks
                            showUnit={true}
                            inputFormat="dBFS"
                            outputFormat="dB SPL"
                            theme={{
                                minDb: -60,
                                maxDb: 0,
                                backgroundColor: '#333333',
                                size: {
                                    width: 300,
                                    height: 220,
                                },
                                text: {
                                    yOffset: 10,
                                    xOffset: -35,
                                },
                            }}
                            showValue
                            showNeedle={false}
                            font={font}
                        />
                    </Canvas>
                </View>
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