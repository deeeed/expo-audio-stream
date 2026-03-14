import {
    convertPCMToFloat32,
    AudioStudioModule,
    useAudioRecorder,
    type AudioDataEvent,
} from '@siteed/audio-studio'
import type { SpeechSegment, VadModelConfig } from '@siteed/sherpa-onnx.rn'
import { VAD } from '@siteed/sherpa-onnx.rn'
import { Asset } from 'expo-asset'
import { useLocalSearchParams } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { makeWebProgressHandler, getWebModelBaseUrl } from '../../../utils/webModelUtils'
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
    useVadModels,
    useVadModelWithConfig,
} from '../../../hooks/useModelWithConfig'
import {
    DEFAULT_LIVE_SAMPLE_RATE,
    DEFAULT_VAD_WINDOW_SIZE,
} from '../../../utils/constants'
import { readFileAsArrayBuffer } from '../../../utils/fileUtils'

interface AudioItem {
    id: string
    name: string
    localUri: string
    source: 'bundled'
}

const BUNDLED_AUDIO = [
    { id: '1', name: 'JFK Speech', module: require('@assets/audio/jfk.wav') },
    {
        id: '2',
        name: 'English Sample',
        module: require('@assets/audio/en.wav'),
    },
]

export default function VadScreen() {
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
    const [segments, setSegments] = useState<SpeechSegment[]>([])
    const [isSpeechDetected, setIsSpeechDetected] = useState(false)

    // Live mic state
    const [isLiveMic, setIsLiveMic] = useState(false)
    const [liveChunks, setLiveChunks] = useState(0)
    const [liveSegments, setLiveSegments] = useState<SpeechSegment[]>([])
    const [liveSpeechDetected, setLiveSpeechDetected] = useState(false)

    // Models
    const { downloadedModels } = useVadModels()
    const { vadConfig, localPath } = useVadModelWithConfig({
        modelId: selectedModelId,
    })

    // Audio recorder for live mic (same pattern as KWS)
    const recorder = useAudioRecorder()
    const recordingRef = useRef(false)

    // Load bundled audio files
    useEffect(() => {
        const loadAudio = async () => {
            const items: AudioItem[] = []
            for (const audio of BUNDLED_AUDIO) {
                try {
                    const [asset] = await Asset.loadAsync(audio.module)
                    const uri = asset?.localUri || asset?.uri
                    if (uri) {
                        const localUri = uri.replace('file://', '')
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
            segmentsCount: segments.length,
            segments: segments.map((s) => ({
                start: s.startTime,
                end: s.endTime,
            })),
            liveSegmentsCount: liveSegments.length,
            liveSegments: liveSegments.map((s) => ({
                start: s.startTime,
                end: s.endTime,
            })),
            isSpeechDetected,
            liveSpeechDetected,
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
        segments,
        liveSegments,
        isSpeechDetected,
        liveSpeechDetected,
        error,
        audioItems,
        selectedAudioId,
        statusMessage,
    ])

    // Initialize VAD
    const handleInit = useCallback(async () => {
        if (!selectedModelId || !vadConfig || !localPath) {
            setError('No model selected or not downloaded')
            return
        }

        setLoading(true)
        setError(null)
        setStatusMessage('Initializing VAD...')

        try {
            const config: VadModelConfig = {
                modelDir: localPath,
                ...vadConfig,
                modelBaseUrl: getWebModelBaseUrl('vad'),
                onProgress: makeWebProgressHandler(setStatusMessage),
            }
            const result = await VAD.init(config)
            if (result.success) {
                setInitialized(true)
                setStatusMessage('VAD initialized successfully')
            } else {
                setError(result.error || 'Init failed')
                setStatusMessage('')
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }, [selectedModelId, vadConfig, localPath])

    // Detect from file
    const handleDetectFromFile = useCallback(async () => {
        const selected = audioItems.find((a) => a.id === selectedAudioId)
        if (!selected || !initialized) return

        setDetecting(true)
        setError(null)
        setSegments([])
        setIsSpeechDetected(false)
        setStatusMessage(`Processing ${selected.name}...`)

        try {
            const arrayBuffer = await readFileAsArrayBuffer(selected.localUri)

            // Parse WAV header for sample rate
            const dataView = new DataView(arrayBuffer)
            const sampleRate = dataView.getUint32(24, true)
            const bitsPerSample = dataView.getUint16(34, true)

            // Convert to float32 (handles WAV header internally)
            const { pcmValues: float32 } = await convertPCMToFloat32({
                buffer: arrayBuffer,
                bitDepth: bitsPerSample,
            })

            // Feed in chunks matching the VAD window size
            const chunkSize = DEFAULT_VAD_WINDOW_SIZE
            const allSegments: SpeechSegment[] = []
            let speechDetected = false

            for (let offset = 0; offset < float32.length; offset += chunkSize) {
                const end = Math.min(offset + chunkSize, float32.length)
                const chunk = Array.from(float32.subarray(offset, end))

                // Pad last chunk to window size if needed
                while (chunk.length < chunkSize) {
                    chunk.push(0)
                }

                const result = await VAD.acceptWaveform(
                    DEFAULT_LIVE_SAMPLE_RATE,
                    chunk
                )
                if (result.success) {
                    if (result.isSpeechDetected) speechDetected = true
                    if (result.segments.length > 0) {
                        allSegments.push(...result.segments)
                    }
                }
            }

            setSegments(allSegments)
            setIsSpeechDetected(speechDetected)
            setStatusMessage(
                `Done. ${allSegments.length} segment(s) found, speech ${speechDetected ? 'detected' : 'not detected'}`
            )

            // Reset VAD for next detection
            await VAD.reset()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setDetecting(false)
        }
    }, [audioItems, selectedAudioId, initialized])

    // Live mic start (same pattern as KWS)
    const handleStartMic = useCallback(async () => {
        if (!initialized) {
            setError('VAD not initialized')
            return
        }
        setLiveChunks(0)
        setLiveSegments([])
        setLiveSpeechDetected(false)

        try {
            const permResult =
                await AudioStudioModule.requestPermissionsAsync()
            if (permResult.status !== 'granted') {
                setError('Microphone permission denied')
                return
            }

            recordingRef.current = true
            setIsLiveMic(true)
            setStatusMessage('Live mic active...')

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
                            console.warn('[VAD] Expected Float32Array but got', typeof event.data)
                            return
                        }
                        const samples = Array.from(event.data)
                        if (samples.length === 0) return
                        const result = await VAD.acceptWaveform(
                            DEFAULT_LIVE_SAMPLE_RATE,
                            samples
                        )
                        if (result.success) {
                            setLiveSpeechDetected(result.isSpeechDetected)
                            if (result.segments.length > 0) {
                                setLiveSegments((prev) => [
                                    ...prev,
                                    ...result.segments,
                                ])
                            }
                            setLiveChunks((prev) => prev + 1)
                        } else {
                            console.warn('[VAD] acceptWaveform failed:', result)
                        }
                    } catch (e) {
                        console.warn('[VAD] Error processing audio chunk:', e)
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
            await recorder.stopRecording()
        } catch (e) {
            console.warn('[VAD] Stop error:', e)
        }
        setIsLiveMic(false)
        setStatusMessage(
            `Live mic stopped. ${liveChunks} chunks, ${liveSegments.length} segments`
        )
        await VAD.reset()
    }, [recorder, liveChunks, liveSegments.length])

    // Release
    const handleRelease = useCallback(async () => {
        if (isLiveMic) {
            recordingRef.current = false
            await recorder.stopRecording()
            setIsLiveMic(false)
        }
        await VAD.release()
        setInitialized(false)
        setSegments([])
        setLiveSegments([])
        setStatusMessage('VAD released')
    }, [isLiveMic, recorder])

    return (
        <PageContainer>
            {/* Model Selector */}
            <Section title="Model">
                {downloadedModels.length === 0 ? (
                    <InlineModelDownloader
                        modelType="vad"
                        emptyLabel="No VAD models downloaded."
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
                            testID="vad-init-button"
                            label="Initialize"
                            onPress={handleInit}
                            disabled={!selectedModelId || loading}
                            loading={loading}
                            variant="primary"
                        />
                    ) : (
                        <ThemedButton
                            testID="vad-release-button"
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
                        testID="vad-detect-button"
                        label="Detect Speech"
                        onPress={handleDetectFromFile}
                        disabled={detecting || !selectedAudioId}
                        loading={detecting}
                        variant="primary"
                    />

                    {/* File detection results */}
                    {segments.length > 0 && (
                        <ResultsBox>
                            <Text variant="titleSmall">
                                Segments ({segments.length}):
                            </Text>
                            {segments.map((seg, i) => (
                                <Text
                                    key={i}
                                    variant="bodySmall"
                                    style={{
                                        color: theme.colors.onSurface,
                                        marginBottom: 2,
                                    }}
                                >
                                    {seg.startTime.toFixed(2)}s -{' '}
                                    {seg.endTime.toFixed(2)}s ({seg.duration}{' '}
                                    samples)
                                </Text>
                            ))}
                        </ResultsBox>
                    )}
                </Section>
            )}

            {/* Live mic detection */}
            {initialized && (
                <Section title="Live Microphone">
                    <ThemedButton
                        testID="vad-livemic-button"
                        label={isLiveMic ? 'Stop Mic' : 'Start Mic'}
                        onPress={isLiveMic ? handleStopMic : handleStartMic}
                        variant={isLiveMic ? 'danger' : 'primary'}
                    />

                    {isLiveMic && (
                        <View style={{ marginTop: theme.margin.s, gap: 4 }}>
                            <Text
                                variant="titleMedium"
                                style={{
                                    textAlign: 'center',
                                    paddingVertical: 8,
                                    borderRadius: theme.roundness,
                                    color: liveSpeechDetected
                                        ? '#00aa00'
                                        : theme.colors.onSurfaceVariant,
                                    backgroundColor: liveSpeechDetected
                                        ? '#e0ffe0'
                                        : theme.colors.surfaceVariant,
                                    fontWeight: 'bold',
                                }}
                            >
                                {liveSpeechDetected ? 'SPEECH' : 'SILENCE'}
                            </Text>
                            <Text
                                variant="bodyMedium"
                                style={{ color: theme.colors.onSurfaceVariant }}
                            >
                                Chunks: {liveChunks}
                            </Text>
                            <Text
                                variant="bodyMedium"
                                style={{ color: theme.colors.onSurfaceVariant }}
                            >
                                Segments: {liveSegments.length}
                            </Text>
                        </View>
                    )}

                    {liveSegments.length > 0 && (
                        <ResultsBox>
                            <Text variant="titleSmall">
                                Live Segments ({liveSegments.length}):
                            </Text>
                            {liveSegments.slice(-10).map((seg, i) => (
                                <Text
                                    key={i}
                                    variant="bodySmall"
                                    style={{
                                        color: theme.colors.onSurface,
                                        marginBottom: 2,
                                    }}
                                >
                                    {seg.startTime.toFixed(2)}s -{' '}
                                    {seg.endTime.toFixed(2)}s
                                </Text>
                            ))}
                            {liveSegments.length > 10 && (
                                <Text
                                    variant="bodyMedium"
                                    style={{
                                        color: theme.colors.onSurfaceVariant,
                                    }}
                                >
                                    ... and {liveSegments.length - 10} more
                                </Text>
                            )}
                        </ResultsBox>
                    )}
                </Section>
            )}
        </PageContainer>
    )
}
