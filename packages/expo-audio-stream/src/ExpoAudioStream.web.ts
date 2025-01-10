// src/ExpoAudioStreamModule.web.ts
import { LegacyEventEmitter } from 'expo-modules-core'

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import {
    AudioRecording,
    AudioStreamStatus,
    BitDepth,
    ConsoleLike,
    RecordingConfig,
    StartRecordingResult,
    WebRecordingOptions,
} from './ExpoAudioStream.types'
import { WebRecorder } from './WebRecorder.web'
import { AudioEventPayload } from './events'
import { encodingToBitDepth } from './utils/encodingToBitDepth'
import { writeWavHeader } from './utils/writeWavHeader'

export interface EmitAudioEventProps {
    data: Float32Array
    position: number
    compression?: {
        data: Blob
        size: number
        totalSize: number
        mimeType: string
        format: string
        bitrate: number
    }
}
export type EmitAudioEventFunction = (_: EmitAudioEventProps) => void
export type EmitAudioAnalysisFunction = (_: AudioAnalysis) => void

export interface ExpoAudioStreamWebProps {
    logger?: ConsoleLike
    audioWorkletUrl: string
    featuresExtratorUrl: string
}

export class ExpoAudioStreamWeb extends LegacyEventEmitter {
    customRecorder: WebRecorder | null
    audioChunks: Float32Array[]
    isRecording: boolean
    isPaused: boolean
    recordingStartTime: number
    pausedTime: number
    currentDurationMs: number
    currentSize: number
    currentInterval: number
    lastEmittedSize: number
    lastEmittedTime: number
    lastEmittedCompressionSize: number
    streamUuid: string | null
    extension: 'webm' | 'wav' = 'wav' // Default extension is 'webm'
    recordingConfig?: RecordingConfig
    bitDepth: BitDepth // Bit depth of the audio
    audioWorkletUrl: string
    featuresExtratorUrl: string
    logger?: ConsoleLike
    latestPosition: number = 0
    totalCompressedSize: number = 0

    constructor({
        audioWorkletUrl,
        featuresExtratorUrl,
        logger,
    }: ExpoAudioStreamWebProps) {
        const mockNativeModule = {
            addListener: () => {
                // Not used on web
            },
            removeListeners: () => {
                // Not used on web
            },
        }
        super(mockNativeModule) // Pass the mock native module to the parent class

        this.logger = logger
        this.customRecorder = null
        this.audioChunks = []
        this.isRecording = false
        this.isPaused = false
        this.recordingStartTime = 0
        this.pausedTime = 0
        this.currentDurationMs = 0
        this.currentSize = 0
        this.bitDepth = 32 // Default
        this.currentInterval = 1000 // Default interval in ms
        this.lastEmittedSize = 0
        this.lastEmittedTime = 0
        this.latestPosition = 0
        this.lastEmittedCompressionSize = 0
        this.streamUuid = null // Initialize UUID on first recording start
        this.audioWorkletUrl = audioWorkletUrl
        this.featuresExtratorUrl = featuresExtratorUrl
    }

    // Utility to handle user media stream
    async getMediaStream() {
        try {
            return await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (error) {
            this.logger?.error('Failed to get media stream:', error)
            throw error
        }
    }

    // Start recording with options
    async startRecording(recordingConfig: RecordingConfig = {}) {
        if (this.isRecording) {
            throw new Error('Recording is already in progress')
        }

        this.bitDepth = encodingToBitDepth({
            encoding: recordingConfig.encoding ?? 'pcm_32bit',
        })

        const audioContext = new (window.AudioContext ||
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - Allow webkitAudioContext for Safari
            window.webkitAudioContext)()
        const stream = await this.getMediaStream()

        const source = audioContext.createMediaStreamSource(stream)

        this.customRecorder = new WebRecorder({
            logger: this.logger,
            audioContext,
            source,
            recordingConfig,
            audioWorkletUrl: this.audioWorkletUrl,
            emitAudioEventCallback: ({
                data,
                position,
                compression,
            }: EmitAudioEventProps) => {
                this.audioChunks.push(new Float32Array(data))
                this.currentSize += data.byteLength
                this.emitAudioEvent({ data, position, compression })
                this.lastEmittedTime = Date.now()
                this.lastEmittedSize = this.currentSize
                this.lastEmittedCompressionSize = compression?.size ?? 0
            },
            emitAudioAnalysisCallback: (audioAnalysisData: AudioAnalysis) => {
                this.logger?.log(`Emitted AudioAnalysis:`, audioAnalysisData)
                this.emit('AudioAnalysis', audioAnalysisData)
            },
        })
        await this.customRecorder.init()
        this.customRecorder.start()

        // // Set a timer to stop recording after 5 seconds
        // setTimeout(() => {
        //   logger.log("AUTO Stopping recording");
        //   this.customRecorder?.stopAndPlay();
        //   this.isRecording = false;
        // }, 3000);

        this.isRecording = true
        this.recordingConfig = recordingConfig
        this.recordingStartTime = Date.now()
        this.pausedTime = 0
        this.isPaused = false
        this.lastEmittedSize = 0
        this.lastEmittedTime = 0
        this.lastEmittedCompressionSize = 0
        this.streamUuid = Date.now().toString()
        const fileUri = `${this.streamUuid}.${this.extension}`
        const streamConfig: StartRecordingResult = {
            fileUri,
            mimeType: `audio/${this.extension}`,
            bitDepth: this.bitDepth,
            channels: recordingConfig.channels ?? 1,
            sampleRate: recordingConfig.sampleRate ?? 44100,
            compression: recordingConfig.compression
                ? {
                      ...recordingConfig.compression,
                      bitrate: recordingConfig.compression?.bitrate ?? 128000,
                      size: 0,
                      mimeType: 'audio/webm',
                      format: recordingConfig.compression?.format ?? 'opus',
                      compressedFileUri: '',
                  }
                : undefined,
        }
        return streamConfig
    }

    emitAudioEvent({ data, position, compression }: EmitAudioEventProps) {
        const fileUri = `${this.streamUuid}.${this.extension}`
        if (compression?.size) {
            this.lastEmittedCompressionSize = compression.size
            this.totalCompressedSize = compression.totalSize
        }
        this.latestPosition = position
        this.currentDurationMs = position * 1000 // Convert position (in seconds) to ms

        const audioEventPayload: AudioEventPayload = {
            fileUri,
            mimeType: `audio/${this.extension}`,
            lastEmittedSize: this.lastEmittedSize,
            deltaSize: data.byteLength,
            position,
            totalSize: this.currentSize,
            buffer: data,
            streamUuid: this.streamUuid ?? '',
            compression: compression
                ? {
                      data: compression?.data,
                      totalSize: this.totalCompressedSize,
                      eventDataSize: compression?.size ?? 0,
                      position,
                  }
                : undefined,
        }

        this.emit('AudioData', audioEventPayload)
    }

    // Stop recording
    async stopRecording(options?: WebRecordingOptions): Promise<AudioRecording> {
        if (!this.customRecorder) {
            throw new Error('Recorder is not initialized')
        }

        // Create a promise to handle the PCM data processing
        return new Promise<AudioRecording>((resolve) => {
            // Use requestAnimationFrame to avoid blocking the UI
            requestAnimationFrame(() => {
                // Move the async work inside a self-executing async function
                (async () => {
                    const { pcmData, compressedBlob } = await this.customRecorder!.stop(options)

                    this.logger?.debug(`Stopped recording`, pcmData)
                    this.isRecording = false
                    this.isPaused = false
                    this.currentDurationMs = Date.now() - this.recordingStartTime

                    // Process in the next frame to avoid blocking
                    requestAnimationFrame(() => {
                        // Rest of the code remains the same
                        const wavBuffer = writeWavHeader({
                            buffer: pcmData.buffer,
                            sampleRate: this.recordingConfig?.sampleRate ?? 44100,
                            numChannels: this.recordingConfig?.channels ?? 1,
                            bitDepth: this.bitDepth,
                        })

                        const cloneableBuffer = wavBuffer.slice(0)

                        const blob = new Blob([cloneableBuffer], {
                            type: `audio/${this.extension}`,
                        })
                        const fileUri = URL.createObjectURL(blob)

                        let compression: AudioRecording['compression']
                        if (compressedBlob && this.recordingConfig?.compression?.enabled) {
                            const compressedUri = URL.createObjectURL(compressedBlob)
                            compression = {
                                compressedFileUri: compressedUri,
                                size: compressedBlob.size,
                                mimeType: 'audio/webm',
                                format: 'opus',
                                bitrate: this.recordingConfig.compression.bitrate ?? 128000,
                            }
                        }

                        resolve({
                            fileUri,
                            filename: `${this.streamUuid}.${this.extension}`,
                            wavPCMData: new Float32Array(cloneableBuffer),
                            bitDepth: this.bitDepth,
                            channels: this.recordingConfig?.channels ?? 1,
                            sampleRate: this.recordingConfig?.sampleRate ?? 44100,
                            durationMs: this.currentDurationMs,
                            size: this.currentSize,
                            mimeType: `audio/${this.extension}`,
                            compression,
                        })
                    })
                })().catch((error) => {
                    this.logger?.error('Error in stopRecording:', error)
                    throw error
                })
            })
        })
    }

    // Pause recording
    async pauseRecording() {
        if (!this.isRecording || this.isPaused) {
            throw new Error('Recording is not active or already paused')
        }

        if (this.customRecorder) {
            this.customRecorder.pause()
        }
        this.isPaused = true
        this.pausedTime = Date.now()
    }

    // Resume recording
    async resumeRecording() {
        if (!this.isPaused) {
            throw new Error('Recording is not paused')
        }

        if (this.customRecorder) {
            this.customRecorder.resume()
        }
        this.isPaused = false
        this.recordingStartTime += Date.now() - this.pausedTime
    }

    // Get current status
    status() {
        const status: AudioStreamStatus = {
            isRecording: this.isRecording,
            isPaused: this.isPaused,
            durationMs: this.currentDurationMs,
            size: this.currentSize,
            interval: this.currentInterval,
            mimeType: `audio/${this.extension}`,
            compression: this.recordingConfig?.compression?.enabled
                ? {
                      size: this.totalCompressedSize,
                      mimeType: 'audio/webm',
                      format: this.recordingConfig.compression.format ?? 'opus',
                      bitrate:
                          this.recordingConfig.compression.bitrate ?? 128000,
                  }
                : undefined,
        }
        return status
    }
}
