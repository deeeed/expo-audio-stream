import { AppTheme, Button, NumberAdjuster, ScreenWrapper, Text, useTheme } from '@siteed/design-system'
import { ExtractAudioDataOptions, ExtractedAudioData, TranscriberData, extractAudioData } from '@siteed/expo-audio-stream'
import { Audio } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ProgressBar, SegmentedButtons } from 'react-native-paper'

import { isWeb } from '../../../../packages/expo-audio-ui/src/constants'
import { PCMPlayer } from '../component/PCMPlayer'
import { TranscriberConfig } from '../component/TranscriberConfig'
import Transcript from '../component/Transcript'
import { baseLogger } from '../config'
import { useTranscription } from '../context/TranscriptionProvider'
import { TranscribeParams } from '../context/TranscriptionProvider.types'


const logger = baseLogger.extend('whisper')

interface TranscriptionLog {
    modelId: string
    fileName: string
    processingDuration: number
    fileDuration: number
    timestamp: number
    fileSize: number
}

interface SelectedFile {
    uri: string
    size: number
    name: string
    duration?: number
}

interface ExtractDurationOption {
    label: string
    value: number  // duration in milliseconds
}

const EXTRACT_DURATION_OPTIONS: ExtractDurationOption[] = [
    { label: '3 sec', value: 3000 },
    { label: '10 sec', value: 10000 },
    { label: '30 sec', value: 30000 },
    { label: '1 min', value: 60000 }
]

const getStyles = ({ theme }: { theme: AppTheme }) => {
    return StyleSheet.create({
        container: {
            gap: theme.spacing.gap,
            paddingHorizontal: theme.padding.s,
        },
        progressContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.gap,
            marginTop: theme.margin.m,
        },
        progressText: {
            minWidth: 48,
        },
        progressBar: {
            flex: 1,
            height: 8,
        },
        resultText: {
            marginTop: theme.margin.s,
        },
        logsContainer: {
            marginTop: theme.margin.m,
            padding: theme.padding.s,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.roundness,
        },
        logsTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: theme.margin.s,
        },
        logItem: {
            padding: theme.padding.s,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant,
            gap: theme.spacing.gap,
        },
        processingContainer: {
            marginTop: theme.margin.m,
            padding: theme.padding.s,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.roundness,
            alignItems: 'center',
        },
        processingTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: theme.margin.s,
        },
        processingTime: {
            marginBottom: theme.margin.s,
        },
        extractionSection: {
            marginTop: theme.margin.m,
            padding: theme.padding.s,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.roundness,
            gap: theme.spacing.gap,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: theme.margin.s,
        },
        transcriptContainer: {
            marginTop: theme.margin.m,
            padding: theme.padding.m,
            backgroundColor: theme.colors.primaryContainer,
            borderRadius: theme.roundness,
            elevation: 2,
        },
        transcriptTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: theme.margin.s,
            color: theme.colors.onPrimaryContainer,
        },
        transcriptContent: {
            backgroundColor: theme.colors.surface,
            padding: theme.padding.m,
            borderRadius: theme.roundness,
        },
        transcriptText: {
            fontSize: 16,
            lineHeight: 24,
        },
    })
}

export function WhisperScreen() {
    const theme = useTheme()
    const styles = useMemo(() => getStyles({ theme }), [theme])
    
    const [transcriptionData, setTranscriptionData] = useState<TranscriberData>(
        {
            id: '1',
            isBusy: false,
            text: '',
            startTime: 0,
            endTime: 0,
            chunks: [],
        }
    )
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [stopTranscription, setStopTranscription] = useState<
        (() => Promise<void>) | null
    >(null)
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
    const [extractDuration, setExtractDuration] = useState<number>(3000)
    const [customDuration, setCustomDuration] = useState<number>(10000)
    const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false)
    const [audioExtracted, setAudioExtracted] = useState<boolean>(false)
    const [extractedAudioData, setExtractedAudioData] = useState<ExtractedAudioData | null>(null)
    const processingTimer = useRef<ReturnType<typeof setInterval>>()
    const [currentProcessingTime, setCurrentProcessingTime] =
        useState<number>(0)
    const [lastTranscriptionLog, setLastTranscriptionLog] = useState<TranscriptionLog | null>(null)

    const {
        ready: whisperContextReady,
        transcribe,
    } = useTranscription()

    const handleFileSelection = useCallback(async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'audio/*',
        })

        if (!result.canceled && result.assets?.[0]) {
            const { uri, size = 0, name } = result.assets[0]
            
            // Get audio duration for the selected file
            try {
                const sound = await Audio.Sound.createAsync({ uri });
                const status = await sound.sound.getStatusAsync();
                const fileDuration = status.isLoaded && status.durationMillis 
                    ? status.durationMillis / 1000 
                    : 0;
                sound.sound.unloadAsync();
                
                setSelectedFile({ uri, size, name, duration: fileDuration });
            } catch (error) {
                console.error('Error getting audio duration:', error);
                setSelectedFile({ uri, size, name, duration: 0 });
            }
            
            // Reset everything when a new file is selected
            setTranscriptionData({
                id: '1',
                isBusy: false,
                text: '',
                startTime: 0,
                endTime: 0,
                chunks: [],
            });
            setProgress(0);
            setCurrentProcessingTime(0);
            setAudioExtracted(false);
            setExtractedAudioData(null);
        }
    }, [])

    const handleExtractAudio = useCallback(async () => {
        if (!selectedFile) {
            logger.error('No file selected')
            return
        }

        try {
            setIsExtracting(true)
            setProgress(0)
            
            // Get the duration to extract based on user selection
            const durationToExtract = isCustomDuration ? customDuration : extractDuration;
            
            const options: ExtractAudioDataOptions = {
                fileUri: selectedFile.uri,
                includeBase64Data: true,
                includeNormalizedData: true,
                includeWavHeader: isWeb,
                startTimeMs: 0,
                endTimeMs: durationToExtract,
                logger,
                decodingOptions: {
                    targetSampleRate: 16000, // Whisper expects 16kHz
                    targetChannels: 1, // Mono
                    targetBitDepth: 16, // 16-bit
                    normalizeAudio: false,
                },
            }
            logger.debug('Extract audio options:', options)
            const extractedData = await extractAudioData(options);

            // Validate the extracted audio data immediately
            if (extractedData.normalizedData) {
                // Fix TypeScript errors by using proper type assertions and explicit typing
                const normalizedArray = Array.from(extractedData.normalizedData.slice(0, 1000));
                
                // Use explicit type assertion to tell TypeScript these are numbers
                const max = Math.max(...normalizedArray.map((x: unknown): number => Math.abs(x as number)));
                const sum = normalizedArray.reduce((a: number, b: unknown): number => a + Math.abs(b as number), 0);
                
                logger.debug('Extracted audio validation:', {
                    max,
                    sum,
                    hasSignal: max > 0,
                    isAmplified: max >= 0.5
                });
                
                if (max === 0) {
                    logger.error('Extracted audio contains no signal (all zeros)');
                    alert('The extracted audio contains no signal. Please try a different file or time range.');
                    setIsExtracting(false);
                    return;
                }
            }

            setExtractedAudioData(extractedData);
            setAudioExtracted(true);
        } catch (error) {
            console.error('Audio extraction error:', error);
            alert('Failed to extract audio: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setIsExtracting(false)
        }
    }, [selectedFile, extractDuration, customDuration, isCustomDuration]);

    const startTranscription = useCallback(async () => {
        if (!selectedFile || !whisperContextReady || !extractedAudioData) return

        try {
            setIsTranscribing(true)
            setProgress(0)
            setCurrentProcessingTime(0)

            processingTimer.current = setInterval(() => {
                setCurrentProcessingTime((prev) => prev + 1)
            }, 1000)

            setTranscriptionData({
                id: '1',
                isBusy: true,
                text: '',
                startTime: Date.now(),
                endTime: 0,
                chunks: [],
            })

            const startTime = Date.now()
            const sound = await Audio.Sound.createAsync({
                uri: selectedFile.uri,
            })
            const status = await sound.sound.getStatusAsync()
            const fileDuration =
                status.isLoaded && status.durationMillis
                    ? status.durationMillis / 1000
                    : 0
            sound.sound.unloadAsync()

            const transcribeParams: Partial<TranscribeParams> = {
                jobId: '1',
                options: {
                    language: 'en',
                    tokenTimestamps: true,
                    tdrzEnable: true,
                },
                onProgress(progress: number) {
                    setProgress(progress)
                },
                onNewSegments(result) {
                    setTranscriptionData((prev) => {
                        const existingChunks = prev.chunks || []
                        const updatedChunks = [...existingChunks]
                        
                        // Convert segments to the format we need
                        const newChunks = result.segments.map(segment => ({
                            text: segment.text.trim(),
                            timestamp: [
                                segment.t0 / 100,
                                segment.t1 ? segment.t1 / 100 : null,
                            ] as [number, number | null],
                        }))

                        newChunks.forEach((newChunk) => {
                            const isDuplicate = existingChunks.some(
                                (existing) =>
                                    existing.text === newChunk.text &&
                                    existing.timestamp[0] === newChunk.timestamp[0]
                            )
                            if (!isDuplicate) {
                                updatedChunks.push(newChunk)
                            }
                        })

                        return {
                            ...prev,
                            text: updatedChunks
                                .map((chunk) => chunk.text)
                                .join(' '),
                            chunks: updatedChunks,
                        }
                    })
                }
            }

            // Debug the extracted audio data
            logger.debug('Extracted audio data details:', {
                sampleRate: extractedAudioData.sampleRate,
                channels: extractedAudioData.channels,
                bitDepth: extractedAudioData.bitDepth,
                durationMs: extractedAudioData.durationMs,
                format: extractedAudioData.format,
                samples: extractedAudioData.samples,
                hasPcmData: !!extractedAudioData.pcmData,
                pcmDataLength: extractedAudioData.pcmData?.length,
                hasNormalizedData: !!extractedAudioData.normalizedData,
                normalizedDataLength: extractedAudioData.normalizedData?.length,
                hasBase64Data: !!extractedAudioData.base64Data,
                base64DataLength: extractedAudioData.base64Data?.length,
            });

            if (isWeb) {
                // Use the PCM data directly since it already has a WAV header
                transcribeParams.audioUri = URL.createObjectURL(
                    new Blob([extractedAudioData.pcmData], { type: 'audio/wav' })
                );
            } else {
                // For native platforms, use base64 data if available
                if (extractedAudioData.base64Data) {
                    logger.debug('Using base64 data for native transcription');
                    transcribeParams.audioData = extractedAudioData.base64Data;
                } else {
                    logger.debug('Using original file URI for native transcription');
                    transcribeParams.audioUri = selectedFile.uri;
                }
            }

            logger.debug('Transcribe params:', transcribeParams);
            const { promise, stop } = await transcribe(transcribeParams as TranscribeParams);
            setStopTranscription(() => stop);

            const transcription = await promise;
            const endTime = Date.now();
            const processingDuration = (endTime - startTime) / 1000;

            setLastTranscriptionLog({
                modelId: 'tiny',
                fileName: selectedFile.name ?? 'Unknown file',
                processingDuration,
                fileDuration,
                timestamp: endTime,
                fileSize: selectedFile.size ?? 0,
            });
            
            console.log('Final transcription:', transcription);
            setTranscriptionData(transcription);
        } catch (error) {
            console.error('Transcription error:', error);
            setTranscriptionData((prev) => ({
                ...prev,
                isBusy: false,
                text: 'Error during transcription',
                endTime: Date.now(),
            }));
        } finally {
            if (processingTimer.current) {
                clearInterval(processingTimer.current);
            }
            setIsTranscribing(false);
            setStopTranscription(null);
        }
    }, [selectedFile, whisperContextReady, extractedAudioData, transcribe]);

    const handleStop = useCallback(async () => {
        if (stopTranscription) {
            await stopTranscription()
            setTranscriptionData((prev) => ({
                ...prev,
                isBusy: false,
                text: 'Transcription stopped',
                endTime: Date.now(),
            }))
        }
    }, [stopTranscription])

    return (
        <ScreenWrapper withScrollView useInsets contentContainerStyle={styles.container}>

                <TranscriberConfig 
                                    compact={true}
                                    onConfigChange={() => {
                                        // Reset any state that depends on the model when config changes
                                        setAudioExtracted(false);
                                        setExtractedAudioData(null);
                                    }}
                                />

                <Button
                    mode="contained"
                    onPress={handleFileSelection}
                    disabled={isTranscribing}
                >
                    Select Audio File
                </Button>

                {selectedFile && (
                    <Text>
                        Selected: {selectedFile.name} (
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB
                        {selectedFile.duration ? ` | ${selectedFile.duration.toFixed(1)}s` : ''})
                    </Text>
                )}

                {selectedFile && whisperContextReady && (
                    <>
                        <View style={styles.extractionSection}>
                            <Text style={styles.sectionTitle}>Audio Extraction Options</Text>
                            
                            <SegmentedButtons
                                value={isCustomDuration ? 'custom' : extractDuration.toString()}
                                onValueChange={(value) => {
                                    if (value === 'custom') {
                                        setIsCustomDuration(true);
                                        setAudioExtracted(false);
                                    } else {
                                        setIsCustomDuration(false);
                                        setExtractDuration(parseInt(value, 10));
                                        setAudioExtracted(false);
                                    }
                                }}
                                buttons={[
                                    ...EXTRACT_DURATION_OPTIONS.map((option) => ({
                                        value: option.value.toString(),
                                        label: option.label,
                                    })),
                                    { value: 'custom', label: 'Custom' }
                                ]}
                            />
                            
                            {isCustomDuration && (
                                <NumberAdjuster
                                    label="Custom Duration (ms)"
                                    value={customDuration}
                                    onChange={(value) => {
                                        setCustomDuration(value);
                                        setAudioExtracted(false);
                                    }}
                                    min={1000}
                                    max={600000}
                                    step={1000}
                                    disabled={isExtracting || isTranscribing}
                                />
                            )}
                            
                            <Button
                                mode="contained-tonal"
                                onPress={handleExtractAudio}
                                loading={isExtracting}
                                disabled={isTranscribing || !selectedFile || !whisperContextReady}
                                style={{ marginTop: 10 }}
                            >
                                {isExtracting ? 'Extracting...' : 'Extract Audio Data'}
                            </Button>
                        </View>
                        
                        {audioExtracted && extractedAudioData && (
                            <View style={styles.extractionSection}>
                                <Text style={styles.sectionTitle}>Extracted Audio Preview</Text>
                                <Text>
                                    Duration: {(extractedAudioData.durationMs / 1000).toFixed(2)}s | 
                                    Sample Rate: {extractedAudioData.sampleRate}Hz | 
                                    Channels: {extractedAudioData.channels}
                                </Text>
                                {extractedAudioData.pcmData && (
                                    <PCMPlayer 
                                        data={extractedAudioData.pcmData} 
                                        sampleRate={extractedAudioData.sampleRate} 
                                        bitDepth={16}
                                        channels={extractedAudioData.channels}
                                        hasWavHeader={extractedAudioData.hasWavHeader}
                                    />
                                )}
                            </View>
                        )}
                        
                        <Button
                            mode="contained"
                            onPress={startTranscription}
                            loading={isTranscribing}
                            disabled={
                                isExtracting || isTranscribing || !selectedFile || 
                                !whisperContextReady || !audioExtracted || !extractedAudioData
                            }
                        >
                            {isTranscribing ? 'Transcribing...' : 'Start Transcription'}
                        </Button>
                    </>
                )}

                {isTranscribing && stopTranscription && (
                    <Button
                        mode="contained"
                        onPress={handleStop}
                        style={{ marginTop: 10 }}
                    >
                        Stop Transcription
                    </Button>
                )}

                {isTranscribing && (
                    <View style={styles.processingContainer}>
                        <Text style={styles.processingTitle}>
                            Transcribing...
                        </Text>
                        <Text style={styles.processingTime}>
                            Time: {currentProcessingTime}s
                        </Text>
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>
                                {Math.round(progress)}%
                            </Text>
                            <ProgressBar
                                progress={progress / 100}
                                style={styles.progressBar}
                            />
                        </View>
                    </View>
                )}

                {audioExtracted &&transcriptionData  && (
                        <Transcript
                            transcribedData={transcriptionData}
                            isBusy={isTranscribing}
                            showActions={false}
                            useScrollView
                        />
                )}

                {lastTranscriptionLog && (
                    <View style={styles.logsContainer}>
                        <Text style={styles.logsTitle}>
                            Last Transcription
                        </Text>
                        <View style={styles.logItem}>
                            <Text>File: {lastTranscriptionLog.fileName}</Text>
                            <Text>Model: {lastTranscriptionLog.modelId}</Text>
                            <Text>
                                File Duration: {lastTranscriptionLog.fileDuration.toFixed(1)}s
                            </Text>
                            <Text>
                                Processing Time: {lastTranscriptionLog.processingDuration.toFixed(1)}s
                            </Text>
                            <Text>
                                Processing Speed: {(
                                    lastTranscriptionLog.fileDuration /
                                    lastTranscriptionLog.processingDuration
                                ).toFixed(1)}x
                            </Text>
                            <Text>
                                Size: {(lastTranscriptionLog.fileSize / (1024 * 1024)).toFixed(2)}MB
                            </Text>
                            <Text>
                                Date: {new Date(lastTranscriptionLog.timestamp).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                )}

        </ScreenWrapper>
    )
}

export default WhisperScreen
