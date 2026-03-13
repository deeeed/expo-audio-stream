import type {
    ModelProvider,
    TtsGenerateResult,
    TtsInitResult,
    TtsModelConfig,
} from '@siteed/sherpa-onnx.rn'
import { TTS } from '@siteed/sherpa-onnx.rn'
import * as FileSystem from 'expo-file-system/legacy'
import { useEffect, useState } from 'react'
import { makeWebProgressHandler, getWebModelBaseUrl } from '../utils/webModelUtils'
import { useTtsModels, useTtsModelWithConfig } from './useModelWithConfig'
import { DEFAULT_NUM_THREADS } from '../utils/constants'
import { setAgenticPageState } from '../agentic-bridge'

export const TTS_DEFAULT_TEXT =
    "Hello, this is a test of the Sherpa Onnx TTS system. I hope you're having a great day!"

async function verifyFileExists(filePath: string): Promise<boolean> {
    try {
        const fileInfo = await FileSystem.getInfoAsync(filePath)
        return fileInfo.exists
    } catch {
        return false
    }
}

export function useTts() {
    const [text, setText] = useState(TTS_DEFAULT_TEXT)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

    const [ttsInitialized, setTtsInitialized] = useState(false)
    const [initResult, setInitResult] = useState<TtsInitResult | null>(null)
    const [ttsResult, setTtsResult] = useState<TtsGenerateResult | null>(null)
    const [speakerId, setSpeakerId] = useState(0)
    const [speakingRate, setSpeakingRate] = useState(1.0)
    const [numThreads, setNumThreads] = useState(DEFAULT_NUM_THREADS)
    const [debugMode, setDebugMode] = useState(false)
    const [provider, setProvider] = useState<ModelProvider>('cpu')
    const [autoPlay, setAutoPlay] = useState(true)

    const { downloadedModels } = useTtsModels()
    const { ttsConfig, localPath, isDownloaded } = useTtsModelWithConfig({
        modelId: selectedModelId,
    })

    // Agentic page state
    useEffect(() => {
        setAgenticPageState({
            selectedModelId,
            ttsInitialized,
            isLoading,
            errorMessage: errorMessage || null,
            statusMessage: statusMessage || null,
            speakerId,
            speakingRate,
            hasResult: !!ttsResult,
        })
    }, [
        selectedModelId,
        ttsInitialized,
        isLoading,
        errorMessage,
        statusMessage,
        speakerId,
        speakingRate,
        ttsResult,
    ])

    // Reset configuration when selected model changes
    useEffect(() => {
        if (ttsConfig) {
            setNumThreads(ttsConfig.numThreads ?? DEFAULT_NUM_THREADS)
            setDebugMode(ttsConfig.debug ?? false)
            setProvider(ttsConfig.provider ?? 'cpu')
            setSpeakerId(0)
            setSpeakingRate(1.0)
        }
    }, [selectedModelId, ttsConfig])

    // Auto-select the first downloaded model if none is selected
    useEffect(() => {
        if (downloadedModels.length > 0 && !selectedModelId) {
            setSelectedModelId(downloadedModels[0].metadata.id)
        }
    }, [downloadedModels, selectedModelId])

    const handleModelSelect = async (modelId: string) => {
        if (modelId === selectedModelId) return
        if (ttsInitialized) {
            try {
                await TTS.release()
                setTtsInitialized(false)
                setInitResult(null)
                setTtsResult(null)
            } catch (error) {
                setErrorMessage(
                    `Error releasing TTS: ${(error as Error).message}`
                )
            }
        }
        setSelectedModelId(modelId)
    }

    const handleInitTts = async () => {
        if (!selectedModelId) {
            setErrorMessage('Please select a model first')
            return
        }
        if (!ttsConfig || !localPath || !isDownloaded) {
            setErrorMessage(
                'Selected model is not valid or configuration not found.'
            )
            return
        }

        if (ttsInitialized) {
            try {
                await TTS.release()
            } catch (_) {}
            setTtsInitialized(false)
        }

        setIsLoading(true)
        setErrorMessage('')
        setStatusMessage('Initializing TTS...')

        try {
            const cleanLocalPath = localPath.replace('file://', '')

            const modelConfig: TtsModelConfig = {
                modelDir: cleanLocalPath,
                ttsModelType: ttsConfig.ttsModelType || 'vits',
                modelFile: ttsConfig.modelFile || '',
                tokensFile: ttsConfig.tokensFile || '',
                ...ttsConfig,
                numThreads,
                debug: debugMode,
                provider,
                modelBaseUrl: getWebModelBaseUrl('tts'),
                onProgress: makeWebProgressHandler(setStatusMessage),
            }

            const result = await TTS.initialize(modelConfig)
            setInitResult(result)
            setTtsInitialized(result.success)

            if (result.success) {
                setStatusMessage(
                    `TTS initialized successfully! Sample rate: ${result.sampleRate}Hz, Speakers: ${result.numSpeakers}`
                )
            } else {
                setErrorMessage(`TTS initialization failed: ${result.error}`)
            }
        } catch (error) {
            setErrorMessage(`TTS init error: ${(error as Error).message}`)
            setTtsInitialized(false)
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerateTts = async () => {
        if (!ttsInitialized) {
            setErrorMessage('TTS must be initialized first')
            return
        }
        if (!text.trim()) {
            setErrorMessage('Please enter text to speak')
            return
        }

        setIsLoading(true)
        setErrorMessage('')
        setStatusMessage('Generating speech...')

        try {
            const result = await TTS.generateSpeech(text, {
                speakerId,
                speakingRate,
                playAudio: autoPlay,
            })

            if (result.success || result.filePath) {
                setStatusMessage('Speech generated successfully!')

                if (result.filePath) {
                    const formattedPath = result.filePath.startsWith('file://')
                        ? result.filePath
                        : `file://${result.filePath}`

                    const fileExists = await verifyFileExists(formattedPath)

                    if (fileExists) {
                        setTtsResult(result)
                        if (!autoPlay) {
                            setStatusMessage(
                                'Audio ready. Use the play button to listen.'
                            )
                        }
                    } else {
                        setTtsResult({
                            success: false,
                            filePath: result.filePath,
                        })
                        setErrorMessage('Generated audio file not found.')
                    }
                } else if (autoPlay) {
                    setStatusMessage('Speech played successfully!')
                }
            } else {
                setErrorMessage('TTS generation failed')
            }
        } catch (error) {
            setErrorMessage(`TTS generation error: ${(error as Error).message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleStopTts = async () => {
        setStatusMessage('Stopping TTS...')
        try {
            const result = await TTS.stopSpeech()
            if (result.stopped) {
                setStatusMessage('TTS stopped successfully')
                setIsLoading(false)
            } else {
                setErrorMessage(
                    `Failed to stop TTS: ${result.message || 'Unknown error'}`
                )
            }
        } catch (error) {
            setErrorMessage(`Stop TTS error: ${(error as Error).message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handleReleaseTts = async () => {
        try {
            const result = await TTS.release()
            if (result.released) {
                setTtsInitialized(false)
                setInitResult(null)
                setTtsResult(null)
                setStatusMessage('TTS resources released')
            } else {
                setErrorMessage('Failed to release TTS resources')
            }
        } catch (error) {
            setErrorMessage(`Release TTS error: ${(error as Error).message}`)
        }
    }

    return {
        // State
        text,
        isLoading,
        errorMessage,
        statusMessage,
        selectedModelId,
        ttsInitialized,
        initResult,
        ttsResult,
        speakerId,
        speakingRate,
        numThreads,
        debugMode,
        provider,
        autoPlay,
        // Derived
        downloadedModels,
        ttsConfig,
        // Setters
        setText,
        setSpeakerId,
        setSpeakingRate,
        setNumThreads,
        setDebugMode,
        setProvider,
        setAutoPlay,
        // Handlers
        handleModelSelect,
        handleInitTts,
        handleGenerateTts,
        handleStopTts,
        handleReleaseTts,
    }
}
