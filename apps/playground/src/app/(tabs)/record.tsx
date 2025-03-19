// playground/src/app/(tabs)/index.tsx
import {
    AppTheme,
    Button,
    EditableInfoCard,
    LabelSwitch,
    Text,
    Notice,
    ScreenWrapper,
    useToast,
    useTheme,
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
} from '@siteed/expo-audio-studio'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { useRouter, Stack } from 'expo-router'
import isBase64 from 'is-base64'
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Platform, StyleSheet, View, Image } from 'react-native'
import { ActivityIndicator, SegmentedButtons } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
const DEFAULT_BITRATE = Platform.OS === 'ios' ? 32000 : 24000

const baseRecordingConfig: RecordingConfig = {
    interval: CHUNK_DURATION_MS,
    sampleRate: WhisperSampleRate,
    keepAwake: true,
    intervalAnalysis: CHUNK_DURATION_MS,
    showNotification: Platform.OS === 'ios' ? false : true,
    showWaveformInNotification: true,
    encoding: 'pcm_32bit',
    segmentDurationMs: 100,
    enableProcessing: true,
    features: undefined,
    compression: {
        enabled: true,
        format: Platform.OS === 'ios' ? 'aac' : 'opus',
        bitrate: DEFAULT_BITRATE,
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
        icon: undefined,
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

const getStyles = ({ theme, insets }: { theme: AppTheme, insets?: { bottom: number, top: number } }) => {
    return StyleSheet.create({
        container: {
            gap: theme.spacing.gap || 16,
            paddingHorizontal: theme.padding.s,
            paddingBottom: insets?.bottom || 80,
            paddingTop: Math.max(insets?.top || 0, 10),
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
}

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

    const { show } = useToast()

    const theme = useTheme()
    const { bottom, top } = useSafeAreaInsets()
    const styles = useMemo(() => getStyles({ theme, insets: { bottom, top } }), [theme, bottom, top])

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
    }, [stopRecording, enableLiveTranscription, router, transcripts, refreshFiles, transcribeLive, startRecordingConfig.sampleRate])

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
            <Button 
                testID="pause-recording-button"
                mode="contained" 
                onPress={pauseRecording}
            >
                Pause Recording
            </Button>
            <Button 
                testID="stop-recording-button"
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
            <Button 
                testID="resume-recording-button"
                mode="contained" 
                onPress={resumeRecording}
            >
                Resume Recording
            </Button>
            <Button mode="contained" onPress={() => handleStopRecording()}>
                Stop Recording
            </Button>
        </View>
    )

    const renderStopped = () => (
        <View style={{ gap: 10 }} testID="stopped-recording-view">
            <EditableInfoCard
                testID="filename-input"
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

            <View>
                <Text variant="titleMedium" style={{ marginBottom: 8 }}>Sample Rate</Text>
                <SegmentedButtons
                    value={String(startRecordingConfig.sampleRate || WhisperSampleRate)}
                    onValueChange={(value) => {
                        setStartRecordingConfig((prev) => ({
                            ...prev,
                            sampleRate: parseInt(value, 10) as SampleRate,
                        }))
                    }}
                    buttons={[
                        { value: '16000', label: '16 kHz' },
                        { value: '44100', label: '44.1 kHz' },
                        { value: '48000', label: '48 kHz' },
                    ]}
                />
            </View>
            <View>
                <Text variant="titleMedium" style={{ marginBottom: 8 }}>Encoding</Text>
                <SegmentedButtons
                    value={startRecordingConfig.encoding || 'pcm_32bit'}
                    onValueChange={(value) => {
                        setStartRecordingConfig((prev) => ({
                            ...prev,
                            encoding: value as RecordingConfig['encoding'],
                        }))
                    }}
                    buttons={[
                        { value: 'pcm_16bit', label: '16-bit' },
                        { value: 'pcm_32bit', label: '32-bit' },
                        { value: 'pcm_8bit', label: '8-bit' },
                    ]}
                />
            </View>
            <SegmentDurationSelector
                testID="segment-duration-selector"
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
                                    ...(prev.compression ?? { format: 'opus', bitrate: DEFAULT_BITRATE }),
                                    enabled,
                                },
                            }))
                        }}
                    />

                    {startRecordingConfig.compression?.enabled && (
                        <>
                            <View>
                                <Text variant="titleMedium" style={{ marginBottom: 8 }}>Compression Format</Text>
                                <SegmentedButtons
                                    value={startRecordingConfig.compression?.format || 'opus'}
                                    onValueChange={(value) => {
                                        setStartRecordingConfig((prev) => ({
                                            ...prev,
                                            compression: {
                                                ...(prev.compression ?? { enabled: true, bitrate: DEFAULT_BITRATE }),
                                                format: value as 'aac' | 'opus',
                                            },
                                        }))
                                    }}
                                    buttons={[
                                        { value: 'opus', label: 'OPUS' },
                                        // Only show AAC option for native platforms
                                        ...(!isWeb ? [{ value: 'aac', label: 'AAC' }] : []),
                                    ]}
                                />
                            </View>
                            
                            <View>
                                <Text variant="titleMedium" style={{ marginBottom: 8 }}>Bitrate</Text>
                                <SegmentedButtons
                                    value={String(startRecordingConfig.compression?.bitrate || DEFAULT_BITRATE)}
                                    onValueChange={(value) => {
                                        setStartRecordingConfig((prev) => ({
                                            ...prev,
                                            compression: {
                                                ...(prev.compression ?? { enabled: true, format: 'opus' }),
                                                bitrate: parseInt(value, 10),
                                            },
                                        }))
                                    }}
                                    buttons={[
                                        { value: '32000', label: '32 kbps (Voice)' },
                                        { value: '64000', label: '64 kbps (Studio)' },
                                    ]}
                                />
                            </View>
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

            
            <LabelSwitch
                label="Live Transcription"
                value={validSRTranscription && enableLiveTranscription}
                disabled={!validSRTranscription}
                onValueChange={setEnableLiveTranscription}
            />

            {!validSRTranscription && (
                <Notice
                    type="warning"
                    title="Transcription Not Available"
                    message="Live Transcription is only available at 16kHz sample rate"
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
            <Button 
                testID="start-recording-button"
                mode="contained" 
                onPress={() => handleStart()}
            >
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
            <ScreenWrapper withScrollView useInsets={false} contentContainerStyle={styles.container} testID="record-screen-wrapper">
                <View testID="record-screen-header">
                    <Notice
                        type="info"
                        title="Audio Recording"
                        message="Record audio from your device's microphone. You can pause, resume, and stop recordings. Saved recordings will be available in the Files tab."
                        testID="record-screen-notice"
                    />
                </View>
                {result && (
                    <View style={{ gap: 10, paddingBottom: 100 }} testID="recording-result-view">
                        <AudioRecordingView
                            recording={result}
                            onDelete={() => handleDelete(result)}
                            onActionPress={() => {
                                router.navigate(`(recordings)/${result.filename}`)
                            }}
                            actionText="Visualize"
                            testID="audio-recording-view"
                        />
                        <Button mode="contained" onPress={() => setResult(null)} testID="record-again-button">
                            Record Again
                        </Button>
                    </View>
                )}
                {isRecording && !isPaused && (
                    <View testID="active-recording-view">
                        {renderRecording()}
                    </View>
                )}
                {isPaused && (
                    <View testID="paused-recording-view">
                        {renderPaused()}
                    </View>
                )}
                {!result && !isRecording && !isPaused && (
                    <View testID="recording-controls">
                        {renderStopped()}
                    </View>
                )}
            </ScreenWrapper>
        </>
    )
}
