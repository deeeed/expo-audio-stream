// packages/expo-audio-stream/src/AudioAnalysis/AudioAnalysis.types.ts

/**
 * Represents various audio features extracted from an audio signal.
 */
export interface AudioFeatures {
    energy: number // The infinite integral of the squared signal, representing the overall energy of the audio.
    mfcc: number[] // Mel-frequency cepstral coefficients, describing the short-term power spectrum of a sound.
    rms: number // Root mean square value, indicating the amplitude of the audio signal.
    minAmplitude: number // Minimum amplitude value in the audio signal.
    maxAmplitude: number // Maximum amplitude value in the audio signal.
    zcr: number // Zero-crossing rate, indicating the rate at which the signal changes sign.
    spectralCentroid: number // The center of mass of the spectrum, indicating the brightness of the sound.
    spectralFlatness: number // Measure of the flatness of the spectrum, indicating how noise-like the signal is.
    spectralRolloff: number // The frequency below which a specified percentage (usually 85%) of the total spectral energy lies.
    spectralBandwidth: number // The width of the spectrum, indicating the range of frequencies present.
    chromagram: number[] // Chromagram, representing the 12 different pitch classes of the audio.
    tempo: number // Estimated tempo of the audio signal, measured in beats per minute (BPM).
    hnr: number // Harmonics-to-noise ratio, indicating the proportion of harmonics to noise in the audio signal.
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
}

/**
 * Represents a single data point in the audio analysis.
 */
export interface DataPoint {
    id: number
    amplitude: number
    activeSpeech?: boolean
    dB?: number
    silent?: boolean
    features?: AudioFeatures
    startTime?: number
    endTime?: number
    // start / end position in bytes
    startPosition?: number
    endPosition?: number
    // number of audio samples for this point (samples size depends on bit depth)
    samples?: number
    // TODO: speaker detection
    speaker?: number
}

/**
 * Represents the complete data from the audio analysis.
 */
export interface AudioAnalysis {
    pointsPerSecond: number // How many consolidated value per second
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
    // TODO: speaker detection
    speakerChanges?: {
        timestamp: number // Timestamp of the speaker change in milliseconds.
        speaker: number // Speaker identifier.
    }[]
}

export interface AudioAnalysisEventPayload {
    analysis: AudioAnalysis
}
