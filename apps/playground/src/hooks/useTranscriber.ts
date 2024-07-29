import { Chunk, TranscriberData } from '@siteed/expo-audio-stream'
import { useCallback, useMemo, useRef, useState } from 'react'

import { useWorker } from './useWorker'
import { config } from '../config'

export interface ProgressItem {
    file: string
    loaded: number
    progress: number
    total: number
    name: string
    status: string
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

export interface Transcriber {
    onInputChange: () => void
    isBusy: boolean
    isModelLoading: boolean
    progressItems: ProgressItem[]
    start: (audioData: Float32Array | undefined) => void
    initialize: () => void
    output?: TranscriberData
    model: string
    setModel: (model: string) => void
    multilingual: boolean
    setMultilingual: (model: boolean) => void
    quantized: boolean
    setQuantized: (model: boolean) => void
    subtask: string
    setSubtask: (subtask: string) => void
    language?: string
    setLanguage: (language: string) => void
}

export function useTranscriber(): Transcriber {
    const [transcript, setTranscript] = useState<TranscriberData | undefined>(
        undefined
    )
    const [isBusy, setIsBusy] = useState(false)
    const [isModelLoading, setIsModelLoading] = useState(false)
    const [progressItems, setProgressItems] = useState<ProgressItem[]>([])
    const audioDataRef = useRef<Float32Array | null>(null)

    const webWorker = useWorker({
        url: config.whisperWorkerUrl,
        messageEventHandler: (event) => {
            const message = event.data
            switch (message.status) {
                case 'progress':
                    setProgressItems((prev) =>
                        prev.map((item) => {
                            if (item.file === message.file) {
                                return { ...item, progress: message.progress }
                            }
                            return item
                        })
                    )
                    break
                case 'update': {
                    const updateMessage = message as TranscriberUpdateData
                    setTranscript({
                        isBusy: true,
                        text: updateMessage.data[0],
                        chunks: updateMessage.data[1].chunks,
                    })
                    break
                }
                case 'complete': {
                    const completeMessage = message as TranscriberCompleteData
                    setTranscript({
                        isBusy: false,
                        text: completeMessage.data.text,
                        chunks: completeMessage.data.chunks,
                    })
                    setIsBusy(false)
                    break
                }
                case 'initiate':
                    setIsModelLoading(true)
                    setProgressItems((prev) => [...prev, message])
                    break
                case 'ready':
                    setIsModelLoading(false)
                    break
                case 'error':
                    setIsBusy(false)
                    alert(
                        `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.\n\nIf this is not the case, please file a bug report.`
                    )
                    break
                case 'done':
                    setProgressItems((prev) =>
                        prev.filter((item) => item.file !== message.file)
                    )
                    break
                default:
                    break
            }
        },
    })

    const [model, setModel] = useState<string>(config.DEFAULT_MODEL)
    const [subtask, setSubtask] = useState<string>(config.DEFAULT_SUBTASK)
    const [quantized, setQuantized] = useState<boolean>(
        config.DEFAULT_QUANTIZED
    )
    const [multilingual, setMultilingual] = useState<boolean>(
        config.DEFAULT_MULTILINGUAL
    )
    const [language, setLanguage] = useState<string>(config.DEFAULT_LANGUAGE)

    const onInputChange = useCallback(() => {
        setTranscript(undefined)
    }, [])

    const initialize = useCallback(async () => {
        setIsModelLoading(true)
        webWorker.postMessage({
            type: 'initialize',
            model,
            quantized,
        })
    }, [webWorker, model, quantized])

    const postRequest = useCallback(
        async (audioData: Float32Array | undefined) => {
            if (audioData && audioData !== audioDataRef.current) {
                audioDataRef.current = audioData
                setTranscript(undefined)
                setIsBusy(true)

                webWorker.postMessage({
                    type: 'transcribe',
                    audio: audioData,
                    model,
                    multilingual,
                    quantized,
                    subtask: multilingual ? subtask : null,
                    language:
                        multilingual && language !== 'auto' ? language : null,
                })
            }
        },
        [webWorker, model, multilingual, quantized, subtask, language]
    )

    const transcriber = useMemo(() => {
        return {
            onInputChange,
            isBusy,
            isModelLoading,
            progressItems,
            start: postRequest,
            initialize,
            output: transcript,
            model,
            setModel,
            multilingual,
            setMultilingual,
            quantized,
            setQuantized,
            subtask,
            setSubtask,
            language,
            setLanguage,
        }
    }, [
        isBusy,
        isModelLoading,
        progressItems,
        postRequest,
        initialize,
        transcript,
        model,
        multilingual,
        quantized,
        subtask,
        language,
    ])

    return transcriber
}
