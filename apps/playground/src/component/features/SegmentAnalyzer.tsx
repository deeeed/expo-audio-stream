import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTheme, useTheme } from '@siteed/design-system'
import { AudioAnalysis, AudioFeaturesOptions, DataPoint, extractAudioAnalysis } from '@siteed/expo-audio-stream'
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { baseLogger } from '../../config'
import { FeatureViewer } from './FeatureViewer'

const logger = baseLogger.extend('SegmentAnalyzer')

const getStyles = (theme: AppTheme) => StyleSheet.create({
    container: {
        marginTop: theme.margin.m,
        padding: theme.padding.m,
        borderRadius: theme.roundness,
        backgroundColor: theme.colors.surfaceVariant,
    },
    iconButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    resultsContainer: {
        marginTop: theme.margin.m,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.padding.s,
    },
    label: {
        fontWeight: '500',
        marginRight: theme.margin.s,
        color: theme.colors.onSurfaceVariant,
    },
    value: {
        color: theme.colors.onSurfaceVariant,
    },
    featuresSection: {
        marginTop: theme.margin.s,
    },
    segmentInfo: {
        marginTop: theme.margin.s,
        marginBottom: theme.margin.m,
        padding: theme.padding.s,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
    }
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
}

export function SegmentAnalyzer({ 
    dataPoint, 
    fileUri, 
    sampleRate,
    onError,
    analysisConfig 
}: SegmentAnalyzerProps) {
    const theme = useTheme()
    const styles = getStyles(theme)
    const [isProcessing, setIsProcessing] = useState(false)
    const [segmentAnalysis, setSegmentAnalysis] = useState<AudioAnalysis>()
    const [processingTime, setProcessingTime] = useState<number>()

    // Calculate positions for display
    const startPosition = dataPoint.startPosition ?? (dataPoint.startTime ?? 0) * sampleRate * 2
    const endPosition = dataPoint.endPosition ?? (dataPoint.endTime ?? 0) * sampleRate * 2
    const length = endPosition - startPosition
    const durationMs = (length / (sampleRate * 2)) * 1000

    const handleProcessSegment = async () => {
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
    }

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
                        <Text style={styles.label}>Duration:</Text>
                        <Text style={styles.value}>
                            {(segmentAnalysis.durationMs / 1000).toFixed(2)}s
                        </Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.label}>Data Points:</Text>
                        <Text style={styles.value}>{segmentAnalysis.dataPoints.length}</Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.label}>Samples:</Text>
                        <Text style={styles.value}>{dataPoint.samples}</Text>
                    </View>
                    
                    {segmentAnalysis.dataPoints[0]?.features && (
                        <View style={styles.featuresSection}>
                            <FeatureViewer features={segmentAnalysis.dataPoints[0].features} />
                        </View>
                    )}
                </View>
            )}
        </View>
    )
} 