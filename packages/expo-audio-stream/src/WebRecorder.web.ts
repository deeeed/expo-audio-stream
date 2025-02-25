// packages/expo-audio-stream/src/WebRecorder.web.ts

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import { ConsoleLike, RecordingConfig } from './ExpoAudioStream.types'
import {
    EmitAudioAnalysisFunction,
    EmitAudioEventFunction,
} from './ExpoAudioStream.web'
import { encodingToBitDepth } from './utils/encodingToBitDepth'
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
const DEFAULT_SEGMENT_DURATION_MS = 100
const DEFAULT_WEB_INTERVAL = 500
const DEFAULT_WEB_NUMBER_OF_CHANNELS = 1

const TAG = 'WebRecorder'

export class WebRecorder {
    private audioContext: AudioContext
    private audioWorkletNode!: AudioWorkletNode
    private featureExtractorWorker?: Worker
    private source: MediaStreamAudioSourceNode
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
    private dataPointIdCounter: number = 0 // Add this property to track the counter

    /**
     * Initializes a new WebRecorder instance for audio recording and processing
     * @param audioContext - The AudioContext to use for recording
     * @param source - The MediaStreamAudioSourceNode providing the audio input
     * @param recordingConfig - Configuration options for the recording
     * @param emitAudioEventCallback - Callback function for audio data events
     * @param emitAudioAnalysisCallback - Callback function for audio analysis events
     * @param logger - Optional logger for debugging information
     */
    constructor({
        audioContext,
        source,
        recordingConfig,
        emitAudioEventCallback,
        emitAudioAnalysisCallback,
        logger,
    }: {
        audioContext: AudioContext
        source: MediaStreamAudioSourceNode
        recordingConfig: RecordingConfig
        emitAudioEventCallback: EmitAudioEventFunction
        emitAudioAnalysisCallback: EmitAudioAnalysisFunction
        logger?: ConsoleLike
    }) {
        this.audioContext = audioContext
        this.source = source
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
            segmentDurationMs:
                this.config.segmentDurationMs ?? DEFAULT_SEGMENT_DURATION_MS, // Default to 100ms segments
        }

        if (recordingConfig.enableProcessing) {
            this.initFeatureExtractorWorker()
        }

        // Initialize compressed recording if enabled
        if (recordingConfig.compression?.enabled) {
            this.initializeCompressedRecorder()
        }
    }

    /**
     * Initializes the audio worklet using an inline script
     * Creates and connects the audio processing pipeline
     */
    async init() {
        try {
            // Create and use inline audio worklet
            const blob = new Blob([InlineAudioWebWorker], {
                type: 'application/javascript',
            })
            const url = URL.createObjectURL(blob)
            await this.audioContext.audioWorklet.addModule(url)

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
                            segmentDurationMs:
                                this.config.segmentDurationMs ??
                                DEFAULT_SEGMENT_DURATION_MS, // Default to 100ms
                            bitDepth: this.bitDepth,
                            fullAudioDurationMs: chunkPosition * 1000,
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
                // enableLogging: !!this.logger,
            })

            // Connect the source to the AudioWorkletNode and start recording
            this.source.connect(this.audioWorkletNode)
            this.audioWorkletNode.connect(this.audioContext.destination)
        } catch (error) {
            console.error(`[${TAG}] Failed to initialize WebRecorder`, error)
        }
    }

    /**
     * Initializes the feature extractor worker for audio analysis
     * Creates an inline worker from a blob for audio feature extraction
     */
    initFeatureExtractorWorker() {
        try {
            const blob = new Blob([InlineFeaturesExtractor], {
                type: 'application/javascript',
            })
            const url = URL.createObjectURL(blob)
            this.featureExtractorWorker = new Worker(url)
            this.featureExtractorWorker.onmessage =
                this.handleFeatureExtractorMessage.bind(this)
            this.featureExtractorWorker.onerror = (error) => {
                console.error(`[${TAG}] Feature extractor worker error:`, error)
            }
            this.logger?.log(
                'Feature extractor worker initialized successfully'
            )
        } catch (error) {
            console.error(
                `[${TAG}] Failed to initialize feature extractor worker`,
                error
            )
        }
    }

    /**
     * Processes audio analysis results from the feature extractor worker
     * Updates the audio analysis data and emits events
     * @param event - The event containing audio analysis results
     */
    handleFeatureExtractorMessage(event: AudioFeaturesEvent) {
        if (event.data.command === 'features') {
            const segmentResult = event.data.result

            // Update the dataPointIdCounter based on the last ID received
            if (
                segmentResult.dataPoints &&
                segmentResult.dataPoints.length > 0
            ) {
                const lastDataPoint =
                    segmentResult.dataPoints[
                        segmentResult.dataPoints.length - 1
                    ]
                if (lastDataPoint && typeof lastDataPoint.id === 'number') {
                    this.dataPointIdCounter = Math.max(
                        this.dataPointIdCounter,
                        lastDataPoint.id + 1
                    )
                }
            }

            console.debug('[WebRecorder] Raw segment result:', {
                dataPointsLength: segmentResult.dataPoints.length,
                durationMs: segmentResult.durationMs,
                sampleRate: segmentResult.sampleRate,
                amplitudeRange: segmentResult.amplitudeRange,
            })

            // Ensure consistent sample rate in the result
            segmentResult.sampleRate =
                this.config.sampleRate || this.audioContext.sampleRate

            // Update the full audio analysis data with proper range merging
            this.audioAnalysisData.dataPoints.push(...segmentResult.dataPoints)
            this.audioAnalysisData.durationMs += segmentResult.durationMs

            // Make sure the sample rate is consistent
            this.audioAnalysisData.sampleRate = segmentResult.sampleRate

            // Properly merge amplitude ranges
            if (segmentResult.amplitudeRange) {
                if (!this.audioAnalysisData.amplitudeRange) {
                    this.audioAnalysisData.amplitudeRange = {
                        ...segmentResult.amplitudeRange,
                    }
                } else {
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
            }

            // Properly merge RMS ranges
            if (segmentResult.rmsRange) {
                if (!this.audioAnalysisData.rmsRange) {
                    this.audioAnalysisData.rmsRange = {
                        ...segmentResult.rmsRange,
                    }
                } else {
                    this.audioAnalysisData.rmsRange = {
                        min: Math.min(
                            this.audioAnalysisData.rmsRange.min,
                            segmentResult.rmsRange.min
                        ),
                        max: Math.max(
                            this.audioAnalysisData.rmsRange.max,
                            segmentResult.rmsRange.max
                        ),
                    }
                }
            }

            this.logger?.debug('features event segmentResult', segmentResult)
            this.logger?.debug(
                `features event audioAnalysisData duration=${this.audioAnalysisData.durationMs}`,
                this.audioAnalysisData
            )
            this.emitAudioAnalysisCallback(segmentResult)

            console.debug('[WebRecorder] Updated audioAnalysisData:', {
                dataPointsLength: this.audioAnalysisData.dataPoints.length,
                durationMs: this.audioAnalysisData.durationMs,
                sampleRate: this.audioAnalysisData.sampleRate,
                amplitudeRange: this.audioAnalysisData.amplitudeRange,
            })
        }
    }

    /**
     * Resets the data point ID counter
     * Used when starting a new recording
     */
    resetDataPointCounter() {
        this.dataPointIdCounter = 0

        // Reset the counter in the worker
        if (this.featureExtractorWorker) {
            this.featureExtractorWorker.postMessage({
                command: 'resetCounter',
                startCounterFrom: 0,
            })
        }
    }

    /**
     * Starts the audio recording process
     * Connects the audio nodes and begins capturing audio data
     */
    start() {
        this.source.connect(this.audioWorkletNode)
        this.audioWorkletNode.connect(this.audioContext.destination)
        this.packetCount = 0

        // Reset the counter when starting a new recording
        this.resetDataPointCounter()

        if (this.compressedMediaRecorder) {
            this.compressedMediaRecorder.start(this.config.interval ?? 1000)
        }
    }

    /**
     * Stops the audio recording process and returns the recorded data
     * @returns Promise resolving to an object containing PCM data and optional compressed blob
     */
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

    /**
     * Cleans up resources when recording is stopped
     * Closes audio context and disconnects nodes
     */
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

    /**
     * Pauses the audio recording process
     * Disconnects audio nodes and pauses the media recorder
     */
    pause() {
        this.source.disconnect(this.audioWorkletNode) // Disconnect the source from the AudioWorkletNode
        this.audioWorkletNode.disconnect(this.audioContext.destination) // Disconnect the AudioWorkletNode from the destination
        this.audioWorkletNode.port.postMessage({ command: 'pause' })
        this.compressedMediaRecorder?.pause()
    }

    /**
     * Stops all media stream tracks to release hardware resources
     * Ensures recording indicators (like microphone icon) are turned off
     */
    stopMediaStreamTracks() {
        // Stop all audio tracks to stop the recording icon
        const tracks = this.source.mediaStream.getTracks()
        tracks.forEach((track) => track.stop())
    }

    /**
     * Determines the audio format capabilities of the current audio context
     * @param sampleRate - The sample rate to check
     * @returns Object containing format information (sample rate, bit depth, channels)
     */
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

    /**
     * Resumes a paused recording
     * Reconnects audio nodes and resumes the media recorder
     */
    resume() {
        this.source.connect(this.audioWorkletNode)
        this.audioWorkletNode.connect(this.audioContext.destination)
        this.audioWorkletNode.port.postMessage({ command: 'resume' })
        this.compressedMediaRecorder?.resume()
    }

    /**
     * Initializes the compressed media recorder if compression is enabled
     * Sets up event handlers for compressed audio data
     */
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

    /**
     * Processes features if enabled
     */
    processFeatures(
        chunk: Float32Array,
        sampleRate: number,
        chunkPosition: number,
        startPosition: number,
        endPosition: number,
        samples: number
    ) {
        if (this.config.enableProcessing && this.featureExtractorWorker) {
            this.featureExtractorWorker.postMessage({
                command: 'process',
                channelData: chunk,
                sampleRate,
                segmentDurationMs:
                    this.config.segmentDurationMs ??
                    DEFAULT_SEGMENT_DURATION_MS, // Default to 100ms
                bitDepth: this.bitDepth,
                fullAudioDurationMs: chunkPosition * 1000,
                numberOfChannels: this.numberOfChannels,
                features: this.config.features,
                intervalAnalysis: this.config.intervalAnalysis,
                startPosition,
                endPosition,
                samples,
                startCounterFrom: this.dataPointIdCounter, // Pass the current counter value
            })
        }
    }
}
