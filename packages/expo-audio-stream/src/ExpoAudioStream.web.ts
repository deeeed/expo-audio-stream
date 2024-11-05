// src/ExpoAudioStreamModule.web.ts
import { EventEmitter } from 'expo-modules-core'

import { AudioAnalysis } from './AudioAnalysis/AudioAnalysis.types'
import {
    AudioRecording,
    AudioStreamStatus,
    BitDepth,
    RecordingConfig,
    StartRecordingResult,
} from './ExpoAudioStream.types'
import { WebRecorder } from './WebRecorder.web'
import { AudioEventPayload } from './events'
import { getLogger } from './logger'
import { encodingToBitDepth } from './utils/encodingToBitDepth'
import { WavHeaderOptions, writeWavHeader } from './utils/writeWavHeader'

export interface EmitAudioEventProps {
    data: Float32Array
    position: number
}
export type EmitAudioEventFunction = (_: EmitAudioEventProps) => void
export type EmitAudioAnalysisFunction = (_: AudioAnalysis) => void

export interface ExpoAudioStreamWebProps {
    audioWorkletUrl: string
    featuresExtratorUrl: string
}

const logger = getLogger('ExpoAudioStreamWeb')

export class ExpoAudioStreamWeb extends EventEmitter {
    customRecorder: WebRecorder | null
    audioChunks: ArrayBuffer[]
    isRecording: boolean
    isPaused: boolean
    recordingStartTime: number
    pausedTime: number
    currentDurationMs: number
    currentSize: number
    currentInterval: number
    lastEmittedSize: number
    lastEmittedTime: number
    streamUuid: string | null
    extension: 'webm' | 'wav' = 'wav' // Default extension is 'webm'
    recordingConfig?: RecordingConfig
    bitDepth: BitDepth // Bit depth of the audio
    audioWorkletUrl: string
    featuresExtratorUrl: string

    constructor({
        audioWorkletUrl,
        featuresExtratorUrl,
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
        this.streamUuid = null // Initialize UUID on first recording start
        this.audioWorkletUrl = audioWorkletUrl
        this.featuresExtratorUrl = featuresExtratorUrl
    }

    // Utility to handle user media stream
    async getMediaStream() {
        try {
            return await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (error) {
            console.error('Failed to get media stream:', error)
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
            audioContext,
            source,
            recordingConfig,
            audioWorkletUrl: this.audioWorkletUrl,
            emitAudioEventCallback: ({
                data,
                position,
            }: EmitAudioEventProps) => {
                this.audioChunks.push(data)
                this.currentSize += data.byteLength
                this.emitAudioEvent({ data, position })
                this.lastEmittedTime = Date.now()
                this.lastEmittedSize = this.currentSize
            },
            emitAudioAnalysisCallback: (audioAnalysisData: AudioAnalysis) => {
                logger.log(`Emitted AudioAnalysis:`, audioAnalysisData)
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
        this.streamUuid = Date.now().toString()
        const fileUri = `${this.streamUuid}.${this.extension}`
        const streamConfig: StartRecordingResult = {
            fileUri,
            mimeType: `audio/${this.extension}`,
            bitDepth: this.bitDepth,
            channels: recordingConfig.channels ?? 1,
            sampleRate: recordingConfig.sampleRate ?? 44100,
        }
        return streamConfig
    }

    emitAudioEvent({ data, position }: EmitAudioEventProps) {
        const fileUri = `${this.streamUuid}.${this.extension}`
        const audioEventPayload: AudioEventPayload = {
            fileUri,
            mimeType: `audio/${this.extension}`,
            lastEmittedSize: this.lastEmittedSize, // Since this might be continuously streaming, adjust accordingly
            deltaSize: data.byteLength,
            position,
            totalSize: this.currentSize,
            buffer: data,
            streamUuid: this.streamUuid ?? '', // Generate or manage UUID for stream identification
        }

        this.emit('AudioData', audioEventPayload)
    }

    // Stop recording
    async stopRecording(): Promise<AudioRecording> {
        if (!this.customRecorder) {
            throw new Error('Recorder is not initialized')
        }

        const fullPcmBufferArray = await this.customRecorder.stop()

        // concat all audio chunks
        logger.debug(`Stopped recording`, fullPcmBufferArray)
        this.isRecording = false
        this.isPaused = false
        this.currentDurationMs = Date.now() - this.recordingStartTime

        // Rewrite wav header with correct data size
        const wavConfig: WavHeaderOptions = {
            buffer: fullPcmBufferArray.buffer,
            sampleRate: this.recordingConfig?.sampleRate ?? 44100,
            numChannels: this.recordingConfig?.channels ?? 1,
            bitDepth: this.bitDepth,
        }
        logger.debug(`Writing wav header`, wavConfig)
        const wavBuffer = writeWavHeader(wavConfig).slice(0)

        // Create blob fileUri from audio chunks
        const blob = new Blob([wavBuffer], {
            type: `audio/${this.extension}`,
        })
        const fileUri = URL.createObjectURL(blob)

        const result: AudioRecording = {
            fileUri,
            filename: `${this.streamUuid}.${this.extension}`,
            wavPCMData: fullPcmBufferArray,
            bitDepth: this.bitDepth,
            channels: this.recordingConfig?.channels ?? 1,
            sampleRate: this.recordingConfig?.sampleRate ?? 44100,
            durationMs: this.currentDurationMs,
            size: this.currentSize,
            mimeType: `audio/${this.extension}`,
        }

        return result
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
            durationMs: Date.now() - this.recordingStartTime,
            size: this.currentSize,
            interval: this.currentInterval,
            mimeType: `audio/${this.extension}`,
        }
        return status
    }
}
