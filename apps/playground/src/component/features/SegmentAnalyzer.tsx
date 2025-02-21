import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTheme, useTheme, useToast } from '@siteed/design-system'
import { AudioAnalysis, AudioFeaturesOptions, DataPoint, extractAudioAnalysis } from '@siteed/expo-audio-stream'
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { baseLogger } from '../../config'
import { useAudioSegmentData } from '../../hooks/useAudioSegmentData'
import { isWeb } from '../../utils/utils'
import { FeatureViewer } from './FeatureViewer'
import { HexDataViewer } from '../HexDataViewer'
import { SpeechAnalyzer } from './SpeechAnalyzer'

const logger = baseLogger.extend('SegmentAnalyzer')

const getStyles = (theme: AppTheme) => StyleSheet.create({
    container: {
        gap: theme.spacing.gap,
    },
    iconButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.gap,
    },
    resultsContainer: {
        gap: theme.spacing.gap,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.padding.s,
    },
    label: {
        fontWeight: '500',
        marginRight: theme.spacing.gap,
        color: theme.colors.onSurfaceVariant,
    },
    value: {
        color: theme.colors.onSurfaceVariant,
    },
    featuresSection: {
        gap: theme.spacing.gap,
    },
    segmentInfo: {
        padding: theme.padding.s,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
        gap: theme.spacing.gap,
    },
    attributeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.gap,
    },
    detectionRow: {
        flexDirection: 'row',
        gap: theme.spacing.gap,
        paddingVertical: theme.padding.s,
    },
    speechSection: {
        padding: theme.padding.m,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
        gap: theme.spacing.gap,
    },
    checksumValue: {
        fontFamily: 'monospace',
        color: theme.colors.onSurfaceVariant,
    },
    metricsContainer: {
        padding: theme.padding.s,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
        gap: theme.spacing.gap,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.padding.s,
    },
    metricLabel: {
        fontWeight: '500',
        color: theme.colors.onSecondaryContainer,
    },
    metricValue: {
        color: theme.colors.onSecondaryContainer,
        fontFamily: 'monospace',
    },
    amplitudeRange: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.gap,
    },
    rangeLabel: {
        color: theme.colors.onSecondaryContainer,
        fontSize: 12,
    },
    rangeValue: {
        color: theme.colors.onSecondaryContainer,
        fontFamily: 'monospace',
    },
})

interface SegmentAnalyzerProps {
    dataPoint: DataPoint
    fileUri: string
    sampleRate: number
    onError?: (error: Error) => void
    analysisConfig: {
        pointsPerSecond: number
        features?: AudioFeaturesOptions
    }
    bitDepth?: number
}

export function SegmentAnalyzer({ 
    dataPoint, 
    fileUri, 
    sampleRate,
    onError,
    analysisConfig,
    bitDepth = 16
}: SegmentAnalyzerProps) {
    const theme = useTheme()
    const styles = getStyles(theme)
    const [isProcessing, setIsProcessing] = useState(false)
    const [segmentAnalysis, setSegmentAnalysis] = useState<AudioAnalysis>()
    const [processingTime, setProcessingTime] = useState<number>()
    const { show } = useToast()

    const { byteArray, isLoading } = useAudioSegmentData({
        fileUri,
        selectedDataPoint: dataPoint,
        bitDepth
    })

    // Calculate positions for display
    const startPosition = dataPoint.startPosition ?? (dataPoint.startTime ?? 0) * sampleRate * 2
    const endPosition = dataPoint.endPosition ?? (dataPoint.endTime ?? 0) * sampleRate * 2
    const length = endPosition - startPosition
    const durationMs = (length / (sampleRate * 2)) * 1000

    const handleProcessSegment = useCallback(async () => {
        if(isWeb) {
            show({type: 'warning', message: 'Segment analysis is not supported on web (yet)'})
            return;
        }
        
        logger.info('Processing segment with config:', {
            startPosition: dataPoint.startPosition,
            endPosition: dataPoint.endPosition,
            startTime: dataPoint.startTime,
            endTime: dataPoint.endTime,
            sampleRate,
            samples: dataPoint.samples,
            analysisConfig
        })

        if (startPosition === undefined || endPosition === undefined) {
            const error = new Error('Could not determine segment position. Missing time or position data.')
            logger.error('Failed to process segment:', {
                error,
                dataPoint,
                calculatedStart: startPosition,
                calculatedEnd: endPosition
            })
            onError?.(error)
            return
        }

        logger.info('Calculated segment positions:', {
            startPosition,
            endPosition,
            length,
            durationMs
        })

        try {
            setIsProcessing(true)
            const startTime = performance.now()

            const segmentResult = await extractAudioAnalysis({
                fileUri,
                position: startPosition,
                length,
                pointsPerSecond: analysisConfig.pointsPerSecond,
                features: analysisConfig.features,
            })

            const timeElapsed = performance.now() - startTime
            
            logger.info('Segment Analysis Complete:', {
                processingTimeMs: timeElapsed.toFixed(2),
                segmentDuration: segmentResult.durationMs,
                dataPoints: segmentResult.dataPoints.length,
                amplitudeRange: segmentResult.amplitudeRange,
                firstDataPoint: segmentResult.dataPoints[0],
                lastDataPoint: segmentResult.dataPoints[segmentResult.dataPoints.length - 1],
                features: segmentResult.dataPoints[0]?.features 
                    ? Object.keys(segmentResult.dataPoints[0].features)
                    : 'No features computed'
            })

            setProcessingTime(timeElapsed)
            setSegmentAnalysis(segmentResult)
        } catch (error) {
            logger.error('Failed to process segment:', {
                error,
                fileUri,
                startPosition,
                endPosition,
                config: analysisConfig
            })
            onError?.(error instanceof Error ? error : new Error('Failed to process segment'))
        } finally {
            setIsProcessing(false)
        }
    }, [dataPoint, sampleRate, analysisConfig, startPosition, endPosition, length, durationMs, show, onError, fileUri])

    return (
        <View style={styles.container}>
            <View style={styles.segmentInfo}>
                <View style={styles.resultRow}>
                    <Text style={styles.label}>Start Position:</Text>
                    <Text style={styles.value}>{startPosition} bytes</Text>
                </View>
                <View style={styles.resultRow}>
                    <Text style={styles.label}>End Position:</Text>
                    <Text style={styles.value}>{endPosition} bytes</Text>
                </View>
                <View style={styles.resultRow}>
                    <Text style={styles.label}>Length:</Text>
                    <Text style={styles.value}>{length} bytes</Text>
                </View>
                <View style={styles.resultRow}>
                    <Text style={styles.label}>Duration:</Text>
                    <Text style={styles.value}>{(durationMs / 1000).toFixed(3)}s</Text>
                </View>
            </View>

            <View style={styles.metricsContainer}>
                <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Amplitude:</Text>
                    <View style={styles.amplitudeRange}>
                        <Text style={styles.metricValue}>{dataPoint.amplitude.toFixed(3)}</Text>
                        {dataPoint.features?.maxAmplitude !== undefined && dataPoint.features?.minAmplitude !== undefined && (
                            <Text style={styles.rangeLabel}>
                                (range: {dataPoint.features.minAmplitude.toFixed(3)} to {dataPoint.features.maxAmplitude.toFixed(3)})
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>RMS:</Text>
                    <Text style={styles.metricValue}>{dataPoint.rms.toFixed(3)}</Text>
                </View>
                <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Decibels:</Text>
                    <Text style={styles.metricValue}>{dataPoint.dB.toFixed(1)} dB</Text>
                </View>
            </View>

            <Button
                mode="contained-tonal"
                onPress={handleProcessSegment}
                loading={isProcessing}
                disabled={isProcessing}
            >
                <View style={styles.iconButton}>
                    <MaterialCommunityIcons
                        name="waveform"
                        size={20}
                        color={theme.colors.onSecondaryContainer}
                    />
                    <Text style={{ color: theme.colors.onSecondaryContainer }}>
                        Analyze Segment
                    </Text>
                </View>
            </Button>

            {segmentAnalysis && (
                <View style={styles.resultsContainer}>
                    <View style={styles.resultRow}>
                        <Text style={styles.label}>Processing Time:</Text>
                        <Text style={styles.value}>{processingTime?.toFixed(2)}ms</Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.label}>Data Points:</Text>
                        <Text style={styles.value}>{segmentAnalysis.dataPoints.length}</Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.label}>Samples:</Text>
                        <Text style={styles.value}>{dataPoint.samples}</Text>
                    </View>
                    {dataPoint.features?.dataChecksum !== undefined && (
                        <View style={styles.resultRow}>
                            <Text style={styles.label}>Checksum:</Text>
                            <Text style={styles.checksumValue}>
                                {`0x${dataPoint.features?.dataChecksum.toString(16).padStart(8, '0')}`}
                            </Text>
                        </View>
                    )}
                    
                    <SpeechAnalyzer analysis={segmentAnalysis} />

                    {segmentAnalysis.dataPoints[0]?.features && (
                        <View style={styles.featuresSection}>
                            <FeatureViewer features={segmentAnalysis.dataPoints[0].features} />
                        </View>
                    )}
                </View>
            )}

            {isLoading ? (
                <ActivityIndicator />
            ) : byteArray && (
                <HexDataViewer
                    byteArray={byteArray}
                    bitDepth={bitDepth}
                />
            )}
        </View>
    )
} 