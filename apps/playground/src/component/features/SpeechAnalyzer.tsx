import { FontAwesome } from '@expo/vector-icons'
import { AppTheme, useTheme } from '@siteed/design-system'
import { AudioAnalysis, ExtractedAudioData } from '@siteed/expo-audio-stream'
import React, { useState, useCallback, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useSileroVAD } from '../../hooks/useSileroVAD'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

interface SpeechAnalyzerProps {
    analysis: AudioAnalysis
    audioData?: ExtractedAudioData
    sampleRate?: number
}

export function SpeechAnalyzer({ 
    analysis, 
    audioData,
    sampleRate 
}: SpeechAnalyzerProps) {
    const theme = useTheme()
    const styles = getStyles(theme)
    const [isDetectingLanguage, setIsDetectingLanguage] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [detectedLanguage, setDetectedLanguage] = useState<string>()
    const [transcription, setTranscription] = useState<string>()
    const [vadResult, setVadResult] = useState<{ probability: number; isSpeech: boolean }>()

    const { isModelLoading, isProcessing, processAudioSegment } = useSileroVAD({
        onError: (error) => {
            console.error('VAD Error:', error)
        }
    })

    // Add debug logging
    useEffect(() => {
        console.log('Speech Analyzer Analysis:', {
            durationMs: analysis.durationMs,
            dataPoints: analysis.dataPoints.length,
            firstDataPoint: analysis.dataPoints[0],
            pcmDataLength: audioData?.normalizedData?.length,
            sampleRate
        })
    }, [analysis, audioData, sampleRate])

    // Calculate segment duration in milliseconds
    const segmentDurationMs = analysis.durationMs ?? 0
    const hasEnoughData = segmentDurationMs >= 1000

    // If we're not getting durationMs directly, we can calculate it from PCM data
    useEffect(() => {
        if (!segmentDurationMs && audioData?.normalizedData && sampleRate) {
            // PCM data is 16-bit (2 bytes per sample)
            const numSamples = audioData.normalizedData.length / 2
            const calculatedDurationMs = (numSamples / sampleRate) * 1000
            console.log('Calculated duration:', calculatedDurationMs, 'ms')
        }
    }, [segmentDurationMs, audioData, sampleRate])

    useEffect(() => {
        if (!audioData?.normalizedData || !sampleRate || !isModelLoading) {
            return
        }

        // Only process if we have enough data and actually have data
        if (audioData.normalizedData.length > 0 && hasEnoughData) {
            handleVAD()
        } else {
            // Clear previous VAD result if we don't have enough data
            setVadResult(undefined)
        }
    }, [audioData, sampleRate, isModelLoading, hasEnoughData])

    const handleDetectLanguage = async () => {
        setIsDetectingLanguage(true)
        try {
            // TODO: Implement language detection using a speech-to-text service
            await new Promise(resolve => setTimeout(resolve, 1000))
            setDetectedLanguage('en-US')
        } finally {
            setIsDetectingLanguage(false)
        }
    }

    const handleTranscribe = async () => {
        setIsTranscribing(true)
        try {
            await new Promise(resolve => setTimeout(resolve, 1000))
            setTranscription('Not implemented')
        } finally {
            setIsTranscribing(false)
        }
    }

    const handleVAD = useCallback(async () => {
        if (!audioData?.normalizedData || !sampleRate) {
            console.error('No audio data or sample rate available')
            return
        }

        // Use normalized data directly from audioData
        const result = await processAudioSegment(audioData.normalizedData, sampleRate)
        if (result) {
            setVadResult(result)
        }
    }, [audioData, sampleRate, processAudioSegment])

    const isSpeechActive = analysis.dataPoints[0]?.speech?.isActive

    return (
        <View style={styles.speechSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Speech Analysis</Text>

            {!hasEnoughData && (
                <Text 
                    variant="bodyMedium" 
                    style={[styles.warningText, { color: theme.colors.error }]}
                >
                    At least 1 second of audio is required for speech analysis. Current segment: {(segmentDurationMs / 1000).toFixed(2)}s
                </Text>
            )}

            <View style={styles.buttonGroup}>
                <Button
                    mode="contained-tonal"
                    onPress={handleVAD}
                    loading={isModelLoading || isProcessing}
                    disabled={
                        isModelLoading || 
                        isProcessing || 
                        !audioData || 
                        !sampleRate || 
                        audioData.normalizedData?.length === 0 ||
                        !hasEnoughData
                    }
                    style={styles.actionButton}
                    icon={() => (
                        <MaterialCommunityIcons
                            name="waveform"
                            size={20}
                            color={theme.colors.onSecondaryContainer}
                        />
                    )}
                >
                    Refresh VAD
                </Button>

                <Button
                    mode="contained-tonal"
                    onPress={handleDetectLanguage}
                    loading={isDetectingLanguage}
                    disabled={
                        isDetectingLanguage || 
                        !audioData || 
                        !sampleRate ||
                        !hasEnoughData
                    }
                    style={styles.actionButton}
                    icon={() => (
                        <MaterialCommunityIcons
                            name="translate"
                            size={20}
                            color={theme.colors.onSecondaryContainer}
                        />
                    )}
                >
                    Detect Language
                </Button>

                <Button
                    mode="contained-tonal"
                    onPress={handleTranscribe}
                    loading={isTranscribing}
                    disabled={
                        isTranscribing || 
                        !audioData || 
                        !sampleRate ||
                        !hasEnoughData
                    }
                    style={styles.actionButton}
                    icon={() => (
                        <MaterialCommunityIcons
                            name="text-recognition"
                            size={20}
                            color={theme.colors.onSecondaryContainer}
                        />
                    )}
                >
                    Transcribe
                </Button>
            </View>

            {/* Only show results if we have enough data */}
            {hasEnoughData && (
                <>
                    {vadResult && (
                        <View style={styles.resultContainer}>
                            <Text variant="bodyMedium" style={styles.label}>Speech Detection:</Text>
                            <Text variant="bodyMedium" style={[
                                styles.value,
                                { color: vadResult.isSpeech ? theme.colors.success : theme.colors.error }
                            ]}>
                                {vadResult.isSpeech ? 'Speech Detected' : 'No Speech'} ({(vadResult.probability * 100).toFixed(1)}%)
                            </Text>
                        </View>
                    )}

                    {detectedLanguage && (
                        <View style={styles.resultContainer}>
                            <Text variant="bodyMedium" style={styles.label}>Detected Language:</Text>
                            <Text variant="bodyMedium" style={styles.value}>{detectedLanguage}</Text>
                        </View>
                    )}

                    {transcription && (
                        <View style={styles.resultContainer}>
                            <Text variant="bodyMedium" style={styles.label}>Transcription:</Text>
                            <Text variant="bodyMedium" style={styles.value}>{transcription}</Text>
                        </View>
                    )}
                </>
            )}
        </View>
    )
}

const getStyles = (theme: AppTheme) => StyleSheet.create({
    speechSection: {
        padding: theme.padding.m,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
        gap: theme.spacing.gap,
    },
    sectionTitle: {
        color: theme.colors.onSecondaryContainer,
        marginBottom: theme.margin.s,
    },
    buttonGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.gap,
        marginBottom: theme.margin.m,
    },
    actionButton: {
        flexGrow: 1,
        flexBasis: '45%',
        height: 40,
    },
    resultContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.padding.s,
    },
    label: {
        color: theme.colors.onSecondaryContainer,
        fontWeight: '500',
    },
    value: {
        color: theme.colors.onSecondaryContainer,
    },
    warningText: {
        marginBottom: theme.margin.m,
        textAlign: 'center',
    },
})