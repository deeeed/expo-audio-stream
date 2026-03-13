import { Diarization, DiarizationSegment } from '@siteed/sherpa-onnx.rn'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import { WEB_FEATURES } from '../config/webFeatures'
import { useModelManagement } from '../contexts/ModelManagement'
import {
    useModels,
    useSpeakerIdModelWithConfig,
    useSpeakerIdModels,
} from './useModelWithConfig'
import { DEFAULT_NUM_THREADS } from '../utils/constants'

const SAMPLE_AUDIO_FILES = [
    {
        id: '1',
        name: 'JFK Speech Extract',
        module: require('@assets/audio/jfk.wav'),
    },
    {
        id: '2',
        name: 'Random English Voice',
        module: require('@assets/audio/en.wav'),
    },
]

export type DiarizationAudioFile = {
    id: string
    name: string
    module: number
    localUri: string
}

export function useDiarization() {
    const [initialized, setInitialized] = useState(false)
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState('')

    const [selectedSegModelId, setSelectedSegModelId] = useState<string | null>(
        null
    )
    const [selectedEmbModelId, setSelectedEmbModelId] = useState<string | null>(
        null
    )

    const [numClusters, setNumClusters] = useState(-1)
    const [threshold, setThreshold] = useState(0.5)
    const [numThreads, setNumThreads] = useState(DEFAULT_NUM_THREADS)

    const [segments, setSegments] = useState<DiarizationSegment[]>([])
    const [numSpeakers, setNumSpeakers] = useState(0)
    const [processingDurationMs, setProcessingDurationMs] = useState(0)

    const [loadedAudioFiles, setLoadedAudioFiles] = useState<
        DiarizationAudioFile[]
    >([])
    const [selectedAudio, setSelectedAudio] =
        useState<DiarizationAudioFile | null>(null)

    const { downloadedModels: segModels } = useModels({
        modelType: 'diarization-segmentation',
    })
    const { downloadedModels: embModels } = useSpeakerIdModels()
    const { getModelState } = useModelManagement()
    const { speakerIdConfig } = useSpeakerIdModelWithConfig({
        modelId: selectedEmbModelId,
    })

    // Auto-select first available segmentation model
    useEffect(() => {
        if (segModels.length > 0 && !selectedSegModelId) {
            setSelectedSegModelId(segModels[0].metadata.id)
        }
    }, [segModels, selectedSegModelId])

    // Auto-select first available embedding model
    useEffect(() => {
        if (embModels.length > 0 && !selectedEmbModelId) {
            setSelectedEmbModelId(embModels[0].metadata.id)
        }
    }, [embModels, selectedEmbModelId])

    // Load sample audio assets on mount
    useEffect(() => {
        ;(async () => {
            try {
                const assets = SAMPLE_AUDIO_FILES.map((f) =>
                    Asset.fromModule(f.module)
                )
                await Promise.all(assets.map((a) => a.downloadAsync()))
                setLoadedAudioFiles(
                    SAMPLE_AUDIO_FILES.map((f, i) => ({
                        ...f,
                        localUri: assets[i].localUri || assets[i].uri || '',
                    }))
                )
            } catch (err) {
                console.error(
                    '[useDiarization] Failed to load audio assets:',
                    err
                )
            }
        })()
    }, [])

    // Cleanup on unmount
    const initializedRef = useRef(false)
    useEffect(() => {
        initializedRef.current = initialized
    }, [initialized])
    useEffect(() => {
        return () => {
            if (initializedRef.current) Diarization.release().catch(() => {})
        }
    }, [])

    const resolveModelDir = async (rawPath: string): Promise<string> => {
        let cleanPath = rawPath.replace(/^file:\/\//, '')
        try {
            const dirContents = await FileSystem.readDirectoryAsync(rawPath)
            const sherpaDir = dirContents.find(
                (item) =>
                    item.includes('sherpa-onnx') || item.includes('pyannote')
            )
            if (sherpaDir) {
                const subPath = `${rawPath}/${sherpaDir}`
                const subInfo = await FileSystem.getInfoAsync(subPath)
                if (subInfo.exists && subInfo.isDirectory) {
                    const subContents =
                        await FileSystem.readDirectoryAsync(subPath)
                    if (subContents.some((f) => f.endsWith('.onnx'))) {
                        cleanPath = cleanPath + '/' + sherpaDir
                    }
                }
            }
        } catch (_) {
            /* use original path */
        }
        return cleanPath
    }

    const handleInit = async () => {
        const segModelState = selectedSegModelId
            ? getModelState(selectedSegModelId)
            : undefined
        const embModelState = selectedEmbModelId
            ? getModelState(selectedEmbModelId)
            : undefined

        if (!segModelState?.localPath) {
            setError('Please download the segmentation model first')
            return
        }
        if (!embModelState?.localPath) {
            setError('Please download the embedding model first')
            return
        }

        if (initialized) {
            await Diarization.release().catch(() => {})
            setInitialized(false)
        }

        setLoading(true)
        setError(null)
        setStatusMessage('Initializing diarization...')

        try {
            const segModelDir = await resolveModelDir(segModelState.localPath)
            const cleanEmbPath = embModelState.localPath.replace(
                /^file:\/\//,
                ''
            )
            const modelFile = speakerIdConfig?.modelFile || 'model.onnx'
            const embeddingModelFile = `${cleanEmbPath}/${modelFile}`

            setStatusMessage(`Loading models...`)
            const result = await Diarization.init({
                segmentationModelDir: segModelDir,
                embeddingModelFile,
                numThreads,
                numClusters,
                threshold,
                modelBaseUrl:
                    Platform.OS === 'web'
                        ? WEB_FEATURES.diarization?.modelBaseUrl
                        : undefined,
                onProgress:
                    Platform.OS === 'web'
                        ? (info) => {
                              const mb = (info.loaded / 1048576).toFixed(1)
                              const totalMb = (info.total / 1048576).toFixed(1)
                              setStatusMessage(
                                  `Downloading ${info.filename}: ${mb}/${totalMb} MB (${info.percent}%)`
                              )
                          }
                        : undefined,
            })

            if (result.success) {
                setInitialized(true)
                setStatusMessage(
                    `Initialized (sample rate: ${result.sampleRate} Hz)`
                )
            } else {
                throw new Error(result.error || 'Initialization failed')
            }
        } catch (err) {
            setError(
                `Initialization error: ${err instanceof Error ? err.message : String(err)}`
            )
            setInitialized(false)
        } finally {
            setLoading(false)
        }
    }

    const handleProcessFile = async (audioFile: DiarizationAudioFile) => {
        if (!initialized) {
            setError('Initialize diarization first')
            return
        }

        setProcessing(true)
        setError(null)
        setSegments([])
        setNumSpeakers(0)
        setProcessingDurationMs(0)
        setStatusMessage('Processing audio...')

        try {
            const uri = audioFile.localUri.startsWith('http')
                ? audioFile.localUri
                : audioFile.localUri.startsWith('file://')
                  ? audioFile.localUri
                  : `file://${audioFile.localUri}`

            const result = await Diarization.processFile(
                uri,
                numClusters,
                threshold
            )
            if (result.success) {
                setSegments(result.segments)
                setNumSpeakers(result.numSpeakers)
                setProcessingDurationMs(result.durationMs)
                setStatusMessage(
                    `Found ${result.numSpeakers} speaker(s) in ${result.durationMs}ms`
                )
            } else {
                throw new Error(result.error || 'Processing failed')
            }
        } catch (err) {
            setError(
                `Processing error: ${err instanceof Error ? err.message : String(err)}`
            )
            setStatusMessage('')
        } finally {
            setProcessing(false)
        }
    }

    const handleRelease = async () => {
        if (!initialized) return
        setLoading(true)
        setStatusMessage('Releasing resources...')
        try {
            await Diarization.release()
            setInitialized(false)
            setSegments([])
            setNumSpeakers(0)
            setProcessingDurationMs(0)
            setStatusMessage('')
        } catch (err) {
            setError(
                `Release error: ${err instanceof Error ? err.message : String(err)}`
            )
        } finally {
            setLoading(false)
        }
    }

    const handleSelectAudio = (audioFile: DiarizationAudioFile) => {
        setSelectedAudio(audioFile)
        setSegments([])
        setNumSpeakers(0)
        setProcessingDurationMs(0)
        setError(null)
    }

    return {
        // State
        initialized,
        loading,
        processing,
        error,
        statusMessage,
        selectedSegModelId,
        selectedEmbModelId,
        numClusters,
        threshold,
        numThreads,
        segments,
        numSpeakers,
        processingDurationMs,
        loadedAudioFiles,
        selectedAudio,
        // Derived
        segModels,
        embModels,
        // Setters
        setSelectedSegModelId,
        setSelectedEmbModelId,
        setNumClusters,
        setThreshold,
        setNumThreads,
        // Handlers
        handleInit,
        handleRelease,
        handleSelectAudio,
        handleProcessFile,
    }
}
