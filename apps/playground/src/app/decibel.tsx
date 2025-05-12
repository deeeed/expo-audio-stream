import React, { useCallback, useMemo, useState } from 'react'

import { Ionicons } from '@expo/vector-icons'
import { Canvas, useFont } from '@shopify/react-native-skia'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import type { AppTheme } from '@siteed/design-system'
import { Button, ScreenWrapper, useTheme } from '@siteed/design-system'
import { useSharedAudioRecorder } from '@siteed/expo-audio-studio'
import { DecibelGauge } from '@siteed/expo-audio-ui'

import { DecibelGaugeSettings } from '../component/DecibelGaugeSettings'
import { baseLogger } from '../config'
import { useScreenHeader } from '../hooks/useScreenHeader'

import type { GaugeSettings } from '../component/DecibelGaugeSettings'

const logger = baseLogger.extend('DecibelScreen')

const getStyles = ({ theme, insets }: { theme: AppTheme, insets?: { bottom: number, top: number } }) => {
    return StyleSheet.create({
        container: {
            gap: theme.spacing.gap || 16,
            paddingHorizontal: theme.padding.s,
            paddingBottom: insets?.bottom ?? 80,
            paddingTop: 0,
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
    useScreenHeader({
        title: 'Decibel Meter',
        backBehavior: {
            fallbackUrl: '/more',
        },
    })
    
    const font = useFont(require('@assets/Roboto/Roboto-Regular.ttf'), 30)

    const {
        startRecording,
        stopRecording,
        isRecording,
        analysisData,
    } = useSharedAudioRecorder()

    // Gauge configuration state
    const [gaugeSettings, setGaugeSettings] = useState<GaugeSettings>({
        inputFormat: 'dBFS',
        outputFormat: 'dB SPL',
        showTickMarks: true,
        showNeedle: false,
        showValue: true,
        showUnit: true,
        dbRange: '-60_0',
        minDb: -60,
        maxDb: 0,
    })

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

    const handleGaugeSettingsChange = useCallback((settings: Partial<GaugeSettings>) => {
        setGaugeSettings((prev) => ({
            ...prev,
            ...settings,
        }))
    }, [])

    const gaugeTheme = useMemo(() => ({
        minDb: gaugeSettings.minDb,
        maxDb: gaugeSettings.maxDb,
        backgroundColor: '#333333',
        size: {
            width: 300,
            height: 220,
        },
        text: {
            yOffset: 10,
            xOffset: -35,
        },
    }), [gaugeSettings.minDb, gaugeSettings.maxDb])

    return (
        <ScreenWrapper 
            withScrollView 
            useInsets={false} 
            contentContainerStyle={styles.container}
        >
            {/* Gauge Settings Component */}
            <DecibelGaugeSettings 
                settings={gaugeSettings}
                onChange={handleGaugeSettingsChange}
                disabled={isRecording}
            />
            
            <View style={styles.gaugeContainer}>                
                <View style={styles.visualizationContainer}>
                    <Canvas style={styles.gaugeCanvas}>
                        <DecibelGauge
                            db={currentDb}
                            showTickMarks={gaugeSettings.showTickMarks}
                            showUnit={gaugeSettings.showUnit}
                            inputFormat={gaugeSettings.inputFormat}
                            outputFormat={gaugeSettings.outputFormat}
                            theme={gaugeTheme}
                            showValue={gaugeSettings.showValue}
                            showNeedle={gaugeSettings.showNeedle}
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
                        name={isRecording ? 'stop-circle' : 'mic'} 
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