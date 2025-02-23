import { FontAwesome } from '@expo/vector-icons'
import { AppTheme, useTheme } from '@siteed/design-system'
import { AudioAnalysis } from '@siteed/expo-audio-stream'
import React, { useState, useCallback, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useSileroVAD } from '../../hooks/useSileroVAD'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

interface SpeechAnalyzerProps {
    analysis: AudioAnalysis
    pcmData?: Uint8Array
    sampleRate?: number
}

export function SpeechAnalyzer({ analysis, pcmData, sampleRate }: SpeechAnalyzerProps) {
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

    useEffect(() => {
        if (pcmData && sampleRate && !isModelLoading) {
            handleVAD()
        }
    }, [pcmData, sampleRate, isModelLoading])

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
        if (!pcmData || !sampleRate) {
            console.error('No PCM data or sample rate available')
            return
        }

        const float32Data = new Float32Array(pcmData.length / 2)
        const dataView = new DataView(pcmData.buffer)
        
        for (let i = 0; i < pcmData.length; i += 2) {
            const int16Value = dataView.getInt16(i, true)
            float32Data[i / 2] = int16Value / 32768.0
        }

        const result = await processAudioSegment(float32Data, sampleRate)
        if (result) {
            setVadResult(result)
        }
    }, [pcmData, sampleRate, processAudioSegment])

    const isSpeechActive = analysis.dataPoints[0]?.speech?.isActive

    return (
        <View style={styles.speechSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Speech Analysis</Text>

            <View style={styles.buttonGroup}>
                <Button
                    mode="contained-tonal"
                    onPress={handleVAD}
                    loading={isModelLoading || isProcessing}
                    disabled={isModelLoading || isProcessing || !pcmData || !sampleRate}
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
                    disabled={isDetectingLanguage || !pcmData || !sampleRate}
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
                    disabled={isTranscribing || !pcmData || !sampleRate}
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
})