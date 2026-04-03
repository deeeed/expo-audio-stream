import { Asset } from 'expo-asset'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform } from 'react-native'

import { baseLogger } from '../config'
import {
    ASR_BENCHMARK_MODELS,
    ASR_BENCHMARK_SAMPLES,
    type AsrBenchmarkMode,
    type AsrBenchmarkSample,
} from '../utils/asrBenchmarkModels'
import {
    getBenchmarkModelStatus,
    prepareBenchmarkModel,
    runBenchmarkFile,
    runBenchmarkSimulatedLive,
} from '../utils/asrBenchmarkRuntime'

const logger = baseLogger.extend('AsrBenchmark')

export interface AsrBenchmarkResult {
    commitCount?: number
    createdAt: number
    engine: 'moonshine' | 'whisper'
    error?: string
    firstCommitMs?: number
    firstPartialMs?: number
    initMs?: number
    mode: AsrBenchmarkMode
    modelId: string
    modelName: string
    notes?: string
    partialCount?: number
    recognizeMs?: number
    runtime: 'streaming' | 'offline'
    sampleName?: string
    sessionMs?: number
    transcript: string
}

interface BenchmarkModelStatus {
    downloaded: boolean
    localPath: string | null
}

const loggerPrefix = 'Benchmark'

function nowMs(): number {
    return Date.now()
}

async function loadBenchmarkSamples(): Promise<
    Array<AsrBenchmarkSample & { localUri: string }>
> {
    const loadedSamples: Array<AsrBenchmarkSample & { localUri: string }> = []

    for (const sample of ASR_BENCHMARK_SAMPLES) {
        const asset = Asset.fromModule(sample.module)
        await asset.downloadAsync()
        const localUri = asset.localUri || asset.uri
        if (!localUri) continue
        loadedSamples.push({
            ...sample,
            localUri,
        })
    }

    return loadedSamples
}

export function useAsrBenchmark() {
    const [mode, setMode] = useState<AsrBenchmarkMode>('sample')
    const [samples, setSamples] = useState<
        Array<AsrBenchmarkSample & { localUri: string }>
    >([])
    const [selectedModelId, setSelectedModelId] = useState<string>(
        ASR_BENCHMARK_MODELS[0]?.id ?? ''
    )
    const [selectedSampleId, setSelectedSampleId] = useState<string | null>(
        null
    )
    const [results, setResults] = useState<AsrBenchmarkResult[]>([])
    const [statusMessage, setStatusMessage] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)
    const [simulationIsRunning, setSimulationIsRunning] = useState(false)
    const [modelStatuses, setModelStatuses] = useState<
        Record<string, BenchmarkModelStatus>
    >({})
    const [simulatedInterimText, setSimulatedInterimText] = useState('')
    const [simulatedCommittedText, setSimulatedCommittedText] = useState('')

    const benchmarkModels = useMemo(
        () =>
            Platform.OS === 'web'
                ? ASR_BENCHMARK_MODELS.filter((model) => model.engine === 'moonshine')
                : ASR_BENCHMARK_MODELS,
        []
    )

    const selectedModel = useMemo(
        () =>
            benchmarkModels.find((model) => model.id === selectedModelId) ??
            null,
        [benchmarkModels, selectedModelId]
    )
    const selectedSample = useMemo(
        () => samples.find((sample) => sample.id === selectedSampleId) ?? null,
        [samples, selectedSampleId]
    )
    const selectedModelStatus = selectedModelId
        ? modelStatuses[selectedModelId] ?? {
              downloaded: false,
              localPath: null,
          }
        : { downloaded: false, localPath: null }

    const simulatedBenchmarkModels = useMemo(
        () => benchmarkModels.filter((model) => model.liveCapable),
        [benchmarkModels]
    )

    const refreshModelStatuses = useCallback(async () => {
        const nextStatuses: Record<string, BenchmarkModelStatus> = {}
        await Promise.all(
            benchmarkModels.map(async (model) => {
                nextStatuses[model.id] = await getBenchmarkModelStatus(model.id)
            })
        )
        setModelStatuses(nextStatuses)
    }, [benchmarkModels])

    useEffect(() => {
        void refreshModelStatuses()
    }, [refreshModelStatuses])

    useEffect(() => {
        void (async () => {
            try {
                const loaded = await loadBenchmarkSamples()
                setSamples(loaded)
            } catch (sampleError) {
                logger.warn(
                    `${loggerPrefix} failed to load benchmark samples: ${
                        sampleError instanceof Error
                            ? sampleError.message
                            : String(sampleError)
                    }`
                )
            }
        })()
    }, [])

    useEffect(() => {
        if (!selectedSampleId && samples.length > 0) {
            setSelectedSampleId(samples[0].id)
        }
    }, [samples, selectedSampleId])

    useEffect(() => {
        if (!selectedModelId && benchmarkModels.length > 0) {
            setSelectedModelId(benchmarkModels[0].id)
            return
        }
        if (
            selectedModelId &&
            !benchmarkModels.some((model) => model.id === selectedModelId)
        ) {
            setSelectedModelId(benchmarkModels[0]?.id ?? '')
        }
    }, [benchmarkModels, selectedModelId])

    useEffect(() => {
        if (mode !== 'simulated') return
        if (!selectedModelId) return
        if (
            !simulatedBenchmarkModels.some((model) => model.id === selectedModelId)
        ) {
            setSelectedModelId(simulatedBenchmarkModels[0]?.id ?? '')
        }
    }, [mode, selectedModelId, simulatedBenchmarkModels])

    const appendResult = useCallback((result: AsrBenchmarkResult) => {
        setResults((previous) => [result, ...previous])
    }, [])

    const clearSimulatedTranscript = useCallback(() => {
        setSimulatedCommittedText('')
        setSimulatedInterimText('')
    }, [])

    const prepareSelectedModel = useCallback(async () => {
        if (!selectedModel) {
            setError('Select a benchmark model first')
            return
        }

        setProcessing(true)
        setError(null)
        try {
            setStatusMessage(`Preparing ${selectedModel.name}...`)
            const status = await prepareBenchmarkModel(
                selectedModel.id,
                setStatusMessage
            )
            setModelStatuses((previous) => ({
                ...previous,
                [selectedModel.id]: status,
            }))
            setStatusMessage(`${selectedModel.name} is ready`)
        } catch (prepareError) {
            setError(
                prepareError instanceof Error
                    ? prepareError.message
                    : String(prepareError)
            )
        } finally {
            setProcessing(false)
        }
    }, [selectedModel])

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
            setStatusMessage(
                `Running ${selectedModel.name} on ${selectedSample.name}...`
            )
            const startedAt = nowMs()
            const result = await runBenchmarkFile(
                selectedModel.id,
                selectedSample.localUri,
                setStatusMessage
            )
            appendResult({
                createdAt: nowMs(),
                engine: selectedModel.engine,
                initMs: result.initMs,
                mode: 'sample',
                modelId: selectedModel.id,
                modelName: selectedModel.name,
                recognizeMs: result.recognizeMs,
                runtime:
                    selectedModel.engine === 'moonshine'
                        ? 'streaming'
                        : 'offline',
                sampleName: selectedSample.name,
                sessionMs: nowMs() - startedAt,
                transcript: result.transcript,
            })
            await refreshModelStatuses()
        } catch (runError) {
            const message =
                runError instanceof Error ? runError.message : String(runError)
            appendResult({
                createdAt: nowMs(),
                engine: selectedModel.engine,
                error: message,
                mode: 'sample',
                modelId: selectedModel.id,
                modelName: selectedModel.name,
                runtime:
                    selectedModel.engine === 'moonshine'
                        ? 'streaming'
                        : 'offline',
                sampleName: selectedSample.name,
                transcript: '',
            })
            setError(message)
        } finally {
            setStatusMessage('')
            setProcessing(false)
        }
    }, [appendResult, refreshModelStatuses, selectedModel, selectedSample])

    const runAllSampleBenchmarks = useCallback(async () => {
        if (!selectedSample) {
            setError('Select a sample audio file first')
            return
        }

        setProcessing(true)
        setError(null)
        try {
            for (const model of benchmarkModels) {
                setStatusMessage(`Running ${model.name} on ${selectedSample.name}...`)
                const startedAt = nowMs()
                try {
                    const result = await runBenchmarkFile(
                        model.id,
                        selectedSample.localUri,
                        setStatusMessage
                    )
                    appendResult({
                        createdAt: nowMs(),
                        engine: model.engine,
                        initMs: result.initMs,
                        mode: 'sample',
                        modelId: model.id,
                        modelName: model.name,
                        recognizeMs: result.recognizeMs,
                        runtime:
                            model.engine === 'moonshine'
                                ? 'streaming'
                                : 'offline',
                        sampleName: selectedSample.name,
                        sessionMs: nowMs() - startedAt,
                        transcript: result.transcript,
                    })
                } catch (runError) {
                    appendResult({
                        createdAt: nowMs(),
                        engine: model.engine,
                        error:
                            runError instanceof Error
                                ? runError.message
                                : String(runError),
                        mode: 'sample',
                        modelId: model.id,
                        modelName: model.name,
                        runtime:
                            model.engine === 'moonshine'
                                ? 'streaming'
                                : 'offline',
                        sampleName: selectedSample.name,
                        transcript: '',
                    })
                }
            }
            await refreshModelStatuses()
        } finally {
            setStatusMessage('')
            setProcessing(false)
        }
    }, [appendResult, benchmarkModels, refreshModelStatuses, selectedSample])

    const runSelectedSimulatedBenchmark = useCallback(async () => {
        if (!selectedModel) {
            setError('Select a benchmark model first')
            return
        }
        if (!selectedModel.liveCapable) {
            setError('Selected model does not support simulated live transcription')
            return
        }
        if (!selectedSample) {
            setError('Select a sample audio file first')
            return
        }

        setProcessing(true)
        setSimulationIsRunning(true)
        setError(null)
        clearSimulatedTranscript()

        try {
            const startedAt = nowMs()
            setStatusMessage(
                `Running simulated live benchmark for ${selectedModel.name} on ${selectedSample.name}...`
            )
            const result = await runBenchmarkSimulatedLive(
                selectedModel.id,
                selectedSample.localUri,
                {
                    onCommit: setSimulatedCommittedText,
                    onInterimUpdate: setSimulatedInterimText,
                    onStatus: setStatusMessage,
                }
            )

            appendResult({
                commitCount: result.commitCount,
                createdAt: nowMs(),
                engine: selectedModel.engine,
                firstCommitMs: result.firstCommitMs,
                firstPartialMs: result.firstPartialMs,
                initMs: result.initMs,
                mode: 'simulated',
                modelId: selectedModel.id,
                modelName: selectedModel.name,
                partialCount: result.partialCount,
                runtime: 'streaming',
                sampleName: selectedSample.name,
                sessionMs: result.sessionMs || nowMs() - startedAt,
                transcript: result.transcript,
            })
            await refreshModelStatuses()
        } catch (runError) {
            const message =
                runError instanceof Error ? runError.message : String(runError)
            appendResult({
                createdAt: nowMs(),
                engine: selectedModel.engine,
                error: message,
                mode: 'simulated',
                modelId: selectedModel.id,
                modelName: selectedModel.name,
                runtime: 'streaming',
                sampleName: selectedSample.name,
                transcript: '',
            })
            setError(message)
        } finally {
            setSimulationIsRunning(false)
            setStatusMessage('')
            setProcessing(false)
        }
    }, [
        appendResult,
        clearSimulatedTranscript,
        refreshModelStatuses,
        selectedModel,
        selectedSample,
    ])

    const clearResults = useCallback(() => {
        clearSimulatedTranscript()
        setResults([])
        setError(null)
        setStatusMessage('')
    }, [clearSimulatedTranscript])

    return {
        benchmarkModels,
        clearResults,
        error,
        mode,
        modelStatuses,
        prepareSelectedModel,
        processing,
        results,
        runAllSampleBenchmarks,
        runSelectedSampleBenchmark,
        runSelectedSimulatedBenchmark,
        samples,
        selectedModel,
        selectedModelId,
        selectedModelStatus,
        selectedSample,
        selectedSampleId,
        setMode,
        setSelectedModelId,
        setSelectedSampleId,
        simulatedBenchmarkModels,
        simulatedCommittedText,
        simulatedInterimText,
        simulationIsRunning,
        statusMessage,
    }
}
