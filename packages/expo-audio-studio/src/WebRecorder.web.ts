// packages/expo-audio-stream/src/WebRecorder.web.ts

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import { ConsoleLike, RecordingConfig } from './ExpoAudioStream.types'
import {
    EmitAudioAnalysisFunction,
    EmitAudioEventFunction,
} from './ExpoAudioStream.web'
import { encodingToBitDepth } from './utils/encodingToBitDepth'
import { writeWavHeader } from './utils/writeWavHeader'
import { InlineFeaturesExtractor } from './workers/InlineFeaturesExtractor.web'
import { InlineAudioWebWorker } from './workers/inlineAudioWebWorker.web'

interface AudioWorkletEvent {
    data: {
        command: string
        recordedData?: Float32Array
        sampleRate?: number
        position?: number
        message?: string // For debug messages
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
    private readonly logger?: ConsoleLike
    private compressedMediaRecorder: MediaRecorder | null = null
    private compressedChunks: Blob[] = []
    private compressedSize: number = 0
    private pendingCompressedChunk: Blob | null = null
    private dataPointIdCounter: number = 0 // Add this property to track the counter
    private deviceDisconnectionHandler: (() => void) | null = null
    private readonly mediaStream: MediaStream | null = null
    private readonly onInterruptionCallback?: (event: {
        reason: string
        isPaused: boolean
        timestamp: number
    }) => void
    private _isDeviceDisconnected: boolean = false
    private pcmData: Float32Array | null = null // Store original PCM data
    private totalSampleCount: number = 0

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
            extractionTimeMs: 0,
        }

        if (recordingConfig.enableProcessing) {
            this.initFeatureExtractorWorker()
        }

        // Initialize compressed recording if enabled
        if (recordingConfig.output?.compressed?.enabled) {
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
                if (command === 'debug') {
                    this.logger?.debug(`[AudioWorklet] ${event.data.message}`)
                    return
                }

                if (command !== 'newData') return

                const pcmBufferFloat = event.data.recordedData
                if (!pcmBufferFloat) {
                    this.logger?.warn('Received empty audio buffer', event)
                    return
                }

                // Process data in smaller chunks and emit immediately
                const sampleRate =
                    event.data.sampleRate ?? this.audioContext.sampleRate
                // Use chunk size from config interval or default to 2 seconds
                const intervalMs = this.config.interval ?? DEFAULT_WEB_INTERVAL
                const chunkSize = Math.floor(sampleRate * (intervalMs / 1000))
                const duration = pcmBufferFloat.length / sampleRate

                // Use incoming position if provided by worklet, otherwise use our tracked position
                const incomingPosition =
                    typeof event.data.position === 'number'
                        ? event.data.position
                        : this.position

                // Simple position tracking for logging (no duplicate filtering)
                this.logger?.debug(
                    `Audio chunk: position=${incomingPosition.toFixed(3)}s, size=${pcmBufferFloat.length}`
                )

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

                    // Only store PCM data if primary output is enabled
                    const shouldStoreUncompressed =
                        this.config.output?.primary?.enabled ?? true

                    // Store PCM chunks when needed - this is for the final WAV file
                    if (shouldStoreUncompressed) {
                        // Store the original Float32Array data for later WAV creation
                        this.appendPcmData(chunk)
                        this.totalSampleCount += chunk.length
                    }

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

                    // Prepare compression data if available
                    const compression = this.pendingCompressedChunk
                        ? {
                              data: this.pendingCompressedChunk,
                              size: this.pendingCompressedChunk.size,
                              totalSize: this.compressedSize,
                              mimeType: 'audio/webm',
                              format:
                                  this.config.output?.compressed?.format ??
                                  'opus',
                              bitrate:
                                  this.config.output?.compressed?.bitrate ??
                                  128000,
                          }
                        : undefined

                    // Emit chunk immediately - whether compressed or not
                    this.emitAudioEventCallback({
                        data: chunk,
                        position: chunkPosition,
                        compression,
                    })

                    // Reset pending compressed chunk after we've used it
                    this.pendingCompressedChunk = null
                }

                // Update our position based on the worklet's position if provided
                this.position = incomingPosition + duration
            }

            // Ensure we use all relevant settings from config
            const recordSampleRate = this.audioContext.sampleRate
            const exportSampleRate =
                this.config.sampleRate ?? this.audioContext.sampleRate
            const channels = this.config.channels ?? this.numberOfChannels
            const interval = this.config.interval ?? DEFAULT_WEB_INTERVAL

            this.logger?.debug(`WebRecorder initialized with config:`, {
                recordSampleRate,
                exportSampleRate,
                bitDepth: this.bitDepth,
                exportBitDepth: this.exportBitDepth,
                channels,
                interval,
                position: this.position,
                deviceId: this.config.deviceId ?? 'default',
                compression: this.config.output?.compressed
                    ? {
                          enabled: this.config.output.compressed.enabled,
                          format: this.config.output.compressed.format,
                          bitrate: this.config.output.compressed.bitrate,
                      }
                    : 'disabled',
            })

            // Initialize the worklet with all settings from config
            this.audioWorkletNode.port.postMessage({
                command: 'init',
                recordSampleRate,
                exportSampleRate,
                bitDepth: this.bitDepth,
                exportBitDepth: this.exportBitDepth,
                channels,
                interval,
                position: this.position, // Pass the current position to the processor
                enableLogging: true,
            })

            // Connect the source to the AudioWorkletNode and start recording
            this.source.connect(this.audioWorkletNode)
            this.audioWorkletNode.connect(this.audioContext.destination)
        } catch (error) {
            console.error(`[${TAG}] Failed to initialize WebRecorder`, error)
        }
    }

    /**
     * Append new PCM data to the existing buffer
     * @param newData New Float32Array data to append
     */
    private appendPcmData(newData: Float32Array): void {
        // Clone the incoming data to ensure it's not modified
        const dataToAdd = new Float32Array(newData)

        if (!this.pcmData) {
            // First chunk - create a copy to avoid references to original data
            this.pcmData = new Float32Array(dataToAdd)
            return
        }

        // Create a new buffer with increased size
        const newBuffer = new Float32Array(
            this.pcmData.length + dataToAdd.length
        )

        // Copy existing data
        newBuffer.set(this.pcmData)

        // Append new data
        newBuffer.set(dataToAdd, this.pcmData.length)

        // Replace existing buffer
        this.pcmData = newBuffer
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
        if (event.data.command !== 'features') return

        const segmentResult = event.data.result
        const uniqueNewDataPoints = this.filterUniqueDataPoints(
            segmentResult.dataPoints
        )

        // Update counter based on the highest ID seen
        this.updateDataPointCounter(uniqueNewDataPoints)

        // Update analysis data with the new results
        this.updateAudioAnalysisData(segmentResult, uniqueNewDataPoints)

        // Send filtered result to avoid duplicate IDs
        const filteredSegmentResult = {
            ...segmentResult,
            dataPoints: uniqueNewDataPoints,
        }

        this.emitAudioAnalysisCallback(filteredSegmentResult)
    }

    /**
     * Filters out data points with duplicate IDs
     */
    private filterUniqueDataPoints(dataPoints: any[]): any[] {
        // Track existing IDs to prevent duplicates
        const existingIds = new Set(
            this.audioAnalysisData.dataPoints.map((dp) => dp.id)
        )

        // Filter out datapoints with duplicate IDs
        const uniquePoints = dataPoints.filter((dp) => !existingIds.has(dp.id))

        // Log filtered duplicates if any
        if (uniquePoints.length < dataPoints.length && this.logger?.warn) {
            this.logger.warn(
                `Filtered ${dataPoints.length - uniquePoints.length} duplicate datapoints`
            )
        }

        return uniquePoints
    }

    /**
     * Updates the counter based on the highest ID in datapoints
     */
    private updateDataPointCounter(dataPoints: any[]): void {
        if (dataPoints.length === 0) return

        const lastDataPoint = dataPoints[dataPoints.length - 1]
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

    /**
     * Updates audio analysis data with segment results
     */
    private updateAudioAnalysisData(
        segmentResult: AudioAnalysis,
        uniqueDataPoints: any[]
    ): void {
        // Add unique data points to our analysis data
        this.audioAnalysisData.dataPoints.push(...uniqueDataPoints)
        this.audioAnalysisData.durationMs += segmentResult.durationMs
        this.audioAnalysisData.sampleRate = segmentResult.sampleRate

        // Update amplitude range if present
        if (segmentResult.amplitudeRange) {
            this.audioAnalysisData.amplitudeRange = this.mergeRange(
                this.audioAnalysisData.amplitudeRange,
                segmentResult.amplitudeRange
            )
        }

        // Update RMS range if present
        if (segmentResult.rmsRange) {
            this.audioAnalysisData.rmsRange = this.mergeRange(
                this.audioAnalysisData.rmsRange,
                segmentResult.rmsRange
            )
        }
    }

    /**
     * Merges value ranges
     */
    private mergeRange(
        existing: { min: number; max: number } | undefined,
        newRange: { min: number; max: number }
    ): { min: number; max: number } {
        if (!existing) return { ...newRange }

        return {
            min: Math.min(existing.min, newRange.min),
            max: Math.max(existing.max, newRange.max),
        }
    }

    /**
     * Reset the data point counter to a specific value or zero
     * @param startCounterFrom Optional value to start the counter from (for continuing from previous recordings)
     */
    resetDataPointCounter(startCounterFrom?: number): void {
        // Set the counter with the passed value or 0
        this.dataPointIdCounter = startCounterFrom ?? 0
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

            // Clear PCM data for new recording
            this.pcmData = null
            this.totalSampleCount = 0
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
     * Creates a WAV file from the stored PCM data
     */
    private createWavFromPcmData(): Blob | null {
        try {
            // Check if we have PCM data
            if (!this.pcmData || this.pcmData.length === 0) {
                this.logger?.warn('No PCM data available to create WAV file')
                return null
            }

            const sampleRate =
                this.config.sampleRate ?? this.audioContext.sampleRate
            const channels = this.numberOfChannels || 1

            // Convert float32 PCM data to 16-bit PCM for WAV
            const bytesPerSample = 2 // 16-bit = 2 bytes
            const dataLength = this.pcmData.length * bytesPerSample
            const buffer = new ArrayBuffer(dataLength)
            const view = new DataView(buffer)

            // Convert Float32Array (-1 to 1) to Int16Array (-32768 to 32767)
            for (let i = 0; i < this.pcmData.length; i++) {
                const sample = Math.max(-1, Math.min(1, this.pcmData[i]))
                const int16Value = Math.round(sample * 32767)
                view.setInt16(i * 2, int16Value, true)
            }

            // Use the existing writeWavHeader utility to add a WAV header
            const wavBuffer = writeWavHeader({
                buffer,
                sampleRate,
                numChannels: channels,
                bitDepth: 16,
                isFloat: false,
            })

            return new Blob([wavBuffer], { type: 'audio/wav' })
        } catch (error) {
            this.logger?.error('Error creating WAV file from PCM data:', error)
            return null
        }
    }

    /**
     * Stops the audio recording process and returns the recorded data
     * @returns Promise resolving to an object containing compressed and/or uncompressed blobs
     */
    async stop(): Promise<{ compressedBlob?: Blob; uncompressedBlob?: Blob }> {
        try {
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

            // Create uncompressed WAV file from the PCM data
            let uncompressedBlob: Blob | undefined

            // Only create WAV if we have PCM data
            if (this.pcmData && this.pcmData.length > 0) {
                uncompressedBlob = this.createWavFromPcmData() || undefined
            }

            // Return the compressed and/or uncompressed blobs if available
            return {
                compressedBlob:
                    this.compressedChunks.length > 0
                        ? new Blob(this.compressedChunks, {
                              type: 'audio/webm;codecs=opus',
                          })
                        : undefined,
                uncompressedBlob,
            }
        } finally {
            this.cleanup()
            // Reset the chunks array
            this.compressedChunks = []
            this.compressedSize = 0
            this.pendingCompressedChunk = null
            this.pcmData = null
            this.totalSampleCount = 0
            this.dataPointIdCounter = 0 // Reset counter
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
            this.audioContext.close().catch((e) => {
                // Log closure errors but continue cleanup
                this.logger?.warn('Error closing AudioContext:', e)
            })
        }

        // Safely disconnect audioWorkletNode if it exists
        if (this.audioWorkletNode) {
            try {
                this.audioWorkletNode.disconnect()
            } catch (e) {
                // Log disconnection errors but continue cleanup
                this.logger?.warn('Error disconnecting audioWorkletNode:', e)
            }
        }

        // Safely disconnect source if it exists
        if (this.source) {
            try {
                this.source.disconnect()
            } catch (e) {
                // Log disconnection errors but continue cleanup
                this.logger?.warn('Error disconnecting source:', e)
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
        } catch (error: unknown) {
            this.logger?.error('Error in resume(): ', error)
            // Rethrow the error to inform callers
            throw new Error(
                `Failed to resume recording: ${error instanceof Error ? error.message : 'unknown error'}`
            )
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
                        this.config.output?.compressed?.bitrate ?? 128000,
                }
            )

            this.compressedMediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    // Store the compressed chunk for final blob creation
                    this.compressedChunks.push(event.data)
                    this.compressedSize += event.data.size

                    // Store the pending compressed chunk for the next PCM chunk to use
                    this.pendingCompressedChunk = event.data
                }
            }
        } catch (error) {
            this.logger?.error(
                'Failed to initialize compressed recorder:',
                error
            )
            // Setting to null to indicate initialization failed
            this.compressedMediaRecorder = null
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
                    this.logger?.warn(
                        'Error disconnecting audioWorkletNode:',
                        e
                    )
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
