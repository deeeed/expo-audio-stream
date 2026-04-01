import { ASR, type AsrModelConfig } from '@siteed/sherpa-onnx.rn'
import {
    AudioStudioModule,
    type AudioDataEvent,
    useAudioRecorder,
} from '@siteed/audio-studio'
import { Asset } from 'expo-asset'
import { Platform } from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { baseLogger } from '../config'
import type { ModelState } from '../contexts/ModelManagement/types'
import { DEFAULT_LIVE_SAMPLE_RATE } from '../utils/constants'
import { resolveModelDir } from '../utils/fileUtils'
import { SAMPLE_AUDIO_FILES } from '../utils/asrSamples'
import {
    ASR_BENCHMARK_MATRIX,
    ASR_BENCHMARK_MODEL_IDS,
    getAsrBenchmarkEntry,
    isAsrBenchmarkEntrySupportedOnPlatform,
} from '../utils/asrBenchmarkMatrix'
import { readMonoPcm16Wav } from '../utils/wav'
import { getWebModelBaseUrl, makeWebProgressHandler } from '../utils/webModelUtils'
import { getAsrModelConfigById } from './useModelConfig'
import { useAsrModels } from './useModelWithConfig'
import { useLiveAsr } from './useLiveAsr'

const logger = baseLogger.extend('AsrBenchmark')

export type BenchmarkMode = 'sample' | 'live'

export interface BenchmarkSample {
    id: string
    localUri: string
    module: number
    name: string
}

export interface AsrBenchmarkResult {
    createdAt: number
    error?: string
    firstCommitMs?: number
    firstPartialMs?: number
    initMs?: number
    mode: BenchmarkMode
    modelId: string
    modelName: string
    notes?: string
    partialCount?: number
    commitCount?: number
    recognizeMs?: number
    runtime: 'streaming' | 'offline'
    sampleName?: string
    sessionMs?: number
    transcript: string
}

interface LiveBenchmarkSession {
    commitCount: number
    firstCommitMs?: number
    firstPartialMs?: number
    initMs: number
    lastInterimText: string
    partialCount: number
    startedAt: number
}

function nowMs(): number {
    return Date.now()
}

function formatTranscript(
    committedText: string,
    trailingText?: string | null
): string {
    const parts = [committedText.trim(), trailingText?.trim() ?? ''].filter(
        Boolean
    )
    return parts.join(' ').trim()
}

function getOrderedBenchmarkModels(downloadedModels: ModelState[]): ModelState[] {
    const byId = new Map(downloadedModels.map((model) => [model.metadata.id, model]))
    return ASR_BENCHMARK_MODEL_IDS.map((id) => byId.get(id)).filter(
        (model): model is ModelState => Boolean(model)
    )
}

export function useAsrBenchmark() {
    const recorder = useAudioRecorder()
    const { downloadedModels } = useAsrModels()
    const [mode, setMode] = useState<BenchmarkMode>('sample')
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null)
    const [samples, setSamples] = useState<BenchmarkSample[]>([])
    const [results, setResults] = useState<AsrBenchmarkResult[]>([])
    const [error, setError] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState('')
    const [processing, setProcessing] = useState(false)
    const liveSessionRef = useRef<LiveBenchmarkSession | null>(null)
    const liveAsrRef = useRef<ReturnType<typeof useLiveAsr> | null>(null)
    const recorderRef = useRef(recorder)

    const liveAsr = useLiveAsr({
        onCommit: (text) => {
            const session = liveSessionRef.current
            if (!session || !text.trim()) return
            session.commitCount += 1
            if (session.firstCommitMs == null) {
                session.firstCommitMs = nowMs() - session.startedAt
            }
        },
        onError: (message) => {
            setError(message)
        },
        onInterimUpdate: (text) => {
            const session = liveSessionRef.current
            const trimmed = text.trim()
            if (!session || !trimmed || trimmed === session.lastInterimText) return
            session.lastInterimText = trimmed
            session.partialCount += 1
            if (session.firstPartialMs == null) {
                session.firstPartialMs = nowMs() - session.startedAt
            }
        },
    })

    useEffect(() => {
        liveAsrRef.current = liveAsr
    }, [liveAsr])

    useEffect(() => {
        recorderRef.current = recorder
    }, [recorder])

    const supportedBenchmarkEntries = useMemo(
        () =>
            ASR_BENCHMARK_MATRIX.filter((entry) =>
                isAsrBenchmarkEntrySupportedOnPlatform(entry)
            ),
        []
    )

    const benchmarkModels = useMemo(() => {
        const filtered = downloadedModels.filter((model) => {
            if (!ASR_BENCHMARK_MODEL_IDS.includes(model.metadata.id)) return false
            const entry = getAsrBenchmarkEntry(model.metadata.id)
            return entry ? isAsrBenchmarkEntrySupportedOnPlatform(entry) : true
        })
        return getOrderedBenchmarkModels(filtered)
    }, [downloadedModels])

    const liveBenchmarkModels = useMemo(
        () =>
            benchmarkModels.filter((model) => {
                const entry = getAsrBenchmarkEntry(model.metadata.id)
                return entry?.liveCapable
            }),
        [benchmarkModels]
    )

    const missingBenchmarkEntries = useMemo(() => {
        const downloadedIds = new Set(benchmarkModels.map((model) => model.metadata.id))
        return supportedBenchmarkEntries.filter(
            (entry) => !downloadedIds.has(entry.id)
        )
    }, [benchmarkModels, supportedBenchmarkEntries])

    const selectedModel = useMemo(
        () =>
            benchmarkModels.find((model) => model.metadata.id === selectedModelId) ??
            null,
        [benchmarkModels, selectedModelId]
    )

    const selectedSample = useMemo(
        () => samples.find((sample) => sample.id === selectedSampleId) ?? null,
        [samples, selectedSampleId]
    )

    useEffect(() => {
        if (!selectedModelId && benchmarkModels.length > 0) {
            setSelectedModelId(benchmarkModels[0].metadata.id)
        }
    }, [benchmarkModels, selectedModelId])

    useEffect(() => {
        if (
            selectedModelId &&
            benchmarkModels.length > 0 &&
            !benchmarkModels.some(
                (model) => model.metadata.id === selectedModelId
            )
        ) {
            setSelectedModelId(benchmarkModels[0].metadata.id)
        }
    }, [benchmarkModels, selectedModelId])

    useEffect(() => {
        if (!selectedSampleId && samples.length > 0) {
            setSelectedSampleId(samples[0].id)
        }
    }, [samples, selectedSampleId])

    useEffect(() => {
        if (
            mode === 'live' &&
            selectedModelId &&
            !liveBenchmarkModels.some((model) => model.metadata.id === selectedModelId)
        ) {
            setSelectedModelId(liveBenchmarkModels[0]?.metadata.id ?? null)
        }
    }, [liveBenchmarkModels, mode, selectedModelId])

    useEffect(() => {
        ;(async () => {
            const loadedSamples: BenchmarkSample[] = []
            for (const sample of SAMPLE_AUDIO_FILES) {
                try {
                    const asset = Asset.fromModule(sample.module)
                    await asset.downloadAsync()
                    const localUri = asset.localUri || asset.uri
                    if (localUri) {
                        loadedSamples.push({ ...sample, localUri })
                    }
                } catch (sampleError) {
                    logger.warn(
                        `Failed to load sample ${sample.name}: ${
                            sampleError instanceof Error
                                ? sampleError.message
                                : String(sampleError)
                        }`
                    )
                }
            }
            setSamples(loadedSamples)
        })()
    }, [])

    const appendResult = useCallback((result: AsrBenchmarkResult) => {
        setResults((previous) => [result, ...previous])
    }, [])

    const buildRuntimeConfig = useCallback(
        async (
            model: ModelState,
            overrides?: Partial<AsrModelConfig>
        ): Promise<AsrModelConfig> => {
            const baseConfig = getAsrModelConfigById(model.metadata.id)
            if (!baseConfig) {
                throw new Error(`Missing ASR config for ${model.metadata.name}`)
            }
            if (!model.localPath) {
                throw new Error(`Model ${model.metadata.name} is missing a local path`)
            }

            const modelDir = await resolveModelDir(model.localPath)
            return {
                modelDir,
                modelBaseUrl: getWebModelBaseUrl('asr'),
                onProgress: makeWebProgressHandler(setStatusMessage),
                modelType: baseConfig.modelType ?? 'transducer',
                numThreads: baseConfig.numThreads,
                decodingMethod: baseConfig.decodingMethod ?? 'greedy_search',
                maxActivePaths: baseConfig.maxActivePaths,
                streaming: baseConfig.streaming ?? false,
                debug: baseConfig.debug ?? false,
                provider: baseConfig.provider ?? 'cpu',
                modelFiles: baseConfig.modelFiles,
                language: baseConfig.language,
                task: baseConfig.task,
                useItn: baseConfig.useItn,
                srcLang: baseConfig.srcLang,
                tgtLang: baseConfig.tgtLang,
                usePnc: baseConfig.usePnc,
                ...overrides,
            }
        },
        []
    )

    const runSampleBenchmarkForModel = useCallback(
        async (model: ModelState, sample: BenchmarkSample): Promise<AsrBenchmarkResult> => {
            const runtime =
                getAsrBenchmarkEntry(model.metadata.id)?.liveCapable === true
                    ? 'streaming'
                    : 'offline'
            const startedAt = nowMs()
            let initFinishedAt = startedAt
            let transcript = ''

            try {
                setStatusMessage(`Initializing ${model.metadata.name}...`)
                await ASR.release().catch(() => {})
                const config = await buildRuntimeConfig(model)
                const initResult = await ASR.initialize(config)
                if (!initResult.success) {
                    throw new Error(initResult.error || 'ASR init failed')
                }
                initFinishedAt = nowMs()

                setStatusMessage(`Running ${model.metadata.name} on ${sample.name}...`)
                const recognizeStartedAt = nowMs()
                const recognizeResult = config.streaming
                    ? await (async () => {
                          const wav = await readMonoPcm16Wav(sample.localUri)
                          return ASR.recognizeFromSamples(
                              wav.sampleRate,
                              wav.samples
                          )
                      })()
                    : await ASR.recognizeFromFile(sample.localUri)
                if (!recognizeResult.success) {
                    throw new Error(recognizeResult.error || 'Recognition failed')
                }
                transcript = (recognizeResult.text || '').trim()

                return {
                    createdAt: nowMs(),
                    initMs: initFinishedAt - startedAt,
                    mode: 'sample',
                    modelId: model.metadata.id,
                    modelName: model.metadata.name,
                    recognizeMs: nowMs() - recognizeStartedAt,
                    runtime,
                    sampleName: sample.name,
                    sessionMs: nowMs() - startedAt,
                    transcript,
                }
            } catch (runError) {
                return {
                    createdAt: nowMs(),
                    error:
                        runError instanceof Error
                            ? runError.message
                            : String(runError),
                    initMs: initFinishedAt - startedAt,
                    mode: 'sample',
                    modelId: model.metadata.id,
                    modelName: model.metadata.name,
                    runtime,
                    sampleName: sample.name,
                    sessionMs: nowMs() - startedAt,
                    transcript,
                }
            } finally {
                await ASR.release().catch(() => {})
                setStatusMessage('')
            }
        },
        [buildRuntimeConfig]
    )

    const runSelectedSampleBenchmark = useCallback(async () => {
        if (!selectedModel) {
            setError('Select a benchmark model first')
            return
        }
        if (!selectedSample) {
            setError('Select a sample audio file first')
            return
        }

        setProcessing(true)
        setError(null)
        try {
            const result = await runSampleBenchmarkForModel(
                selectedModel,
                selectedSample
            )
            appendResult(result)
            if (result.error) {
                setError(result.error)
            }
        } finally {
            setProcessing(false)
        }
    }, [appendResult, runSampleBenchmarkForModel, selectedModel, selectedSample])

    const runAllSampleBenchmarks = useCallback(async () => {
        if (!selectedSample) {
            setError('Select a sample audio file first')
            return
        }
        if (benchmarkModels.length === 0) {
            setError('Download benchmark models before running the matrix')
            return
        }

        setProcessing(true)
        setError(null)
        try {
            for (const model of benchmarkModels) {
                const result = await runSampleBenchmarkForModel(model, selectedSample)
                appendResult(result)
            }
        } finally {
            setStatusMessage('')
            setProcessing(false)
        }
    }, [appendResult, benchmarkModels, runSampleBenchmarkForModel, selectedSample])

    const startLiveBenchmark = useCallback(async () => {
        if (!selectedModel) {
            setError('Select a live benchmark model first')
            return
        }
        const entry = getAsrBenchmarkEntry(selectedModel.metadata.id)
        if (!entry?.liveCapable) {
            setError('Selected model does not support live streaming')
            return
        }

        setProcessing(true)
        setError(null)
        liveAsr.clear()

        try {
            const permission = await AudioStudioModule.requestPermissionsAsync()
            if (permission.status !== 'granted') {
                throw new Error('Microphone permission denied')
            }

            await ASR.release().catch(() => {})
            setStatusMessage(`Initializing ${selectedModel.metadata.name}...`)
            const initStartedAt = nowMs()
            const config = await buildRuntimeConfig(selectedModel, {
                decodingMethod: 'greedy_search',
                streaming: true,
            })
            const initResult = await ASR.initialize(config)
            if (!initResult.success) {
                throw new Error(initResult.error || 'ASR init failed')
            }
            await ASR.createOnlineStream()
            const initMs = nowMs() - initStartedAt

            liveSessionRef.current = {
                commitCount: 0,
                firstCommitMs: undefined,
                firstPartialMs: undefined,
                initMs,
                lastInterimText: '',
                partialCount: 0,
                startedAt: nowMs(),
            }

            liveAsr.start()
            setStatusMessage(`Starting recorder for ${selectedModel.metadata.name}...`)
            await recorder.startRecording({
                sampleRate: DEFAULT_LIVE_SAMPLE_RATE,
                channels: 1,
                encoding: 'pcm_32bit',
                interval: 100,
                streamFormat: 'float32',
                onAudioStream: async (event: AudioDataEvent) => {
                    if (!(event.data instanceof Float32Array)) return
                    const samples = Array.from(event.data)
                    if (samples.length === 0) return
                    liveAsr.feedAudio(samples, DEFAULT_LIVE_SAMPLE_RATE)
                },
            })
            setStatusMessage(`Recording with ${selectedModel.metadata.name}...`)
        } catch (startError) {
            await ASR.release().catch(() => {})
            liveSessionRef.current = null
            liveAsr.stop()
            setError(
                startError instanceof Error
                    ? startError.message
                    : String(startError)
            )
        } finally {
            setProcessing(false)
        }
    }, [buildRuntimeConfig, liveAsr, recorder, selectedModel])

    const stopLiveBenchmark = useCallback(async () => {
        if (!selectedModel) return

        setProcessing(true)
        try {
            await recorder.stopRecording()
            liveAsr.stop()
            const trailingResult = await ASR.getResult().catch(() => ({
                text: '',
                timestamps: [],
                tokens: [],
            }))
            const transcript = formatTranscript(
                liveAsr.committedText,
                trailingResult.text || liveAsr.interimText
            )
            const session = liveSessionRef.current
            appendResult({
                commitCount: session?.commitCount ?? 0,
                createdAt: nowMs(),
                firstCommitMs: session?.firstCommitMs,
                firstPartialMs: session?.firstPartialMs,
                initMs: session?.initMs,
                mode: 'live',
                modelId: selectedModel.metadata.id,
                modelName: selectedModel.metadata.name,
                notes:
                    Platform.OS === 'web'
                        ? 'Web runs through WASM; compare against native results separately.'
                        : undefined,
                partialCount: session?.partialCount ?? 0,
                runtime: 'streaming',
                sessionMs: session ? nowMs() - session.startedAt : undefined,
                transcript,
            })
        } catch (stopError) {
            setError(
                stopError instanceof Error
                    ? stopError.message
                    : String(stopError)
            )
        } finally {
            liveSessionRef.current = null
            setStatusMessage('')
            await ASR.release().catch(() => {})
            setProcessing(false)
        }
    }, [
        appendResult,
        liveAsr,
        recorder,
        selectedModel,
    ])

    const clearResults = useCallback(() => {
        setResults([])
        setError(null)
    }, [])

    useEffect(() => {
        return () => {
            const currentRecorder = recorderRef.current
            const currentLiveAsr = liveAsrRef.current
            if (currentRecorder?.isRecording) {
                currentRecorder.stopRecording().catch(() => {})
            }
            currentLiveAsr?.stop()
            ASR.release().catch(() => {})
        }
    }, [])

    return {
        benchmarkModels,
        clearResults,
        error,
        liveAsr,
        liveBenchmarkModels,
        missingBenchmarkEntries,
        mode,
        processing,
        recorderDurationMs: recorder.durationMs,
        recorderIsRecording: recorder.isRecording,
        results,
        samples,
        selectedModel,
        selectedModelId,
        selectedSample,
        selectedSampleId,
        setMode,
        setSelectedModelId,
        setSelectedSampleId,
        startLiveBenchmark,
        statusMessage,
        stopLiveBenchmark,
        runAllSampleBenchmarks,
        runSelectedSampleBenchmark,
    }
}
