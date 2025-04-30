// playground/src/app/(tabs)/index.tsx
import {
    AppTheme,
    Button,
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
    RecordingConfig,
    StartRecordingResult,
    TranscriberData,
    useSharedAudioRecorder,
    useAudioDevices,
    AudioDevice,
} from '@siteed/expo-audio-studio'
import { AudioVisualizer } from '@siteed/expo-audio-ui'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { Stack, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image, Platform, StyleSheet, View } from 'react-native'
import { ActivityIndicator } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AudioRecordingView } from '../../component/AudioRecordingView'
import { DeviceDisconnectionHandler } from '../../component/DeviceDisconnectionHandler'
import LiveTranscriber from '../../component/LiveTranscriber'
import { ProgressItems } from '../../component/ProgressItems'
import { RecordingSettings } from '../../component/RecordingSettings'
import { RecordingStats } from '../../component/RecordingStats'
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
    deviceDisconnectionBehavior: 'fallback',
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
        if (event.reason === 'deviceDisconnected') {
            logger.warn('Device disconnected event received from native layer')
        }
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
    
    // Add state for visualization display
    const [showVisualization, setShowVisualization] = useState(true);
    
    const audioChunks = useRef<string[]>([])
    const webAudioChunks = useRef<Float32Array>(new Float32Array(0))
    const [streamConfig, setStreamConfig] =
        useState<StartRecordingResult | null>(null)
    const [enableLiveTranscription, setEnableLiveTranscription] = useState(false)
    const [startRecordingConfig, setStartRecordingConfig] = 
        useState<RecordingConfig>(() => ({
            ...baseRecordingConfig,
            deviceDisconnectionBehavior: 'fallback',
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
    const { currentDevice } = useAudioDevices()

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
        prepareRecording,
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

    // Completely isolated audio data handler
    const onAudioDataRef = useRef<(event: AudioDataEvent) => Promise<void>>(
        async (event: AudioDataEvent): Promise<void> => {
            try {
                const { data, eventDataSize } = event;
                
                if (!eventDataSize || eventDataSize === 0) return;

                if (typeof data === 'string') {
                    // For native platforms (iOS/Android)
                    if (audioChunks.current) {
                        audioChunks.current.push(data);
                    }
                    
                    // Only process if needed
                    if (isProgressiveBatchRunning && 
                        enableLiveTranscription && 
                        addAudioData) {
                        addAudioData(data);
                    }
                } else if (data instanceof Float32Array) {
                    // For web platforms - update visualization buffer
                    if (webAudioChunks.current) {
                        const newLength = Math.min(
                            MAX_AUDIO_BUFFER_LENGTH, 
                            webAudioChunks.current.length + data.length
                        );
                        
                        const buffer = new Float32Array(newLength);
                        
                        if (webAudioChunks.current.length + data.length > MAX_AUDIO_BUFFER_LENGTH) {
                            const offset = (webAudioChunks.current.length + data.length) - MAX_AUDIO_BUFFER_LENGTH;
                            buffer.set(webAudioChunks.current.slice(offset), 0);
                            buffer.set(data, MAX_AUDIO_BUFFER_LENGTH - data.length);
                        } else {
                            buffer.set(webAudioChunks.current);
                            buffer.set(data, webAudioChunks.current.length);
                        }
                        
                        webAudioChunks.current = buffer;
                        if (currentSize.current) {
                            currentSize.current += eventDataSize;
                        }
                        
                        // Update live web audio visualization
                        // This is safe because it's just updating UI
                        setLiveWebAudio(buffer);
                    }
                    
                    // Process if needed
                    if (isProgressiveBatchRunning && 
                        enableLiveTranscription && 
                        addAudioData) {
                        addAudioData(data);
                    }
                }
            } catch (error) {
                console.error('Error processing audio data:', error);
            }
            
            return Promise.resolve();
        }
    );

    // Update the recording configuration with the stable callback
    useEffect(() => {
        setStartRecordingConfig(prev => ({
            ...prev,
            onAudioStream: (event: AudioDataEvent): Promise<void> => 
                onAudioDataRef.current(event)
        }));
    }, []);

    useEffect(() => {
        // Preload the model if transcription is enabled
        async function preloadWhisperModel() {
            // Use unifiedIsModelLoading here
            if (enableLiveTranscription && validSRTranscription && !isWeb && !ready && !unifiedIsModelLoading) {
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
        // Update dependency to use unifiedIsModelLoading
    }, [enableLiveTranscription, validSRTranscription, ready, initializeTranscription, unifiedIsModelLoading, isWeb]) // Added isWeb as it's used in condition

    const isProgressiveBatchRunningRef = useRef(false);
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

    const [isRecordingPrepared, setIsRecordingPrepared] = useState(false)

    // Handle device change when disconnected during recording
    const handleDeviceDisconnected = useCallback(() => {
        if (isRecording && !isPaused) {
            logger.warn('Device disconnection detected, pausing recording')
            try {
                pauseRecording()
                show({
                    type: 'warning',
                    message: 'Audio device disconnected. Recording paused.',
                    duration: 3000,
                })
            } catch (error) {
                logger.error('Failed to pause recording after device disconnection:', error)
            }
        }
    }, [isRecording, isPaused, pauseRecording, show])

    // Handle device fallback selection
    const handleDeviceFallback = useCallback((newDevice: AudioDevice) => {
        logger.debug(`Switching to fallback device: ${newDevice.name} (${newDevice.id})`)
        setStartRecordingConfig(prev => ({
            ...prev,
            deviceId: newDevice.id
        }))
    }, [])

    const handlePrepareRecording = useCallback(async () => {
        try {
            setProcessing(true)
            
            // Only check directory on native platforms
            if (!isWeb && !defaultDirectory) {
                throw new Error('Storage directory not initialized')
            }

            // Request permissions early
            const permissionsGranted = await requestPermissions()
            if (!permissionsGranted) return

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

            logger.debug(`Preparing recording with config:`, finalConfig)
            await prepareRecording(finalConfig)
            logger.debug(`Recording prepared successfully`)
            setIsRecordingPrepared(true)
            
            show({
                type: 'success',
                message: 'Recording prepared and ready to start',
                duration: 2000,
            })
        } catch (error) {
            logger.error(`Error while preparing recording:`, error)
            if (error instanceof Error) {
                show({
                    type: 'error',
                    message: `Preparation failed: ${error.message}`,
                    duration: 3000,
                })
            }
            setIsRecordingPrepared(false)
        } finally {
            setProcessing(false)
        }
    }, [defaultDirectory, requestPermissions, customFileName, startRecordingConfig, prepareRecording, show])

    const handleStart = useCallback(async () => {
        try {
            setProcessing(true);
            
            // If we haven't prepared yet, we need to check permissions
            if (!isRecordingPrepared) {
                // Only check directory on native platforms
                if (!isWeb && !defaultDirectory) {
                    throw new Error('Storage directory not initialized');
                }

                // Request permissions and other checks...
                const permissionsGranted = await requestPermissions();
                if (!permissionsGranted) return;
            }

            // Choose transcription strategy based on platform and device capability
            if (enableLiveTranscriptionRef.current && validSRTranscription) {
                try {
                    await initializeTranscription(); // Ensure transcription context is ready
                    
                    if (isWeb) {
                        logger.debug('Setting up batch transcription for web...');
                        // Make sure the batch mode is initialized properly
                        try {
                            logger.debug('Stopping any existing batch processing...');
                            stopProgressiveBatch?.();
                            
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
                            if (startProgressiveBatch) {
                                startProgressiveBatch(batchParams);
                            }
                                                    
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
            if (enableLiveTranscriptionRef.current && validSRTranscription) {
                if (!ready) {
                    logger.debug('Initializing transcription before recording start');
                    try {
                        // Show loading indicator for model
                        show({
                            type: 'info',
                            message: 'Loading speech recognition model...',
                            duration: 5000,
                        });
                        
                        await initializeTranscription();
                        
                        // Give a bit more time for the context to fully initialize
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        if (!transcriptionContext.ready) {
                            throw new Error('Failed to initialize model in time');
                        }
                        
                        logger.debug('Transcription model loaded successfully');
                    } catch (error) {
                        logger.error('Failed to initialize transcription:', error);
                        show({
                            type: 'error',
                            message: 'Speech recognition model failed to load. Continuing without transcription.',
                            duration: 3000,
                        });
                        // Continue without transcription rather than failing
                        setEnableLiveTranscription(false);
                    }
                }
            }

            // Clear previous audio chunks
            webAudioChunks.current = new Float32Array(0);
            audioChunks.current = [];
            currentSize.current = 0;
            setLiveWebAudio(null);

            // Ensure filename has proper extension if provided
            let finalFileName = customFileName;
            if (finalFileName && !finalFileName.endsWith('.wav')) {
                finalFileName = `${finalFileName}.wav`;
            }

            const finalConfig = {
                ...startRecordingConfig,
                filename: finalFileName || undefined,
                outputDirectory: !isWeb ? defaultDirectory : undefined,
            };

            logger.debug(`Starting recording with config:`, finalConfig);
            const streamConfig: StartRecordingResult = await startRecording(finalConfig);
            logger.debug(`Recording started:`, streamConfig);
            setStreamConfig(streamConfig);
            setIsRecordingPrepared(false); // Reset prepared state after starting

            // For native platforms, start realtime transcription after recording begins
            if(!isWeb && enableLiveTranscriptionRef.current && validSRTranscription) {
                try {
                    if (transcriptionSettings.mode === 'realtime') {
                        if (startRealtimeTranscription) {
                            await startRealtimeTranscription({
                                language: transcriptionContext.language === 'auto' ? 
                                    undefined : transcriptionContext.language,
                                ...transcriptionSettings.realtimeOptions
                            });
                        }
                        
                        logger.debug('Realtime transcription started successfully');
                        show({
                            type: 'success',
                            message: 'Live transcription active',
                            duration: 2000,
                        });
                    } else {
                        // Use batch mode
                        if (startProgressiveBatch) {
                            startProgressiveBatch({
                                sampleRate: startRecordingConfig.sampleRate || 16000,
                                language: transcriptionContext.language === 'auto' ? 
                                    undefined : transcriptionContext.language,
                                ...transcriptionSettings.batchOptions
                            });
                        }
                        
                        show({
                            type: 'success',
                            message: 'Batch transcription active',
                            duration: 2000,
                        });
                    }
                } catch (error) {
                    logger.warn(`${transcriptionSettings.mode} mode failed, falling back to batch mode:`, error);
                    if (startProgressiveBatch) {
                        startProgressiveBatch({
                            sampleRate: startRecordingConfig.sampleRate || 16000,
                            language: transcriptionContext.language === 'auto' ? 
                                undefined : transcriptionContext.language,
                            ...transcriptionSettings.batchOptions
                        });
                    }
                    
                    show({
                        type: 'info',
                        message: 'Using batch transcription mode',
                        duration: 2000,
                    });
                }
            } else if (isWeb && enableLiveTranscriptionRef.current && validSRTranscription) {
                // For web, always use batch mode with web-optimized settings
                if (startProgressiveBatch) {
                    startProgressiveBatch({
                        sampleRate: startRecordingConfig.sampleRate || 16000,
                        language: transcriptionContext.language === 'auto' ? 
                            undefined : transcriptionContext.language,
                        ...transcriptionSettings.batchOptions
                    });
                }
                
                show({
                    type: 'success',
                    message: 'Web transcription active',
                    duration: 2000,
                });
            }
        } catch (error) {
            logger.error(`Error while starting recording:`, error);
            if (error instanceof Error) {
                show({
                    type: 'error',
                    message: `Recording failed: ${error.message}`,
                    duration: 3000,
                });
            }
            setError('Failed to start recording. Please try again.');
        } finally {
            setProcessing(false);
        }
    }, [isRecordingPrepared, defaultDirectory, requestPermissions, validSRTranscription, customFileName, startRecordingConfig, startRecording, initializeTranscription, ready, show, transcriptionSettings.mode, transcriptionSettings.realtimeOptions, transcriptionSettings.batchOptions, stopProgressiveBatch, startProgressiveBatch, startRealtimeTranscription, transcriptionContext]);

    const handleStopRecording = useCallback(async () => {
        try {
            setStopping(true);
            setProcessing(true);
            setIsRecordingPrepared(false); // Reset prepared state when stopping

            // Stop active transcription
            if (isRealtimeTranscribing) {
                await stopRealtimeTranscription?.();
            }
            
            if (isProgressiveBatchRunningRef.current) {
                stopProgressiveBatch?.();
            }

            const result = await stopRecording();
            logger.debug(`Recording stopped. `, result);

            if (!result) {
                setError('No audio data found.');
                return;
            }

            // Defer post-processing to let UI breathe
            await new Promise(resolve => requestAnimationFrame(resolve));

            // Add transcripts to the result
            if (enableLiveTranscriptionRef.current) {
                result.transcripts = transcripts;
            }

            // Defer file storage operations
            await new Promise(resolve => requestAnimationFrame(resolve));

            setResult(result);

            if (isWeb) {
                try {
                    let arrayBuffer: ArrayBuffer = new ArrayBuffer(0);
                    let filename = result.filename;
                    if(result.compression?.compressedFileUri) {
                        const audioBuffer = result.compression.compressedFileUri;
                        arrayBuffer = await fetch(audioBuffer).then(res => res.arrayBuffer());
                        // replace filename wav extension (if exists) with matching format
                        filename = filename.replace(/\.wav$/, `.${result.compression?.format}`);
                    }

                    await storeAudioFile({
                        fileName: filename,
                        arrayBuffer,
                        metadata: result,
                    });

                    await refreshFiles();
                    logger.debug('Audio file stored successfully');
                } catch (error) {
                    logger.error('Failed to store audio:', error);
                    if (error instanceof Error) {
                        logger.error('Error details:', {
                            message: error.message,
                            name: error.name,
                            stack: error.stack
                        });
                    }
                    throw new Error('Failed to store audio file');
                }
            } else {
                const jsonPath = result.fileUri.replace(/\.wav$/, '.json');
                await FileSystem.writeAsStringAsync(
                    jsonPath,
                    JSON.stringify(result, null, 2),
                    { encoding: FileSystem.EncodingType.UTF8 }
                );
                logger.log(`Metadata saved to ${jsonPath}`);
                refreshFiles();
            }

            setResult(null);
            router.navigate(`(recordings)/${result.filename}`);
        } catch (error) {
            logger.error(`Error while stopping recording`, error);
            setError('Failed to stop recording. Please try again.');
        } finally {
            setStopping(false);
            setProcessing(false);
            setCustomFileName('');
            // Reset transcripts
            setTranscripts([]);
            setActiveTranscript(null);
        }
    }, [router, transcripts, refreshFiles, stopRecording, isRealtimeTranscribing, stopRealtimeTranscription, stopProgressiveBatch]);

    const renderRecording = () => (
        <View style={{ gap: 10, display: 'flex' }}>
            {/* Conditionally render visualizer based on showVisualization state */}
            {analysisData && showVisualization && startRecordingConfig.enableProcessing && (
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
                device={currentDevice}
            />

            <DeviceDisconnectionHandler
                isRecording={isRecording}
                currentDevice={currentDevice}
                deviceDisconnectionBehavior={startRecordingConfig.deviceDisconnectionBehavior}
                onDeviceDisconnected={handleDeviceDisconnected}
                onDeviceFallback={handleDeviceFallback}
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
                    if (isProgressiveBatchRunningRef.current || isRealtimeTranscribing) {
                        stopCurrentTranscription?.();
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
            {/* Conditionally render visualizer based on showVisualization state */}
            {analysisData && showVisualization && startRecordingConfig.enableProcessing && (
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
                device={currentDevice}
            />

            <DeviceDisconnectionHandler
                isRecording={isRecording}
                currentDevice={currentDevice}
                deviceDisconnectionBehavior={startRecordingConfig.deviceDisconnectionBehavior}
                onDeviceDisconnected={handleDeviceDisconnected}
                onDeviceFallback={handleDeviceFallback}
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
                    if (enableLiveTranscriptionRef.current && validSRTranscription) {
                        if (isWeb) {
                            startProgressiveBatch?.({
                                sampleRate: 16000,
                                language: transcriptionContext.language === 'auto' ? 
                                    undefined : transcriptionContext.language,
                                ...transcriptionSettings.batchOptions
                            });
                        } else {
                            try {
                                if (transcriptionSettings.mode === 'realtime') {
                                    startRealtimeTranscription?.({
                                        language: transcriptionContext.language === 'auto' ? 
                                            undefined : transcriptionContext.language,
                                        ...transcriptionSettings.realtimeOptions
                                    }).catch(error => {
                                        logger.warn('Falling back to batch mode after resume:', error);
                                        startProgressiveBatch?.({
                                            sampleRate: startRecordingConfig.sampleRate || 16000,
                                            language: transcriptionContext.language === 'auto' ? 
                                                undefined : transcriptionContext.language,
                                            ...transcriptionSettings.batchOptions
                                        });
                                    });
                                } else {
                                    // Use batch mode directly if that's the selected mode
                                    startProgressiveBatch?.({
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
            {/* Use RecordingSettings Component */}
            <RecordingSettings
                config={startRecordingConfig}
                onConfigChange={setStartRecordingConfig}
                customFileName={customFileName}
                onCustomFileNameChange={setCustomFileName}
                isRecording={isRecording}
                isPaused={isPaused}
                isRecordingPrepared={isRecordingPrepared}
                enableLiveTranscription={enableLiveTranscription}
                showVisualization={showVisualization}
                onShowVisualizationChange={setShowVisualization}
            />

            <TranscriptionModeConfig
                enabled={enableLiveTranscription}
                onEnabledChange={(enabled) => {
                    setEnableLiveTranscription(enabled);
                    
                    // Preload the model if enabled
                    if (enabled && !ready && !unifiedIsModelLoading && validSRTranscription) {
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
            {enableLiveTranscription && unifiedIsModelLoading && (
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

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Button 
                    testID="prepare-recording-button"
                    mode="outlined" 
                    onPress={handlePrepareRecording}
                    disabled={isRecordingPrepared}
                    style={{ flex: 1 }}
                >
                    {isRecordingPrepared ? 'Prepared' : 'Prepare Recording'}
                </Button>
                <Button 
                    testID="start-recording-button"
                    mode="contained" 
                    onPress={handleStart}
                    style={{ flex: 1 }}
                >
                    {isRecordingPrepared ? 'Start' : 'Start Recording'}
                </Button>
            </View>
        </View>
    )

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
                            onAudioStream: (event: AudioDataEvent): Promise<void> => {
                                return onAudioDataRef.current?.(event) || Promise.resolve();
                            },
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
