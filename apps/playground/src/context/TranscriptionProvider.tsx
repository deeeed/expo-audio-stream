// apps/playground/src/context/TranscriptionProvider.tsx
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useMemo,
    useReducer,
    useRef,
} from 'react'

import {
    initialState,
    transcriptionReducer,
} from './TranscriptionProvider.reducer'
import {
    TranscriptionAction,
    TranscriptionState,
} from './TranscriptionProvider.types'
import { config } from '../config'
import { useWorker } from '../hooks/useWorker'

interface TranscriptionContextProps extends TranscriptionState {
    dispatch: React.Dispatch<TranscriptionAction>
    initialize: () => void
    start: (audioData: Float32Array | undefined) => void
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

    const webWorker = useWorker({
        url: config.whisperWorkerUrl,
        messageEventHandler: (event) => {
            const message = event.data
            switch (message.status) {
                case 'progress':
                    dispatch({
                        type: 'UPDATE_PROGRESS_ITEM',
                        progressItem: {
                            file: message.file,
                            progress: message.progress,
                            loaded: 0,
                            total: 0,
                            name: '',
                            status: '',
                        },
                    })
                    break
                case 'update':
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            transcript: {
                                isBusy: true,
                                text: message.data[0],
                                chunks: message.data[1].chunks,
                            },
                        },
                    })
                    break
                case 'complete':
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            transcript: {
                                isBusy: false,
                                text: message.data.text,
                                chunks: message.data.chunks,
                            },
                            isBusy: false,
                        },
                    })
                    break
                case 'initiate':
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            isModelLoading: true,
                            progressItems: [...state.progressItems, message],
                        },
                    })
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
                case 'error':
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            isBusy: false,
                        },
                    })
                    alert(
                        `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.\n\nIf this is not the case, please file a bug report.`
                    )
                    break
                case 'done': {
                    dispatch({
                        type: 'UPDATE_STATE',
                        payload: {
                            progressItems: state.progressItems.filter(
                                (item) => item.file !== message.file
                            ),
                        },
                    })
                    break
                }
                default:
                    break
            }
        },
    })

    const initialize = useCallback(() => {
        dispatch({
            type: 'UPDATE_STATE',
            payload: { isModelLoading: true, ready: false },
        })
        webWorker.postMessage({
            type: 'initialize',
            model: state.model,
            quantized: state.quantized,
        })
    }, [webWorker, state.model, state.quantized])

    const start = useCallback(
        async (audioData: Float32Array | undefined) => {
            if (audioData && audioData !== audioDataRef.current) {
                audioDataRef.current = audioData
                dispatch({
                    type: 'UPDATE_STATE',
                    payload: { transcript: undefined, isBusy: true },
                })

                webWorker.postMessage({
                    type: 'transcribe',
                    audio: audioData,
                    model: state.model,
                    multilingual: state.multilingual,
                    quantized: state.quantized,
                    subtask: state.multilingual ? state.subtask : null,
                    language:
                        state.multilingual && state.language !== 'auto'
                            ? state.language
                            : null,
                })
            }
        },
        [
            webWorker,
            state.model,
            state.multilingual,
            state.quantized,
            state.subtask,
            state.language,
        ]
    )

    const contextValue = useMemo(
        () => ({
            ...state,
            dispatch,
            initialize,
            start,
        }),
        [state, initialize, start]
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
