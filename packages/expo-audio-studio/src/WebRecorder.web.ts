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
        position?: number
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
    public audioContext: AudioContext
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
    private logger?: ConsoleLike
    private compressedMediaRecorder: MediaRecorder | null = null
    private compressedChunks: Blob[] = []
    private compressedSize: number = 0
    private pendingCompressedChunk: Blob | null = null
    private dataPointIdCounter: number = 0 // Add this property to track the counter
    private deviceDisconnectionHandler: (() => void) | null = null
    private mediaStream: MediaStream | null = null
    private onInterruptionCallback?: (event: {
        reason: string
        isPaused: boolean
        timestamp: number
    }) => void
    private _isDeviceDisconnected: boolean = false

    /**
     * Flag to indicate whether this is the first audio chunk after a device switch
     * Used to maintain proper duration counting
     */
    public isFirstChunkAfterSwitch: boolean = false

    /**
     * Gets whether the recording device has been disconnected
     */
    get isDeviceDisconnected(): boolean {
        return this._isDeviceDisconnected
    }

    /**
     * Initializes a new WebRecorder instance for audio recording and processing
     * @param audioContext - The AudioContext to use for recording
     * @param source - The MediaStreamAudioSourceNode providing the audio input
     * @param recordingConfig - Configuration options for the recording
     * @param emitAudioEventCallback - Callback function for audio data events
     * @param emitAudioAnalysisCallback - Callback function for audio analysis events
     * @param onInterruption - Callback for recording interruptions
     * @param logger - Optional logger for debugging information
     */
    constructor({
        audioContext,
        source,
        recordingConfig,
        emitAudioEventCallback,
        emitAudioAnalysisCallback,
        onInterruption,
        logger,
    }: {
        audioContext: AudioContext
        source: MediaStreamAudioSourceNode
        recordingConfig: RecordingConfig
        emitAudioEventCallback: EmitAudioEventFunction
        emitAudioAnalysisCallback: EmitAudioAnalysisFunction
        onInterruption?: (event: {
            reason: string
            isPaused: boolean
            timestamp: number
        }) => void
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

        this.mediaStream = source.mediaStream
        this.onInterruptionCallback = onInterruption

        // Setup device disconnection detection
        this.setupDeviceDisconnectionDetection()
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

                // Use incoming position if provided by worklet, otherwise use our tracked position
                const incomingPosition =
                    typeof event.data.position === 'number'
                        ? event.data.position
                        : this.position

                // Calculate bytes per sample based on bit depth
                const bytesPerSample = this.bitDepth / 8

                // Emit chunks without storing them
                for (let i = 0; i < pcmBufferFloat.length; i += chunkSize) {
                    const chunk = pcmBufferFloat.slice(i, i + chunkSize)
                    const chunkPosition = incomingPosition + i / sampleRate

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

                // Update our position based on the worklet's position if provided
                this.position = incomingPosition + duration
                this.pendingCompressedChunk = null
            }

            this.logger?.debug(
                `WebRecorder initialized -- recordSampleRate=${this.audioContext.sampleRate}, startPosition=${this.position}`,
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
                position: this.position, // Pass the current position to the processor
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

            // Initialize worker with counter if needed
            if (this.dataPointIdCounter > 0) {
                this.featureExtractorWorker.postMessage({
                    command: 'resetCounter',
                    value: this.dataPointIdCounter,
                })
                this.logger?.debug(
                    `Initialized worker with counter value ${this.dataPointIdCounter}`
                )
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

            // Track existing IDs to prevent duplicates
            const existingIds = new Set(
                this.audioAnalysisData.dataPoints.map((dp) => dp.id)
            )

            // Filter out datapoints with duplicate IDs
            const uniqueNewDataPoints = segmentResult.dataPoints.filter(
                (dp) => {
                    return !existingIds.has(dp.id)
                }
            )

            // Log filtered duplicates if any
            if (
                uniqueNewDataPoints.length < segmentResult.dataPoints.length &&
                this.logger?.warn
            ) {
                this.logger.warn(
                    `Filtered ${segmentResult.dataPoints.length - uniqueNewDataPoints.length} duplicate datapoints`
                )
            }

            // Update counter based on the highest ID seen
            if (uniqueNewDataPoints.length > 0) {
                const lastDataPoint =
                    uniqueNewDataPoints[uniqueNewDataPoints.length - 1]

                if (lastDataPoint && typeof lastDataPoint.id === 'number') {
                    const nextIdValue = lastDataPoint.id + 1

                    if (nextIdValue > this.dataPointIdCounter) {
                        this.dataPointIdCounter = nextIdValue
                        this.logger?.debug(
                            `Counter updated to ${this.dataPointIdCounter}`
                        )
                    }
                }
            }

            // Add unique data points to our analysis data
            this.audioAnalysisData.dataPoints.push(...uniqueNewDataPoints)
            this.audioAnalysisData.durationMs += segmentResult.durationMs
            this.audioAnalysisData.sampleRate = segmentResult.sampleRate

            // Merge amplitude ranges
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

            // Merge RMS ranges
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

            // Send filtered result to avoid duplicate IDs
            const filteredSegmentResult = {
                ...segmentResult,
                dataPoints: uniqueNewDataPoints,
            }

            this.emitAudioAnalysisCallback(filteredSegmentResult)
        }
    }

    /**
     * Reset the data point counter to a specific value or zero
     * @param startCounterFrom Optional value to start the counter from (for continuing from previous recordings)
     */
    resetDataPointCounter(startCounterFrom?: number): void {
        // Set the counter with the passed value or 0
        this.dataPointIdCounter =
            startCounterFrom !== undefined ? startCounterFrom : 0
        this.logger?.debug(
            `Reset data point counter to ${this.dataPointIdCounter}`
        )

        // Update worker counter if available
        if (this.featureExtractorWorker) {
            this.featureExtractorWorker.postMessage({
                command: 'resetCounter',
                value: this.dataPointIdCounter,
            })
        } else {
            this.logger?.warn(
                'No feature extractor worker available to update counter'
            )
        }
    }

    /**
     * Get the current data point counter value
     * @returns The current value of the data point counter
     */
    getDataPointCounter(): number {
        return this.dataPointIdCounter
    }

    /**
     * Prepares the recorder for continuity after device switch
     * Sets up all necessary state to maintain proper recording continuity
     */
    prepareForDeviceSwitch(): void {
        this.isFirstChunkAfterSwitch = true
        this.logger?.debug(
            `Prepared for device switch at position ${this.position}s`
        )
    }

    /**
     * Starts the audio recording process
     * Connects the audio nodes and begins capturing audio data
     * @param preserveCounters If true, do not reset the counter (used for device switching)
     */
    start(preserveCounters = false) {
        this.source.connect(this.audioWorkletNode)
        this.audioWorkletNode.connect(this.audioContext.destination)

        // Only reset the counter when not preserving state (e.g., for a fresh recording)
        if (!preserveCounters) {
            this.logger?.debug(
                'Starting fresh recording, resetting counter to 0'
            )
            this.resetDataPointCounter(0) // Explicitly reset to 0 for new recordings
            this.isFirstChunkAfterSwitch = false
        } else {
            this.logger?.debug(
                `Preserving counter at ${this.dataPointIdCounter} during device switch`
            )
        }

        if (this.compressedMediaRecorder) {
            this.compressedMediaRecorder.start(this.config.interval ?? 1000)
        }
    }

    /**
     * Stops the audio recording process and returns the recorded data
     * @param externalAudioChunks Optional array of Float32Array chunks from previous devices
     * @returns Promise resolving to an object containing PCM data and optional compressed blob
     */
    async stop(
        externalAudioChunks?: Float32Array[]
    ): Promise<{ pcmData: Float32Array; compressedBlob?: Blob }> {
        try {
            // Log what's happening for debugging
            this.logger?.debug('Stopping recording and collecting final data')

            // Stop any compressed recording first
            if (
                this.compressedMediaRecorder &&
                this.compressedMediaRecorder.state !== 'inactive'
            ) {
                this.compressedMediaRecorder.stop()
            }

            // Wait for any pending compressed chunks to be processed
            if (this.compressedMediaRecorder) {
                // Small delay to ensure all data is processed
                await new Promise((resolve) => setTimeout(resolve, 100))
            }

            // Return the compressed blob if available
            return {
                pcmData: new Float32Array(), // Return empty array since we're streaming
                compressedBlob:
                    this.compressedChunks.length > 0
                        ? new Blob(this.compressedChunks, {
                              type: 'audio/webm;codecs=opus',
                          })
                        : undefined,
            }
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
    public cleanup() {
        // Remove device disconnection handler
        if (this.deviceDisconnectionHandler) {
            this.deviceDisconnectionHandler()
            this.deviceDisconnectionHandler = null
        }

        // Check if AudioContext is already closed before attempting to close it
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try {
                this.audioContext.close()
            } catch (e) {
                // Ignore closure errors - this happens if already closed
            }
        }

        // Safely disconnect audioWorkletNode if it exists
        if (this.audioWorkletNode) {
            try {
                this.audioWorkletNode.disconnect()
            } catch (e) {
                // Ignore disconnection errors - node might be already disconnected
            }
        }

        // Safely disconnect source if it exists
        if (this.source) {
            try {
                this.source.disconnect()
            } catch (e) {
                // Ignore disconnection errors - source might be already disconnected
            }
        }

        // Always stop media stream tracks to release hardware resources
        this.stopMediaStreamTracks()

        // Mark as disconnected to prevent future errors
        this._isDeviceDisconnected = true
    }

    /**
     * Pauses the audio recording process
     * Disconnects audio nodes and pauses the media recorder
     */
    pause() {
        try {
            // Note: We're just pausing, not disconnecting the device
            // Simply disconnect nodes temporarily without marking device as disconnected
            this.source.disconnect(this.audioWorkletNode)
            this.audioWorkletNode.disconnect(this.audioContext.destination)
            this.audioWorkletNode.port.postMessage({ command: 'pause' })

            if (this.compressedMediaRecorder?.state === 'recording') {
                this.compressedMediaRecorder.pause()
            }

            this.logger?.debug('Recording paused successfully')
        } catch (error) {
            this.logger?.error('Error in pause(): ', error)
            // Already disconnected, just ignore and continue
        }
    }

    /**
     * Stops all media stream tracks to release hardware resources
     * Ensures recording indicators (like microphone icon) are turned off
     */
    public stopMediaStreamTracks() {
        // Stop all audio tracks to stop the recording icon
        if (this.mediaStream) {
            const tracks = this.mediaStream.getTracks()
            tracks.forEach((track) => track.stop())
        } else if (this.source?.mediaStream) {
            const tracks = this.source.mediaStream.getTracks()
            tracks.forEach((track) => track.stop())
        }
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
        // If device was disconnected, we can't resume
        if (this._isDeviceDisconnected) {
            this.logger?.warn('Cannot resume recording: device disconnected')
            return
        }

        try {
            this.source.connect(this.audioWorkletNode)
            this.audioWorkletNode.connect(this.audioContext.destination)
            this.audioWorkletNode.port.postMessage({ command: 'resume' })
            this.compressedMediaRecorder?.resume()
        } catch (error) {
            this.logger?.error('Error in resume(): ', error)
        }
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
            })
        }
    }

    /**
     * Sets up detection for device disconnection events
     */
    private setupDeviceDisconnectionDetection() {
        if (!this.mediaStream) return

        // Function to handle track ending (which happens on device disconnection)
        const handleTrackEnded = () => {
            this.logger?.warn('Audio track ended - device disconnected')
            this._isDeviceDisconnected = true

            // Use the callback to notify parent component about device disconnection
            if (this.onInterruptionCallback) {
                this.onInterruptionCallback({
                    reason: 'deviceDisconnected',
                    isPaused: true,
                    timestamp: Date.now(),
                })
                this.logger?.debug('Notified about device disconnection')
            }

            // Ensure we disconnect nodes to prevent zombie recordings
            if (this.audioWorkletNode) {
                this.audioWorkletNode.port.postMessage({
                    command: 'deviceDisconnected',
                })

                try {
                    this.source.disconnect(this.audioWorkletNode)
                    this.audioWorkletNode.disconnect()
                } catch (e) {
                    // Ignore disconnection errors as the track might already be gone
                }
            }
        }

        // Add listeners to all audio tracks
        const tracks = this.mediaStream.getAudioTracks()
        tracks.forEach((track) => {
            track.addEventListener('ended', handleTrackEnded)
        })

        // Store the handler for cleanup
        this.deviceDisconnectionHandler = () => {
            tracks.forEach((track) => {
                track.removeEventListener('ended', handleTrackEnded)
            })
        }
    }

    /**
     * Explicitly set the position for continuous recording across device switches
     * @param position The position in seconds to continue from
     */
    setPosition(position: number): void {
        if (position >= 0) {
            this.position = position
            this.logger?.debug(`Position explicitly set to ${position} seconds`)
        } else {
            this.logger?.warn(`Invalid position value: ${position}, ignoring`)
        }
    }

    /**
     * Get the current position in seconds
     * @returns The current position
     */
    getPosition(): number {
        return this.position
    }

    /**
     * Gets the current compressed chunks
     * @returns Array of current compressed audio chunks
     */
    getCompressedChunks(): Blob[] {
        return [...this.compressedChunks]
    }

    /**
     * Sets the compressed chunks from a previous recorder
     * @param chunks Array of compressed chunks from a previous recorder
     */
    setCompressedChunks(chunks: Blob[]): void {
        if (chunks && chunks.length > 0) {
            this.logger?.debug(
                `Adding ${chunks.length} compressed chunks from previous device`
            )
            this.compressedChunks = [...chunks, ...this.compressedChunks]
            // Update size
            this.compressedSize = this.compressedChunks.reduce(
                (size, chunk) => size + chunk.size,
                0
            )
        }
    }
}
