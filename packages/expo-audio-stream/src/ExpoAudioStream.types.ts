// packages/expo-audio-stream/src/ExpoAudioStream.types.ts
import {
    AmplitudeAlgorithm,
    AudioAnalysis,
    AudioFeaturesOptions,
} from './AudioAnalysis/AudioAnalysis.types'
import { AudioAnalysisEvent } from './events'

export interface AudioStreamStatus {
    isRecording: boolean
    isPaused: boolean
    durationMs: number
    size: number
    interval: number
    mimeType: string
}

export interface AudioDataEvent {
    data: string | Float32Array
    position: number
    fileUri: string
    eventDataSize: number
    totalSize: number
}

export type EncodingType = 'pcm_32bit' | 'pcm_16bit' | 'pcm_8bit'
export type SampleRate = 16000 | 44100 | 48000
export type BitDepth = 8 | 16 | 32

export interface Chunk {
    text: string
    timestamp: [number, number | null]
}

export interface TranscriberData {
    id: string
    isBusy: boolean
    text: string
    startTime: number
    endTime: number
    chunks: Chunk[]
}

export interface AudioRecording {
    fileUri: string
    filename: string
    durationMs: number
    size: number
    mimeType: string
    channels: number
    bitDepth: BitDepth
    sampleRate: SampleRate
    transcripts?: TranscriberData[]
    wavPCMData?: Float32Array // Full PCM data for the recording in WAV format (only on web, for native use the fileUri)
    analysisData?: AudioAnalysis // Analysis data for the recording depending on enableProcessing flag
}

export interface StartRecordingResult {
    fileUri: string
    mimeType: string
    channels?: number
    bitDepth?: BitDepth
    sampleRate?: SampleRate
}

export interface RecordingConfig {
    sampleRate?: SampleRate // Sample rate for recording
    channels?: 1 | 2 // 1 or 2 (MONO or STEREO)
    encoding?: EncodingType // Encoding type for the recording
    interval?: number // Interval in milliseconds at which to emit recording data

    keepAwake?: boolean // Boolean to keep the device awake while recording (default is false)

    showNotification?: boolean // Whether to show a notification during recording
    showWaveformInNotification?: boolean // android only when showNotification is true
    notification?: NotificationConfig

    // Optional parameters for audio processing
    enableProcessing?: boolean // Boolean to enable/disable audio processing (default is false)
    pointsPerSecond?: number // Number of data points to extract per second of audio (default is 1000)
    algorithm?: AmplitudeAlgorithm // Algorithm to use for amplitude computation (default is "rms")
    features?: AudioFeaturesOptions // Feature options to extract (default is empty)

    onAudioStream?: (_: AudioDataEvent) => Promise<void> // Callback function to handle audio stream
    onAudioAnalysis?: (_: AudioAnalysisEvent) => Promise<void> // Callback function to handle audio features extraction results
}

export interface NotificationConfig {
    title?: string
    text?: string
    icon?: string
    // For Android-specific customization
    android?: {
        channelId?: string
        channelName?: string
        channelDescription?: string
        actions?: NotificationAction[]
        waveform?: WaveformConfig
        lightColor?: string
        priority?: 'min' | 'low' | 'default' | 'high' | 'max'
        accentColor?: string
    }
    // For iOS-specific customization
    ios?: {
        categoryIdentifier?: string
        actions?: NotificationAction[]
    }
}

export interface NotificationAction {
    title: string
    identifier: string
    icon?: string
}

export interface WaveformConfig {
    color?: string // The color of the waveform (e.g., "#FFFFFF" for white)
    opacity?: number // Opacity of the waveform (0.0 - 1.0)
    strokeWidth?: number // Width of the waveform line (default: 1.5)
    style?: 'stroke' | 'fill' // Drawing style: "stroke" for outline, "fill" for solid
    mirror?: boolean // Whether to mirror the waveform (symmetrical display)
    height?: number // Height of the waveform view in dp (default: 64)
}

export interface UseAudioRecorderState {
    startRecording: (_: RecordingConfig) => Promise<StartRecordingResult>
    stopRecording: () => Promise<AudioRecording | null>
    pauseRecording: () => void
    resumeRecording: () => void
    isRecording: boolean
    isPaused: boolean
    durationMs: number // Duration of the recording
    size: number // Size in bytes of the recorded audio
    analysisData?: AudioAnalysis // Analysis data for the recording depending on enableProcessing flag
}
