// packages/expo-audio-stream/src/AudioAnalysis/AudioAnalysis.types.ts

import { BitDepth, ConsoleLike } from '../ExpoAudioStream.types'

/**
 * Represents the configuration for decoding audio data.
 */
export interface DecodingConfig {
    /** Target sample rate for decoded audio (Android and Web) */
    targetSampleRate?: number
    /** Target number of channels (Android and Web) */
    targetChannels?: number
    /** Target bit depth (Android and Web) */
    targetBitDepth?: BitDepth
    /** Whether to normalize audio levels (Android and Web) */
    normalizeAudio?: boolean
}

/**
 * Represents speech-related features extracted from audio.
 */
export interface SpeechFeatures {
    isActive: boolean // Whether speech is detected in this segment
    speakerId?: number // Optional speaker identification
    // Could add more speech-related features here like:
    // confidence: number
    // language?: string
    // sentiment?: number
    // etc.
}

/**
 * Represents various audio features extracted from an audio signal.
 */
export interface AudioFeatures {
    energy?: number // The infinite integral of the squared signal, representing the overall energy of the audio.
    mfcc?: number[] // Mel-frequency cepstral coefficients, describing the short-term power spectrum of a sound.
    rms?: number // Root mean square value, indicating the amplitude of the audio signal.
    minAmplitude?: number // Minimum amplitude value in the audio signal.
    maxAmplitude?: number // Maximum amplitude value in the audio signal.
    zcr?: number // Zero-crossing rate, indicating the rate at which the signal changes sign.
    spectralCentroid?: number // The center of mass of the spectrum, indicating the brightness of the sound.
    spectralFlatness?: number // Measure of the flatness of the spectrum, indicating how noise-like the signal is.
    spectralRolloff?: number // The frequency below which a specified percentage (usually 85%) of the total spectral energy lies.
    spectralBandwidth?: number // The width of the spectrum, indicating the range of frequencies present.
    chromagram?: number[] // Chromagram, representing the 12 different pitch classes of the audio.
    tempo?: number // Estimated tempo of the audio signal, measured in beats per minute (BPM).
    hnr?: number // Harmonics-to-noise ratio, indicating the proportion of harmonics to noise in the audio signal.
    melSpectrogram?: number[] // Mel-scaled spectrogram representation of the audio.
    spectralContrast?: number[] // Spectral contrast features representing the difference between peaks and valleys.
    tonnetz?: number[] // Tonal network features representing harmonic relationships.
    pitch?: number // Pitch of the audio signal, measured in Hertz (Hz).
    crc32?: number // crc32 checksum of the audio signal, used to verify the integrity of the audio.
}

/**
 * Options to specify which audio features to extract.
 */
export interface AudioFeaturesOptions {
    energy?: boolean
    mfcc?: boolean
    rms?: boolean
    zcr?: boolean
    spectralCentroid?: boolean
    spectralFlatness?: boolean
    spectralRolloff?: boolean
    spectralBandwidth?: boolean
    chromagram?: boolean
    tempo?: boolean
    hnr?: boolean
    melSpectrogram?: boolean
    spectralContrast?: boolean
    tonnetz?: boolean
    pitch?: boolean
    crc32?: boolean
}

/**
 * Represents a single data point in the audio analysis.
 */
export interface DataPoint {
    id: number
    amplitude: number // Peak amplitude for the segment
    rms: number // Root mean square value
    dB: number // dBFS (decibels relative to full scale) computed from RMS value
    silent: boolean // Always computed
    features?: AudioFeatures
    speech?: SpeechFeatures
    startTime?: number
    endTime?: number
    // start / end position in bytes
    startPosition?: number
    endPosition?: number
    // number of audio samples for this point (samples size depends on bit depth)
    samples?: number
}

/**
 * Represents the complete data from the audio analysis.
 */
export interface AudioAnalysis {
    segmentDurationMs: number // Duration of each segment in milliseconds
    durationMs: number // Duration of the audio in milliseconds
    bitDepth: number // Bit depth of the audio
    samples: number // Size of the audio in bytes
    numberOfChannels: number // Number of audio channels
    sampleRate: number // Sample rate of the audio
    dataPoints: DataPoint[] // Array of data points from the analysis.
    amplitudeRange: {
        min: number
        max: number
    }
    rmsRange: {
        min: number
        max: number
    }
    // TODO: speaker changes into a broader speech analysis section
    speechAnalysis?: {
        speakerChanges: {
            timestamp: number
            speakerId: number
        }[]
        // Could add more speech analysis data here like:
        // dominantSpeaker?: number
        // totalSpeechDuration?: number
        // speakerStats?: { [speakerId: number]: { duration: number, segments: number } }
    }
}

/**
 * Options for specifying a time range within an audio file.
 */
export interface AudioRangeOptions {
    /** Start time in milliseconds */
    startTimeMs?: number
    /** End time in milliseconds */
    endTimeMs?: number
}

/**
 * Options for generating a quick preview of audio waveform.
 * This is optimized for UI rendering with a specified number of points.
 */
export interface PreviewOptions extends AudioRangeOptions {
    /** URI of the audio file to analyze */
    fileUri: string
    /**
     * Total number of points to generate for the preview.
     * @default 100
     */
    numberOfPoints?: number
    /**
     * Optional logger for debugging.
     */
    logger?: ConsoleLike
    /**
     * Optional configuration for decoding the audio file.
     * Defaults to:
     * - targetSampleRate: undefined (keep original)
     * - targetChannels: undefined (keep original)
     * - targetBitDepth: 16
     * - normalizeAudio: false
     */
    decodingOptions?: DecodingConfig
}

// Options for mel-spectrogram extraction
export interface ExtractMelSpectrogramOptions {
    fileUri?: string // Path to audio file
    arrayBuffer?: ArrayBuffer // Raw audio buffer
    windowSizeMs: number // Window size in ms (e.g., 25)
    hopLengthMs: number // Hop length in ms (e.g., 10)
    nMels: number // Number of mel filters (e.g., 60)
    fMin?: number // Min frequency (default: 0)
    fMax?: number // Max frequency (default: sampleRate / 2)
    windowType?: 'hann' | 'hamming' // Window function (default: 'hann')
    normalize?: boolean // Mean normalization (default: false)
    logScale?: boolean // Log scaling of mel energies (default: true)
    decodingOptions?: DecodingConfig // Audio decoding settings
    startTimeMs?: number // Optional start time
    endTimeMs?: number // Optional end time
    logger?: ConsoleLike
}

// Return type
export interface MelSpectrogram {
    spectrogram: number[][] // 2D array [time][mel]
    sampleRate: number // Audio sample rate
    nMels: number // Number of mel filters
    timeSteps: number // Number of time frames
    durationMs: number // Audio duration in ms
}
