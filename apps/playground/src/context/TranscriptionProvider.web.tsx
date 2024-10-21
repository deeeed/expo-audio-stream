// apps/playground/src/context/TranscriptionProvider.tsx
import { TranscriberData } from '@siteed/expo-audio-stream'
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
} from 'react'

import {
    initialState,
    transcriptionReducer,
} from './TranscriptionProvider.reducer'
import {
    TranscriberCompleteData,
    TranscriberUpdateData,
    TranscriptionState,
} from './TranscriptionProvider.types'
import { baseLogger, config } from '../config'
import { useWorker } from '../hooks/useWorker.web'

const logger = baseLogger.extend('TranscriptionProvider')

export interface TranscribeParams {
    audioData: Float32Array | undefined
    position?: number
    jobId: string
    onChunkUpdate?: (_: TranscriberUpdateData['data']) => void
}

export interface TranscriptionContextProps extends TranscriptionState {
    initialize: () => void
    transcribe: (_: TranscribeParams) => Promise<TranscriberData>
    updateConfig: (
        config: Partial<TranscriptionState>,
        shouldInitialize?: boolean
    ) => Promise<void>
}

interface TranscriptionProviderProps {
    children: ReactNode
    initialModel?: string
    initialQuantized?: boolean
    initialMultilingual?: boolean
    initialLanguage?: string
}

const TranscriptionContext = createContext<
    TranscriptionContextProps | undefined
>(undefined)

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

    const messageEventHandler = useCallback(
        (event: MessageEvent) => {
            const message = event.data
            const jobId = message.jobId
            switch (message.status) {
                case 'progress':
                    dispatch({
                        type: 'UPDATE_PROGRESS_ITEM',
                        progressItem: message,
                    })
                    break
                case 'update': {
                    const updateMessage = message as TranscriberUpdateData
                    const { jobId, data } = updateMessage
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
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            transcript,
                        },
                    })
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
        },
        [dispatch]
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
        async ({ audioData, jobId, position = 0 }: TranscribeParams) => {
            if (audioData && audioData !== audioDataRef.current) {
                audioDataRef.current = audioData
                dispatch({
                    type: 'TRANSCRIPTION_START',
                })

                return new Promise<TranscriberData>((resolve, reject) => {
                    transcribeResolveMapRef.current[jobId] = resolve
                    transcribeRejectMapRef.current[jobId] = reject

                    logger.debug(
                        `Transcribing position=${position} jobId=${jobId}...`
                    )
                    webWorker.postMessage({
                        type: 'transcribe',
                        audio: audioData,
                        position,
                        jobId,
                        model: modelRef.current,
                        multilingual: multilingualRef.current,
                        quantized: quantizedRef.current,
                        subtask: multilingualRef.current
                            ? subtaskRef.current
                            : null,
                        language:
                            multilingualRef.current &&
                            languageRef.current !== 'auto'
                                ? languageRef.current
                                : null,
                    })
                })
            }
            return Promise.reject(new Error('No audio data provided'))
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

    const contextValue = useMemo(
        () => ({
            ...state,
            initialize,
            transcribe,
            updateConfig,
        }),
        [state, initialize, transcribe, updateConfig]
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
