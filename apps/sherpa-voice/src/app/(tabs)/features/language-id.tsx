import {
    ExpoAudioStreamModule,
    useAudioRecorder,
    type AudioDataEvent,
} from '@siteed/expo-audio-studio'
import type { LanguageIdModelConfig } from '@siteed/sherpa-onnx.rn'
import { LanguageId } from '@siteed/sherpa-onnx.rn'
import { Asset } from 'expo-asset'
import { useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { setAgenticPageState } from '../../../agentic-bridge'
import { InlineModelDownloader } from '../../../components/InlineModelDownloader'
import {
    AudioSelector,
    ModelSelector,
    PageContainer,
    ResultsBox,
    Section,
    StatusBlock,
    Text,
    ThemedButton,
    useTheme,
} from '../../../components/ui'
import {
    useLanguageIdModels,
    useLanguageIdModelWithConfig,
} from '../../../hooks/useModelWithConfig'
import { DEFAULT_LIVE_SAMPLE_RATE } from '../../../utils/constants'

interface AudioItem {
    id: string
    name: string
    localUri: string
    source: 'bundled'
}

const BUNDLED_AUDIO = [
    {
        id: '1',
        name: 'JFK Speech (EN)',
        module: require('@assets/audio/jfk.wav'),
    },
    {
        id: '2',
        name: 'English Sample',
        module: require('@assets/audio/en.wav'),
    },
]

export default function LanguageIdScreen() {
    const params = useLocalSearchParams<{ model?: string }>()
    const theme = useTheme()

    // Model state
    const [selectedModelId, setSelectedModelId] = useState<string | null>(
        params.model ?? null
    )
    const [initialized, setInitialized] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState('')

    // Audio items
    const [audioItems, setAudioItems] = useState<AudioItem[]>([])
    const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null)

    // Detection state
    const [detecting, setDetecting] = useState(false)
    const [detectedLanguage, setDetectedLanguage] = useState<string | null>(
        null
    )
    const [durationMs, setDurationMs] = useState<number | null>(null)

    // Live mic state
    const [isLiveMic, setIsLiveMic] = useState(false)
    const [liveChunks, setLiveChunks] = useState(0)
    const [liveLanguage, setLiveLanguage] = useState<string | null>(null)

    // Models
    const { downloadedModels } = useLanguageIdModels()
    const { languageIdConfig, localPath } = useLanguageIdModelWithConfig({
        modelId: selectedModelId,
    })

    // Audio recorder for live mic
    const recorder = useAudioRecorder()
    const recordingRef = useRef(false)
    const samplesBufferRef = useRef<number[]>([])

    // Load bundled audio files
    useEffect(() => {
        const loadAudio = async () => {
            const items: AudioItem[] = []
            for (const audio of BUNDLED_AUDIO) {
                try {
                    const [asset] = await Asset.loadAsync(audio.module)
                    const assetUri = asset?.localUri || asset?.uri
                    if (assetUri) {
                        const localUri = assetUri.replace('file://', '')
                        items.push({
                            id: audio.id,
                            name: audio.name,
                            localUri,
                            source: 'bundled',
                        })
                    }
                } catch (e) {
                    console.warn(`Failed to load ${audio.name}:`, e)
                }
            }
            setAudioItems(items)
            if (items.length > 0) setSelectedAudioId(items[0].id)
        }
        loadAudio()
    }, [])

    // Auto-select first model
    useEffect(() => {
        if (!selectedModelId && downloadedModels.length > 0) {
            setSelectedModelId(downloadedModels[0].metadata.id)
        }
    }, [selectedModelId, downloadedModels])

    // Agentic page state
    useEffect(() => {
        setAgenticPageState({
            selectedModelId,
            initialized,
            loading,
            detecting,
            isLiveMic,
            liveChunks,
            detectedLanguage,
            liveLanguage,
            durationMs,
            error,
            statusMessage,
            audioItemsCount: audioItems.length,
            selectedAudioId,
        })
    }, [
        selectedModelId,
        initialized,
        loading,
        detecting,
        isLiveMic,
        liveChunks,
        detectedLanguage,
        liveLanguage,
        durationMs,
        error,
        statusMessage,
        audioItems.length,
        selectedAudioId,
    ])

    // Initialize Language ID
    const handleInit = useCallback(async () => {
        if (!selectedModelId || !languageIdConfig || !localPath) {
            setError('No model selected or not downloaded')
            return
        }

        setLoading(true)
        setError(null)
        setStatusMessage('Initializing Language ID...')

        try {
            const config: LanguageIdModelConfig = {
                modelDir: localPath,
                ...languageIdConfig,
            }
            const result = await LanguageId.init(config)
            if (result.success) {
                setInitialized(true)
                setStatusMessage('Language ID initialized successfully')
            } else {
                setError(result.error || 'Init failed')
                setStatusMessage('')
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }, [selectedModelId, languageIdConfig, localPath])

    // Detect from file
    const handleDetectFromFile = useCallback(async () => {
        const selected = audioItems.find((a) => a.id === selectedAudioId)
        if (!selected || !initialized) return

        setDetecting(true)
        setError(null)
        setDetectedLanguage(null)
        setDurationMs(null)
        setStatusMessage(`Processing ${selected.name}...`)

        try {
            const result = await LanguageId.detectLanguageFromFile(
                selected.localUri
            )
            if (result.success) {
                setDetectedLanguage(result.language)
                setDurationMs(result.durationMs)
                setStatusMessage(
                    `Detected: ${result.language} (${result.durationMs}ms)`
                )
            } else {
                setError(result.error || 'Detection failed')
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setDetecting(false)
        }
    }, [audioItems, selectedAudioId, initialized])

    // Live mic start
    const handleStartMic = useCallback(async () => {
        if (!initialized) {
            setError('Language ID not initialized')
            return
        }
        setLiveChunks(0)
        setLiveLanguage(null)
        samplesBufferRef.current = []

        try {
            const permResult =
                await ExpoAudioStreamModule.requestPermissionsAsync()
            if (permResult.status !== 'granted') {
                setError('Microphone permission denied')
                return
            }

            recordingRef.current = true
            setIsLiveMic(true)
            setStatusMessage('Live mic active — collecting audio...')

            await recorder.startRecording({
                sampleRate: DEFAULT_LIVE_SAMPLE_RATE,
                channels: 1,
                encoding: 'pcm_32bit',
                interval: 100,
                streamFormat: 'float32',
                onAudioStream: async (event: AudioDataEvent) => {
                    if (!recordingRef.current) return
                    try {
                        if (!(event.data instanceof Float32Array)) {
                            console.warn('[LanguageId] Expected Float32Array but got', typeof event.data)
                            return
                        }
                        const samples = Array.from(event.data)
                        if (samples.length === 0) return
                        samplesBufferRef.current.push(...samples)
                        setLiveChunks((prev) => prev + 1)

                        // Detect every ~2 seconds (32000 samples at 16kHz)
                        if (samplesBufferRef.current.length >= 32000) {
                            const result = await LanguageId.detectLanguage(
                                DEFAULT_LIVE_SAMPLE_RATE,
                                samplesBufferRef.current
                            )
                            if (result.success) {
                                setLiveLanguage(result.language)
                                setStatusMessage(
                                    `Live: ${result.language} (${result.durationMs}ms)`
                                )
                            }
                            samplesBufferRef.current = []
                        }
                    } catch (e) {
                        console.warn(
                            '[LanguageId] Error processing audio chunk:',
                            e
                        )
                    }
                },
            })
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            setError(`Mic error: ${msg}`)
            recordingRef.current = false
            setIsLiveMic(false)
        }
    }, [initialized, recorder])

    const handleStopMic = useCallback(async () => {
        recordingRef.current = false
        try {
            // Process remaining buffered samples
            if (samplesBufferRef.current.length > 0) {
                const result = await LanguageId.detectLanguage(
                    DEFAULT_LIVE_SAMPLE_RATE,
                    samplesBufferRef.current
                )
                if (result.success) {
                    setLiveLanguage(result.language)
                }
                samplesBufferRef.current = []
            }
            await recorder.stopRecording()
        } catch (e) {
            console.warn('[LanguageId] Stop error:', e)
        }
        setIsLiveMic(false)
        setStatusMessage(`Live mic stopped. ${liveChunks} chunks processed.`)
    }, [recorder, liveChunks])

    // Release
    const handleRelease = useCallback(async () => {
        if (isLiveMic) {
            recordingRef.current = false
            await recorder.stopRecording()
            setIsLiveMic(false)
        }
        await LanguageId.release()
        setInitialized(false)
        setDetectedLanguage(null)
        setLiveLanguage(null)
        setStatusMessage('Language ID released')
    }, [isLiveMic, recorder])

    return (
        <PageContainer>
            {/* Model Selector */}
            <Section title="Model">
                {downloadedModels.length === 0 ? (
                    <InlineModelDownloader
                        modelType="language-id"
                        emptyLabel="No Language ID models downloaded."
                        onModelDownloaded={(modelId) =>
                            setSelectedModelId(modelId)
                        }
                    />
                ) : (
                    <ModelSelector
                        models={downloadedModels}
                        selectedId={selectedModelId}
                        onSelect={(id) => {
                            if (!initialized) setSelectedModelId(id)
                        }}
                        disabled={initialized}
                    />
                )}
            </Section>

            {/* Controls */}
            <Section>
                <View style={{ flexDirection: 'row', gap: theme.gap?.s ?? 8 }}>
                    {!initialized ? (
                        <ThemedButton
                            testID="langid-init-button"
                            label="Initialize"
                            onPress={handleInit}
                            disabled={!selectedModelId || loading}
                            loading={loading}
                            variant="primary"
                        />
                    ) : (
                        <ThemedButton
                            testID="langid-release-button"
                            label="Release"
                            onPress={handleRelease}
                            variant="danger"
                        />
                    )}
                </View>
            </Section>

            {/* Status */}
            <StatusBlock status={statusMessage} error={error} />

            {/* File-based detection */}
            {initialized && (
                <Section title="File Detection">
                    <AudioSelector
                        items={audioItems}
                        selectedId={selectedAudioId}
                        onSelect={setSelectedAudioId}
                        disabled={detecting}
                    />
                    <ThemedButton
                        testID="langid-detect-button"
                        label="Detect Language"
                        onPress={handleDetectFromFile}
                        disabled={detecting || !selectedAudioId}
                        loading={detecting}
                        variant="primary"
                    />

                    {detectedLanguage && (
                        <ResultsBox>
                            <Text variant="titleSmall">Detected Language:</Text>
                            <Text
                                variant="headlineMedium"
                                style={{
                                    color: '#00BCD4',
                                    textAlign: 'center',
                                    paddingVertical: 8,
                                    backgroundColor: '#e0f7fa',
                                    borderRadius: theme.roundness,
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold',
                                }}
                            >
                                {detectedLanguage}
                            </Text>
                            {durationMs != null && (
                                <Text
                                    variant="bodyMedium"
                                    style={{
                                        color: theme.colors.onSurfaceVariant,
                                    }}
                                >
                                    Processing time: {durationMs}ms
                                </Text>
                            )}
                        </ResultsBox>
                    )}
                </Section>
            )}

            {/* Live mic detection */}
            {initialized && (
                <Section title="Live Microphone">
                    <ThemedButton
                        testID="langid-livemic-button"
                        label={isLiveMic ? 'Stop Mic' : 'Start Mic'}
                        onPress={isLiveMic ? handleStopMic : handleStartMic}
                        variant={isLiveMic ? 'danger' : 'primary'}
                    />

                    {(isLiveMic || liveLanguage) && (
                        <View style={{ marginTop: theme.margin.s, gap: 4 }}>
                            {liveLanguage && (
                                <Text
                                    variant="headlineMedium"
                                    style={{
                                        color: '#00BCD4',
                                        textAlign: 'center',
                                        paddingVertical: 8,
                                        backgroundColor: '#e0f7fa',
                                        borderRadius: theme.roundness,
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {liveLanguage}
                                </Text>
                            )}
                            <Text
                                variant="bodyMedium"
                                style={{ color: theme.colors.onSurfaceVariant }}
                            >
                                Chunks: {liveChunks}
                            </Text>
                        </View>
                    )}
                </Section>
            )}
        </PageContainer>
    )
}
