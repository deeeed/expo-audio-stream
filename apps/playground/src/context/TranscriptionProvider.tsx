// apps/playground/src/context/TranscriptionProvider.tsx
import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useReducer,
    useRef,
    useState,
} from 'react'

import * as FileSystem from 'expo-file-system'
import { fromByteArray } from 'react-native-quick-base64'
import {
    initWhisper,
} from 'whisper.rn'

import type { TranscriberData } from '@siteed/expo-audio-studio'

import { baseLogger, config } from '../config'
import {
    initialState,
    transcriptionReducer,
} from './TranscriptionProvider.reducer'
import { WHISPER_MODELS } from '../hooks/useWhisperModels'

import type {
    RealtimeTranscribeParams,
    RealtimeTranscribeResult,
    TranscribeParams,
    TranscribeResult,
    TranscriptionContextProps,
    TranscriptionProviderProps,
    TranscriptionState,
    BatchTranscribeParams,
} from './TranscriptionProvider.types'
import type {
    TranscribeFileOptions,
    TranscribeRealtimeOptions,
    WhisperContext,
} from 'whisper.rn'

const logger = baseLogger.extend('TranscriptionProvider')

const TranscriptionContext = createContext<TranscriptionContextProps | undefined>(undefined)

export const TranscriptionProvider: React.FC<TranscriptionProviderProps> = ({
    children,
    initialModel = config.DEFAULT_MODEL,
    initialQuantized = config.DEFAULT_QUANTIZED,
    initialMultilingual = config.DEFAULT_MULTILINGUAL,
    initialLanguage = config.DEFAULT_LANGUAGE,
}) => {
    const initialProviderState = {
        ...initialState,
        model: initialModel,
        quantized: initialQuantized,
        multilingual: initialMultilingual,
        language: initialLanguage,
    }
    const [state, dispatch] = useReducer(
        transcriptionReducer,
        initialProviderState
    )

    const [whisperContext, setWhisperContext] = useState<WhisperContext | null>(null)
    
    // Add refs to track multiple transcriptions
    const transcribeResolveMapRef = useRef<
        Record<string, (transcription: TranscriberData) => void>
    >({})
    const transcribeRejectMapRef = useRef<
        Record<string, (error: Error) => void>
    >({})

    const getModelDirectory = useCallback(async () => {
        const directory = `${FileSystem.documentDirectory}whisper-models/`
        await FileSystem.makeDirectoryAsync(directory, {
            intermediates: true,
        }).catch(() => {})
        return directory
    }, [])

    const downloadModel = useCallback(async (modelId: string) => {
        const model = WHISPER_MODELS.find((m) => m.id === modelId)
        if (!model) throw new Error(`Model ${modelId} not found`)

        const directory = await getModelDirectory()
        const filePath = `${directory}${model.filename}`

        const fileInfo = await FileSystem.getInfoAsync(filePath)
        if (fileInfo.exists) {
            return filePath
        }

        logger.debug(`Downloading model ${modelId} from ${model.url}`)
        dispatch({
            type: 'UPDATE_PROGRESS_ITEM',
            progressItem: {
                file: model.filename,
                loaded: 0,
                total: 100,
                progress: 0,
                name: modelId,
                status: 'downloading',
            },
        })

        try {
            const downloadResumable = FileSystem.createDownloadResumable(
                model.url,
                filePath,
                {},
                (downloadProgress) => {
                    const progress =
                        (downloadProgress.totalBytesWritten /
                        downloadProgress.totalBytesExpectedToWrite) * 100
                    dispatch({
                        type: 'UPDATE_PROGRESS_ITEM',
                        progressItem: {
                            file: model.filename,
                            loaded: downloadProgress.totalBytesWritten,
                            total: downloadProgress.totalBytesExpectedToWrite,
                            progress,
                            name: modelId,
                            status: 'downloading',
                        },
                    })
                }
            )

            const result = await downloadResumable.downloadAsync()
            if (!result) throw new Error('Download failed')

            dispatch({
                type: 'REMOVE_PROGRESS_ITEM',
                payload: model.filename,
            })

            return result.uri
        } catch (error) {
            logger.error(`Error downloading model ${modelId}:`, error)
            throw error
        }
    }, [getModelDirectory])

    const initialize = useCallback(async () => {
        try {
            dispatch({
                type: 'UPDATE_STATE',
                payload: { isModelLoading: true, ready: false },
            })
            
            logger.debug('Initializing whisper...', state.model)
            
            // First ensure we have the model file
            const modelPath = await downloadModel(state.model)
            
            logger.debug('Model downloaded, initializing context with path:', modelPath)
            
            // Add more detailed logging
            logger.debug('Calling initWhisper...')
            const context = await initWhisper({
                filePath: modelPath,
            })
            logger.debug('initWhisper returned successfully, context:', context ? 'valid' : 'null')
            
            // Set the context with logging
            logger.debug('Setting whisperContext state...')
            setWhisperContext(context)
            logger.debug('whisperContext state set, dispatching ready state')
            
            dispatch({
                type: 'UPDATE_STATE',
                payload: { isModelLoading: false, ready: true },
            })
            
            return
        } catch (error) {
            logger.error('Failed to initialize whisper:', error)
            dispatch({
                type: 'UPDATE_STATE',
                payload: { isModelLoading: false, ready: false },
            })
            throw error
        }
    }, [state.model, downloadModel])

    const transcribe = useCallback(
        async ({
            audioData,
            audioUri,
            position = 0,
            jobId: providedJobId,
            options,
            onProgress,
            onNewSegments,
        }: TranscribeParams): Promise<TranscribeResult> => {
            const jobId = providedJobId || `transcribe_${Date.now()}_${Math.random().toString(36).slice(2)}`

            // Add logging for current state
            logger.debug('transcribe called, current state:', { 
                hasContext: !!whisperContext, 
                isModelLoading: state.isModelLoading,
                ready: state.ready, 
            })

            // Auto-initialize if not ready
            let localContext = whisperContext
            if (!localContext && !state.isModelLoading) {
                logger.debug('Model not initialized, auto-initializing before transcription')
                try {
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: { isModelLoading: true },
                    })
                    
                    // Download model and initialize directly
                    logger.debug('Downloading model and initializing directly...')
                    const modelPath = await downloadModel(state.model)
                    logger.debug('Model downloaded, initializing context with path:', modelPath)
                    
                    // Initialize context directly and capture the result
                    localContext = await initWhisper({
                        filePath: modelPath,
                    })
                    
                    logger.debug('Context initialized directly:', localContext ? 'valid' : 'null')
                    
                    // Also update the state for future calls
                    setWhisperContext(localContext)
                    
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: { isModelLoading: false, ready: true },
                    })
                    
                    if (!localContext) {
                        throw new Error('Failed to initialize whisper context')
                    }
                } catch (error) {
                    logger.error('Auto-initialization failed:', error)
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: { isModelLoading: false },
                    })
                    return {
                        promise: Promise.reject(new Error('Failed to initialize model: ' + error)),
                        stop: async () => {},
                        jobId,
                    }
                }
            }

            if(!localContext) {
                return {
                    promise: Promise.reject(new Error('No whisper context available')),
                    stop: async () => {},
                    jobId,
                }
            }

            if (!audioData && !audioUri) {
                return {
                    promise: Promise.reject(new Error('No audio data or URI provided')),
                    stop: async () => {},
                    jobId,
                }
            }

            // Determine what to use for transcription
            let filePathOrBase64: string
            let useTranscribeData = false
            
            if (audioUri) {
                // If audioUri is provided, use it directly
                filePathOrBase64 = audioUri
            } else if (audioData) {
                // Convert audioData to base64 if needed
                useTranscribeData = true
                if (typeof audioData === 'string') {
                    // Already a string (likely base64)
                    filePathOrBase64 = audioData
                    logger.debug(`Using string audio data, length=${audioData.length}`)
                } else if (audioData instanceof ArrayBuffer || 
                          audioData instanceof Float32Array || 
                          audioData instanceof Uint8Array) {
                    // Convert buffer to base64
                    filePathOrBase64 = fromByteArray(new Uint8Array(audioData instanceof ArrayBuffer ? audioData : audioData.buffer))
                } else {
                    return {
                        promise: Promise.reject(new Error('Unsupported audio data format')),
                        stop: async () => {},
                        jobId,
                    }
                }
            } else {
                // This shouldn't happen due to the earlier check
                return {
                    promise: Promise.reject(new Error('No audio data or URI provided')),
                    stop: async () => {},
                    jobId,
                }
            }

            const file = `file_${Date.now()}`
            
            dispatch({
                type: 'UPDATE_PROGRESS_ITEM',
                progressItem: {
                    file,
                    loaded: 0,
                    total: 100,
                    progress: 0,
                    name: state.model,
                    status: 'processing',
                },
            })

            const fullOptions: TranscribeFileOptions = {
                ...options,
                language: state.language === 'auto' ? undefined : state.language,
                onProgress(progress) {
                    dispatch({
                        type: 'UPDATE_PROGRESS_ITEM',
                        progressItem: {
                            file,
                            loaded: progress,
                            total: 100,
                            progress,
                            name: state.model,
                            status: 'processing',
                        },
                    })
                    onProgress?.(progress)
                },
                onNewSegments(result) {
                    const chunks = result.segments.map((segment) => ({
                        text: segment.text.trim(),
                        timestamp: [
                            segment.t0 / 100,
                            segment.t1 ? segment.t1 / 100 : null,
                        ] as [number, number | null],
                    }))

                    const text = chunks.map((c) => c.text).join(' ')
                    const chunkStartTime = startTime + position * 1000

                    const transcriptUpdate: TranscriberData = {
                        id: jobId,
                        isBusy: true,
                        text,
                        chunks,
                        startTime: chunkStartTime,
                        endTime: chunkStartTime + (chunks[chunks.length - 1]?.timestamp[1] ?? 0) * 1000,
                    }

                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: { transcript: transcriptUpdate },
                    })

                    onNewSegments?.(result)
                },
            }
            const startTime = Date.now()
            
            // Use the appropriate transcribe method based on the input type
            const { promise: whisperPromise, stop } = useTranscribeData 
                ? localContext.transcribeData(filePathOrBase64, fullOptions)
                : localContext.transcribe(filePathOrBase64, fullOptions)

            const transcriptionPromise = new Promise<TranscriberData>((resolve, reject) => {
                transcribeResolveMapRef.current[jobId] = resolve
                transcribeRejectMapRef.current[jobId] = reject

                whisperPromise.then(
                    ({ result: transcription, segments }) => {
                        const finalTranscript: TranscriberData = {
                            id: jobId,
                            isBusy: false,
                            text: transcription,
                            chunks: segments.map((segment) => ({
                                text: segment.text.trim(),
                                timestamp: [
                                    segment.t0 / 100,
                                    segment.t1 ? segment.t1 / 100 : null,
                                ],
                            })),
                            startTime: startTime + position * 1000,
                            endTime: Date.now(),
                        }

                        dispatch({
                            type: 'UPDATE_STATE',
                            payload: {
                                transcript: finalTranscript,
                                isBusy: false,
                            },
                        })

                        if (transcribeResolveMapRef.current[jobId]) {
                            transcribeResolveMapRef.current[jobId](finalTranscript)
                            delete transcribeResolveMapRef.current[jobId]
                            delete transcribeRejectMapRef.current[jobId]
                        }

                        dispatch({
                            type: 'REMOVE_PROGRESS_ITEM',
                            payload: file,
                        })
                        
                        return finalTranscript
                    }
                ).catch((error) => {
                    if (transcribeRejectMapRef.current[jobId]) {
                        transcribeRejectMapRef.current[jobId](error)
                        delete transcribeResolveMapRef.current[jobId]
                        delete transcribeRejectMapRef.current[jobId]
                    }
                    throw error
                })
            })

            return {
                promise: transcriptionPromise,
                stop: async () => {
                    await stop()
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: { isBusy: false },
                    })
                    dispatch({
                        type: 'REMOVE_PROGRESS_ITEM',
                        payload: file,
                    })
                    delete transcribeResolveMapRef.current[jobId]
                    delete transcribeRejectMapRef.current[jobId]
                },
                jobId,
            }
        },
        [whisperContext, state.language, state.model, state.ready, state.isModelLoading, downloadModel]
    )

    const updateConfig = useCallback(
        async (
            config: Partial<TranscriptionState>,
            shouldInitialize: boolean = false
        ): Promise<void> => {
            logger.debug('Updating config', config)
            dispatch({
                type: 'UPDATE_STATE',
                payload: config,
            })

            if (shouldInitialize) {
                setWhisperContext(null)
                await initialize()
            }

            return Promise.resolve()
        },
        [initialize]
    )

    const resetWhisperContext = useCallback(() => {
        setWhisperContext(null)
        dispatch({
            type: 'UPDATE_STATE',
            payload: { ready: false },
        })
    }, [])

    const transcribeRealtime = useCallback(
        async ({
            jobId,
            options,
            onTranscriptionUpdate,
        }: RealtimeTranscribeParams): Promise<RealtimeTranscribeResult> => {
            logger.debug('Starting realtime transcription with jobId:', jobId, 'options:', JSON.stringify(options))
            
            // First ensure the whisper context is initialized
            if (!whisperContext) {
                logger.debug('Whisper context not initialized, initializing first')
                try {
                    // Initialize with a timeout
                    const initPromise = initialize()
                    const timeoutPromise = new Promise<void>((_resolve, reject) => {
                        setTimeout(() => reject(new Error('Initialization timed out after 10 seconds')), 10000)
                    })
                    
                    await Promise.race([initPromise, timeoutPromise])
                    
                    // Add a delay to ensure state updates have propagated
                    await new Promise((resolve) => setTimeout(resolve, 500))
                    
                    // Check again after initialization with more diagnostic info
                    if (!whisperContext) {
                        logger.error('Whisper context still null after initialize call. State:', {
                            isModelLoading: state.isModelLoading,
                            ready: state.ready,
                        })
                        throw new Error('Whisper context still not initialized after waiting')
                    }
                } catch (error) {
                    logger.error('Failed to initialize whisper context:', error)
                    throw new Error('Failed to initialize whisper context: ' + (error instanceof Error ? error.message : String(error)))
                }
            }
            
            try {
                // Configure realtime options
                const realtimeOptions: Partial<TranscribeRealtimeOptions> = {
                    language: state.language === 'auto' ? undefined : state.language,
                    ...options,
                }
                
                logger.debug('Calling whisperContext.transcribeRealtime with options:', JSON.stringify(realtimeOptions))
                
                // Send initial update to indicate transcription has started
                const initialData: TranscriberData = {
                    id: jobId,
                    text: '',
                    chunks: [],
                    isBusy: true,
                    startTime: Date.now(),
                    endTime: Date.now(),
                }
                onTranscriptionUpdate(initialData)
                
                // Call the existing transcribeRealtime method
                const { stop, subscribe } = await whisperContext.transcribeRealtime(realtimeOptions)
                
                logger.debug('Successfully started realtime transcription, setting up subscription')
                
                // Set up a failsafe for resetting if the realtime transcription hangs
                let lastUpdateTimestamp = Date.now()
                const healthCheckInterval = setInterval(() => {
                    const now = Date.now()
                    // If no updates for more than 10 seconds, assume transcription has stalled
                    if (now - lastUpdateTimestamp > 10000) {
                        logger.warn('Realtime transcription appears to have stalled - no updates for 10s')
                        // No need to clear the interval here since we're about to reset everything
                        stop().catch((e) => logger.error('Error stopping stalled transcription:', e))
                        
                        // Provide error feedback
                        dispatch({
                            type: 'UPDATE_STATE',
                            payload: { isBusy: false },
                        })
                        
                        // throw new Error('Realtime transcription stalled - no updates received')
                    }
                }, 2000)
                
                // Set up subscription to transcription events
                subscribe((event) => {
                    const { isCapturing, data, processTime, recordingTime, error, code } = event
                    
                    logger.debug(`Realtime event: capturing=${isCapturing}, hasData=${!!data}, code=${code}, error=${error || 'none'}, processTime=${processTime}ms`)
                    
                    if (data?.result) {
                        logger.debug(`Transcription result: "${data.result.substring(0, 100)}..." (${data.segments?.length || 0} segments)`)
                        
                        // Create chunks from segments
                        const chunks = data.segments ? data.segments.map((segment) => ({
                            text: segment.text.trim(),
                            timestamp: [
                                segment.t0 / 100,
                                segment.t1 ? segment.t1 / 100 : null,
                            ] as [number, number | null],
                        })) : []
                        
                        // Create transcription data object
                        const transcriptionData: TranscriberData = {
                            id: jobId,
                            text: data.result,
                            chunks: chunks,
                            isBusy: isCapturing,
                            startTime: Date.now() - recordingTime,
                            endTime: Date.now(),
                        }
                        
                        // Update state
                        dispatch({
                            type: 'UPDATE_STATE',
                            payload: {
                                transcript: transcriptionData,
                                isBusy: isCapturing,
                            },
                        })
                        
                        // Call the callback with the transcription data
                        onTranscriptionUpdate(transcriptionData)
                    } else if (error) {
                        logger.error('Realtime transcription error:', error)
                    }
                    
                    // If capturing has stopped, update state
                    if (!isCapturing) {
                        logger.debug('Realtime transcription finished')
                        dispatch({
                            type: 'UPDATE_STATE',
                            payload: { isBusy: false },
                        })
                    }
                    
                    // Update timestamp on any data
                    if (data) {
                        lastUpdateTimestamp = Date.now()
                    }
                })
                
                // Return an enhanced stop function that cleans up the health check
                return {
                    stop: async () => {
                        logger.debug('Stopping realtime transcription')
                        if (healthCheckInterval) {
                            clearInterval(healthCheckInterval)
                        }
                        await stop()
                        dispatch({
                            type: 'UPDATE_STATE',
                            payload: { isBusy: false },
                        })
                    },
                }
            } catch (error) {
                logger.error('Failed to start realtime transcription:', error)
                throw error
            }
        },
        [whisperContext, state.language, initialize, state.isModelLoading, state.ready]
    )

    const transcribeBatchBase64 = useCallback(
        async ({
            base64Data,
            jobId,
            options,
            onTranscriptionUpdate,
        }: BatchTranscribeParams): Promise<TranscriberData> => {
            logger.debug(`transcribeBatchBase64 called with jobId ${jobId}, data length ${base64Data.length}`)
            
            if (!whisperContext) {
                throw new Error('Whisper context not initialized. Call initialize() first.')
            }
            
            try {
                // Create properly formatted options
                const transcribeOptions = {
                    language: state.language === 'auto' ? undefined : state.language,
                    ...options,
                }
                
                // Call native transcribeData with the correct signature
                const { promise } = whisperContext.transcribeData(base64Data, transcribeOptions)
                
                // Wait for the result
                const result = await promise
                
                if (!result) {
                    throw new Error('Transcription failed: No result returned')
                }
                
                // Process the result - use proper typing from whisper.rn package
                // The type should match what's used in the transcribe method above
                const chunks = result.segments.map((segment) => ({
                    text: segment.text.trim(),
                    timestamp: [
                        segment.t0 / 100,
                        segment.t1 ? segment.t1 / 100 : null,
                    ] as [number, number | null],
                }))
                
                // Create the final transcript
                const transcription: TranscriberData = {
                    id: jobId,
                    text: result.result || '', // Use result.result instead of result.text
                    chunks,
                    isBusy: false,
                    startTime: Date.now() - 5000, // Approximate
                    endTime: Date.now(),
                }
                
                // Notify caller of result
                onTranscriptionUpdate?.(transcription)
                
                return transcription
            } catch (error) {
                logger.error('Error in transcribeBatchBase64:', error)
                throw error
            }
        },
        [whisperContext, state.language]
    )

    const contextValue = useMemo(
        () => ({
            ...state,
            initialize,
            transcribe,
            transcribeRealtime,
            transcribeBatchBase64,
            updateConfig,
            resetWhisperContext,
        }),
        [state, initialize, transcribe, transcribeRealtime, transcribeBatchBase64, updateConfig, resetWhisperContext]
    )

    return (
        <TranscriptionContext.Provider value={contextValue}>
            {children}
        </TranscriptionContext.Provider>
    )
}

export const useTranscription = (): TranscriptionContextProps => {
    const context = useContext(TranscriptionContext)
    if (context === undefined) {
        throw new Error(
            'useTranscription must be used within a TranscriptionProvider'
        )
    }
    return context
}
