// apps/playground/src/context/TranscriptionProvider.tsx
import { TranscriberData } from '@siteed/expo-audio-stream'
import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useReducer,
    useRef,
    useState
} from 'react'
import { initWhisper, WhisperContext } from 'whisper.rn'
import * as FileSystem from 'expo-file-system'

import { baseLogger, config } from '../config'
import {
    initialState,
    transcriptionReducer,
} from './TranscriptionProvider.reducer'
import {
    TranscribeParams,
    TranscribeResult,
    TranscriptionContextProps,
    TranscriptionProviderProps,
    TranscriptionState,
} from './TranscriptionProvider.types'
import { WHISPER_MODELS } from '../hooks/useWhisperModels'

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
        const model = WHISPER_MODELS.find(m => m.id === modelId)
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
            const context = await initWhisper({
                filePath: modelPath,
            })
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
            throw error
        }
    }, [state.model, downloadModel])

    const transcribe = useCallback(
        async ({
            audioData,
            position = 0,
            jobId: providedJobId,
            options,
            onProgress,
            onNewSegments,
        }: TranscribeParams): Promise<TranscribeResult> => {
            const jobId = providedJobId || `transcribe_${Date.now()}_${Math.random().toString(36).slice(2)}`

            if (!whisperContext || !audioData || typeof audioData !== 'string') {
                return {
                    promise: Promise.reject(new Error('No whisper context or invalid audio data')),
                    stop: async () => {},
                    jobId
                }
            }

            dispatch({
                type: 'UPDATE_PROGRESS_ITEM',
                progressItem: {
                    file: audioData,
                    loaded: 0,
                    total: 100,
                    progress: 0,
                    name: state.model,
                    status: 'processing',
                }
            })

            const startTime = Date.now()
            const { promise: whisperPromise, stop } = whisperContext.transcribe(
                audioData,
                {
                    ...options,
                    language: state.language === 'auto' ? undefined : state.language,
                    onProgress(progress) {
                        dispatch({
                            type: 'UPDATE_PROGRESS_ITEM',
                            progressItem: {
                                file: audioData,
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
            )

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
                            payload: audioData,
                        })
                        
                        return finalTranscript
                    }
                ).catch(error => {
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
                        payload: audioData,
                    })
                    delete transcribeResolveMapRef.current[jobId]
                    delete transcribeRejectMapRef.current[jobId]
                },
                jobId
            }
        },
        [whisperContext, state.language, state.model]
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
