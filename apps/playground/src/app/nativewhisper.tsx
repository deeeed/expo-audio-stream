import { Button, ScreenWrapper } from '@siteed/design-system'
import { TranscriberData } from '@siteed/expo-audio-stream'
import { Audio } from 'expo-av'
import * as DocumentPicker from 'expo-document-picker'
import React, { useCallback, useState, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ProgressBar, SegmentedButtons } from 'react-native-paper'
import {
    initWhisper,
    WhisperContext,
    TranscribeNewSegmentsResult,
} from 'whisper.rn'

import Transcript from '../component/Transcript'
import { isWeb } from '../utils/utils'

interface WhisperModel {
    id: string
    label: string
    file: any
}

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
}

const WHISPER_MODELS: WhisperModel[] = [
    {
        id: 'tiny',
        label: 'Tiny Model',
        file: require('@assets/ggml-tiny.en.bin'),
    },
    {
        id: 'base',
        label: 'Base Model',
        file: require('@assets/ggml-base.bin'),
    },
    {
        id: 'small',
        label: 'Small (tdrz)',
        file: require('@assets/ggml-small.en-tdrz.bin'),
    },
]

const styles = StyleSheet.create({
    container: {
        padding: 10,
        gap: 16,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
    },
    progressText: {
        minWidth: 48,
    },
    progressBar: {
        flex: 1,
        height: 8,
    },
    resultText: {
        marginTop: 10,
    },
    logsContainer: {
        marginTop: 16,
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    logsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    logItem: {
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        gap: 4,
    },
    processingContainer: {
        marginTop: 16,
        padding: 8,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        alignItems: 'center',
    },
    processingTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    processingTime: {
        marginBottom: 8,
    },
})

export function TestPage() {
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
    const [progress, setProgress] = useState(0)
    const [stopTranscription, setStopTranscription] = useState<
        (() => Promise<void>) | null
    >(null)
    const [selectedModel, setSelectedModel] = useState<string>(
        WHISPER_MODELS[0].id
    )
    const [whisperContext, setWhisperContext] = useState<WhisperContext | null>(
        null
    )
    const [isInitializingModel, setIsInitializingModel] = useState(false)
    const [transcriptionLogs, setTranscriptionLogs] = useState<
        TranscriptionLog[]
    >([])
    const [currentProcessingTime, setCurrentProcessingTime] =
        useState<number>(0)
    const processingTimer = useRef<ReturnType<typeof setInterval>>()
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)

    const convertWhisperSegmentsToChunks = (
        result: TranscribeNewSegmentsResult
    ) => {
        return result.segments.map((segment) => ({
            text: segment.text.trim(),
            timestamp: [
                segment.t0 / 100,
                segment.t1 ? segment.t1 / 100 : null,
            ] as [number, number | null],
        }))
    }

    const handleFileSelection = useCallback(async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: 'audio/*',
        })

        if (!result.canceled && result.assets?.[0]) {
            const { uri, size = 0, name } = result.assets[0]
            setSelectedFile({ uri, size, name })
        }
    }, [])

    const startTranscription = useCallback(async () => {
        if (!selectedFile || !whisperContext) return

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

            const { promise, stop } = whisperContext.transcribe(
                selectedFile.uri,
                {
                    language: 'en',
                    tokenTimestamps: true,
                    tdrzEnable: true,
                    onProgress(progress: number) {
                        setProgress(progress)
                    },
                    onNewSegments(result) {
                        const newChunks = convertWhisperSegmentsToChunks(result)
                        setTranscriptionData((prev) => {
                            const existingChunks = prev.chunks || []
                            const updatedChunks = [...existingChunks]

                            newChunks.forEach((newChunk) => {
                                const isDuplicate = existingChunks.some(
                                    (existing) =>
                                        existing.text === newChunk.text &&
                                        existing.timestamp[0] ===
                                            newChunk.timestamp[0]
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
                    },
                }
            )

            setStopTranscription(() => stop)

            const { result: transcription } = await promise
            const endTime = Date.now()
            const processingDuration = (endTime - startTime) / 1000

            setTranscriptionLogs((prev) => [
                ...prev,
                {
                    modelId: selectedModel,
                    fileName: selectedFile.name ?? 'Unknown file',
                    processingDuration,
                    fileDuration,
                    timestamp: endTime,
                    fileSize: selectedFile.size ?? 0,
                },
            ])

            console.log('Final transcription:', transcription)
            setTranscriptionData((prev) => ({
                ...prev,
                isBusy: false,
                text: transcription.trim(),
                endTime: Date.now(),
            }))
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
    }, [selectedFile, whisperContext])

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

    const initializeWhisperModel = useCallback(async () => {
        try {
            setIsInitializingModel(true)
            const modelToUse = WHISPER_MODELS.find(
                (model) => model.id === selectedModel
            )
            if (!modelToUse) throw new Error('Invalid model selected')

            const context = await initWhisper({
                filePath: modelToUse.file,
            })
            setWhisperContext(context)
        } catch (error) {
            console.error('Model initialization error:', error)
        } finally {
            setIsInitializingModel(false)
        }
    }, [selectedModel])

    if (isWeb) {
        return <Text>Native Whisper is not supported on web</Text>
    }

    return (
        <ScreenWrapper withScrollView>
            <View style={styles.container}>
                <SegmentedButtons
                    value={selectedModel}
                    onValueChange={(model) => {
                        setSelectedModel(model)
                        setWhisperContext(null)
                    }}
                    buttons={WHISPER_MODELS.map((model) => ({
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
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
                    </Text>
                )}

                <Button
                    mode="contained"
                    onPress={initializeWhisperModel}
                    loading={isInitializingModel}
                    disabled={isInitializingModel || whisperContext !== null}
                >
                    Initialize{' '}
                    {WHISPER_MODELS.find((m) => m.id === selectedModel)?.label}
                </Button>

                <Button
                    mode="contained"
                    onPress={startTranscription}
                    loading={isTranscribing}
                    disabled={
                        isTranscribing || !selectedFile || !whisperContext
                    }
                >
                    Start Transcription
                </Button>

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
                            Processing...
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

                {transcriptionLogs.length > 0 && (
                    <View style={styles.logsContainer}>
                        <Text style={styles.logsTitle}>
                            Transcription History
                        </Text>
                        {transcriptionLogs.map((log, index) => (
                            <View key={index} style={styles.logItem}>
                                <Text>File: {log.fileName}</Text>
                                <Text>Model: {log.modelId}</Text>
                                <Text>
                                    File Duration: {log.fileDuration.toFixed(1)}
                                    s
                                </Text>
                                <Text>
                                    Processing Time:{' '}
                                    {log.processingDuration.toFixed(1)}s
                                </Text>
                                <Text>
                                    Processing Speed:{' '}
                                    {(
                                        log.fileDuration /
                                        log.processingDuration
                                    ).toFixed(1)}
                                    x
                                </Text>
                                <Text>
                                    Size:{' '}
                                    {(log.fileSize / (1024 * 1024)).toFixed(2)}
                                    MB
                                </Text>
                                <Text>
                                    Date:{' '}
                                    {new Date(log.timestamp).toLocaleString()}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
                <View>
                    <Transcript
                        transcribedData={transcriptionData}
                        isBusy={isTranscribing}
                        showActions={false}
                        useScrollView
                    />
                </View>
            </View>
        </ScreenWrapper>
    )
}

export default TestPage
