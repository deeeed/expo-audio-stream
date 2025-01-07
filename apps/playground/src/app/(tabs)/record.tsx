// playground/src/app/(tabs)/index.tsx
import {
    Button,
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
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Text } from 'react-native-paper'

import { AudioRecordingView } from '../../component/AudioRecordingView'
import { IOSSettingsConfig } from '../../component/IOSSettingsConfig'
import LiveTranscriber from '../../component/LiveTranscriber'
import { NativeNotificationConfig } from '../../component/NativeNotificationConfig'
import { ProgressItems } from '../../component/ProgressItems'
import { baseLogger, WhisperSampleRate } from '../../config'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { useTranscription } from '../../context/TranscriptionProvider'
import { useLiveTranscriber } from '../../hooks/useLiveTranscriber'
import { storeAudioFile } from '../../utils/indexedDB'
import { formatBytes, formatDuration, isWeb } from '../../utils/utils'

const CHUNK_DURATION_MS = 500 // 500 ms chunks

const baseRecordingConfig: RecordingConfig = {
    interval: CHUNK_DURATION_MS,
    sampleRate: WhisperSampleRate,
    keepAwake: true,
    showNotification: false,
    showWaveformInNotification: true,
    encoding: 'pcm_32bit',
    pointsPerSecond: 10,
    enableProcessing: true,
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
        useState(isWeb)
    const validSRTranscription =
        startRecordingConfig.sampleRate === WhisperSampleRate
    const [stopping, setStopping] = useState(false)

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
                } else {
                    // const binaryString = atob(data)
                    // const len = binaryString.length
                    // const bytes = new Uint8Array(len)
                    // for (let i = 0; i < len; i++) {
                    //     bytes[i] = binaryString.charCodeAt(i)
                    // }
                    // const wavAudioBuffer = bytes.buffer
                    // liveWavFormBuffer.current[liveWavFormBufferIndex.current] =
                    //     wavAudioBuffer
                    // liveWavFormBufferIndex.current =
                    //     (liveWavFormBufferIndex.current + 1) %
                    //     LIVE_WAVE_FORM_CHUNKS_LENGTH
                }
            } else if (data instanceof Float32Array) {
                // append to webAudioChunks
                const concatenatedBuffer = new Float32Array(
                    webAudioChunks.current.length + data.length
                )
                concatenatedBuffer.set(webAudioChunks.current)
                concatenatedBuffer.set(data, webAudioChunks.current.length)
                webAudioChunks.current = concatenatedBuffer
                // TODO: we should use either the webAudioChunks or the liveWebAudio
                setLiveWebAudio(webAudioChunks.current)
                // logger.debug(`TEMP Received audio data ${typeof data}`, data)
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
        isRecording,
        analysisData,
    } = useSharedAudioRecorder()

    const handleStart = async () => {
        try {
            setProcessing(true)
            // Request all necessary permissions
            const permissionsGranted = await requestPermissions()
            if (!permissionsGranted) {
                return
            }

            if (!ready && isWeb) {
                logger.info(`Initializing transcription...`)
                initialize()
            }
            // Clear previous audio chunks
            audioChunks.current = []
            webAudioChunks.current = new Float32Array(0)
            currentSize.current = 0
            setLiveWebAudio(null)
            logger.log(`Starting recording...`, startRecordingConfig)
            const streamConfig: StartRecordingResult = await startRecording({
                ...startRecordingConfig,
                showNotification: notificationEnabled,
                keepAwake: true,
                notification: notificationConfig,
                onAudioAnalysis: async (analysis) => {
                    logger.debug(`Received audio analysis`, analysis)
                    return undefined
                },
            })
            logger.debug(`Recording started `, streamConfig)
            setStreamConfig(streamConfig)

            // // Debug Only with fixed audio buffer
            // setTimeout(async () => {
            //   console.log("AUTO Stopping recording");
            //   await handleStopRecording();
            // }, 3000);
        } catch (error) {
            logger.error(`Error while starting recording`, error)
            setError('Failed to start recording. Please try again.')
        } finally {
            setProcessing(false)
        }
    }

    const handleStopRecording = useCallback(async () => {
        try {
            setStopping(true)
            setProcessing(true)
            const result = await stopRecording()
            logger.debug(`Recording stopped. `, result)

            if (!result) {
                setError('No audio data found.')
                return
            }

            // Attach transcripts to the result if available
            if (enableLiveTranscription) {
                show({
                    loading: true,
                    message: 'Waiting for transcription to complete',
                })
                // wait for end of transcription or timeout within 15 seconds
                let timeout
                const transcriptions = await Promise.race([
                    new Promise<TranscriberData[]>((resolve) => {
                        timeout = setTimeout(() => {
                            logger.warn(`Timeout waiting for transcriptions`)
                            // return last received ones in case of timeout
                            resolve(transcripts)
                        }, 15000)
                    }),
                    new Promise<TranscriberData[]>((resolve) => {
                        transcriptionResolveRef.current = resolve
                    }),
                ])
                clearTimeout(timeout)
                hide()
                console.log(`After wait transcripts`, transcriptions)
                result.transcripts = transcriptions
            }

            if (isWeb && result.wavPCMData) {
                const audioBuffer = result.wavPCMData.buffer
                // Store the audio file and metadata in IndexedDB
                await storeAudioFile({
                    fileName: result.filename,
                    arrayBuffer: audioBuffer,
                    metadata: result,
                })

                setResult(result)
                setLiveWebAudio(result.wavPCMData.slice(100))

                await refreshFiles()
            } else {
                setResult(result)
                const jsonPath = result.fileUri.replace(/\.wav$/, '.json') // Assuming fileUri has a .wav extension
                await FileSystem.writeAsStringAsync(
                    jsonPath,
                    JSON.stringify(result, null, 2),
                    {
                        encoding: FileSystem.EncodingType.UTF8,
                    }
                )
                logger.log(`Metadata saved to ${jsonPath}`)
                refreshFiles()
            }

            setResult(null)
            // Go to the newly saved page.
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

            <Text>enableLiveTranscription: {enableLiveTranscription.toString()}</Text>
            <Text>Duration: {formatDuration(duration)}</Text>
            <Text>Size: {formatBytes(size)}</Text>
            {streamConfig?.sampleRate ? (
                <Text>sampleRate: {streamConfig?.sampleRate}</Text>
            ) : null}
            {streamConfig?.bitDepth ? (
                <Text>bitDepth: {streamConfig?.bitDepth}</Text>
            ) : null}
            {streamConfig?.channels ? (
                <Text>channels: {streamConfig?.channels}</Text>
            ) : null}
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
            <Button mode="contained" onPress={() => handleStopRecording()}>
                Stop Recording
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
            <Text>Duration: {formatDuration(duration)}</Text>
            <Text>Size: {formatBytes(size)}</Text>
            {streamConfig?.sampleRate ? (
                <Text>sampleRate: {streamConfig?.sampleRate}</Text>
            ) : null}
            {streamConfig?.bitDepth ? (
                <Text>bitDepth: {streamConfig?.bitDepth}</Text>
            ) : null}
            {streamConfig?.channels ? (
                <Text>channels: {streamConfig?.channels}</Text>
            ) : null}
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
                    console.log(`Selected options`, options)
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
        <ScreenWrapper withScrollView contentContainerStyle={styles.container}>
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
