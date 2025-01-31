// playground/src/app/(tabs)/index.tsx
import {
    Button,
    EditableInfoCard,
    LabelSwitch,
    Notice,
    Picker,
    ScreenWrapper,
    useToast,
} from '@siteed/design-system'
import {
    AudioDataEvent,
    AudioRecording,
    ExpoAudioStreamModule,
    NotificationConfig,
    RecordingConfig,
    SampleRate,
    StartRecordingResult,
    TranscriberData,
    useSharedAudioRecorder,
} from '@siteed/expo-audio-stream'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useRouter } from 'expo-router'
import isBase64 from 'is-base64'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text, useTheme } from 'react-native-paper'

import { AudioRecordingView } from '../../component/AudioRecordingView'
import { IOSSettingsConfig } from '../../component/IOSSettingsConfig'
import LiveTranscriber from '../../component/LiveTranscriber'
import { NativeNotificationConfig } from '../../component/NativeNotificationConfig'
import { ProgressItems } from '../../component/ProgressItems'
import { RecordingStats } from '../../component/RecordingStats'
import { baseLogger, WhisperSampleRate } from '../../config'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { useTranscription } from '../../context/TranscriptionProvider'
import { useLiveTranscriber } from '../../hooks/useLiveTranscriber'
import { storeAudioFile } from '../../utils/indexedDB'
import { isWeb } from '../../utils/utils'

const CHUNK_DURATION_MS = 500 // 500 ms chunks
const MAX_AUDIO_BUFFER_LENGTH = 48000 * 5; // 5 seconds of audio at 48kHz

const baseRecordingConfig: RecordingConfig = {
    interval: CHUNK_DURATION_MS,
    sampleRate: WhisperSampleRate,
    keepAwake: true,
    showNotification: false,
    showWaveformInNotification: true,
    encoding: 'pcm_32bit',
    pointsPerSecond: 10,
    enableProcessing: true,
    compression: {
        enabled: true,
        format: 'opus',
        bitrate: 24000,
    },
    ios: {
        audioSession: {
            category: 'PlayAndRecord',
            mode: 'SpokenAudio',
            categoryOptions: [
                'MixWithOthers',
                'DefaultToSpeaker',
                'AllowBluetooth',
                'AllowBluetoothA2DP',
                'AllowAirPlay',
            ],
        },
    },
    onRecordingInterrupted: (event) => {
        console.log('Recording interrupted', event)
    },
    notification: {
        title: 'Recording in progress',
        text: 'Please wait while we transcribe your audio',
        android:
            Platform.OS === 'android'
                ? {
                      channelId: 'audio_recording_channel',
                      channelName: 'Audio Recording',
                      channelDescription: 'Shows audio recording status',
                      notificationId: 1,
                      waveform: {
                          color: '#FFFFFF',
                          opacity: 1.0,
                          strokeWidth: 1.5,
                          style: 'fill',
                          mirror: true,
                          height: 64,
                      },
                      lightColor: '#FF0000',
                      priority: 'high',
                  }
                : undefined,
        ios:
            Platform.OS === 'ios'
                ? {
                      categoryIdentifier: '',
                  }
                : undefined,
    },
}

const logger = baseLogger.extend('RecordScreen')

if (Platform.OS === 'ios') {
    baseRecordingConfig.sampleRate = 48000
} else if (Platform.OS === 'android') {
    baseRecordingConfig.sampleRate = WhisperSampleRate
} else if (Platform.OS === 'web') {
    baseRecordingConfig.sampleRate = 44100
}

logger.debug(`Base Recording Config`, baseRecordingConfig)

export default function RecordScreen() {
    const [error, setError] = useState<string | null>(null)
    const [notificationEnabled, setNotificationEnabled] = useState(
        baseRecordingConfig.showNotification ?? false
    )

    const [notificationConfig, setNotificationConfig] =
        useState<NotificationConfig>({
            title:
                baseRecordingConfig.notification?.title ??
                'Recording in progress',
            text: baseRecordingConfig.notification?.text ?? '',
            icon: baseRecordingConfig.notification?.icon,
            android: {
                notificationId: 1,
                channelId: baseRecordingConfig.notification?.android?.channelId,
                channelName:
                    baseRecordingConfig.notification?.android?.channelName,
                channelDescription:
                    baseRecordingConfig.notification?.android
                        ?.channelDescription,
                waveform: baseRecordingConfig.notification?.android?.waveform,
                lightColor:
                    baseRecordingConfig.notification?.android?.lightColor,
                priority: baseRecordingConfig.notification?.android?.priority,
                accentColor:
                    baseRecordingConfig.notification?.android?.accentColor,
            },
            ios: {
                categoryIdentifier:
                    baseRecordingConfig.notification?.ios?.categoryIdentifier,
            },
        })
    const [iosSettingsEnabled, setIOSSettingsEnabled] = useState(false)
    const [iosSettings, setIOSSettings] = useState<RecordingConfig['ios']>(
        baseRecordingConfig.ios
    )

    const audioChunks = useRef<string[]>([])
    const webAudioChunks = useRef<Float32Array>(new Float32Array(0))
    const [streamConfig, setStreamConfig] =
        useState<StartRecordingResult | null>(null)
    const [startRecordingConfig, setStartRecordingConfig] =
        useState<RecordingConfig>({
            ...baseRecordingConfig,
            onAudioStream: (a) => onAudioData(a),
        })
    const { initialize, ready, isModelLoading, progressItems } =
        useTranscription()
    const [result, setResult] = useState<AudioRecording | null>(null)
    const [processing, setProcessing] = useState(false)
    const currentSize = useRef(0)
    const { refreshFiles, removeFile } = useAudioFiles()
    const router = useRouter()
    const [liveWebAudio, setLiveWebAudio] = useState<Float32Array | null>(null)
    const [enableLiveTranscription, setEnableLiveTranscription] =
        useState(false)
    const validSRTranscription =
        startRecordingConfig.sampleRate === WhisperSampleRate
    const [stopping, setStopping] = useState(false)
    const { colors } = useTheme()
    const [customFileName, setCustomFileName] = useState<string>('')
    const [defaultDirectory, setDefaultDirectory] = useState<string>('')

    const { transcripts, activeTranscript } = useLiveTranscriber({
        stopping,
        audioBuffer: webAudioChunks.current,
        sampleRate: startRecordingConfig.sampleRate ?? WhisperSampleRate,
        enabled: enableLiveTranscription && validSRTranscription,
    })
    const transcriptionResolveRef =
        useRef<(transcriptions: TranscriberData[]) => void>()
    const { show, hide } = useToast()

    const showPermissionError = (permission: string) => {
        logger.error(`${permission} permission not granted`)
        show({
            type: 'error',
            message: `${permission} permission is required for recording`,
            duration: 3000,
        })
    }

    const requestPermissions = async () => {
        try {
            if (Platform.OS === 'android') {
                const recordingPermission =
                    await ExpoAudioStreamModule.requestPermissionsAsync()
                if (recordingPermission.status !== 'granted') {
                    showPermissionError('Microphone')
                    return false
                }

                if (Platform.Version >= 33) {
                    const notificationPermission =
                        await ExpoAudioStreamModule.requestNotificationPermissionsAsync()
                    if (notificationPermission.status !== 'granted') {
                        showPermissionError('Notification')
                        return false
                    }
                }
            } else {
                const { granted } = await Audio.requestPermissionsAsync()
                if (!granted) {
                    showPermissionError('Microphone')
                    return false
                }
            }

            return true
        } catch (error) {
            logger.error('Error requesting permissions:', error)
            setError('Failed to request permissions. Please try again.')
            return false
        }
    }

    const onAudioData = useCallback(async (event: AudioDataEvent) => {
        try {
            logger.log(`Received audio data event`, event)
            const { data, position, eventDataSize } = event
            if (eventDataSize === 0) {
                logger.warn(`Invalid data size=${eventDataSize}`)
                return
            }

            currentSize.current += eventDataSize

            if (typeof data === 'string') {
                // Append the audio data to the audioRef
                audioChunks.current.push(data)
                if (!isBase64(data)) {
                    logger.warn(
                        `Invalid base64 data for chunks#${audioChunks.current.length} position=${position}`
                    )
                }
            } else if (data instanceof Float32Array) {
                // Keep only a sliding window of audio data
                const newLength = Math.min(
                    MAX_AUDIO_BUFFER_LENGTH,
                    webAudioChunks.current.length + data.length
                )
                
                const concatenatedBuffer = new Float32Array(newLength)
                
                if (webAudioChunks.current.length + data.length > MAX_AUDIO_BUFFER_LENGTH) {
                    // If we would exceed max length, copy only the most recent data
                    const startOffset = (webAudioChunks.current.length + data.length) - MAX_AUDIO_BUFFER_LENGTH
                    concatenatedBuffer.set(
                        webAudioChunks.current.slice(startOffset), 
                        0
                    )
                    concatenatedBuffer.set(data, MAX_AUDIO_BUFFER_LENGTH - data.length)
                } else {
                    // If we're still under max length, copy everything
                    concatenatedBuffer.set(webAudioChunks.current)
                    concatenatedBuffer.set(data, webAudioChunks.current.length)
                }
                
                webAudioChunks.current = concatenatedBuffer
                setLiveWebAudio(webAudioChunks.current)
            }
        } catch (error) {
            logger.error(`Error while processing audio data`, error)
        }
    }, [])

    const {
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        isPaused,
        durationMs: duration,
        size,
        compression,
        isRecording,
        analysisData,
    } = useSharedAudioRecorder()

    const handleStart = async () => {
        try {
            setProcessing(true)
            
            // Ensure we have a valid directory
            if (!defaultDirectory) {
                throw new Error('Storage directory not initialized')
            }

            // Request permissions and other checks...
            const permissionsGranted = await requestPermissions()
            if (!permissionsGranted) return

            // Restore web-specific initialization
            if (!ready && isWeb) {
                logger.info(`Initializing transcription...`)
                initialize()
            }

            // Clear previous audio chunks
            audioChunks.current = []
            webAudioChunks.current = new Float32Array(0)
            currentSize.current = 0
            setLiveWebAudio(null)

            // Ensure filename has proper extension if provided
            let finalFileName = customFileName
            if (finalFileName && !finalFileName.endsWith('.wav')) {
                finalFileName = `${finalFileName}.wav`
            }

            const finalConfig = {
                ...startRecordingConfig,
                filename: finalFileName || undefined,
                outputDirectory: Platform.OS !== 'web' ? defaultDirectory : undefined,
            }

            logger.debug(`Starting recording with config:`, finalConfig)
            const streamConfig: StartRecordingResult = await startRecording(finalConfig)
            logger.debug(`Recording started:`, streamConfig)
            setStreamConfig(streamConfig)

        } catch (error) {
            logger.error(`Error while starting recording:`, error)
            if (error instanceof Error) {
                show({
                    type: 'error',
                    message: `Recording failed: ${error.message}`,
                    duration: 3000,
                })
            }
            setError('Failed to start recording. Please try again.')
        } finally {
            setProcessing(false)
        }
    }

    const handleStopRecording = useCallback(async () => {
        try {
            setStopping(true)
            setProcessing(true)

            // Defer the stop operation to the next tick to let UI update
            await new Promise(resolve => setTimeout(resolve, 0))
            
            const result = await stopRecording()
            logger.debug(`Recording stopped. `, result)

            if (!result) {
                setError('No audio data found.')
                return
            }

            // Defer post-processing to let UI breathe
            await new Promise(resolve => requestAnimationFrame(resolve))

            // Handle live transcription if enabled
            if (enableLiveTranscription) {
                show({
                    loading: true,
                    message: 'Waiting for transcription to complete',
                })

                let timeout: NodeJS.Timeout
                const transcriptions = await Promise.race([
                    new Promise<TranscriberData[]>((resolve) => {
                        timeout = setTimeout(() => {
                            logger.warn(`Timeout waiting for transcriptions`)
                            resolve(transcripts)
                        }, 15000)
                    }),
                    new Promise<TranscriberData[]>((resolve) => {
                        transcriptionResolveRef.current = resolve
                    }),
                ])
                clearTimeout(timeout!)
                hide()
                result.transcripts = transcriptions
            }

            // Defer file storage operations
            await new Promise(resolve => requestAnimationFrame(resolve))

            setResult(result)

            if (isWeb) {
                try {
                    let arrayBuffer: ArrayBuffer = new ArrayBuffer(0)
                    if(result.compression?.compressedFileUri) {
                        const audioBuffer = result.compression.compressedFileUri
                        arrayBuffer = await fetch(audioBuffer).then(res => res.arrayBuffer())
                    }

                    await storeAudioFile({
                        fileName: result.filename,
                        arrayBuffer,
                        metadata: result,
                    })

                    await refreshFiles()
                    logger.debug('Audio file stored successfully')
            } catch (error) {
                logger.error('Failed to store audio:', error)
                if (error instanceof Error) {
                    logger.error('Error details:', {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    })
                }
                throw new Error('Failed to store audio file')
            }
            } else {
                const jsonPath = result.fileUri.replace(/\.wav$/, '.json')
                await FileSystem.writeAsStringAsync(
                    jsonPath,
                    JSON.stringify(result, null, 2),
                    { encoding: FileSystem.EncodingType.UTF8 }
                )
                logger.log(`Metadata saved to ${jsonPath}`)
                refreshFiles()
            }

            setResult(null)
            router.navigate(`(recordings)/${result.filename}`)
        } catch (error) {
            logger.error(`Error while stopping recording`, error)
            setError('Failed to stop recording. Please try again.')
        } finally {
            setStopping(false)
            setProcessing(false)
        }
    }, [stopRecording, enableLiveTranscription, router, show, hide, transcripts, refreshFiles])

    const renderRecording = () => (
        <View style={{ gap: 10, display: 'flex' }}>
            {analysisData && (
                <AudioVisualizer
                    candleSpace={2}
                    candleWidth={5}
                    canvasHeight={200}
                    mode="live"
                    audioData={analysisData}
                />
            )}
            <RecordingStats
                duration={duration}
                size={size}
                sampleRate={streamConfig?.sampleRate}
                bitDepth={streamConfig?.bitDepth}
                channels={streamConfig?.channels}
                compression={compression}
            />

            {isModelLoading && <ProgressItems items={progressItems} />}

            {!isModelLoading &&
                isWeb &&
                enableLiveTranscription &&
                liveWebAudio && (
                    <LiveTranscriber
                        transcripts={transcripts}
                        duration={duration}
                        activeTranscript={activeTranscript}
                        sampleRate={
                            startRecordingConfig.sampleRate ?? WhisperSampleRate
                        }
                    />
                )}
            <Button mode="contained" onPress={pauseRecording}>
                Pause Recording
            </Button>
            <Button 
                mode="contained" 
                onPress={() => handleStopRecording()}
                loading={stopping}
                disabled={stopping}
            >
                {stopping ? 'Stopping...' : 'Stop Recording'}
            </Button>
        </View>
    )

    const handleDelete = useCallback(
        async (recording: AudioRecording) => {
            logger.debug(`Deleting recording: ${recording.filename}`)
            try {
                router.navigate('/files')
                await removeFile(recording)
                setResult(null)
            } catch (error) {
                logger.error(
                    `Failed to delete recording: ${recording.fileUri}`,
                    error
                )
                setError('Failed to delete the recording. Please try again.')
            }
        },
        [removeFile, router]
    )

    const renderPaused = () => (
        <View style={{ gap: 10, display: 'flex' }}>
            {analysisData && (
                <AudioVisualizer
                    candleSpace={2}
                    candleWidth={5}
                    canvasHeight={200}
                    mode="live"
                    audioData={analysisData}
                />
            )}
            <RecordingStats
                duration={duration}
                size={size}
                sampleRate={streamConfig?.sampleRate}
                bitDepth={streamConfig?.bitDepth}
                channels={streamConfig?.channels}
                compression={compression}
            />
            <Button mode="contained" onPress={resumeRecording}>
                Resume Recording
            </Button>
            <Button mode="contained" onPress={() => handleStopRecording()}>
                Stop Recording
            </Button>
        </View>
    )

    const showDirectoryInfo = () => {
        show({
            type: 'info',
            message: 'Files are saved to the app\'s designated storage area for security. Use the Share button after recording to save files elsewhere.',
            duration: 5000,
        })
    }

    const renderStopped = () => (
        <View style={{ gap: 10 }}>
            <EditableInfoCard
                label="File Name"
                value={customFileName}
                placeholder="pick a filename for your recording"
                inlineEditable
                editable
                containerStyle={{
                    backgroundColor: colors.secondaryContainer,
                }}
                onInlineEdit={(newFileName) => {
                    if (typeof newFileName === 'string') {
                        setCustomFileName(newFileName)
                        setStartRecordingConfig(prev => ({
                            ...prev,
                            filename: newFileName || undefined
                        }))
                    }
                }}
            />

            {Platform.OS !== 'web' && (
                <>
                    <Button 
                        mode="outlined" 
                        onPress={showDirectoryInfo}
                        icon="folder-information"
                    >
                        Storage Location Info
                    </Button>
                    <Notice
                        type="info"
                        title="Storage Location"
                        message={`Files will be saved to:\n${defaultDirectory}`}
                    />
                </>
            )}

            <Picker
                label="Sample Rate"
                multi={false}
                options={[
                    {
                        label: '16000',
                        value: '16000',
                        selected: startRecordingConfig.sampleRate === 16000,
                    },
                    {
                        label: '44100',
                        value: '44100',
                        selected: startRecordingConfig.sampleRate === 44100,
                    },
                    {
                        label: '48000',
                        value: '48000',
                        selected: startRecordingConfig.sampleRate === 48000,
                    },
                ]}
                onFinish={(options) => {
                    const selected = options?.find((option) => option.selected)
                    if (!selected) return
                    setStartRecordingConfig((prev) => ({
                        ...prev,
                        sampleRate: parseInt(selected.value, 10) as SampleRate,
                    }))
                }}
            />
            <Picker
                label="Encoding"
                multi={false}
                options={[
                    {
                        label: 'pcm_16bit',
                        value: 'pcm_16bit',
                        selected: startRecordingConfig.encoding === 'pcm_16bit',
                    },
                    {
                        label: 'pcm_32bit',
                        value: 'pcm_32bit',
                        selected: startRecordingConfig.encoding === 'pcm_32bit',
                    },
                    {
                        label: 'pcm_8bit',
                        value: 'pcm_8bit',
                        selected: startRecordingConfig.encoding === 'pcm_8bit',
                    },
                ]}
                onFinish={(options) => {
                    const selected = options?.find((option) => option.selected)
                    if (!selected) return
                    setStartRecordingConfig((prev) => ({
                        ...prev,
                        encoding: selected.value as RecordingConfig['encoding'],
                    }))
                }}
            />
            <Picker
                label="Points Per Second"
                multi={false}
                options={[
                    {
                        label: '20',
                        value: '20',
                        selected: startRecordingConfig.pointsPerSecond === 20,
                    },
                    {
                        label: '10',
                        value: '10',
                        selected: startRecordingConfig.pointsPerSecond === 10,
                    },
                    {
                        label: '1',
                        value: '1',
                        selected: startRecordingConfig.pointsPerSecond === 1,
                    },
                ]}
                onFinish={(options) => {
                    const selected = options?.find((option) => option.selected)
                    if (!selected) return
                    setStartRecordingConfig((prev) => ({
                        ...prev,
                        pointsPerSecond: parseInt(selected.value, 10),
                    }))
                }}
            />
            {!result && !isRecording && !isPaused && (
                <>
                    <LabelSwitch
                        label="Enable Compression"
                        value={startRecordingConfig.compression?.enabled ?? true}
                        onValueChange={(enabled) => {
                            setStartRecordingConfig((prev) => ({
                                ...prev,
                                compression: {
                                    ...(prev.compression ?? { format: 'opus', bitrate: 128000 }),
                                    enabled,
                                },
                            }))
                        }}
                    />

                    {startRecordingConfig.compression?.enabled && (
                        <>
                            <Picker
                                label="Compression Format"
                                multi={false}
                                options={[
                                    {
                                        label: 'OPUS (Recommended)',
                                        value: 'opus',
                                        selected: startRecordingConfig.compression?.format === 'opus',
                                    },
                                    // Only show AAC option for native platforms
                                    ...(!isWeb ? [{
                                        label: 'AAC',
                                        value: 'aac',
                                        selected: startRecordingConfig.compression?.format === 'aac',
                                    }] : []),
                                ]}
                                onFinish={(options) => {
                                    const selected = options?.find((option) => option.selected)
                                    if (!selected) return
                                    setStartRecordingConfig((prev) => ({
                                        ...prev,
                                        compression: {
                                            ...(prev.compression ?? { enabled: true, bitrate: 128000 }),
                                            format: selected.value as 'aac' | 'opus',
                                        },
                                    }))
                                }}
                            />
                            
                            <Picker
                                label="Bitrate (kbps)"
                                multi={false}
                                options={[
                                    {
                                        label: '32 kbps (High quality voice)',
                                        value: '32000',
                                        selected: startRecordingConfig.compression?.bitrate === 32000,
                                    },
                                    {
                                        label: '64 kbps (Studio quality)',
                                        value: '64000',
                                        selected: startRecordingConfig.compression?.bitrate === 64000,
                                    },
                                ]}
                                onFinish={(options) => {
                                    const selected = options?.find((option) => option.selected)
                                    if (!selected) return
                                    setStartRecordingConfig((prev) => ({
                                        ...prev,
                                        compression: {
                                            ...(prev.compression ?? { enabled: true, format: 'opus' }),
                                            bitrate: parseInt(selected.value, 10),
                                        },
                                    }))
                                }}
                            />
                        </>
                    )}
                </>
            )}
            {Platform.OS !== 'web' && (
                <NativeNotificationConfig
                    enabled={notificationEnabled}
                    onEnabledChange={setNotificationEnabled}
                    config={notificationConfig}
                    onConfigChange={setNotificationConfig}
                />
            )}

            {isWeb && validSRTranscription && (
                <LabelSwitch
                    label="Live Transcription"
                    value={enableLiveTranscription}
                    onValueChange={setEnableLiveTranscription}
                />
            )}
            {isWeb && !validSRTranscription && (
                <Notice
                    type="warning"
                    title="Transcription Not Available"
                    message="Live Transcription is only available at 16000hz sample rate"
                />
            )}

            {Platform.OS === 'ios' && (
                <>
                    <LabelSwitch
                        label="Custom iOS Audio Settings"
                        value={iosSettingsEnabled}
                        onValueChange={setIOSSettingsEnabled}
                    />
                    {iosSettingsEnabled && (
                        <IOSSettingsConfig
                            config={iosSettings}
                            onConfigChange={(newConfig) => {
                                console.debug(`New iOS config`, newConfig)
                                setIOSSettings(newConfig)
                            }}
                        />
                    )}
                </>
            )}
            <Button mode="contained" onPress={() => handleStart()}>
                Start Recording
            </Button>
        </View>
    )

    useEffect(() => {
        // Watch for new transcripts and resolve the promise
        if (transcriptionResolveRef.current) {
            transcriptionResolveRef.current(transcripts)
            transcriptionResolveRef.current = undefined
        }
    }, [transcripts])

    useEffect(() => {
        setStartRecordingConfig((prev) => ({
            ...prev,
            showNotification: notificationEnabled,
            notification: notificationConfig,
            ios: iosSettings,
        }))
    }, [notificationEnabled, notificationConfig, iosSettings])

    useEffect(() => {
        async function initializeDefaultDirectory() {
            try {
                // Use documentDirectory for both iOS and Android
                const baseDir = FileSystem.documentDirectory
                if (!baseDir) throw new Error('Could not get documents directory')
                
                // Remove file:// protocol and trailing slash
                const directory = baseDir
                    .replace('file://', '')
                    .replace(/\/$/, '')
                
                setDefaultDirectory(directory)
                logger.debug(`Storage directory initialized: ${directory}`)
            } catch (error) {
                logger.error('Error initializing default directory:', error)
                show({
                    type: 'error',
                    message: 'Failed to initialize storage directory',
                    duration: 3000,
                })
            }
        }

        initializeDefaultDirectory()
    }, [show])

    if (error) {
        return (
            <View style={{ gap: 10 }}>
                <Text>{error}</Text>
                <Button
                    onPress={() => {
                        setError(null)
                        handleStart()
                    }}
                >
                    Try Again
                </Button>
            </View>
        )
    }

    if (processing) {
        return <ActivityIndicator size="large" />
    }

    return (
        <ScreenWrapper withScrollView useInsets={false} contentContainerStyle={styles.container}>
            {result && (
                <View style={{ gap: 10, paddingBottom: 100 }}>
                    <AudioRecordingView
                        recording={result}
                        onDelete={() => handleDelete(result)}
                        onActionPress={() => {
                            router.navigate(`(recordings)/${result.filename}`)
                        }}
                        actionText="Visualize"
                    />
                    <Button mode="contained" onPress={() => setResult(null)}>
                        Record Again
                    </Button>
                </View>
            )}
            {isRecording && !isPaused && renderRecording()}
            {isPaused && renderPaused()}
            {!result && !isRecording && !isPaused && renderStopped()}
        </ScreenWrapper>
    )
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
        padding: 10,
        // flex: 1,
        // alignItems: "center",
        justifyContent: 'center',
        paddingBottom: 80,
    },
    waveformContainer: {
        borderRadius: 10,
    },
    recordingContainer: {
        gap: 10,
        borderWidth: 1,
    },
})
