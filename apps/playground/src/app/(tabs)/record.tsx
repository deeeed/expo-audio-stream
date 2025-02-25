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
import { useRouter, Stack } from 'expo-router'
import isBase64 from 'is-base64'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, View, Image } from 'react-native'
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
import { storeAudioFile } from '../../utils/indexedDB'
import { isWeb } from '../../utils/utils'
import { SegmentDuration, SegmentDurationSelector } from '../../component/SegmentDurationSelector'
import { useUnifiedTranscription } from '../../hooks/useUnifiedTranscription'

const CHUNK_DURATION_MS = 500 // 500 ms chunks
const MAX_AUDIO_BUFFER_LENGTH = 48000 * 5; // 5 seconds of audio at 48kHz

const logger = baseLogger.extend('RecordScreen')

const baseRecordingConfig: RecordingConfig = {
    interval: CHUNK_DURATION_MS,
    sampleRate: WhisperSampleRate,
    keepAwake: true,
    intervalAnalysis: CHUNK_DURATION_MS,
    showNotification: true,
    showWaveformInNotification: true,
    encoding: 'pcm_32bit',
    segmentDurationMs: 100,
    enableProcessing: true,
    compression: {
        enabled: true,
        format: Platform.OS === 'ios' ? 'aac' : 'opus',
        bitrate: Platform.OS === 'ios' ? 32000 : 24000,
    },
    autoResumeAfterInterruption: true,
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
        logger.warn('Recording interrupted', event)
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


if (Platform.OS === 'ios') {
    baseRecordingConfig.sampleRate = 48000
} else if (Platform.OS === 'android') {
    baseRecordingConfig.sampleRate = WhisperSampleRate
} else if (Platform.OS === 'web') {
    baseRecordingConfig.sampleRate = 44100
}

const logoSource = require('@assets/icon.png')

export default function RecordScreen() {
    const [error, setError] = useState<string | null>(null)
    const [notificationEnabled, setNotificationEnabled] = useState(
        baseRecordingConfig.showNotification ?? true
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
    const { ready, isModelLoading, progressItems } =
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

    const {
        transcribeLive,
        initialize: initializeTranscription,
        isModelLoading: unifiedIsModelLoading,
    } = useUnifiedTranscription({
        onError: (error) => {
            logger.error('Transcription error:', error)
            show({
                type: 'error',
                message: `Transcription error: ${error.message}`,
                duration: 3000,
            })
        },
        onTranscriptionUpdate: (data) => {
            // Update transcripts state with new data
            setTranscripts(prev => {
                const existingIndex = prev.findIndex(t => t.id === data.id)
                if (existingIndex >= 0) {
                    const updated = [...prev]
                    updated[existingIndex] = data
                    return updated
                }
                return [...prev, data]
            })
            setActiveTranscript(data)
        }
    })

    const [transcripts, setTranscripts] = useState<TranscriberData[]>([])
    const [activeTranscript, setActiveTranscript] = useState<TranscriberData | null>(null)

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
            logger.log(`Received audio data event`)
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
            
            // Only check directory on native platforms
            if (Platform.OS !== 'web' && !defaultDirectory) {
                throw new Error('Storage directory not initialized')
            }

            // Request permissions and other checks...
            const permissionsGranted = await requestPermissions()
            if (!permissionsGranted) return

            // Initialize transcription if needed
            if (!ready && enableLiveTranscription) {
                await initializeTranscription()
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

            // Process final transcription if enabled
            if (enableLiveTranscription && webAudioChunks.current) {
                await transcribeLive(
                    webAudioChunks.current,
                    startRecordingConfig.sampleRate ?? WhisperSampleRate,
                    { stopping: true }
                )
            }

            const result = await stopRecording()
            logger.debug(`Recording stopped. `, result)

            if (!result) {
                setError('No audio data found.')
                return
            }

            // Defer post-processing to let UI breathe
            await new Promise(resolve => requestAnimationFrame(resolve))

            // Add transcripts to the result
            if (enableLiveTranscription) {
                result.transcripts = transcripts
            }

            // Defer file storage operations
            await new Promise(resolve => requestAnimationFrame(resolve))

            setResult(result)

            if (isWeb) {
                try {
                    let arrayBuffer: ArrayBuffer = new ArrayBuffer(0)
                    let filename = result.filename
                    if(result.compression?.compressedFileUri) {
                        const audioBuffer = result.compression.compressedFileUri
                        arrayBuffer = await fetch(audioBuffer).then(res => res.arrayBuffer())
                        // replace filename wav extension (if exists) with matching format
                        filename = filename.replace(/\.wav$/, `.${result.compression?.format}`)
                    }

                    await storeAudioFile({
                        fileName: filename,
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
            setCustomFileName('')
            // Reset transcripts
            setTranscripts([])
            setActiveTranscript(null)
        }
    }, [stopRecording, enableLiveTranscription, router, show, hide, transcripts, refreshFiles, transcribeLive, startRecordingConfig.sampleRate])

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

            {!unifiedIsModelLoading &&
                isWeb &&
                enableLiveTranscription &&
                liveWebAudio && (
                    <LiveTranscriber
                        transcripts={transcripts}
                        duration={duration}
                        activeTranscript={activeTranscript?.text ?? ''}
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
            <SegmentDurationSelector
                value={(startRecordingConfig.segmentDurationMs ?? 100) as SegmentDuration}
                onChange={(duration) => {
                    setStartRecordingConfig((prev) => ({
                        ...prev,
                        segmentDurationMs: duration,
                    }))
                }}
                maxDurationMs={1000}
                skipConfirmation
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
            <LabelSwitch
                label="Keep Recording in Background"
                value={startRecordingConfig.keepAwake ?? true}
                onValueChange={(enabled) => {
                    setStartRecordingConfig((prev) => ({
                        ...prev,
                        keepAwake: enabled,
                    }))
                }}
            />
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
                                logger.debug(`New iOS config`, newConfig)
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
        let timeoutId: NodeJS.Timeout

        async function processLiveTranscription() {
            if (!enableLiveTranscription || !validSRTranscription || !isRecording || !webAudioChunks.current) {
                return
            }

            try {
                await transcribeLive(
                    webAudioChunks.current,
                    startRecordingConfig.sampleRate ?? WhisperSampleRate,
                    {
                        stopping: stopping,
                        checkpointInterval: 15 // or whatever interval you prefer
                    }
                )
            } catch (error) {
                logger.error('Live transcription error:', error)
            }

            if (isRecording && !stopping) {
                timeoutId = setTimeout(processLiveTranscription, 1000)
            }
        }

        if (enableLiveTranscription && validSRTranscription && isRecording) {
            processLiveTranscription()
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [enableLiveTranscription, validSRTranscription, isRecording, stopping, transcribeLive, startRecordingConfig.sampleRate])

    useEffect(() => {
        setStartRecordingConfig((prev) => ({
            ...prev,
            showNotification: notificationEnabled,
            notification: notificationConfig,
            ios: iosSettings,
        }))
    }, [notificationEnabled, notificationConfig, iosSettings])

    useEffect(() => {
        if(isWeb) return
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
                        // Reset all settings to initial baseRecordingConfig
                        setStartRecordingConfig({
                            ...baseRecordingConfig,
                            onAudioStream: (a) => onAudioData(a),
                            onAudioAnalysis: async (a) => {
                                logger.log('audio analysis', a)
                                return Promise.resolve()
                            },
                        })
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
        <>
            <Stack.Screen
                options={{
                    headerRight: () => (
                        <Image
                            source={logoSource}
                            style={{ width: 30, height: 30, marginRight: 10 }}
                        />
                    ),
                }}
            />
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
        </>
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
    button: {
        marginTop: 10,
    },
})
