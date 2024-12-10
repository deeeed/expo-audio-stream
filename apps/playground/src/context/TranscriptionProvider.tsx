// apps/playground/src/context/TranscriptionProvider.tsx
import { TranscriberData } from '@siteed/expo-audio-stream'
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useMemo,
    useReducer,
    useState,
    useEffect,
} from 'react'
import { initWhisper, WhisperContext, type ContextOptions } from 'whisper.rn'

import {
    initialState,
    transcriptionReducer,
} from './TranscriptionProvider.reducer'
import {
    TranscriberUpdateData,
    TranscriptionState,
} from './TranscriptionProvider.types'
import { baseLogger, config } from '../config'

const logger = baseLogger.extend('TranscriptionProvider')

const DEFAULT_MODEL = require('@assets/ggml-tiny.en.bin')

export interface TranscribeParams {
    audioData: string | Float32Array | undefined
    position?: number
    jobId: string
    onChunkUpdate?: (_: TranscriberUpdateData['data']) => void
}

export interface TranscriptionContextProps extends TranscriptionState {
    initialize: (_: { contextOptions: ContextOptions }) => void
    transcribe: (_: TranscribeParams) => Promise<TranscriberData | undefined>
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

    const [whisperContext, setWhisperContext] = useState<WhisperContext | null>(
        null
    )

    useEffect(() => {
        if (!state.ready && !state.isModelLoading) {
            logger.debug('Auto-initializing whisper with default model...')
            initialize({
                contextOptions: {
                    filePath: DEFAULT_MODEL,
                },
            })
        }
    }, [state.ready, state.isModelLoading])

    const initialize = useCallback(
        async ({ contextOptions }: { contextOptions: ContextOptions }) => {
            try {
                logger.debug('Initializing whisper...', contextOptions)
                dispatch({
                    type: 'UPDATE_STATE',
                    payload: { isModelLoading: true, ready: false },
                })

                const context = await initWhisper(contextOptions)
                logger.debug('Whisper initialized', context)
                setWhisperContext(context)

                dispatch({
                    type: 'UPDATE_STATE',
                    payload: { isModelLoading: false, ready: true },
                })
            } catch (error) {
                logger.error('Failed to initialize whisper:', error)
                dispatch({
                    type: 'UPDATE_STATE',
                    payload: { isModelLoading: false, ready: false },
                })
            }
        },
        []
    )

    const transcribe = useCallback(
        async ({
            audioData,
            position: _position = 0,
            jobId,
            onChunkUpdate,
        }: TranscribeParams): Promise<TranscriberData | undefined> => {
            if (
                !whisperContext ||
                !audioData ||
                typeof audioData !== 'string'
            ) {
                logger.warn('No whisper context or invalid audio data')
                return
            }

            logger.debug('Transcribing...', audioData)
            try {
                dispatch({ type: 'TRANSCRIPTION_START' })

                const startTime = Date.now()
                const { promise, stop: _stop } = whisperContext.transcribe(
                    audioData,
                    {
                        language:
                            state.language === 'auto'
                                ? undefined
                                : state.language,
                        tokenTimestamps: true,
                        tdrzEnable: true,
                        onProgress(progress: number) {
                            console.debug('onProgress', progress)
                            dispatch({
                                type: 'UPDATE_PROGRESS_ITEM',
                                progressItem: {
                                    file: jobId,
                                    loaded: progress,
                                    progress,
                                    total: 100,
                                    name: jobId,
                                    status: 'processing',
                                },
                            })
                        },
                        onNewSegments(result) {
                            console.debug('onNewSegments', result)
                            const chunks = result.segments.map((segment) => {
                                return {
                                    text: segment.text.trim(),
                                    timestamp: [
                                        segment.t0 / 100,
                                        segment.t1 / 100,
                                    ] as [number, number | null],
                                }
                            })

                            const text = chunks
                                .map((chunk) => chunk.text)
                                .join(' ')

                            const chunkStartTime = chunks[0]?.timestamp[0] ?? 0
                            const chunkEndTime =
                                chunks[chunks.length - 1]?.timestamp[1] ??
                                chunkStartTime

                            const updateData: TranscriberUpdateData['data'] = [
                                text,
                                { chunks },
                            ]

                            const transcriptUpdate: TranscriberData = {
                                id: jobId,
                                isBusy: true,
                                text,
                                startTime: chunkStartTime,
                                endTime: chunkEndTime,
                                chunks,
                            }

                            console.debug('Transcript update', transcriptUpdate)

                            dispatch({
                                type: 'UPDATE_STATE',
                                payload: { transcript: transcriptUpdate },
                            })

                            onChunkUpdate?.(updateData)
                        },
                    }
                )

                const { result: transcription, segments } = await promise

                const finalTranscript: TranscriberData = {
                    id: jobId,
                    isBusy: false,
                    text: transcription.trim(),
                    startTime,
                    endTime: Date.now(),
                    chunks: segments.map((segment) => ({
                        text: segment.text.trim(),
                        timestamp: [segment.t0 / 100, segment.t1 / 100],
                    })),
                }

                dispatch({
                    type: 'UPDATE_STATE',
                    payload: {
                        transcript: finalTranscript,
                        isBusy: false,
                    },
                })

                return finalTranscript
            } catch (error) {
                logger.error('Transcription error:', error)
                dispatch({
                    type: 'UPDATE_STATE',
                    payload: { isBusy: false },
                })
                throw error
            }
        },
        [whisperContext, state.language]
    )

    const updateConfig = useCallback(
        (config: Partial<TranscriptionState>): Promise<void> => {
            logger.debug('Updating config', config)
            return Promise.resolve()
        },
        []
    )

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
