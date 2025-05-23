import React, { useCallback, useEffect, useState } from 'react'

import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'

import type { AppTheme } from '@siteed/design-system'
import { useTheme } from '@siteed/design-system'
import type { AudioAnalysis, AudioFeaturesOptions, BitDepth, DataPoint } from '@siteed/expo-audio-studio'
import { extractAudioAnalysis } from '@siteed/expo-audio-studio'

import { baseLogger } from '../../config'
import { useAudioSegmentData } from '../../hooks/useAudioSegmentData'
import { HexDataViewer } from '../HexDataViewer'
import { PCMPlayer } from '../PCMPlayer'
import { FeatureViewer } from './FeatureViewer'
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
        padding: theme.spacing.gap,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
        gap: theme.spacing.gap,
    },
    byteRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.gap,
    },
    byteRangeLabel: {
        color: theme.colors.onSecondaryContainer,
        fontWeight: '500',
    },
    byteRangeValue: {
        color: theme.colors.onSecondaryContainer,
        fontFamily: 'monospace',
    },
    byteRangeBracket: {
        color: theme.colors.onSecondaryContainer,
        opacity: 0.7,
    },
    lengthInfo: {
        color: theme.colors.onSecondaryContainer,
        opacity: 0.7,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.gap,
    },
    separator: {
        color: theme.colors.onSurfaceVariant,
        marginHorizontal: theme.spacing.gap,
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
        segmentDurationMs: number
        features?: AudioFeaturesOptions
    }
    bitDepth?: BitDepth
}

export function SegmentAnalyzer({ 
    dataPoint, 
    fileUri, 
    sampleRate,
    onError,
    analysisConfig,
    bitDepth = 16,
}: SegmentAnalyzerProps) {
    const theme = useTheme()
    const styles = getStyles(theme)
    const [isProcessing, setIsProcessing] = useState(false)
    const [segmentAnalysis, setSegmentAnalysis] = useState<AudioAnalysis>()
    const [processingTime, setProcessingTime] = useState<number>()

    const { audioData, isLoading } = useAudioSegmentData({
        fileUri,
        selectedDataPoint: dataPoint,
        bitDepth,
        includeNormalizedData: true,
    })

    // Calculate positions for display
    const startPosition = dataPoint.startPosition ?? (dataPoint.startTime ?? 0) * sampleRate * 2  // startTime is in seconds
    const endPosition = dataPoint.endPosition ?? (dataPoint.endTime ?? 0) * sampleRate * 2  // endTime is in seconds
    const length = endPosition - startPosition
    const durationMs = dataPoint.startTime !== undefined && !isNaN(dataPoint.startTime) && 
                       dataPoint.endTime !== undefined && !isNaN(dataPoint.endTime)
        ? (dataPoint.endTime - dataPoint.startTime) * 1000  // Convert seconds to ms
        : (length / (sampleRate * 2)) * 1000  // Position-based duration

    logger.info('Duration calculation:', {
        startTime: dataPoint.startTime,
        endTime: dataPoint.endTime,
        startPosition,
        endPosition,
        length,
        durationMs,
    })

    const handleProcessSegment = useCallback(async () => {
        logger.info('Processing segment with config:', {
            startPosition: dataPoint.startPosition,
            endPosition: dataPoint.endPosition,
            startTime: dataPoint.startTime,
            endTime: dataPoint.endTime,
            sampleRate,
            samples: dataPoint.samples,
            analysisConfig,
        })

        if (startPosition === undefined || endPosition === undefined) {
            const error = new Error('Could not determine segment position. Missing time or position data.')
            logger.error('Failed to process segment:', {
                error,
                dataPoint,
                calculatedStart: startPosition,
                calculatedEnd: endPosition,
            })
            onError?.(error)
            return
        }

        logger.info('Calculated segment positions:', {
            startPosition,
            endPosition,
            startTime: dataPoint.startTime,
            endTime: dataPoint.endTime,
            length,
            durationMs,
        })

        try {
            setIsProcessing(true)
            const startTime = performance.now()

            const segmentResult = await extractAudioAnalysis({
                fileUri,
                ...(startPosition !== undefined && length !== undefined
                    ? {
                          position: startPosition,
                          length: length,
                      }
                    : {
                          startTimeMs: dataPoint.startTime !== undefined && !isNaN(dataPoint.startTime) ? dataPoint.startTime * 1000 : 0,  // Convert seconds to ms
                          endTimeMs: dataPoint.endTime !== undefined && !isNaN(dataPoint.endTime) ? dataPoint.endTime * 1000 : 0,  // Convert seconds to ms
                      }),
                segmentDurationMs: analysisConfig.segmentDurationMs,
                features: analysisConfig.features,
                logger: baseLogger.extend('SegmentAnalyzer'),
                decodingOptions: {
                    targetSampleRate: sampleRate,
                    targetChannels: 1,
                    targetBitDepth: bitDepth,
                    normalizeAudio: false,
                },
            })

            const timeElapsed = performance.now() - startTime

            setProcessingTime(timeElapsed)
            setSegmentAnalysis(segmentResult)
        } catch (error) {
            logger.error('Failed to process segment:', {
                error,
                fileUri,
                startPosition,
                endPosition,
                config: analysisConfig,
            })
            onError?.(error instanceof Error ? error : new Error('Failed to process segment'))
        } finally {
            setIsProcessing(false)
        }
    }, [dataPoint, sampleRate, analysisConfig, startPosition, endPosition, length, durationMs, onError, fileUri, bitDepth])

    // Add useEffect to automatically process segment when dataPoint changes
    useEffect(() => {
        handleProcessSegment()
    }, [dataPoint, handleProcessSegment])

    return (
        <View style={styles.container}>
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
                        Refresh Analysis
                    </Text>
                </View>
            </Button>

            <View style={styles.segmentInfo}>
                <View style={styles.metricRow}>
                    <Text style={styles.byteRangeLabel}>ByteRange:</Text>
                    <View style={styles.byteRangeContainer}>
                        <Text style={styles.byteRangeBracket}>[</Text>
                        <Text style={styles.byteRangeValue}>{startPosition}</Text>
                        <Text style={styles.byteRangeBracket}>..</Text>
                        <Text style={styles.byteRangeValue}>{endPosition}</Text>
                        <Text style={styles.byteRangeBracket}>]</Text>
                        <Text style={styles.lengthInfo}>({length}b)</Text>
                    </View>
                </View>
                <View style={styles.metricRow}>
                    <Text style={styles.byteRangeLabel}>Duration:</Text>
                    <Text style={styles.byteRangeValue}>{(durationMs / 1000).toFixed(3)}s</Text>
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
                    {dataPoint.features?.crc32 !== undefined && (
                        <View style={styles.resultRow}>
                            <Text style={styles.label}>Checksum:</Text>
                            <Text style={styles.checksumValue}>
                                0x{dataPoint.features?.crc32.toString(16).toUpperCase().padStart(8, '0')}
                            </Text>
                        </View>
                    )}
                    
                    <SpeechAnalyzer 
                        analysis={segmentAnalysis}
                        audioData={audioData}
                        sampleRate={sampleRate}
                        fileUri={fileUri}
                    />

                    {segmentAnalysis.dataPoints[0]?.features && (
                        <View style={styles.featuresSection}>
                            <FeatureViewer features={segmentAnalysis.dataPoints[0].features} />
                        </View>
                    )}
                </View>
            )}

            {isLoading ? (
                <ActivityIndicator />
            ) : audioData?.pcmData && (
                <>
                    <PCMPlayer
                        data={audioData?.pcmData}
                        sampleRate={sampleRate}
                        bitDepth={bitDepth}
                    />
                    <HexDataViewer
                        byteArray={audioData?.pcmData}
                        bitDepth={bitDepth}
                        shouldComputeChecksum
                    />
                </>
            )}
        </View>
    )
} 