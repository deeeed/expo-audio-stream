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
const DEFAULT_ALGORITHM = 'rms'

const TAG = 'WebRecorder'

export class WebRecorder {
    private audioContext: AudioContext
    private audioWorkletNode!: AudioWorkletNode
    private featureExtractorWorker?: Worker
    private source: MediaStreamAudioSourceNode
    private audioWorkletUrl: string
    private emitAudioEventCallback: EmitAudioEventFunction
    private emitAudioAnalysisCallback: EmitAudioAnalysisFunction
    private config: RecordingConfig
    private position: number // Track the cumulative position
    private numberOfChannels: number // Number of audio channels
    private bitDepth: number // Bit depth of the audio
    private exportBitDepth: number // Bit depth of the audio
    private audioBuffer: Float32Array // Single buffer to store the audio data
    private audioBufferSize: number // Keep track of the buffer size
    private audioAnalysisData: AudioAnalysis // Keep updating the full audio analysis data with latest events
    private packetCount: number = 0
    private logger?: ConsoleLike
    private compressedMediaRecorder: MediaRecorder | null = null
    private compressedChunks: Blob[] = []
    private compressedSize: number = 0
    private pendingCompressedChunk: Blob | null = null

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
        this.position = 0
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

        // Initialize the audio buffer separately
        this.audioBuffer = new Float32Array(0)
        this.audioBufferSize = 0

        this.audioAnalysisData = {
            amplitudeRange: { min: 0, max: 0 },
            dataPoints: [],
            durationMs: 0,
            samples: 0,
            amplitudeAlgorithm: recordingConfig.algorithm || DEFAULT_ALGORITHM,
            bitDepth: this.bitDepth,
            numberOfChannels: this.numberOfChannels,
            sampleRate: this.config.sampleRate || this.audioContext.sampleRate,
            pointsPerSecond:
                this.config.pointsPerSecond || DEFAULT_WEB_POINTS_PER_SECOND,
            speakerChanges: [],
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
                if (command !== 'newData') {
                    return
                }
                const pcmBufferFloat = event.data.recordedData

                if (!pcmBufferFloat) {
                    this.logger?.warn('Received empty audio buffer', event)
                    return
                }

                // Handle the audio blob (e.g., send it to the server or process it further)
                this.logger?.debug(
                    `Received audio blob from processor len:${pcmBufferFloat?.length}`,
                    event
                )
                // Concatenate the incoming Float32Array to the existing buffer
                const newBuffer = new Float32Array(
                    this.audioBufferSize + pcmBufferFloat.length
                )
                newBuffer.set(this.audioBuffer, 0)
                newBuffer.set(pcmBufferFloat, this.audioBufferSize)
                this.audioBuffer = newBuffer
                this.audioBufferSize += pcmBufferFloat.length

                const sampleRate =
                    event.data.sampleRate ?? this.audioContext.sampleRate
                const duration = pcmBufferFloat.length / sampleRate // Calculate duration of the current buffer

                let data: Float32Array
                if (this.packetCount === 0) {
                    // Initialize WAV header
                    const wavHeaderBuffer = writeWavHeader({
                        sampleRate: this.audioContext.sampleRate,
                        numChannels: this.numberOfChannels,
                        bitDepth: this.exportBitDepth,
                    })

                    // For the first packet, combine WAV header with audio data
                    const headerFloatArray = new Float32Array(wavHeaderBuffer)
                    data = new Float32Array(
                        headerFloatArray.length + this.audioBuffer.length
                    )
                    data.set(headerFloatArray, 0)
                    data.set(this.audioBuffer, headerFloatArray.length)
                } else {
                    // For subsequent packets, just send the new audio data
                    data = pcmBufferFloat
                }

                // Track the number of packets
                this.packetCount += 1

                // Prepare compression data if available
                let compressionData
                if (this.pendingCompressedChunk) {
                    compressionData = {
                        data: this.pendingCompressedChunk,
                        size: this.pendingCompressedChunk.size,
                        totalSize: this.compressedSize,
                        mimeType: 'audio/webm',
                        format: 'opus',
                        bitrate: this.config.compression?.bitrate ?? 128000,
                    }
                    this.pendingCompressedChunk = null
                }

                console.log(
                    `VERSUS uncompressed=${this.audioBufferSize} compressed=${compressionData?.size}`
                )
                this.emitAudioEventCallback({
                    data: pcmBufferFloat,
                    position: this.position,
                    compression: compressionData,
                })
                this.position += duration // Update position

                this.featureExtractorWorker?.postMessage(
                    {
                        command: 'process',
                        channelData: pcmBufferFloat,
                        sampleRate,
                        pointsPerSecond:
                            this.config.pointsPerSecond ||
                            DEFAULT_WEB_POINTS_PER_SECOND,
                        algorithm: this.config.algorithm || 'rms',
                        bitDepth: this.bitDepth,
                        fullAudioDurationMs: this.position * 1000,
                        numberOfChannels: this.numberOfChannels,
                        features: this.config.features,
                    },
                    []
                )
            }

            this.logger?.debug(
                `WebRecorder initialized -- recordSampleRate=${this.audioContext.sampleRate}`,
                this.config
            )
            this.audioWorkletNode.port.postMessage({
                command: 'init',
                recordSampleRate: this.audioContext.sampleRate, // Pass the original sample rate
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
            this.audioAnalysisData.speakerChanges?.push(
                ...(segmentResult.speakerChanges ?? [])
            )
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
        return new Promise((resolve, reject) => {
            try {
                if (this.audioWorkletNode) {
                    // this.source.disconnect(this.audioWorkletNode);
                    // this.audioWorkletNode.disconnect(this.audioContext.destination);
                    this.audioWorkletNode.port.postMessage({ command: 'stop' })

                    // Set a timeout to reject the promise if no message is received within 5 seconds
                    const timeout = setTimeout(() => {
                        this.audioWorkletNode.port.removeEventListener(
                            'message',
                            onMessage
                        )
                        reject(
                            new Error(
                                "Timeout error, audioWorkletNode didn't complete."
                            )
                        )
                    }, 5000)

                    // Listen for the recordedData message to confirm stopping
                    const onMessage = async (event: AudioWorkletEvent) => {
                        const command = event.data.command
                        if (command === 'recordedData') {
                            clearTimeout(timeout) // Clear the timeout

                            const rawPCMDataFull =
                                event.data.recordedData?.slice(0)

                            if (!rawPCMDataFull) {
                                reject(new Error('Failed to get recorded data'))
                                return
                            }

                            // Compute duration of the recorded data
                            const duration =
                                rawPCMDataFull.byteLength /
                                (this.audioContext.sampleRate *
                                    (this.exportBitDepth /
                                        this.numberOfChannels))
                            this.logger?.debug(
                                `Received recorded data -- Duration: ${duration} vs ${rawPCMDataFull.byteLength / this.audioContext.sampleRate} seconds`
                            )
                            this.logger?.debug(
                                `recordedData.length=${rawPCMDataFull.byteLength} vs transmittedData.length=${this.audioBufferSize}`
                            )

                            // Remove the event listener after receiving the final data
                            this.audioWorkletNode.port.removeEventListener(
                                'message',
                                onMessage
                            )

                            const convertedPCM = await convertPCMToFloat32({
                                buffer: rawPCMDataFull.buffer,
                                skipWavHeader: true,
                                bitDepth: this.exportBitDepth,
                            })

                            resolve({ pcmData: convertedPCM.pcmValues }) // Resolve the promise with the collected buffers
                        }
                    }
                    this.audioWorkletNode.port.addEventListener(
                        'message',
                        onMessage
                    )
                }

                // Stop all media stream tracks to stop the browser recording
                this.stopMediaStreamTracks()

                if (this.compressedMediaRecorder) {
                    this.compressedMediaRecorder.onstop = () => {
                        const compressedBlob = new Blob(this.compressedChunks, {
                            type: 'audio/webm;codecs=opus',
                        })
                        resolve({
                            pcmData: this.audioBuffer,
                            compressedBlob,
                        })
                    }
                    this.compressedMediaRecorder.stop()
                } else {
                    resolve({ pcmData: this.audioBuffer })
                }
            } catch (error) {
                reject(error)
            }
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
