// src/WebRecorder.ts

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import { ConsoleLike, RecordingConfig } from './ExpoAudioStream.types'
import {
    EmitAudioAnalysisFunction,
    EmitAudioEventFunction,
} from './ExpoAudioStream.web'
import { convertPCMToFloat32 } from './utils/convertPCMToFloat32'
import { encodingToBitDepth } from './utils/encodingToBitDepth'
import { writeWavHeader } from './utils/writeWavHeader'
import { InlineFeaturesExtractor } from './workers/InlineFeaturesExtractor.web'
import { InlineAudioWebWorker } from './workers/inlineAudioWebWorker.web'

interface AudioWorkletEvent {
    data: {
        command: string
        recordedData?: Float32Array
        sampleRate?: number
    }
}

interface AudioFeaturesEvent {
    data: {
        command: string
        result: AudioAnalysis
    }
}

const DEFAULT_WEB_BITDEPTH = 32
const DEFAULT_WEB_POINTS_PER_SECOND = 10
const DEFAULT_WEB_INTERVAL = 500
const DEFAULT_WEB_NUMBER_OF_CHANNELS = 1

const TAG = 'WebRecorder'

const STOP_PERFORMANCE_MARKS = {
    STOP_INITIATED: 'stopInitiated',
    COMPRESSED_RECORDING_STOP: 'compressedRecordingStop',
    AUDIO_WORKLET_STOP: 'audioWorkletStop',
    CLEANUP: 'cleanup',
    TOTAL_STOP_TIME: 'totalStopTime',
} as const

export class WebRecorder {
    private audioContext: AudioContext
    private audioWorkletNode!: AudioWorkletNode
    private featureExtractorWorker?: Worker
    private source: MediaStreamAudioSourceNode
    private audioWorkletUrl: string
    private emitAudioEventCallback: EmitAudioEventFunction
    private emitAudioAnalysisCallback: EmitAudioAnalysisFunction
    private config: RecordingConfig
    private position: number = 0
    private numberOfChannels: number // Number of audio channels
    private bitDepth: number // Bit depth of the audio
    private exportBitDepth: number // Bit depth of the audio
    private audioAnalysisData: AudioAnalysis // Keep updating the full audio analysis data with latest events
    private packetCount: number = 0
    private logger?: ConsoleLike
    private compressedMediaRecorder: MediaRecorder | null = null
    private compressedChunks: Blob[] = []
    private compressedSize: number = 0
    private pendingCompressedChunk: Blob | null = null
    private readonly wavMimeType = 'audio/wav'

    constructor({
        audioContext,
        source,
        recordingConfig,
        audioWorkletUrl,
        emitAudioEventCallback,
        emitAudioAnalysisCallback,
        logger,
    }: {
        audioContext: AudioContext
        source: MediaStreamAudioSourceNode
        recordingConfig: RecordingConfig
        audioWorkletUrl: string
        emitAudioEventCallback: EmitAudioEventFunction
        emitAudioAnalysisCallback: EmitAudioAnalysisFunction
        logger?: ConsoleLike
    }) {
        this.audioContext = audioContext
        this.source = source
        this.audioWorkletUrl = audioWorkletUrl
        this.emitAudioEventCallback = emitAudioEventCallback
        this.emitAudioAnalysisCallback = emitAudioAnalysisCallback
        this.config = recordingConfig
        this.logger = logger

        const audioContextFormat = this.checkAudioContextFormat({
            sampleRate: this.audioContext.sampleRate,
        })
        this.logger?.debug('Initialized WebRecorder with config:', {
            sampleRate: audioContextFormat.sampleRate,
            bitDepth: audioContextFormat.bitDepth,
            numberOfChannels: audioContextFormat.numberOfChannels,
        })

        this.bitDepth = audioContextFormat.bitDepth
        this.numberOfChannels =
            audioContextFormat.numberOfChannels ||
            DEFAULT_WEB_NUMBER_OF_CHANNELS // Default to 1 if not available
        this.exportBitDepth =
            encodingToBitDepth({
                encoding: recordingConfig.encoding ?? 'pcm_32bit',
            }) ||
            audioContextFormat.bitDepth ||
            DEFAULT_WEB_BITDEPTH

        this.audioAnalysisData = {
            amplitudeRange: { min: 0, max: 0 },
            rmsRange: { min: 0, max: 0 },
            dataPoints: [],
            durationMs: 0,
            samples: 0,
            bitDepth: this.bitDepth,
            numberOfChannels: this.numberOfChannels,
            sampleRate: this.config.sampleRate || this.audioContext.sampleRate,
            segmentDurationMs: this.config.segmentDurationMs ?? 100, // Default to 100ms segments
        }

        if (recordingConfig.enableProcessing) {
            this.initFeatureExtractorWorker()
        }

        // Initialize compressed recording if enabled
        if (recordingConfig.compression?.enabled) {
            this.initializeCompressedRecorder()
        }
    }

    async init() {
        try {
            if (!this.audioWorkletUrl) {
                const blob = new Blob([InlineAudioWebWorker], {
                    type: 'application/javascript',
                })
                const url = URL.createObjectURL(blob)
                await this.audioContext.audioWorklet.addModule(url)
            } else {
                await this.audioContext.audioWorklet.addModule(
                    this.audioWorkletUrl
                )
            }
            this.audioWorkletNode = new AudioWorkletNode(
                this.audioContext,
                'recorder-processor'
            )

            this.audioWorkletNode.port.onmessage = async (
                event: AudioWorkletEvent
            ) => {
                const command = event.data.command
                if (command !== 'newData') return

                const pcmBufferFloat = event.data.recordedData
                if (!pcmBufferFloat) {
                    this.logger?.warn('Received empty audio buffer', event)
                    return
                }

                // Process data in smaller chunks and emit immediately
                const chunkSize = this.audioContext.sampleRate * 2 // Reduce to 2 seconds chunks
                const sampleRate =
                    event.data.sampleRate ?? this.audioContext.sampleRate
                const duration = pcmBufferFloat.length / sampleRate

                // Calculate bytes per sample based on bit depth
                const bytesPerSample = this.bitDepth / 8

                // Emit chunks without storing them
                for (let i = 0; i < pcmBufferFloat.length; i += chunkSize) {
                    const chunk = pcmBufferFloat.slice(i, i + chunkSize)
                    const chunkPosition = this.position + i / sampleRate

                    // Calculate byte positions and samples
                    const startPosition = Math.floor(i * bytesPerSample)
                    const endPosition = Math.floor(
                        (i + chunk.length) * bytesPerSample
                    )
                    const samples = chunk.length // Number of samples in this chunk

                    // Process features if enabled
                    if (
                        this.config.enableProcessing &&
                        this.featureExtractorWorker
                    ) {
                        this.featureExtractorWorker.postMessage({
                            command: 'process',
                            channelData: chunk,
                            sampleRate,
                            logger: this.logger,
                            segmentDurationMs:
                                this.config.segmentDurationMs ?? 100, // Default to 100ms
                            bitDepth: this.bitDepth,
                            fullAudioDurationMs: this.position * 1000,
                            numberOfChannels: this.numberOfChannels,
                            features: this.config.features,
                            intervalAnalysis: this.config.intervalAnalysis,
                            startPosition,
                            endPosition,
                            samples,
                        })
                    }

                    // Emit chunk immediately
                    this.emitAudioEventCallback({
                        data: chunk,
                        position: chunkPosition,
                        compression: this.pendingCompressedChunk
                            ? {
                                  data: this.pendingCompressedChunk,
                                  size: this.pendingCompressedChunk.size,
                                  totalSize: this.compressedSize,
                                  mimeType: 'audio/webm',
                                  format: 'opus',
                                  bitrate:
                                      this.config.compression?.bitrate ??
                                      128000,
                              }
                            : undefined,
                    })
                }

                this.position += duration
                this.pendingCompressedChunk = null
            }

            this.logger?.debug(
                `WebRecorder initialized -- recordSampleRate=${this.audioContext.sampleRate}`,
                this.config
            )
            this.audioWorkletNode.port.postMessage({
                command: 'init',
                recordSampleRate: this.audioContext.sampleRate,
                exportSampleRate:
                    this.config.sampleRate ?? this.audioContext.sampleRate,
                bitDepth: this.bitDepth,
                exportBitDepth: this.exportBitDepth,
                channels: this.numberOfChannels,
                interval: this.config.interval ?? DEFAULT_WEB_INTERVAL,
            })

            // Connect the source to the AudioWorkletNode and start recording
            this.source.connect(this.audioWorkletNode)
            this.audioWorkletNode.connect(this.audioContext.destination)
        } catch (error) {
            console.error(`[${TAG}] Failed to initialize WebRecorder`, error)
        }
    }

    initFeatureExtractorWorker(featuresExtratorUrl?: string) {
        try {
            if (featuresExtratorUrl) {
                // Initialize the feature extractor worker
                //TODO: create audio feature extractor from a Blob instead of url since we cannot include the url directly in the library
                // We keep the url during dev and use the blob in production.
                this.featureExtractorWorker = new Worker(
                    new URL(featuresExtratorUrl, window.location.href)
                )
                this.featureExtractorWorker.onmessage =
                    this.handleFeatureExtractorMessage.bind(this)
                this.featureExtractorWorker.onerror =
                    this.handleWorkerError.bind(this)
            } else {
                // Fallback to the inline worker if the URL is not provided
                this.initFallbackWorker()
            }
        } catch (error) {
            console.error(
                `[${TAG}] Failed to initialize feature extractor worker`,
                error
            )
            this.initFallbackWorker()
        }
    }

    initFallbackWorker() {
        try {
            const blob = new Blob([InlineFeaturesExtractor], {
                type: 'application/javascript',
            })
            const url = URL.createObjectURL(blob)
            this.featureExtractorWorker = new Worker(url)
            this.featureExtractorWorker.onmessage =
                this.handleFeatureExtractorMessage.bind(this)
            this.featureExtractorWorker.onerror = (error) => {
                console.error(`[${TAG}] Default Inline worker failed`, error)
            }
            this.logger?.log('Inline worker initialized successfully')
        } catch (error) {
            console.error(
                `[${TAG}] Failed to initialize Inline Feature Extractor worker`,
                error
            )
        }
    }

    handleWorkerError(error: ErrorEvent) {
        console.error(`[${TAG}] Feature extractor worker error:`, error)
    }

    handleFeatureExtractorMessage(event: AudioFeaturesEvent) {
        if (event.data.command === 'features') {
            const segmentResult = event.data.result

            // Merge the segment result with the full audio analysis data
            this.audioAnalysisData.dataPoints.push(...segmentResult.dataPoints)
            this.audioAnalysisData.durationMs = segmentResult.durationMs
            if (segmentResult.amplitudeRange) {
                this.audioAnalysisData.amplitudeRange = {
                    min: Math.min(
                        this.audioAnalysisData.amplitudeRange.min,
                        segmentResult.amplitudeRange.min
                    ),
                    max: Math.max(
                        this.audioAnalysisData.amplitudeRange.max,
                        segmentResult.amplitudeRange.max
                    ),
                }
            }
            // Handle the extracted features (e.g., emit an event or log them)
            this.logger?.debug('features event segmentResult', segmentResult)
            this.logger?.debug(
                `features event audioAnalysisData duration=${this.audioAnalysisData.durationMs}`,
                this.audioAnalysisData
            )
            this.emitAudioAnalysisCallback(segmentResult)
        }
    }

    start() {
        this.source.connect(this.audioWorkletNode)
        this.audioWorkletNode.connect(this.audioContext.destination)
        this.packetCount = 0

        if (this.compressedMediaRecorder) {
            this.compressedMediaRecorder.start(this.config.interval ?? 1000)
        }
    }

    async stop(): Promise<{ pcmData: Float32Array; compressedBlob?: Blob }> {
        try {
            if (this.compressedMediaRecorder) {
                this.compressedMediaRecorder.stop()
                return {
                    pcmData: new Float32Array(), // Return empty array since we're streaming
                    compressedBlob: new Blob(this.compressedChunks, {
                        type: 'audio/webm;codecs=opus',
                    }),
                }
            }
            return { pcmData: new Float32Array() }
        } finally {
            this.cleanup()
            // Reset the chunks array
            this.compressedChunks = []
            this.compressedSize = 0
            this.pendingCompressedChunk = null
        }
    }

    private cleanup() {
        if (this.audioContext) {
            this.audioContext.close()
        }
        if (this.audioWorkletNode) {
            this.audioWorkletNode.disconnect()
        }
        if (this.source) {
            this.source.disconnect()
        }
        this.stopMediaStreamTracks()
    }

    // Helper method to process recording stop
    private async processRecordingStop(): Promise<{
        pcmData: Float32Array
        compressedBlob?: Blob
    }> {
        const processStartTime = performance.now()
        this.logger?.debug('[Performance] Starting recording stop process')

        const [compressedData, workletData] = await Promise.all([
            this.stopCompressedRecording(),
            this.stopAudioWorklet(),
        ])

        this.logger?.debug(
            `[Performance] Recording stop process completed in ${performance.now() - processStartTime}ms`
        )
        return {
            pcmData:
                workletData ??
                new Float32Array(this.audioAnalysisData.dataPoints.length),
            compressedBlob: compressedData,
        }
    }

    // Helper method to stop compressed recording
    private stopCompressedRecording(): Promise<Blob | undefined> {
        const startTime = performance.now()
        this.logger?.debug(
            `[Performance][${STOP_PERFORMANCE_MARKS.COMPRESSED_RECORDING_STOP}] Starting compressed recording stop`
        )

        if (!this.compressedMediaRecorder) {
            this.logger?.debug('[Performance] No compressed recorder to stop')
            return Promise.resolve(undefined)
        }

        return new Promise((resolve) => {
            this.compressedMediaRecorder!.onstop = () => {
                const blob = new Blob(this.compressedChunks, {
                    type: 'audio/webm;codecs=opus',
                })
                this.logger?.debug(
                    `[Performance][${STOP_PERFORMANCE_MARKS.COMPRESSED_RECORDING_STOP}] Compressed recording stopped in ${performance.now() - startTime}ms, size: ${blob.size}`
                )
                resolve(blob)
            }
            this.compressedMediaRecorder!.stop()
        })
    }

    // Helper method to stop audio worklet
    private stopAudioWorklet(): Promise<Float32Array | undefined> {
        const startTime = performance.now()
        this.logger?.debug(
            `[Performance][${STOP_PERFORMANCE_MARKS.AUDIO_WORKLET_STOP}] Starting audio worklet stop`
        )

        if (!this.audioWorkletNode) {
            this.logger?.debug('[Performance] No audio worklet to stop')
            return Promise.resolve(undefined)
        }

        return new Promise((resolve) => {
            const onMessage = (event: AudioWorkletEvent) => {
                if (event.data.command === 'recordedData') {
                    this.audioWorkletNode?.port.removeEventListener(
                        'message',
                        onMessage
                    )
                    const rawPCMDataFull = event.data.recordedData?.slice(0)

                    if (!rawPCMDataFull) {
                        this.logger?.debug('[Performance] No PCM data received')
                        resolve(undefined)
                        return
                    }

                    if (this.exportBitDepth !== this.bitDepth) {
                        const conversionStart = performance.now()
                        convertPCMToFloat32({
                            buffer: rawPCMDataFull.buffer,
                            bitDepth: this.exportBitDepth,
                            skipWavHeader: true,
                            logger: this.logger,
                        }).then(({ pcmValues }) => {
                            this.logger?.debug(
                                `[Performance] PCM conversion completed in ${performance.now() - conversionStart}ms`
                            )
                            this.logger?.debug(
                                `[Performance][${STOP_PERFORMANCE_MARKS.AUDIO_WORKLET_STOP}] Audio worklet stopped in ${performance.now() - startTime}ms`
                            )
                            resolve(pcmValues)
                        })
                    } else {
                        this.logger?.debug(
                            `[Performance][${STOP_PERFORMANCE_MARKS.AUDIO_WORKLET_STOP}] Audio worklet stopped in ${performance.now() - startTime}ms`
                        )
                        resolve(rawPCMDataFull)
                    }
                }
            }

            this.audioWorkletNode.port.addEventListener('message', onMessage)
            this.audioWorkletNode.port.postMessage({ command: 'stop' })
        })
    }

    pause() {
        this.source.disconnect(this.audioWorkletNode) // Disconnect the source from the AudioWorkletNode
        this.audioWorkletNode.disconnect(this.audioContext.destination) // Disconnect the AudioWorkletNode from the destination
        this.audioWorkletNode.port.postMessage({ command: 'pause' })
        this.compressedMediaRecorder?.pause()
    }

    stopMediaStreamTracks() {
        // Stop all audio tracks to stop the recording icon
        const tracks = this.source.mediaStream.getTracks()
        tracks.forEach((track) => track.stop())
    }

    async playRecordedData({
        recordedData,
    }: {
        recordedData: ArrayBuffer
        mimeType?: string
    }) {
        try {
            // Create a WAV blob with proper headers
            const wavHeaderBuffer = writeWavHeader({
                buffer: recordedData,
                sampleRate: this.audioContext.sampleRate,
                numChannels: this.numberOfChannels,
                bitDepth: this.exportBitDepth,
            })

            const blob = new Blob([wavHeaderBuffer], { type: 'audio/wav' })
            const url = URL.createObjectURL(blob)
            const response = await fetch(url)
            const arrayBuffer = await response.arrayBuffer()

            // Decode the audio data
            const audioBuffer =
                await this.audioContext.decodeAudioData(arrayBuffer)

            // Create a buffer source node and play the audio
            const bufferSource = this.audioContext.createBufferSource()
            bufferSource.buffer = audioBuffer
            bufferSource.connect(this.audioContext.destination)
            bufferSource.start()
            this.logger?.debug('Playing recorded data', recordedData)

            // Clean up
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error(`[${TAG}] Failed to play recorded data:`, error)
        }
    }

    private checkAudioContextFormat({ sampleRate }: { sampleRate: number }) {
        // Create a silent AudioBuffer
        const frameCount = sampleRate * 1.0 // 1 second buffer
        const audioBuffer = this.audioContext.createBuffer(
            1,
            frameCount,
            sampleRate
        )

        // Check the format
        const channelData = audioBuffer.getChannelData(0)
        const bitDepth = channelData.BYTES_PER_ELEMENT * 8 // 4 bytes per element means 32-bit

        return {
            sampleRate: audioBuffer.sampleRate,
            bitDepth,
            numberOfChannels: audioBuffer.numberOfChannels,
        }
    }

    resume() {
        this.source.connect(this.audioWorkletNode)
        this.audioWorkletNode.connect(this.audioContext.destination)
        this.audioWorkletNode.port.postMessage({ command: 'resume' })
        this.compressedMediaRecorder?.resume()
    }

    private initializeCompressedRecorder() {
        try {
            const mimeType = 'audio/webm;codecs=opus'
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                this.logger?.warn(
                    'Opus compression not supported in this browser'
                )
                return
            }

            this.compressedMediaRecorder = new MediaRecorder(
                this.source.mediaStream,
                {
                    mimeType,
                    audioBitsPerSecond:
                        this.config.compression?.bitrate ?? 128000,
                }
            )

            this.compressedMediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.compressedChunks.push(event.data)
                    this.compressedSize += event.data.size
                    this.pendingCompressedChunk = event.data
                }
            }
        } catch (error) {
            this.logger?.error(
                'Failed to initialize compressed recorder:',
                error
            )
        }
    }
}
