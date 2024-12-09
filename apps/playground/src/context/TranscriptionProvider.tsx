// apps/playground/src/context/TranscriptionProvider.tsx
import { TranscriberData } from '@siteed/expo-audio-stream'
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useMemo,
    useReducer,
} from 'react'

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

export interface TranscribeParams {
    audioData: Float32Array | undefined
    position?: number
    jobId: string
    onChunkUpdate?: (_: TranscriberUpdateData['data']) => void
}

export interface TranscriptionContextProps extends TranscriptionState {
    initialize: () => void
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
    const [state] = useReducer(transcriptionReducer, initialProviderState)

    const initialize = useCallback(() => {}, [])

    const transcribe = useCallback(async ({ jobId }: TranscribeParams) => {
        logger.debug('Transcribing', jobId)
        const fakeResult: TranscriberData = {
            id: jobId,
            chunks: [],
            startTime: 0,
            endTime: 0,
            isBusy: false,
            text: '',
        }
        return fakeResult
    }, [])

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
