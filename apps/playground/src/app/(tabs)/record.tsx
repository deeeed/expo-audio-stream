// playground/src/app/(tabs)/index.tsx
import {
    AppTheme,
    Button,
    EditableInfoCard,
    LabelSwitch,
    Notice,
    ScreenWrapper,
    Text,
    useTheme,
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
} from '@siteed/expo-audio-studio'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { Stack, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image, Platform, StyleSheet, View } from 'react-native'
import { ActivityIndicator, SegmentedButtons } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AudioRecordingView } from '../../component/AudioRecordingView'
import { IOSSettingsConfig } from '../../component/IOSSettingsConfig'
import LiveTranscriber from '../../component/LiveTranscriber'
import { NativeNotificationConfig } from '../../component/NativeNotificationConfig'
import { ProgressItems } from '../../component/ProgressItems'
import { RecordingStats } from '../../component/RecordingStats'
import { SegmentDuration, SegmentDurationSelector } from '../../component/SegmentDurationSelector'
import { TranscriptionModeConfig, TranscriptionModeSettings } from '../../component/TranscriptionModeConfig'
import { baseLogger, WhisperSampleRate } from '../../config'
import { useAudioFiles } from '../../context/AudioFilesProvider'
import { useTranscription } from '../../context/TranscriptionProvider'
import { useUnifiedTranscription } from '../../hooks/useUnifiedTranscription'
import { storeAudioFile } from '../../utils/indexedDB'
import { isWeb } from '../../utils/utils'

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
    const [enableLiveTranscription, setEnableLiveTranscription] = useState(false)
    const [startRecordingConfig, setStartRecordingConfig] = 
        useState<RecordingConfig>(() => ({
            ...baseRecordingConfig,
            onAudioStream: (a: AudioDataEvent): Promise<void> => onAudioData(a),
        }))
    const { ready, isModelLoading, progressItems } =
        useTranscription()
    const [result, setResult] = useState<AudioRecording | null>(null)
    const [processing, setProcessing] = useState(false)
    const currentSize = useRef(0)
    const { refreshFiles, removeFile } = useAudioFiles()
    const router = useRouter()
    const [liveWebAudio, setLiveWebAudio] = useState<Float32Array | null>(null)
    const validSRTranscription: boolean = startRecordingConfig.sampleRate === WhisperSampleRate
    const [stopping, setStopping] = useState(false)
    const { colors } = useTheme()
    const [customFileName, setCustomFileName] = useState<string>('')
    const [defaultDirectory, setDefaultDirectory] = useState<string>('')

    const {
        startRealtimeTranscription,
        stopRealtimeTranscription,
        isRealtimeTranscribing,
        startProgressiveBatch,
        stopProgressiveBatch,
        addAudioData,
        isProgressiveBatchRunning,
        initialize: initializeTranscription,
        isModelLoading: unifiedIsModelLoading,
        stopCurrentTranscription,
        isProcessing,
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
            // Log the update for debugging
            logger.debug(`Received transcription update for job ${data.id}: "${data.text.substring(0, 50)}..."`);
            
            // Important: Make sure we're actually receiving updates
            setTranscripts(prev => {
                const existingIndex = prev.findIndex(t => t.id === data.id);
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = data;
                    return updated;
                }
                return [...prev, data];
            });
            
            // Always update the active transcript when a new one arrives
            setActiveTranscript(data);
        }
    })

    const [transcripts, setTranscripts] = useState<TranscriberData[]>([])
    const [activeTranscript, setActiveTranscript] = useState<TranscriberData | null>(null)

    const { show } = useToast()

    const theme = useTheme()
    const { bottom, top } = useSafeAreaInsets()
    const styles = useMemo(() => getStyles({ theme, insets: { bottom, top } }), [theme, bottom, top])

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

    const transcriptionContext = useTranscription();

    const showPermissionError = useCallback((permission: string) => {
        logger.error(`${permission} permission not granted`)
        show({
            type: 'error',
            message: `${permission} permission is required for recording`,
            duration: 3000,
        })
    }, [show])

    const requestPermissions = useCallback(async () => {
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
    }, [showPermissionError])

    const onAudioData = useCallback(async (event: AudioDataEvent): Promise<void> => {
        try {
            const { data, position: _position, eventDataSize } = event;
            logger.debug(`onAudioData: received data of type ${typeof data}, isFloat32Array=${data instanceof Float32Array}, size=${eventDataSize}`);
            
            if (eventDataSize === 0) {
                logger.warn(`Invalid data size=${eventDataSize}`)
                return
            }

            currentSize.current += eventDataSize

            if (typeof data === 'string') {
                // This path is for native platforms (iOS/Android)
                // Append the audio data to the audioRef
                audioChunks.current.push(data)
                
                // Only process if batch is running and transcription is enabled
                if (isProgressiveBatchRunningRef.current && enableLiveTranscriptionRef.current) {
                    logger.debug(`Native: Adding base64 audio data to batch processor, length=${data.length}`);
                    // Pass the base64 string directly to the batch processor
                    addAudioData(data);
                }
            } else if (data instanceof Float32Array) {
                // This path is for web platforms
                logger.debug(`Web: Received Float32Array data of length ${data.length}`);
                
                // First update our local buffer for visualization
                const concatenatedBuffer = new Float32Array(
                    Math.min(MAX_AUDIO_BUFFER_LENGTH, webAudioChunks.current.length + data.length)
                )
                
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
                
                // Feed to batch processor if active - this is the key part for web
                logger.debug(`Web audio state: isProgressiveBatchRunning=${isProgressiveBatchRunningRef.current}, enableLiveTranscription=${enableLiveTranscriptionRef.current}`);
                
                if (isProgressiveBatchRunningRef.current && enableLiveTranscriptionRef.current) {
                    logger.debug(`Web: Adding Float32Array of length ${data.length} to batch processor`);
                    
                    // Pass the Float32Array directly to the batch processor
                    addAudioData(data);
                    
                    // Let's also check if our local buffer is being updated
                    logger.debug(`Local web buffer length: ${webAudioChunks.current.length}`);
                }
            }
        } catch (error) {
            logger.error(`Error while processing audio data:`, error);
            if (error instanceof Error) {
                logger.error(`Error details: ${error.message}\n${error.stack}`);
            }
        }
    }, [addAudioData])

    useEffect(() => {
        // Preload the model if transcription is enabled
        async function preloadWhisperModel() {
            // Add a guard to prevent repeated initialization
            if (enableLiveTranscription && validSRTranscription && !isWeb && !ready && !isModelLoading) {
                logger.debug('Preloading whisper model')
                try {
                    await initializeTranscription()
                    logger.debug('Whisper model preloaded successfully')
                } catch (error) {
                    logger.error('Failed to preload whisper model:', error)
                    // Don't show an error here - we'll retry when recording starts
                }
            }
        }

        preloadWhisperModel()
        // Add isModelLoading to dependencies
    }, [enableLiveTranscription, validSRTranscription, ready, initializeTranscription, isModelLoading])

    const isProgressiveBatchRunningRef = useRef(isProgressiveBatchRunning);
    const enableLiveTranscriptionRef = useRef(enableLiveTranscription);

    // Sync refs with state changes
    useEffect(() => {
        isProgressiveBatchRunningRef.current = isProgressiveBatchRunning;
    }, [isProgressiveBatchRunning]);

    useEffect(() => {
        enableLiveTranscriptionRef.current = enableLiveTranscription;
    }, [enableLiveTranscription]);

    // Define our transcription settings state
    const [transcriptionSettings, setTranscriptionSettings] = useState<TranscriptionModeSettings>({
        mode: Platform.OS === 'web' ? 'batch' : 'realtime',
        realtimeOptions: {
            realtimeAudioMinSec: 1,
            realtimeAudioSec: 300,
            realtimeAudioSliceSec: 30,
        },
        batchOptions: {
            batchIntervalSec: Platform.OS === 'web' ? 3 : 5,
            batchWindowSec: 30,
            minNewDataSec: Platform.OS === 'web' ? 0.5 : 1,
            maxBufferLengthSec: 60,
        }
    });

    const handleStart = useCallback(async () => {
        try {
            setProcessing(true)
            
            // Only check directory on native platforms
            if (!isWeb && !defaultDirectory) {
                throw new Error('Storage directory not initialized')
            }

            // Request permissions and other checks...
            const permissionsGranted = await requestPermissions()
            if (!permissionsGranted) return

            // Choose transcription strategy based on platform and device capability
            if (enableLiveTranscription && validSRTranscription) {
                try {
                    await initializeTranscription() // Ensure transcription context is ready
                    
                    if (isWeb) {
                        logger.debug('Setting up batch transcription for web...');
                        // Make sure the batch mode is initialized properly
                        try {
                            logger.debug('Stopping any existing batch processing...');
                            stopProgressiveBatch();
                            
                            // Configure with web-optimized parameters
                            const batchParams = {
                                batchIntervalSec: 2,
                                batchWindowSec: 10,
                                sampleRate: startRecordingConfig.sampleRate || 16000,
                                language: transcriptionContext.language === 'auto' ? 
                                    undefined : transcriptionContext.language,
                                minNewDataSec: 0.5,
                                maxBufferLengthSec: 30,
                            };
                            
                            logger.debug(`Starting web batch with params: ${JSON.stringify(batchParams)}`);
                            
                            // Start the progressive batch processing
                            startProgressiveBatch(batchParams);
                            logger.debug(`isProgressiveBatchRunning: ${isProgressiveBatchRunning}, enableLiveTranscription: ${enableLiveTranscription}`);
                            
                            // Wait a bit to ensure the system is ready, then check status
                            setTimeout(() => {
                                logger.debug(`Batch status check: isProgressiveBatchRunning=${isProgressiveBatchRunning}`);
                            }, 500);
                            
                            show({
                                type: 'success',
                                message: 'Live transcription active (batch mode)',
                                duration: 2000,
                            });
                        } catch (error) {
                            logger.error('Failed to start batch transcription:', error);
                            show({
                                type: 'error',
                                message: 'Failed to start batch transcription',
                                duration: 3000,
                            });
                        }
                    }
                } catch (error) {
                    logger.error('Failed to initialize transcription:', error);
                    show({
                        type: 'error',
                        message: 'Speech recognition failed to initialize',
                        duration: 3000,
                    });
                }
            }

            // Initialize transcription if needed - with more robust error handling
            if (enableLiveTranscription && validSRTranscription) {
                if (!ready) {
                    logger.debug('Initializing transcription before recording start')
                    try {
                        // Show loading indicator for model
                        show({
                            type: 'info',
                            message: 'Loading speech recognition model...',
                            duration: 5000,
                        })
                        
                        await initializeTranscription()
                        
                        // Give a bit more time for the context to fully initialize
                        await new Promise(resolve => setTimeout(resolve, 500))
                        
                        if (!transcriptionContext.ready) {
                            throw new Error('Failed to initialize model in time')
                        }
                        
                        logger.debug('Transcription model loaded successfully')
                    } catch (error) {
                        logger.error('Failed to initialize transcription:', error)
                        show({
                            type: 'error',
                            message: 'Speech recognition model failed to load. Continuing without transcription.',
                            duration: 3000,
                        })
                        // Continue without transcription rather than failing
                        setEnableLiveTranscription(false)
                    }
                }
            }

            // Clear previous audio chunks
            webAudioChunks.current = new Float32Array(0);
            audioChunks.current = [];
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
                outputDirectory: !isWeb ? defaultDirectory : undefined,
            }

            logger.debug(`Starting recording with config:`, finalConfig)
            const streamConfig: StartRecordingResult = await startRecording(finalConfig)
            logger.debug(`Recording started:`, streamConfig)
            setStreamConfig(streamConfig)

            // For narive platforms, start realtime transcription after recording begins
            if(!isWeb && enableLiveTranscription && validSRTranscription) {
                try {
                    if (transcriptionSettings.mode === 'realtime') {
                        await startRealtimeTranscription({
                            language: transcriptionContext.language === 'auto' ? 
                                undefined : transcriptionContext.language,
                            ...transcriptionSettings.realtimeOptions
                        });
                        
                        logger.debug('Realtime transcription started successfully');
                        show({
                            type: 'success',
                            message: 'Live transcription active',
                            duration: 2000,
                        });
                    } else {
                        // Use batch mode
                        startProgressiveBatch({
                            sampleRate: startRecordingConfig.sampleRate || 16000,
                            language: transcriptionContext.language === 'auto' ? 
                                undefined : transcriptionContext.language,
                            ...transcriptionSettings.batchOptions
                        });
                        
                        show({
                            type: 'success',
                            message: 'Batch transcription active',
                            duration: 2000,
                        });
                    }
                } catch (error) {
                    logger.warn(`${transcriptionSettings.mode} mode failed, falling back to batch mode:`, error);
                    startProgressiveBatch({
                        sampleRate: startRecordingConfig.sampleRate || 16000,
                        language: transcriptionContext.language === 'auto' ? 
                            undefined : transcriptionContext.language,
                        ...transcriptionSettings.batchOptions
                    });
                    
                    show({
                        type: 'info',
                        message: 'Using batch transcription mode',
                        duration: 2000,
                    });
                }
            } else if (isWeb && enableLiveTranscription && validSRTranscription) {
                // For web, always use batch mode with web-optimized settings
                startProgressiveBatch({
                    sampleRate: startRecordingConfig.sampleRate || 16000,
                    language: transcriptionContext.language === 'auto' ? 
                        undefined : transcriptionContext.language,
                    ...transcriptionSettings.batchOptions
                });
                
                show({
                    type: 'success',
                    message: 'Web transcription active',
                    duration: 2000,
                });
            }
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
    }, [defaultDirectory, requestPermissions, enableLiveTranscription, validSRTranscription, customFileName, startRecordingConfig, startRecording, initializeTranscription, stopProgressiveBatch, transcriptionContext.language, transcriptionContext.ready, startProgressiveBatch, isProgressiveBatchRunning, show, ready, transcriptionSettings.mode, transcriptionSettings.realtimeOptions, transcriptionSettings.batchOptions, startRealtimeTranscription])

    const handleStopRecording = useCallback(async () => {
        try {
            setStopping(true)
            setProcessing(true)

            // Stop active transcription
            if (isRealtimeTranscribing) {
                await stopRealtimeTranscription()
            }
            
            if (isProgressiveBatchRunning) {
                stopProgressiveBatch()
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
    }, [enableLiveTranscription, router, transcripts, refreshFiles, stopRecording, isRealtimeTranscribing, stopRealtimeTranscription, isProgressiveBatchRunning, stopProgressiveBatch])

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

            {/* Display transcription text */}
            {enableLiveTranscription && (
                <View style={{
                    padding: 16,
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: 8,
                    marginVertical: 10
                }}>
                    <Text variant="labelMedium" style={{ marginBottom: 4, color: colors.onSurfaceVariant }}>
                        Live Transcription {isProgressiveBatchRunning ? '(Active)' : '(Paused)'}
                    </Text>
                    <Text variant="bodyLarge">
                        {activeTranscript?.text || "Listening..."}
                    </Text>
                    
                    {/* Add this to debug what's happening */}
                    <Text variant="labelSmall" style={{ marginTop: 8, color: colors.outline }}>
                        Status: {isProcessing ? 'Processing' : 'Idle'}, 
                        Batch Running: {isProgressiveBatchRunning ? 'Yes' : 'No'},
                        Transcripts: {transcripts.length}
                    </Text>
                </View>
            )}

            {!unifiedIsModelLoading &&
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
                onPress={() => {
                    pauseRecording();
                    if (isProgressiveBatchRunning || isRealtimeTranscribing) {
                        stopCurrentTranscription();
                    }
                }}
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

            {/* Display transcription text */}
            {enableLiveTranscription && (
                <View style={{
                    padding: 16,
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: 8,
                    marginVertical: 10
                }}>
                    <Text variant="labelMedium" style={{ marginBottom: 4, color: colors.onSurfaceVariant }}>
                        Live Transcription (Paused)
                    </Text>
                    <Text variant="bodyLarge">
                        {activeTranscript?.text || "No transcription available"}
                    </Text>
                </View>
            )}

            <Button 
                testID="resume-recording-button"
                mode="contained" 
                onPress={() => {
                    resumeRecording();
                    if (enableLiveTranscription && validSRTranscription) {
                        if (isWeb) {
                            startProgressiveBatch({
                                sampleRate: 16000,
                                language: transcriptionContext.language === 'auto' ? 
                                    undefined : transcriptionContext.language,
                                ...transcriptionSettings.batchOptions
                            });
                        } else {
                            try {
                                if (transcriptionSettings.mode === 'realtime') {
                                    startRealtimeTranscription({
                                        language: transcriptionContext.language === 'auto' ? 
                                            undefined : transcriptionContext.language,
                                        ...transcriptionSettings.realtimeOptions
                                    }).catch(error => {
                                        logger.warn('Falling back to batch mode after resume:', error);
                                        startProgressiveBatch({
                                            sampleRate: startRecordingConfig.sampleRate || 16000,
                                            language: transcriptionContext.language === 'auto' ? 
                                                undefined : transcriptionContext.language,
                                            ...transcriptionSettings.batchOptions
                                        });
                                    });
                                } else {
                                    // Use batch mode directly if that's the selected mode
                                    startProgressiveBatch({
                                        sampleRate: startRecordingConfig.sampleRate || 16000,
                                        language: transcriptionContext.language === 'auto' ? 
                                            undefined : transcriptionContext.language,
                                        ...transcriptionSettings.batchOptions
                                    });
                                }
                            } catch (error) {
                                logger.error('Failed to resume transcription:', error);
                            }
                        }
                    }
                }}
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

            
            <TranscriptionModeConfig
                enabled={enableLiveTranscription}
                onEnabledChange={(enabled) => {
                    setEnableLiveTranscription(enabled);
                    
                    // Preload the model if enabled
                    if (enabled && !ready && !isModelLoading && validSRTranscription) {
                        show({
                            type: 'info',
                            message: 'Preparing speech recognition model...',
                            duration: 2000,
                        });
                        initializeTranscription().catch(error => {
                            logger.error('Failed to initialize transcription:', error);
                        });
                    }
                }}
                settings={transcriptionSettings}
                onSettingsChange={setTranscriptionSettings}
                validSampleRate={validSRTranscription}
                isWeb={isWeb}
            />
            
            {/* Show loading indicator when model is loading */}
            {enableLiveTranscription && isModelLoading && (
                <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: colors.primaryContainer,
                    padding: 12,
                    borderRadius: 8
                }}>
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                    <Text variant="labelMedium">Loading speech recognition model...</Text>
                </View>
            )}

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
