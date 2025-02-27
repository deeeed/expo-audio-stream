import { AppTheme, Button, NumberAdjuster, ScreenWrapper, Text, useTheme, LabelSwitch } from '@siteed/design-system'
import { ExtractAudioDataOptions, ExtractedAudioData, TranscriberData, extractAudioData } from '@siteed/expo-audio-stream'
import { Audio } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, ScrollView } from 'react-native'
import { ProgressBar, SegmentedButtons } from 'react-native-paper'

import { isWeb } from '../../../../packages/expo-audio-ui/src/constants'
import { PCMPlayer } from '../component/PCMPlayer'
import { TranscriberConfig } from '../component/TranscriberConfig'
import Transcript from '../component/Transcript'
import { baseLogger } from '../config'
import { useTranscription } from '../context/TranscriptionProvider'
import { TranscribeParams } from '../context/TranscriptionProvider.types'
import { validateExtractedAudio } from '../utils/audioValidation'


const logger = baseLogger.extend('whisper')

interface TranscriptionLog {
    modelId: string
    fileName: string
    processingDuration: number
    fileDuration: number
    timestamp: number
    fileSize: number
    extractedDuration: number
    extractedSize: number
}

interface SelectedFile {
    uri: string
    size: number
    name: string
    duration?: number
    fileType?: string
}

interface ExtractDurationOption {
    label: string
    value: number  // duration in milliseconds
}

const EXTRACT_DURATION_OPTIONS: ExtractDurationOption[] = [
    { label: '3 sec', value: 3000 },
    { label: '5 sec', value: 5000 },
    { label: '10 sec', value: 10000 },
    { label: '30 sec', value: 30000 },
    { label: '1 min', value: 60000 },
    { label: 'Full', value: -1 }  // Special value for full file
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
        fileInfoContainer: {
            marginTop: theme.margin.m,
            padding: theme.padding.s,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: theme.roundness,
        },
        fileInfoTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: theme.margin.s,
        },
        fileInfoContent: {
            gap: theme.spacing.gap / 2,
        },
        fileInfoName: {
            fontSize: 15,
            fontWeight: '500',
            marginBottom: 4,
        },
        fileInfoDetails: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.gap,
        },
        fileInfoDetail: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        fileInfoLabel: {
            fontWeight: '500',
            color: theme.colors.onSurfaceVariant,
        },
        logSection: {
            marginBottom: theme.margin.s,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outlineVariant,
            paddingBottom: theme.padding.s,
        },
        logSectionTitle: {
            fontSize: 15,
            fontWeight: '600',
            marginBottom: 8,
            color: theme.colors.primary,
        },
        logDetail: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 2,
        },
        logLabel: {
            fontWeight: '500',
            marginRight: 8,
            color: theme.colors.onSurfaceVariant,
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
    const [autoTranscribeOnSelect, setAutoTranscribeOnSelect] = useState(false)

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
            const fileExtension = name.split('.').pop()?.toLowerCase()
            
            try {
                let audioUri = uri;
                
                // For base64 data URIs on web, convert to blob URL
                if (isWeb && uri.startsWith('data:')) {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    audioUri = URL.createObjectURL(blob);
                }
                
                // Load the audio file
                const { sound } = await Audio.Sound.createAsync(
                    { uri: audioUri },
                    { shouldPlay: false },
                    (status) => {
                        logger.debug('Audio status update:', status);
                    }
                );
                
                // Play and immediately stop to get accurate duration
                await sound.playAsync();
                await sound.stopAsync();
                
                // Get the status after playing
                const status = await sound.getStatusAsync();
                
                // Get duration and unload
                let fileDuration = 0;
                if (status.isLoaded && status.durationMillis) {
                    fileDuration = status.durationMillis / 1000;
                }
                await sound.unloadAsync();
                
                // Clean up blob URL if we created one
                if (isWeb && audioUri !== uri) {
                    URL.revokeObjectURL(audioUri);
                }
                
                logger.debug('Selected file details:', {
                    name,
                    size,
                    extension: fileExtension,
                    uri,
                    durationSeconds: fileDuration,
                    status: status.isLoaded ? status : 'not loaded'
                });
                
                const fileInfo = { 
                    uri, 
                    size, 
                    name, 
                    duration: fileDuration,
                    fileType: fileExtension
                };
                
                setSelectedFile(fileInfo);
                
                // Auto-extract and transcribe if enabled
                if (autoTranscribeOnSelect) {
                    // Use a shorter duration (10 seconds) for auto-transcription
                    setExtractDuration(10000);
                    setTimeout(() => handleExtractAudio(fileInfo, 10000), 100);
                }
                
            } catch (error) {
                console.error('Error loading audio file:', error);
                alert(`Warning: Could not load audio metadata. The file may not be in a supported format. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                const fileInfo = { 
                    uri, 
                    size, 
                    name, 
                    duration: 0,
                    fileType: fileExtension
                };
                setSelectedFile(fileInfo);
            }
            
            // Reset state for new file
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
    }, [autoTranscribeOnSelect])

    const handleExtractAudio = useCallback(async (file?: SelectedFile, duration?: number) => {
        const fileToUse = file || selectedFile;
        const durationToUse = duration || (isCustomDuration ? customDuration : extractDuration);
        
        if (!fileToUse) {
            logger.error('No file selected')
            return
        }

        try {
            setIsExtracting(true)
            setProgress(0)
            
            const options: ExtractAudioDataOptions = {
                fileUri: fileToUse.uri,
                includeBase64Data: true,
                includeNormalizedData: true,
                includeWavHeader: isWeb,
                startTimeMs: 0,
                logger,
                decodingOptions: {
                    targetSampleRate: 16000,
                    targetChannels: 1,
                    targetBitDepth: 16,
                    normalizeAudio: true,
                },
            }

            // Only add endTimeMs if we're not extracting the full file
            if (durationToUse !== -1) {
                options.endTimeMs = durationToUse;
            }

            logger.debug('Extract audio options:', options)
            const extractedData = await extractAudioData(options)

            // Use the shared validation utility
            validateExtractedAudio(extractedData, fileToUse.name)

            setExtractedAudioData(extractedData)
            setAudioExtracted(true)
            
            // Log success
            logger.debug('Audio extraction successful:', {
                fileName: fileToUse.name,
                duration: extractedData.durationMs,
                sampleRate: extractedData.sampleRate,
                channels: extractedData.channels
            })

            // Auto-start transcription if this was triggered by auto-transcribe
            if (autoTranscribeOnSelect && file) {
                setTimeout(() => startTranscription(), 100);
            }

        } catch (error) {
            console.error('Audio extraction error:', {
                error,
                fileName: fileToUse.name,
                fileType: fileToUse.fileType,
                fileSize: fileToUse.size
            })
            alert('Failed to extract audio: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsExtracting(false)
        }
    }, [selectedFile, extractDuration, customDuration, isCustomDuration, autoTranscribeOnSelect])

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
            
            // Use the duration we already have from the selected file
            const fileDuration = selectedFile.duration || 0;
            
            const transcribeParams: Partial<TranscribeParams> = {
                jobId: '1',
                options: {
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
                if(extractedAudioData.normalizedData) {
                    transcribeParams.audioData = extractedAudioData.normalizedData
                } else {
                    // Use the PCM data directly since it already has a WAV header
                    transcribeParams.audioUri = URL.createObjectURL(
                        new Blob([extractedAudioData.pcmData], { type: 'audio/wav' })
                    );
                }
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

            // Calculate extracted audio size
            let extractedSize = 0;
            if (extractedAudioData.pcmData) {
                extractedSize = extractedAudioData.pcmData.byteLength;
            } else if (extractedAudioData.base64Data) {
                // Estimate size from base64 (4 chars in base64 = 3 bytes)
                extractedSize = Math.floor(extractedAudioData.base64Data.length * 0.75);
            }

            setLastTranscriptionLog({
                modelId: 'tiny',
                fileName: selectedFile.name ?? 'Unknown file',
                processingDuration,
                fileDuration,  // This will now use the correct duration from selectedFile
                timestamp: endTime,
                fileSize: selectedFile.size ?? 0,
                extractedDuration: extractedAudioData.durationMs / 1000,
                extractedSize: extractedSize
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
            <LabelSwitch
                label="Auto-transcribe on file selection"
                value={autoTranscribeOnSelect}
                onValueChange={setAutoTranscribeOnSelect}
                containerStyle={{
                    backgroundColor: theme.colors.surface,
                    marginBottom: 10
                }}
            />

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
                <View style={styles.fileInfoContainer}>
                    <Text style={styles.fileInfoTitle}>Selected File</Text>
                    <View style={styles.fileInfoContent}>
                        <Text style={styles.fileInfoName}>{selectedFile.name}</Text>
                        <View style={styles.fileInfoDetails}>
                            <View style={styles.fileInfoDetail}>
                                <Text style={styles.fileInfoLabel}>Size:</Text>
                                <Text>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</Text>
                            </View>
                            {selectedFile.duration ? (
                                <View style={styles.fileInfoDetail}>
                                    <Text style={styles.fileInfoLabel}>Duration:</Text>
                                    <Text>{selectedFile.duration.toFixed(1)}s</Text>
                                </View>
                            ) : null}
                            {selectedFile.fileType ? (
                                <View style={styles.fileInfoDetail}>
                                    <Text style={styles.fileInfoLabel}>Format:</Text>
                                    <Text>{selectedFile.fileType.toUpperCase()}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                </View>
            )}

            {selectedFile && (
                <>
                    <View style={styles.extractionSection}>
                        <Text style={styles.sectionTitle}>Audio Extraction Options</Text>
                        
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={true}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
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
                                    ...EXTRACT_DURATION_OPTIONS
                                        .filter(option => 
                                            option.value === -1 || // Always include 'Full' option
                                            (selectedFile.duration && option.value <= selectedFile.duration * 1000) // Convert duration to ms
                                        )
                                        .map((option) => ({
                                            value: option.value.toString(),
                                            label: option.label,
                                        })),
                                    { value: 'custom', label: 'Custom' }
                                ]}
                            />
                        </ScrollView>
                        
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
                            onPress={() => handleExtractAudio()}
                            loading={isExtracting}
                            disabled={isTranscribing || !selectedFile}
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
                            !audioExtracted || !extractedAudioData
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

            {selectedFile && (
                <Transcript
                    transcribedData={transcriptionData}
                    isBusy={isTranscribing}
                    showActions={false}
                    useScrollView
                />
            )}

            {lastTranscriptionLog && (
                <TranscriptionHistory log={lastTranscriptionLog} />
            )}
        </ScreenWrapper>
    )
}

const TranscriptionHistory = ({ log }: { log: TranscriptionLog }) => {
    const theme = useTheme();
    const styles = useMemo(() => getStyles({ theme }), [theme]);

    return (
        <View style={styles.logsContainer}>
            <Text style={styles.logsTitle}>
                Transcription Results
            </Text>
            <View style={styles.logItem}>
                <View style={styles.logSection}>
                    <Text style={styles.logSectionTitle}>File Information</Text>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Name:</Text>
                        <Text>{log.fileName}</Text>
                    </View>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Original Size:</Text>
                        <Text>{(log.fileSize / (1024 * 1024)).toFixed(2)} MB</Text>
                    </View>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Original Duration:</Text>
                        <Text>{log.fileDuration.toFixed(1)}s</Text>
                    </View>
                </View>

                <View style={styles.logSection}>
                    <Text style={styles.logSectionTitle}>Extracted Audio</Text>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Duration:</Text>
                        <Text>{log.extractedDuration.toFixed(1)}s</Text>
                    </View>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Size:</Text>
                        <Text>{(log.extractedSize / (1024 * 1024)).toFixed(2)} MB</Text>
                    </View>
                </View>

                <View style={styles.logSection}>
                    <Text style={styles.logSectionTitle}>Processing</Text>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Model:</Text>
                        <Text>{log.modelId}</Text>
                    </View>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Processing Time:</Text>
                        <Text>{log.processingDuration.toFixed(1)}s</Text>
                    </View>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Processing Speed:</Text>
                        <Text>{(log.extractedDuration / log.processingDuration).toFixed(1)}x</Text>
                    </View>
                    <View style={styles.logDetail}>
                        <Text style={styles.logLabel}>Timestamp:</Text>
                        <Text>{new Date(log.timestamp).toLocaleString()}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default WhisperScreen
