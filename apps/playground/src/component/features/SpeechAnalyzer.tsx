import { FontAwesome } from '@expo/vector-icons'
import { AppTheme, useTheme } from '@siteed/design-system'
import { AudioAnalysis } from '@siteed/expo-audio-stream'
import React, { useState, useCallback } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { useSileroVAD } from '../../hooks/useSileroVAD'

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
            console.error('VAD Error:', error);
            // You might want to add error handling UI here
        }
    });

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
            console.error('No PCM data or sample rate available');
            return;
        }

        const float32Data = new Float32Array(pcmData.length / 2);
        const dataView = new DataView(pcmData.buffer);
        
        for (let i = 0; i < pcmData.length; i += 2) {
            const int16Value = dataView.getInt16(i, true);
            float32Data[i / 2] = int16Value / 32768.0;
        }

        const result = await processAudioSegment(float32Data, sampleRate);
        if (result) {
            setVadResult(result);
        }
    }, [pcmData, sampleRate, processAudioSegment]);

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
                    onPress={handleVAD}
                    loading={isModelLoading || isProcessing}
                    disabled={isModelLoading || isProcessing || !analysis.dataPoints[0]?.samples}
                    style={styles.actionButton}
                >
                    Run VAD
                </Button>

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

            {vadResult && (
                <View style={styles.resultRow}>
                    <Text style={styles.label}>VAD Result:</Text>
                    <Text style={styles.value}>
                        {vadResult.probability.toFixed(3)} ({vadResult.isSpeech ? 'Speech' : 'No Speech'})
                    </Text>
                </View>
            )}

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