import { FontAwesome } from '@expo/vector-icons'
import { AppTheme, useTheme } from '@siteed/design-system'
import { AudioAnalysis } from '@siteed/expo-audio-stream'
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'

interface SpeechAnalyzerProps {
    analysis: AudioAnalysis
}

export function SpeechAnalyzer({ analysis }: SpeechAnalyzerProps) {
    const theme = useTheme()
    const styles = getStyles(theme)
    const [isDetectingLanguage, setIsDetectingLanguage] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [detectedLanguage, setDetectedLanguage] = useState<string>()
    const [transcription, setTranscription] = useState<string>()

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

    const isSpeechActive = analysis.dataPoints[0]?.speech?.isActive

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Speech Analysis</Text>
            
            <View style={styles.indicators}>
                <View style={styles.indicator}>
                    <Text style={styles.label}>Silent</Text>
                    <FontAwesome
                        name="check-circle"
                        size={16}
                        color={analysis.dataPoints[0]?.silent 
                            ? theme.colors.primary 
                            : theme.colors.outline}
                    />
                </View>
                <View style={styles.indicator}>
                    <Text style={styles.label}>Speech</Text>
                    <FontAwesome
                        name="check-circle"
                        size={16}
                        color={isSpeechActive 
                            ? theme.colors.primary 
                            : theme.colors.outline}
                    />
                </View>
            </View>

            <View style={styles.actions}>
                <Button
                    mode="outlined"
                    onPress={handleDetectLanguage}
                    loading={isDetectingLanguage}
                    disabled={isDetectingLanguage || isTranscribing || !isSpeechActive}
                    style={styles.actionButton}
                >
                    Detect Language
                </Button>

                <Button
                    mode="outlined"
                    onPress={handleTranscribe}
                    loading={isTranscribing}
                    disabled={isDetectingLanguage || isTranscribing || !isSpeechActive}
                    style={styles.actionButton}
                >
                    Transcribe
                </Button>
            </View>

            {(detectedLanguage || transcription) && (
                <View style={styles.results}>
                    {detectedLanguage && (
                        <View style={styles.resultRow}>
                            <Text style={styles.label}>Language:</Text>
                            <Text style={styles.value}>{detectedLanguage}</Text>
                        </View>
                    )}
                    {transcription && (
                        <View style={styles.resultRow}>
                            <Text style={styles.label}>Transcription:</Text>
                            <Text style={styles.value}>{transcription}</Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    )
}

const getStyles = (theme: AppTheme) => StyleSheet.create({
    container: {
        marginTop: theme.margin.m,
        padding: theme.padding.m,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: theme.margin.m,
        color: theme.colors.onSurfaceVariant,
    },
    indicators: {
        flexDirection: 'row',
        gap: theme.margin.l,
        marginBottom: theme.margin.m,
    },
    indicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    actions: {
        flexDirection: 'row',
        gap: theme.margin.m,
        flexWrap: 'wrap',
    },
    actionButton: {
        flex: 1,
        minWidth: 150,
    },
    results: {
        marginTop: theme.margin.m,
        gap: theme.margin.s,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontWeight: '500',
        color: theme.colors.onSurfaceVariant,
    },
    value: {
        color: theme.colors.onSurfaceVariant,
        flex: 1,
        textAlign: 'right',
        marginLeft: theme.margin.m,
    },
}) 