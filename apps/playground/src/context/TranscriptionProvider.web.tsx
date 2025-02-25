// apps/playground/src/context/TranscriptionProvider.tsx
import { TranscriberData } from '@siteed/expo-audio-stream'
import throttle from 'lodash.throttle'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef
} from 'react'

import { TranscribeNewSegmentsResult } from 'whisper.rn'
import { baseLogger, config } from '../config'
import { useWorker } from '../hooks/useWorker.web'
import {
    initialState,
    transcriptionReducer,
} from './TranscriptionProvider.reducer'
import {
    TranscribeParams,
    TranscriberCompleteData,
    TranscriberUpdateData,
    TranscriptionContextProps,
    TranscriptionProviderProps,
    TranscriptionState
} from './TranscriptionProvider.types'

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

    const audioDataRef = useRef<Float32Array | null>(null)
    const resolveUpdateConfigRef = useRef<(() => void) | null>(null)
    const initializeAfterUpdateRef = useRef<boolean>(false)

    // Map to monitor transcription completion and allow to return a promise in transcribe()
    const transcribeResolveMapRef = useRef<
        Record<string, (transcription: TranscriberData) => void>
    >({})
    const transcribeRejectMapRef = useRef<
        Record<string, (error: Error) => void>
    >({})

    const lastProgressUpdate = useRef<number>(0)
    const lastTranscriptRef = useRef<TranscriberData | null>(null)

    // Add at component level with other refs
    const onChunkUpdateRef = useRef<((_: TranscriberUpdateData['data']) => void) | null>(null);
    const progressCallbackRef = useRef<((progress: number) => void) | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const messageEventHandler = useCallback(
        throttle((event: MessageEvent) => {
            const message = event.data
            const jobId = message.jobId
            switch (message.status) {
                case 'progress': {
                    if (
                        !lastProgressUpdate.current ||
                        Date.now() - lastProgressUpdate.current > 100
                    ) {
                        lastProgressUpdate.current = Date.now()
                        dispatch({
                            type: 'UPDATE_PROGRESS_ITEM',
                            progressItem: message,
                        })
                    }
                    break
                }
                case 'update': {
                    const updateMessage = message as TranscriberUpdateData
                    const { data } = updateMessage
                    const text = data[0]
                    const { chunks } = data[1]
                    const transcript: TranscriberData = {
                        id: jobId,
                        isBusy: true,
                        text,
                        chunks,
                        startTime: updateMessage.startTime,
                        endTime: updateMessage.endTime,
                    }

                    console.log('Web worker update received:', { 
                        jobId, 
                        text
                    });

                    // In the message handler
                    if (onChunkUpdateRef.current) {
                        onChunkUpdateRef.current(data)
                    }

                    const lastTranscript = lastTranscriptRef.current
                    if (
                        !lastTranscript ||
                        lastTranscript.id !== transcript.id ||
                        lastTranscript.text !== transcript.text
                    ) {
                        lastTranscriptRef.current = transcript
                        dispatch({
                            type: 'UPDATE_STATE',
                            payload: {
                                transcript,
                                isBusy: true,
                            },
                        })
                    }
                    break
                }
                case 'complete': {
                    const completeMessage = message as TranscriberCompleteData
                    const transcript: TranscriberData = {
                        id: jobId,
                        isBusy: false,
                        text: completeMessage.data.text,
                        chunks: completeMessage.data.chunks,
                        startTime: completeMessage.data.startTime,
                        endTime: completeMessage.data.endTime,
                    }
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            transcript,
                            isBusy: false,
                        },
                    })
                    if (transcribeResolveMapRef.current[jobId]) {
                        transcribeResolveMapRef.current[jobId](transcript)
                        delete transcribeResolveMapRef.current[jobId]
                    }

                    break
                }
                case 'initiate':
                    // dispatch({
                    //     type: 'UPDATE_STATE',
                    //     payload: {
                    //         isModelLoading: true,
                    //         progressItems: [...state.progressItems, message],
                    //     },
                    // })
                    break
                case 'ready':
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            isModelLoading: false,
                            ready: true,
                        },
                    })
                    break
                case 'error': {
                    logger.error(`Transcription error`, message.data.message)
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            isBusy: false,
                        },
                    })
                    alert(
                        `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.\n\nIf this is not the case, please file a bug report.`
                    )
                    if (jobId && transcribeRejectMapRef.current[jobId]) {
                        transcribeRejectMapRef.current[jobId](
                            new Error(event.data.message)
                        )
                        delete transcribeRejectMapRef.current[jobId]
                    }
                    break
                }
                case 'done': {
                    dispatch({
                        type: 'REMOVE_PROGRESS_ITEM',
                        payload: message.file,
                    })
                    break
                }
                default:
                    break
            }
        }, 100), // Throttle to run at most once every 100ms
        []
    )

    const webWorker = useWorker({
        url: config.whisperWorkerUrl,
        messageEventHandler,
    })

    const modelRef = useRef(state.model)
    const quantizedRef = useRef(state.quantized)
    const multilingualRef = useRef(state.multilingual)
    const subtaskRef = useRef(state.subtask)
    const languageRef = useRef(state.language)

    useEffect(() => {
        modelRef.current = state.model
        quantizedRef.current = state.quantized
        multilingualRef.current = state.multilingual
        subtaskRef.current = state.subtask
        languageRef.current = state.language
    }, [
        state.model,
        state.quantized,
        state.multilingual,
        state.subtask,
        state.language,
    ])

    const initialize = useCallback(() => {
        dispatch({
            type: 'UPDATE_STATE',
            payload: { isModelLoading: true, ready: false },
        })
        logger.debug(
            'Initializing transcription...',
            modelRef.current,
            quantizedRef.current
        )
        webWorker.postMessage({
            type: 'initialize',
            model: modelRef.current,
            quantized: quantizedRef.current,
            multilingual: multilingualRef.current,
            subtask: multilingualRef.current ? subtaskRef.current : null,
            language:
                multilingualRef.current && languageRef.current !== 'auto'
                    ? languageRef.current
                    : null,
        })
    }, [dispatch, webWorker])

    const transcribe = useCallback(
        async ({
            audioData,
            position = 0,
            jobId: providedJobId,
            options,
            onProgress,
            onNewSegments,
        }: TranscribeParams): Promise<{
            promise: Promise<TranscriberData>;
            stop: () => Promise<void>;
            jobId: string;
        }> => {
            const jobId = providedJobId || `transcribe_${Date.now()}_${Math.random().toString(36).slice(2)}`
            
            // Store the legacy onChunkUpdate functionality for backward compatibility
            // We'll map onNewSegments to this functionality
            onChunkUpdateRef.current = onNewSegments ? 
                (data) => {
                    // Map the data format from web to match TranscribeNewSegmentsResult
                    const text = data[0];
                    const { chunks } = data[1];
                    
                    // Create a compatible result object
                    const result: TranscribeNewSegmentsResult = {
                        nNew: chunks.length, // This is an approximation
                        totalNNew: chunks.length,
                        result: text,
                        segments: chunks.map((chunk, index) => ({
                            id: index,
                            text: chunk.text,
                            t0: chunk.timestamp[0],
                            t1: chunk.timestamp[1] ?? chunk.timestamp[0],
                        }))
                    };
                    
                    onNewSegments(result);
                } : null;

            // Update progress callback ref
            progressCallbackRef.current = onProgress || null;

            console.debug(
                `transcribe, audioData: ${typeof audioData}, jobId: ${jobId}, position: ${position}`
            )

            // First check if audioData exists
            if (!audioData) {
                return {
                    promise: Promise.resolve({
                        id: jobId,
                        isBusy: false,
                        text: '',
                        chunks: [],
                        startTime: 0,
                        endTime: 0,
                    }),
                    stop: async () => {},
                    jobId
                };
            }

            // Then check the type
            if (
                typeof audioData === 'object' &&
                (!audioDataRef.current || audioData !== audioDataRef.current)
            ) {
                audioDataRef.current = audioData
                dispatch({
                    type: 'TRANSCRIPTION_START',
                })

                // If we have a progress callback, simulate progress updates
                let progressInterval: NodeJS.Timeout | null = null;
                if (progressCallbackRef.current) {
                    // Start with 0% progress
                    progressCallbackRef.current(0);
                    
                    // Simulate progress updates (since web may not provide actual progress)
                    progressInterval = setInterval(() => {
                        if (!progressCallbackRef.current) {
                            if (progressInterval) clearInterval(progressInterval);
                            return;
                        }
                        
                        // Get current progress from state if available, or simulate incremental progress
                        const currentProgress = lastProgressUpdate.current || 0;
                        const newProgress = Math.min(currentProgress + 5, 95); // Cap at 95% until complete
                        
                        lastProgressUpdate.current = newProgress;
                        progressCallbackRef.current(newProgress);
                    }, 500);
                }

                const transcriptionPromise = new Promise<TranscriberData>((resolve, reject) => {
                    transcribeResolveMapRef.current[jobId] = (transcript) => {
                        if (progressInterval) {
                            clearInterval(progressInterval);
                            // Final 100% progress
                            if (progressCallbackRef.current) {
                                progressCallbackRef.current(100);
                            }
                        }
                        resolve(transcript);
                    };
                    transcribeRejectMapRef.current[jobId] = reject;

                    logger.debug(
                        `Transcribing position=${position} jobId=${jobId}...`
                    );
                    
                    webWorker.postMessage({
                        type: 'transcribe',
                        audio: audioData,
                        position,
                        jobId,
                        model: modelRef.current,
                        multilingual: multilingualRef.current,
                        quantized: quantizedRef.current,
                        subtask: multilingualRef.current ? subtaskRef.current : null,
                        language: multilingualRef.current && languageRef.current !== 'auto'
                            ? languageRef.current 
                            : null,
                        ...options
                    });
                });

                return {
                    promise: transcriptionPromise,
                    stop: async () => {
                        if (progressInterval) {
                            clearInterval(progressInterval);
                        }
                        
                        // Send abort message to web worker
                        webWorker.postMessage({
                            type: 'abort',
                            jobId
                        });
                        
                        // Update state to indicate transcription is no longer busy
                        dispatch({
                            type: 'UPDATE_STATE',
                            payload: { isBusy: false }
                        });
                        
                        // Remove callbacks
                        delete transcribeResolveMapRef.current[jobId];
                        delete transcribeRejectMapRef.current[jobId];
                    },
                    jobId
                };
            } else if (typeof audioData === 'string') {
                // Handle string input (base64 or file path) by rejecting
                return {
                    promise: Promise.reject(
                        new Error('String audio data is not supported in web version')
                    ),
                    stop: async () => {},
                    jobId
                };
            }
            
            return {
                promise: Promise.resolve({
                    id: jobId,
                    isBusy: false,
                    text: '',
                    chunks: [],
                    startTime: 0,
                    endTime: 0,
                }),
                stop: async () => {},
                jobId
            };
        },
        [webWorker]
    )

    const updateConfig = useCallback(
        (
            config: Partial<TranscriptionState>,
            shouldInitialize: boolean = false
        ): Promise<void> => {
            logger.debug('Updating config', config)
            return new Promise<void>((resolve) => {
                resolveUpdateConfigRef.current = resolve
                initializeAfterUpdateRef.current = shouldInitialize
                dispatch({
                    type: 'UPDATE_STATE',
                    payload: config,
                })
            })
        },
        []
    )

    useEffect(() => {
        if (resolveUpdateConfigRef.current) {
            resolveUpdateConfigRef.current()
            resolveUpdateConfigRef.current = null

            if (initializeAfterUpdateRef.current) {
                initializeAfterUpdateRef.current = false
                initialize()
            }
        }
    }, [initialize])

    const resetWhisperContext = useCallback(() => {
        // No-op in web version
        logger.debug('resetWhisperContext called (no-op in web version)')
    }, [])

    const contextValue = useMemo(
        () => ({
            ...state,
            initialize,
            transcribe,
            updateConfig,
            resetWhisperContext,
        }),
        [state, initialize, transcribe, updateConfig, resetWhisperContext]
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
