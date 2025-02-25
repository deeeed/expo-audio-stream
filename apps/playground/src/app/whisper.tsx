import { AppTheme, Button, NumberAdjuster, ScreenWrapper, Text, useTheme } from '@siteed/design-system'
import { ExtractedAudioData, TranscriberData, extractAudioData } from '@siteed/expo-audio-stream'
import { Audio } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ProgressBar, SegmentedButtons } from 'react-native-paper'

import { PCMPlayer } from '../component/PCMPlayer'
import Transcript from '../component/Transcript'
import { config } from '../config'
import { useTranscription } from '../context/TranscriptionProvider'
import { TranscribeParams } from '../context/TranscriptionProvider.types'
import { isWeb } from '../../../../packages/expo-audio-ui/src/constants'

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
            padding: theme.padding.m,
            gap: theme.spacing.gap,
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

    const [selectedModel, setSelectedModel] = useState<string>('tiny')

    const {
        isModelLoading: isInitializingModel,
        ready: whisperContextReady,
        resetWhisperContext,
        transcribe,
        updateConfig,
        progressItems,
    } = useTranscription()

    const downloadProgress = useMemo(() => {
        const modelItem = progressItems.find(
            item => item.name === selectedModel && item.status === 'downloading'
        )
        return { [selectedModel]: modelItem ? modelItem.progress / 100 : 0 }
    }, [progressItems, selectedModel])

    const isDownloading = useMemo(() => {
        return progressItems.some(
            item => item.status === 'downloading'
        )
    }, [progressItems])

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

    const handleModelSelection = useCallback(
        (model: string) => {
            setSelectedModel(model)
            resetWhisperContext()
        },
        [resetWhisperContext]
    )

    const handleInitialize = useCallback(async () => {
        // Pass the model ID directly - the platform-specific provider will handle the formatting
        await updateConfig({ model: selectedModel }, true);
    }, [selectedModel, updateConfig]);

    const handleExtractAudio = useCallback(async () => {
        if (!selectedFile) return

        try {
            setIsExtracting(true)
            setProgress(0)
            
            // Get the duration to extract based on user selection
            const durationToExtract = isCustomDuration ? customDuration : extractDuration;
            
            const extractedData = await extractAudioData({
                fileUri: selectedFile.uri,
                includeBase64Data: true,
                includeNormalizedData: true,
                startTimeMs: 0,
                endTimeMs: durationToExtract,
                decodingOptions: {
                    targetSampleRate: 16000, // Whisper expects 16kHz
                    targetChannels: 1, // Mono
                    targetBitDepth: 16, // 16-bit
                },
            });
            
            setExtractedAudioData(extractedData);
            setAudioExtracted(true);
        } catch (error) {
            console.error('Audio extraction error:', error);
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

            // Always extract audio to ensure proper format and duration
            try {
                setProgress(0.1); // Show some initial progress
                
                // Get the duration to extract based on user selection
                const durationToExtract = isCustomDuration ? customDuration : extractDuration;
                
                const extractedData = await extractAudioData({
                    fileUri: selectedFile.uri,
                    includeBase64Data: true,
                    includeNormalizedData: true,
                    startTimeMs: 0,
                    endTimeMs: durationToExtract,
                    decodingOptions: {
                        targetSampleRate: 16000, // Whisper expects 16kHz
                        targetChannels: 1, // Mono
                        targetBitDepth: 16, // 16-bit
                    },
                });
                
                setExtractedAudioData(extractedData);
                setAudioExtracted(true);
            } catch (error) {
                console.error('Audio extraction error:', error);
                throw new Error('Failed to extract audio file');
            }
        
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

            if(extractedAudioData) {
                transcribeParams.audioData = isWeb ?  extractedAudioData.normalizedData: extractedAudioData.base64Data
            } else {
                transcribeParams.audioUri = selectedFile.uri
            }

            const { promise, stop } = await transcribe(transcribeParams as TranscribeParams)

            setStopTranscription(() => stop)

            const transcription = await promise
            const endTime = Date.now()
            const processingDuration = (endTime - startTime) / 1000

            // Store only the last transcription log
            setLastTranscriptionLog({
                modelId: selectedModel,
                fileName: selectedFile.name ?? 'Unknown file',
                processingDuration,
                fileDuration,
                timestamp: endTime,
                fileSize: selectedFile.size ?? 0,
            });
            
            console.log('Final transcription:', transcription)
            setTranscriptionData(transcription)
        } catch (error) {
            console.error('Transcription error:', error)
            setTranscriptionData((prev) => ({
                ...prev,
                isBusy: false,
                text: 'Error during transcription',
                endTime: Date.now(),
            }))
        } finally {
            if (processingTimer.current) {
                clearInterval(processingTimer.current)
            }
            setIsTranscribing(false)
            setStopTranscription(null)
        }
    }, [selectedFile, selectedModel, whisperContextReady, transcribe, extractedAudioData])

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

                <SegmentedButtons
                    value={selectedModel}
                    onValueChange={handleModelSelection}
                    buttons={config.WHISPER_MODELS.map((model) => ({
                        value: model.id,
                        label: model.label,
                        disabled: isInitializingModel,
                    }))}
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

                <Button
                    mode="contained"
                    onPress={handleInitialize}
                    loading={isInitializingModel || isDownloading}
                    disabled={
                        isInitializingModel ||
                        isDownloading ||
                        whisperContextReady
                    }
                >
                    {isDownloading
                        ? `Downloading... ${Math.round(downloadProgress[selectedModel] * 100)}%`
                        : whisperContextReady 
                          ? `${selectedModel} Model Ready`
                          : `Initialize ${selectedModel} Model`}
                </Button>

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

                {transcriptionData  && (
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
