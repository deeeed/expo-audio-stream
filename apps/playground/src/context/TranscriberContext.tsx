import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    useMemo,
} from 'react'

import { baseLogger } from '../config'

const logger = baseLogger.extend('TranscriberContext')

interface TranscriberContextProps {
    isReady: boolean
    isLoading: boolean
    isProcessing: boolean
    progressItems: ProgressItem[]
    error: string | null
    transcribe: (audioBuffer: Float32Array) => void
    transcription: string
    chunksProcessed: number
    setModel: (model: string) => void
    setMultilingual: (multilingual: boolean) => void
    setQuantized: (quantized: boolean) => void
}

export interface Chunk {
    text: string
    timestamp: [number, number | null]
}

export interface TranscriberUpdateData {
    type: 'update'
    data: [string, { chunks: Chunk[] }]
    text: string
}

export interface TranscriberCompleteData {
    type: 'complete'
    data: {
        text: string
        chunks: Chunk[]
    }
}

export interface TranscriberData {
    isBusy: boolean
    text: string
    chunks: Chunk[]
}

const TranscriberContext = createContext<TranscriberContextProps | undefined>(
    undefined
)

export const useTranscriber2 = () => {
    const context = useContext(TranscriberContext)
    if (!context) {
        throw new Error(
            'useTranscriber must be used within a TranscriberProvider'
        )
    }
    return context
}

interface WorkerInitMessage {
    type: 'init'
    model: string
    multilingual: boolean
    quantized: boolean
}

interface WorkerTranscribeMessage {
    type: 'transcribe'
    audio: Float32Array
}

type WorkerOutMessage =
    | { type: 'ready' }
    | { type: 'error'; error: string }
    | {
          type: 'progress'
          data: { status: string; progress: number; file?: string }
      }
    | TranscriberUpdateData
    | TranscriberCompleteData

interface ProgressItem {
    file: string
    loaded: number
    progress: number
    total: number
    name: string
    status: string
}

export const TranscriberProvider: React.FC<{
    children: React.ReactNode
    model: string
    multilingual?: boolean
    quantized?: boolean
}> = ({
    children,
    model: initialModel,
    multilingual = false,
    quantized = false,
}) => {
    const [isReady, setIsReady] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [progressItems, setProgressItems] = useState<ProgressItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const [transcription, setTranscription] = useState<string>('')
    const [model, setModel] = useState<string>(initialModel)
    const [currentMultilingual, setMultilingual] =
        useState<boolean>(multilingual)
    const [currentQuantized, setQuantized] = useState<boolean>(quantized)
    const workerRef = useRef<Worker | null>(null)
    const chunksProcessed = useRef<number>(0)

    const resetStateForModelChange = () => {
        setIsReady(false)
        setIsLoading(true)
        setProgressItems([])
        setError(null)
        setTranscription('')
        chunksProcessed.current = 0
    }

    const initializeModel = useCallback((): void => {
        if (typeof Worker !== 'undefined') {
            resetStateForModelChange()
            logger.log('Initializing worker')
            workerRef.current = new Worker(
                new URL('/whisperWorker.js', window.location.href),
                { type: 'module' }
            )
            workerRef.current.onmessage = (
                event: MessageEvent<WorkerOutMessage>
            ) => {
                const message = event.data
                switch (message.type) {
                    case 'ready':
                        logger.log('Worker is ready')
                        setIsReady(true)
                        setIsLoading(false)
                        break
                    case 'progress':
                        setProgressItems((prevItems) =>
                            prevItems.map((item) =>
                                item.file === message.data.file
                                    ? {
                                          ...item,
                                          progress: message.data.progress,
                                      }
                                    : item
                            )
                        )
                        break
                    case 'error':
                        logger.error('Whisper worker error:', message.error)
                        setError(message.error)
                        setIsLoading(false)
                        setIsProcessing(false)
                        break
                    default:
                        break
                }
            }
            const initMessage: WorkerInitMessage = {
                type: 'init',
                model,
                multilingual: currentMultilingual,
                quantized: currentQuantized,
            }
            logger.log('Sending init message to worker', initMessage)
            workerRef.current.postMessage(initMessage)
        } else {
            logger.error('Web Workers are not supported in this environment')
            setError('Web Workers are not supported in this environment')
        }
    }, [model, currentMultilingual, currentQuantized])

    const transcribe = useCallback((audio: Float32Array) => {
        if (workerRef.current) {
            setIsProcessing(true)
            const transcribeMessage: WorkerTranscribeMessage = {
                type: 'transcribe',
                audio,
            }
            logger.log('Sending transcribe message to worker', {
                audioSize: audio.length,
            })
            workerRef.current.postMessage(transcribeMessage)
        } else {
            setError('Worker is not initialized')
        }
    }, [])

    useEffect(() => {
        initializeModel()
    }, [initializeModel])

    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.onmessage = (
                event: MessageEvent<WorkerOutMessage>
            ) => {
                const message = event.data
                switch (message.type) {
                    case 'ready':
                        logger.log('Worker is ready')
                        setIsReady(true)
                        setIsLoading(false)
                        break
                    case 'update': {
                        const updateMessage = message as TranscriberUpdateData
                        const newTranscription = updateMessage.data[0]
                        logger.log('New transcription:', newTranscription)
                        setTranscription(
                            (prevTranscription) =>
                                prevTranscription + ' ' + newTranscription
                        )
                        chunksProcessed.current += 1
                        break
                    }
                    case 'complete': {
                        const completeMessage =
                            message as TranscriberCompleteData
                        const fullTranscription = completeMessage.data.text
                        logger.log('Full transcription:', fullTranscription)
                        setTranscription(fullTranscription)
                        setIsProcessing(false)
                        break
                    }
                    case 'error':
                        logger.error('Whisper worker error:', message.error)
                        setError(message.error)
                        setIsProcessing(false)
                        break
                    default:
                        break
                }
            }
        }
    }, [])

    const contextValue = useMemo(
        () => ({
            isReady,
            isLoading,
            isProcessing,
            progressItems,
            error,
            transcribe,
            transcription,
            chunksProcessed: chunksProcessed.current,
            setModel: (newModel: string) => {
                setModel(newModel)
                initializeModel()
            },
            setMultilingual: (newMultilingual: boolean) => {
                setMultilingual(newMultilingual)
                initializeModel()
            },
            setQuantized: (newQuantized: boolean) => {
                setQuantized(newQuantized)
                initializeModel()
            },
        }),
        [
            isReady,
            isLoading,
            isProcessing,
            progressItems,
            error,
            transcription,
            initializeModel,
        ]
    )

    return (
        <TranscriberContext.Provider value={contextValue}>
            {children}
        </TranscriberContext.Provider>
    )
}
