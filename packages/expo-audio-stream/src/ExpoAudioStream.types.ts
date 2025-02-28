// packages/expo-audio-stream/src/ExpoAudioStream.types.ts
import {
    AudioAnalysis,
    AudioFeaturesOptions,
    DecodingConfig,
} from './AudioAnalysis/AudioAnalysis.types'
import { AudioAnalysisEvent } from './events'

export interface CompressionInfo {
    size: number
    mimeType: string
    bitrate: number
    format: string
    compressedFileUri?: string
}

export interface AudioStreamStatus {
    isRecording: boolean
    isPaused: boolean
    durationMs: number
    size: number
    interval: number
    intervalAnalysis: number
    mimeType: string
    compression?: CompressionInfo
}

export interface AudioDataEvent {
    data: string | Float32Array
    position: number
    fileUri: string
    eventDataSize: number
    totalSize: number
    compression?: CompressionInfo & {
        data?: string | Blob // Base64 (native) or Float32Array (web) encoded compressed data chunk
    }
}

export type EncodingType = 'pcm_32bit' | 'pcm_16bit' | 'pcm_8bit'
export type SampleRate = 16000 | 44100 | 48000
export type BitDepth = 8 | 16 | 32
export type PCMFormat = `pcm_${BitDepth}bit`

export type ConsoleLike = {
    log: (message: string, ...args: unknown[]) => void
    debug: (message: string, ...args: unknown[]) => void
    info: (message: string, ...args: unknown[]) => void
    warn: (message: string, ...args: unknown[]) => void
    error: (message: string, ...args: unknown[]) => void
}

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
    createdAt?: number
    transcripts?: TranscriberData[]
    analysisData?: AudioAnalysis // Analysis data for the recording depending on enableProcessing flag
    compression?: CompressionInfo & {
        compressedFileUri: string
    }
}

export interface StartRecordingResult {
    fileUri: string
    mimeType: string
    channels?: number
    bitDepth?: BitDepth
    sampleRate?: SampleRate
    compression?: CompressionInfo & {
        compressedFileUri: string
    }
}

export interface AudioSessionConfig {
    category?:
        | 'Ambient'
        | 'SoloAmbient'
        | 'Playback'
        | 'Record'
        | 'PlayAndRecord'
        | 'MultiRoute'
    mode?:
        | 'Default'
        | 'VoiceChat'
        | 'VideoChat'
        | 'GameChat'
        | 'VideoRecording'
        | 'Measurement'
        | 'MoviePlayback'
        | 'SpokenAudio'
    categoryOptions?: (
        | 'MixWithOthers'
        | 'DuckOthers'
        | 'InterruptSpokenAudioAndMixWithOthers'
        | 'AllowBluetooth'
        | 'AllowBluetoothA2DP'
        | 'AllowAirPlay'
        | 'DefaultToSpeaker'
    )[]
}

export interface IOSConfig {
    audioSession?: AudioSessionConfig
}

// Add new type for interruption reasons
export type RecordingInterruptionReason =
    | 'audioFocusLoss'
    | 'audioFocusGain'
    | 'phoneCall'
    | 'phoneCallEnded'
    | 'recordingStopped'

// Add new interface for interruption events
export interface RecordingInterruptionEvent {
    reason: RecordingInterruptionReason
    isPaused: boolean
}

export interface RecordingConfig {
    // Sample rate for recording (16000, 44100, or 48000 Hz)
    sampleRate?: SampleRate

    // Number of audio channels (1 for mono, 2 for stereo)
    channels?: 1 | 2

    // Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)
    encoding?: EncodingType

    // Interval in milliseconds at which to emit recording data
    interval?: number

    // Interval in milliseconds at which to emit analysis data
    intervalAnalysis?: number

    // Keep the device awake while recording (default is false)
    keepAwake?: boolean

    // Show a notification during recording (default is false)
    showNotification?: boolean

    // Show waveform in the notification (Android only, when showNotification is true)
    showWaveformInNotification?: boolean

    // Configuration for the notification
    notification?: NotificationConfig

    // Enable audio processing (default is false)
    enableProcessing?: boolean

    // iOS-specific configuration
    ios?: IOSConfig

    // Duration of each segment in milliseconds (default: 100)
    segmentDurationMs?: number

    // Feature options to extract (default is empty)
    features?: AudioFeaturesOptions

    // Callback function to handle audio stream
    onAudioStream?: (_: AudioDataEvent) => Promise<void>

    // Callback function to handle audio features extraction results
    onAudioAnalysis?: (_: AudioAnalysisEvent) => Promise<void>

    compression?: {
        enabled: boolean
        format: 'aac' | 'opus'
        bitrate?: number
    }

    // Whether to automatically resume recording after an interruption (default is false)
    autoResumeAfterInterruption?: boolean

    // Optional callback to handle recording interruptions
    onRecordingInterrupted?: (_: RecordingInterruptionEvent) => void

    // Optional output configuration
    outputDirectory?: string // If not provided, uses default app directory
    filename?: string // If not provided, uses UUID
}

export interface NotificationConfig {
    // Title of the notification
    title?: string

    // Main text content of the notification
    text?: string

    // Icon to be displayed in the notification (resource name or URI)
    icon?: string

    // Android-specific notification configuration
    android?: {
        // Unique identifier for the notification channel
        channelId?: string

        // User-visible name of the notification channel
        channelName?: string

        // User-visible description of the notification channel
        channelDescription?: string

        // Unique identifier for this notification
        notificationId?: number

        // List of actions that can be performed from the notification
        actions?: NotificationAction[]

        // Configuration for the waveform visualization in the notification
        waveform?: WaveformConfig

        // Color of the notification LED (if device supports it)
        lightColor?: string

        // Priority of the notification (affects how it's displayed)
        priority?: 'min' | 'low' | 'default' | 'high' | 'max'

        // Accent color for the notification (used for the app icon and buttons)
        accentColor?: string
    }

    // iOS-specific notification configuration
    ios?: {
        // Identifier for the notification category (used for grouping similar notifications)
        categoryIdentifier?: string
    }
}

export interface NotificationAction {
    // Display title for the action
    title: string

    // Unique identifier for the action
    identifier: string

    // Icon to be displayed for the action (Android only)
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

export interface ExtractAudioDataOptions {
    fileUri: string
    // Time-based range (mutually exclusive with byte-based range)
    startTimeMs?: number
    endTimeMs?: number
    // Byte-based range (mutually exclusive with time-based range)
    position?: number
    length?: number
    /** Include normalized audio data in [-1, 1] range */
    includeNormalizedData?: boolean
    /** Include base64 encoded string representation of the audio data */
    includeBase64Data?: boolean
    /** Include WAV header in the PCM data (makes it a valid WAV file) */
    includeWavHeader?: boolean
    /** Logger for debugging - can pass console directly. */
    logger?: ConsoleLike
    /** Compute the checksum of the pcm data */
    computeChecksum?: boolean
    /** Target config for the normalized audio (Android and Web) */
    decodingOptions?: DecodingConfig
}

export interface ExtractedAudioData {
    /** Raw PCM audio data */
    pcmData: Uint8Array
    /** Normalized audio data in [-1, 1] range (when includeNormalizedData is true) */
    normalizedData?: Float32Array
    /** Base64 encoded string representation of the audio data (when includeBase64Data is true) */
    base64Data?: string
    /** Sample rate in Hz (e.g., 44100, 48000) */
    sampleRate: number
    /** Number of audio channels (1 for mono, 2 for stereo) */
    channels: number
    /** Bits per sample (8, 16, or 32) */
    bitDepth: BitDepth
    /** Duration of the audio in milliseconds */
    durationMs: number
    /** PCM format identifier (e.g., "pcm_16bit") */
    format: PCMFormat
    /** Total number of audio samples per channel */
    samples: number
    /** Whether the pcmData includes a WAV header */
    hasWavHeader?: boolean
    /** CRC32 Checksum of pcm data */
    checksum?: number
}

export interface UseAudioRecorderState {
    startRecording: (_: RecordingConfig) => Promise<StartRecordingResult>
    stopRecording: () => Promise<AudioRecording | null>
    pauseRecording: () => Promise<void>
    resumeRecording: () => Promise<void>
    isRecording: boolean
    isPaused: boolean
    durationMs: number // Duration of the recording
    size: number // Size in bytes of the recorded audio
    compression?: CompressionInfo
    analysisData?: AudioAnalysis // Analysis data for the recording depending on enableProcessing flag
    onRecordingInterrupted?: (_: RecordingInterruptionEvent) => void
}

/**
 * Represents an event emitted during the trimming process to report progress.
 */
export interface TrimProgressEvent {
    /**
     * The percentage of the trimming process that has been completed, ranging from 0 to 100.
     */
    progress: number

    /**
     * The number of bytes that have been processed so far. This is optional and may not be provided in all implementations.
     */
    bytesProcessed?: number

    /**
     * The total number of bytes to process. This is optional and may not be provided in all implementations.
     */
    totalBytes?: number
}

/**
 * Defines a time range in milliseconds for trimming operations.
 */
export interface TimeRange {
    /**
     * The start time of the range in milliseconds.
     */
    startTimeMs: number

    /**
     * The end time of the range in milliseconds.
     */
    endTimeMs: number
}

/**
 * Options for configuring the audio trimming operation.
 */
export interface TrimAudioOptions {
    /**
     * The URI of the audio file to trim.
     */
    fileUri: string

    /**
     * The mode of trimming to apply.
     * - `'single'`: Trims the audio to a single range defined by `startTimeMs` and `endTimeMs`.
     * - `'keep'`: Keeps the specified `ranges` and removes all other portions of the audio.
     * - `'remove'`: Removes the specified `ranges` and keeps the remaining portions of the audio.
     * @default 'single'
     */
    mode?: 'single' | 'keep' | 'remove'

    /**
     * An array of time ranges to keep or remove, depending on the `mode`.
     * - Required for `'keep'` and `'remove'` modes.
     * - Ignored when `mode` is `'single'`.
     */
    ranges?: TimeRange[]

    /**
     * The start time in milliseconds for the `'single'` mode.
     * - If not provided, trimming starts from the beginning of the audio (0 ms).
     */
    startTimeMs?: number

    /**
     * The end time in milliseconds for the `'single'` mode.
     * - If not provided, trimming extends to the end of the audio.
     */
    endTimeMs?: number

    /**
     * The name of the output file. If not provided, a default name will be generated.
     */
    outputFileName?: string

    /**
     * Configuration for the output audio format.
     */
    outputFormat?: {
        /**
         * The format of the output audio file.
         * - `'wav'`: Waveform Audio File Format (uncompressed).
         * - `'aac'`: Advanced Audio Coding (compressed).
         * - `'opus'`: Opus Interactive Audio Codec (compressed).
         */
        format: 'wav' | 'aac' | 'opus'

        /**
         * The sample rate of the output audio in Hertz (Hz).
         * - If not provided, the input audio's sample rate is used.
         */
        sampleRate?: number

        /**
         * The number of channels in the output audio (e.g., 1 for mono, 2 for stereo).
         * - If not provided, the input audio's channel count is used.
         */
        channels?: number

        /**
         * The bit depth of the output audio, applicable to PCM formats like `'wav'`.
         * - If not provided, the input audio's bit depth is used.
         */
        bitDepth?: number

        /**
         * The bitrate of the output audio in bits per second, applicable to compressed formats like `'aac'`.
         * - If not provided, a default bitrate is used based on the format.
         */
        bitrate?: number
    }

    /**
     * Options for decoding the input audio file.
     * - See `DecodingConfig` for details.
     */
    decodingOptions?: DecodingConfig
}

/**
 * Result of the audio trimming operation.
 */
export interface TrimAudioResult {
    /**
     * The URI of the trimmed audio file.
     */
    uri: string

    /**
     * The filename of the trimmed audio file.
     */
    filename: string

    /**
     * The duration of the trimmed audio in milliseconds.
     */
    durationMs: number

    /**
     * The size of the trimmed audio file in bytes.
     */
    size: number

    /**
     * The sample rate of the trimmed audio in Hertz (Hz).
     */
    sampleRate: number

    /**
     * The number of channels in the trimmed audio (e.g., 1 for mono, 2 for stereo).
     */
    channels: number

    /**
     * The bit depth of the trimmed audio, applicable to PCM formats like `'wav'`.
     */
    bitDepth: number

    /**
     * The MIME type of the trimmed audio file (e.g., `'audio/wav'`, `'audio/mpeg'`).
     */
    mimeType: string

    /**
     * Information about compression if the output format is compressed.
     */
    compression?: {
        /**
         * The format of the compression (e.g., `'aac'`, `'mp3'`, `'opus'`).
         */
        format: string

        /**
         * The bitrate of the compressed audio in bits per second.
         */
        bitrate: number

        /**
         * The size of the compressed audio file in bytes.
         */
        size: number
    }
    
    /**
     * Information about the processing time.
     */
    processingInfo?: {
        /**
         * The time it took to process the audio in milliseconds.
         */
        durationMs: number
    }
}
