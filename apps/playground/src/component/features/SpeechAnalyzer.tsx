// import { FontAwesome } from '@expo/vector-icons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { AppTheme, useTheme } from '@siteed/design-system'
import { AudioAnalysis, ExtractedAudioData, extractMelSpectrogram, MelSpectrogram, TranscriberData } from '@siteed/expo-audio-studio'
import React, { useCallback, useEffect, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { Button, Text } from 'react-native-paper'
import { TranscriptionResults } from '../../components/TranscriptionResults'
import { baseLogger } from '../../config'
import { LANGUAGE_NAMES, useLanguageDetection } from '../../hooks/useLanguageDetection'
import { useSileroVAD } from '../../hooks/useSileroVAD'
import { useTranscriptionAnalyzer } from '../../hooks/useTranscriptionAnalyzer'
import { extractMelSpectrogramWithEssentia } from '../../utils/essentiaUtils'
import { isWeb } from '../../utils/utils'


const logger = baseLogger.extend('SpeechAnalyzer')
interface SpeechAnalyzerProps {
    analysis: AudioAnalysis
    audioData?: ExtractedAudioData
    sampleRate?: number
    fileUri?: string
}

export function SpeechAnalyzer({ 
    analysis, 
    audioData,
    sampleRate,
    fileUri
}: SpeechAnalyzerProps) {
    const theme = useTheme()
    const styles = getStyles(theme)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [detectedLanguage, setDetectedLanguage] = useState<string>()
    const [vadResult, setVadResult] = useState<{ probability: number; isSpeech: boolean }>()
    const [showTranscriptionResults, setShowTranscriptionResults] = useState(false)
    const [transcriptionData, setTranscriptionData] = useState<TranscriberData>()
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null)

    // State for mel spectrogram
    // const [melSpectrogramData, setMelSpectrogramData] = useState<MelSpectrogram | null>(null)
    const [isExtractingMelSpectrogram, setIsExtractingMelSpectrogram] = useState(false)
    const [melSpectrogramError, setMelSpectrogramError] = useState<string | null>(null)

    const [languageDetectionResults, setLanguageDetectionResults] = useState<Record<string, number>>({})

    // Update state for dual implementation comparison
    const [melResults, setMelResults] = useState<{
        current: MelSpectrogram | null,
        essentia: MelSpectrogram | null,
        difference: number | null
    }>({
        current: null,
        essentia: null,
        difference: null
    })

    const { isModelLoading, isProcessing, processAudioSegment } = useSileroVAD({
        onError: (error) => {
            console.error('VAD Error:', error)
        }
    })

    const { 
        isModelLoading: isTranscriptionModelLoading, 
        isProcessing: isTranscriptionProcessing, 
        processAudioSegment: processTranscription,
    } = useTranscriptionAnalyzer({
        onError: (error: Error) => {
            console.error('Transcription Error:', error)
            setTranscriptionError(error.message)
        },
        onTranscriptionUpdate: (data) => {
            setTranscriptionData(data)
        }
    })

    const { 
        isProcessing: isLanguageProcessing, 
        detectLanguage 
    } = useLanguageDetection({
        onError: (error) => {
            console.error('Language detection error:', error);
            setTranscriptionError(error instanceof Error ? error.message : 'Unknown error during language detection');
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

    const handleTranscribe = useCallback(async () => {
        if (!audioData?.normalizedData || !sampleRate || isProcessing) return
        
        setIsTranscribing(true)
        setShowTranscriptionResults(true)
        try {
            await processTranscription(
                isWeb ? audioData.normalizedData : audioData.pcmData
            )
        } finally {
            setIsTranscribing(false)
        }
    }, [audioData, sampleRate, isProcessing, processTranscription])

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
    }, [audioData, sampleRate, isModelLoading, hasEnoughData, handleVAD])

    const handleExtractMelSpectrogram = useCallback(async () => {
        if (!fileUri || !sampleRate || !analysis.dataPoints.length || !audioData?.normalizedData) {
            return
        }
        
        setIsExtractingMelSpectrogram(true)
        setMelSpectrogramError(null)
        
        try {
            // Common parameters for both implementations
            const spectrogramParams = {
                windowSizeMs: 25,
                hopLengthMs: 10,
                nMels: 40,
                fMin: 0,
                fMax: sampleRate ? sampleRate / 2 : 8000,
                windowType: 'hann' as const,
                normalize: true,
                logScale: true,
                startTimeMs: (analysis.dataPoints[0]?.startTime ?? 0) * 1000,
                endTimeMs: (analysis.dataPoints[analysis.dataPoints.length - 1]?.endTime ?? 0) * 1000,
            }
            
            // Run current implementation
            logger.log('Running current implementation...')
            const currentResult = await extractMelSpectrogram({
                fileUri: fileUri,
                ...spectrogramParams,
                decodingOptions: {
                    targetSampleRate: sampleRate,
                    normalizeAudio: true
                }
            })
            
            // Run Essentia implementation with the same data
            logger.log('Running Essentia implementation...')
            const essentiaResult = await extractMelSpectrogramWithEssentia(
                audioData.normalizedData,
                sampleRate,
                spectrogramParams
            )
            
            // Calculate average difference between matrices
            let totalDiff = 0
            let count = 0
            
            const minTimeSteps = Math.min(currentResult.spectrogram.length, essentiaResult.spectrogram.length)
            const minMels = Math.min(
                currentResult.spectrogram[0]?.length || 0, 
                essentiaResult.spectrogram[0]?.length || 0
            )
            
            for (let i = 0; i < minTimeSteps; i++) {
                for (let j = 0; j < minMels; j++) {
                    const diff = Math.abs(
                        (currentResult.spectrogram[i][j] || 0) - 
                        (essentiaResult.spectrogram[i][j] || 0)
                    )
                    totalDiff += diff
                    count++
                }
            }
            
            const avgDifference = count > 0 ? totalDiff / count : null
            
            // Store both results for comparison
            setMelResults({
                current: currentResult,
                essentia: essentiaResult,
                difference: avgDifference
            })
            
            logger.log('Mel Spectrogram comparison results:', {
                currentShape: [currentResult.timeSteps, currentResult.nMels],
                essentiaShape: [essentiaResult.timeSteps, essentiaResult.nMels],
                avgDifference
            })
        } catch (error) {
            console.error('Error extracting mel spectrogram:', error)
            setMelSpectrogramError(error instanceof Error ? error.message : 'Unknown error')
        } finally {
            setIsExtractingMelSpectrogram(false)
        }
    }, [fileUri, sampleRate, analysis.dataPoints, audioData])

    const handleDetectLanguage = useCallback(async () => {
        if (!fileUri || !sampleRate) {
            setTranscriptionError("Audio file and sample rate are required for language detection");
            return;
        }
        
        setTranscriptionError(null);
        
        try {
            const startTimeMs = (analysis.dataPoints[0]?.startTime ?? 0) * 1000
            const endTimeMs = (analysis.dataPoints[analysis.dataPoints.length - 1]?.endTime ?? 0) * 1000
            if (isNaN(startTimeMs) || isNaN(endTimeMs)) {
                
                logger.error('Invalid start or end time for language detection', {
                    startTimeMs,
                    endTimeMs
                })
                setTranscriptionError("Invalid start or end time for language detection");
                return;
            }
            const result = await detectLanguage({
                fileUri,
                sampleRate,
                startTimeMs,
                endTimeMs
            });
            
            if (result) {
                setDetectedLanguage(result.languageName);
                setLanguageDetectionResults(result.similarities);
                
                // If we want to cache the spectrogram for other uses
                if (result.melSpectrogram) {
                    setMelResults(prevState => ({
                        ...prevState,
                        current: result.melSpectrogram || null
                    }));
                }
                
                logger.log('Language detection results:', {
                    detectedLanguage: result.detectedLanguage,
                    languageName: result.languageName,
                    similarities: result.similarities
                });
            }
        } catch (error) {
            console.error('Language detection error:', error);
            setTranscriptionError(error instanceof Error ? error.message : 'Unknown error during language detection');
        }
    }, [fileUri, sampleRate, analysis.dataPoints, analysis.durationMs, detectLanguage]);

    return (
        <View style={styles.speechSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Speech Analysis</Text>
            
            <View style={styles.experimentalBanner}>
                <MaterialCommunityIcons
                    name="flask-outline"
                    size={20}
                    color={theme.colors.error}
                />
                <Text variant="bodySmall" style={styles.experimentalText}>
                    Experimental: Speech analysis models are still in development and may not be accurate.
                </Text>
            </View>

            {!hasEnoughData && (
                <Text 
                    variant="bodyMedium" 
                    style={[styles.warningText, { color: theme.colors.error }]}
                >
                    At least 1 second of audio is required for speech analysis. Current segment: {(segmentDurationMs / 1000).toFixed(2)}s
                </Text>
            )}

            {/* Voice Activity Detection Section */}
            <View style={styles.featureSection}>
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
                    Voice Activity Detection
                </Button>
                
                {hasEnoughData && vadResult && (
                    <View style={styles.resultCard}>
                        <Text variant="bodyMedium" style={styles.label}>Speech Detection:</Text>
                        <Text variant="bodyMedium" style={[
                            styles.value,
                            { color: vadResult.isSpeech ? theme.colors.success : theme.colors.error }
                        ]}>
                            {vadResult.isSpeech ? 'Speech Detected' : 'No Speech'} ({(vadResult.probability * 100).toFixed(1)}%)
                        </Text>
                    </View>
                )}
            </View>

            {/* Language Detection Section - Hide on iOS */}
            {Platform.OS !== 'ios' && (
                <View style={styles.featureSection}>
                    <Button
                        mode="contained-tonal"
                        onPress={handleDetectLanguage}
                        loading={isLanguageProcessing}
                        disabled={
                            isLanguageProcessing || 
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
                    
                    {hasEnoughData && detectedLanguage && (
                        <View style={styles.resultCard}>
                            <View style={styles.resultContainer}>
                                <Text variant="bodyMedium" style={styles.label}>Detected Language:</Text>
                                <Text variant="bodyMedium" style={styles.value}>{detectedLanguage}</Text>
                            </View>
                            
                            {Object.keys(languageDetectionResults).length > 0 && (
                                <View style={styles.languageResultsContainer}>
                                    <Text variant="bodySmall" style={styles.subsectionTitle}>Language Similarities:</Text>
                                    {Object.entries(languageDetectionResults)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([lang, similarity]) => (
                                            <View key={lang} style={styles.languageRow}>
                                                <Text variant="bodySmall" style={styles.languageLabel}>
                                                    {LANGUAGE_NAMES[lang] || lang}:
                                                </Text>
                                                <Text variant="bodySmall" style={[
                                                    styles.languageValue,
                                                    { 
                                                        fontWeight: detectedLanguage === LANGUAGE_NAMES[lang] ? 'bold' : 'normal',
                                                        color: detectedLanguage === LANGUAGE_NAMES[lang] ? 
                                                            theme.colors.primary : theme.colors.onSecondaryContainer
                                                    }
                                                ]}>
                                                    {(similarity * 100).toFixed(1)}%
                                                </Text>
                                            </View>
                                        ))
                                    }
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* Transcription Section */}
            <View style={styles.featureSection}>
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
                    Transcribe Audio
                </Button>
                
                {showTranscriptionResults && (
                    <TranscriptionResults
                        transcriptionData={transcriptionData}
                        isLoading={isTranscriptionModelLoading}
                        isProcessing={isTranscriptionProcessing}
                        error={transcriptionError || undefined}
                    />
                )}
            </View>

            {/* Mel Spectrogram Section - Hide on iOS */}
            {Platform.OS !== 'ios' && (
                <View style={styles.featureSection}>
                    <Button
                        mode="contained-tonal"
                        onPress={handleExtractMelSpectrogram}
                        disabled={!hasEnoughData || isExtractingMelSpectrogram || !fileUri || !audioData?.normalizedData}
                        loading={isExtractingMelSpectrogram}
                        style={styles.actionButton}
                        icon={() => (
                            <MaterialCommunityIcons
                                name="chart-histogram"
                                size={20}
                                color={theme.colors.onSecondaryContainer}
                            />
                        )}
                    >
                        Extract & Compare Mel Spectrograms
                    </Button>
                    
                    {melResults.current && melResults.essentia && (
                        <View style={styles.resultCard}>
                            <Text variant="bodyMedium" style={styles.subsectionTitle}>Mel Spectrogram Comparison</Text>
                            
                            <View style={styles.comparisonRow}>
                                <View style={styles.comparisonColumn}>
                                    <Text variant="bodySmall" style={styles.comparisonTitle}>Current Implementation</Text>
                                    <Text>Time Steps: {melResults.current.timeSteps}</Text>
                                    <Text>Mel Bands: {melResults.current.nMels}</Text>
                                    <Text>Duration: {melResults.current.durationMs}ms</Text>
                                </View>
                                
                                <View style={styles.comparisonColumn}>
                                    <Text variant="bodySmall" style={styles.comparisonTitle}>Essentia Implementation</Text>
                                    <Text>Time Steps: {melResults.essentia.timeSteps}</Text>
                                    <Text>Mel Bands: {melResults.essentia.nMels}</Text>
                                    <Text>Duration: {melResults.essentia.durationMs}ms</Text>
                                </View>
                            </View>
                            
                            <View style={styles.diffSection}>
                                <Text variant="bodyMedium" style={[styles.label, { marginTop: theme.margin.m }]}>
                                    Difference Analysis:
                                </Text>
                                <Text>Average Value Difference: {melResults.difference?.toFixed(6) || 'N/A'}</Text>
                                <Text>Shape Difference: {melResults.current.timeSteps - melResults.essentia.timeSteps} time steps</Text>
                                <Text style={styles.note}>
                                    Lower difference values indicate more similar results
                                </Text>
                            </View>
                        </View>
                    )}
                    
                    {melSpectrogramError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Error: {melSpectrogramError}</Text>
                        </View>
                    )}
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
        flexBasis: isWeb ? 'auto' : '45%',
        height: 40,
        paddingHorizontal: theme.padding.s,
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
    resultsContainer: {
        padding: theme.padding.m,
        backgroundColor: theme.colors.secondaryContainer,
        borderRadius: theme.roundness,
        gap: theme.spacing.gap,
    },
    note: {
        color: theme.colors.onSecondaryContainer,
        fontStyle: 'italic',
    },
    errorContainer: {
        padding: theme.padding.m,
        backgroundColor: theme.colors.errorContainer,
        borderRadius: theme.roundness,
        marginTop: theme.margin.m,
    },
    errorText: {
        color: theme.colors.error,
        textAlign: 'center',
    },
    languageResultsContainer: {
        marginTop: theme.margin.s,
        padding: theme.padding.s,
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.roundness,
    },
    languageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.padding.s,
    },
    languageLabel: {
        color: theme.colors.onSecondaryContainer,
    },
    languageValue: {
        color: theme.colors.onSecondaryContainer,
    },
    experimentalBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.errorContainer,
        borderRadius: theme.roundness,
        padding: theme.padding.s,
        marginBottom: theme.margin.m,
        gap: theme.spacing.gap / 2,
    },
    experimentalText: {
        color: theme.colors.error,
        flex: 1,
        flexWrap: 'wrap',
    },
    featureSection: {
        marginBottom: theme.margin.m,
        gap: theme.spacing.gap,
    },
    resultCard: {
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.roundness,
        padding: theme.padding.m,
        gap: theme.spacing.gap,
    },
    subsectionTitle: {
        color: theme.colors.onSurfaceVariant,
        fontWeight: '500',
        marginBottom: theme.margin.s,
    },
    comparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.gap,
    },
    comparisonColumn: {
        flex: 1,
        padding: theme.padding.s,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.roundness / 2,
            },
    comparisonTitle: {
        fontWeight: 'bold',
        marginBottom: theme.margin.s,
        color: theme.colors.primary,
    },
    diffSection: {
        marginTop: theme.margin.m,
        padding: theme.padding.s,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.roundness / 2,
    },
})