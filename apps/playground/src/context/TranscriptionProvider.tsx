// apps/playground/src/context/TranscriptionProvider.tsx
import { TranscriberData } from '@siteed/expo-audio-stream'
import * as FileSystem from 'expo-file-system'
import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useReducer,
    useRef,
    useState
} from 'react'
import { fromByteArray } from 'react-native-quick-base64'
import { initWhisper, TranscribeFileOptions, WhisperContext } from 'whisper.rn'

import { baseLogger, config } from '../config'
import { WHISPER_MODELS } from '../hooks/useWhisperModels'
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
            audioUri,
            position = 0,
            jobId: providedJobId,
            options,
            onProgress,
            onNewSegments,
        }: TranscribeParams): Promise<TranscribeResult> => {
            const jobId = providedJobId || `transcribe_${Date.now()}_${Math.random().toString(36).slice(2)}`

            if(!whisperContext) {
                return {
                    promise: Promise.reject(new Error('No whisper context')),
                    stop: async () => {},
                    jobId
                }
            }

            if (!audioData && !audioUri) {
                return {
                    promise: Promise.reject(new Error('No audio data or URI provided')),
                    stop: async () => {},
                    jobId
                }
            }

            // Determine what to use for transcription
            let filePathOrBase64: string;
            let useTranscribeData = false;
            
            if (audioUri) {
                // If audioUri is provided, use it directly
                filePathOrBase64 = audioUri;
            } else if (audioData) {
                // Convert audioData to base64 if needed
                useTranscribeData = true;
                if (typeof audioData === 'string') {
                    // Already a string (likely base64)
                    filePathOrBase64 = audioData;
                } else if (audioData instanceof ArrayBuffer || 
                          audioData instanceof Float32Array || 
                          audioData instanceof Uint8Array) {
                    // Convert buffer to base64
                    filePathOrBase64 = fromByteArray(new Uint8Array(audioData instanceof ArrayBuffer ? audioData : audioData.buffer));
                } else {
                    return {
                        promise: Promise.reject(new Error('Unsupported audio data format')),
                        stop: async () => {},
                        jobId
                    }
                }
            } else {
                // This shouldn't happen due to the earlier check
                return {
                    promise: Promise.reject(new Error('No audio data or URI provided')),
                    stop: async () => {},
                    jobId
                }
            }

            const file = `file_${Date.now()}`;
            
            dispatch({
                type: 'UPDATE_PROGRESS_ITEM',
                progressItem: {
                    file,
                    loaded: 0,
                    total: 100,
                    progress: 0,
                    name: state.model,
                    status: 'processing',
                }
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
                ? whisperContext.transcribeData(filePathOrBase64, fullOptions)
                : whisperContext.transcribe(filePathOrBase64, fullOptions);

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
                        payload: file,
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
