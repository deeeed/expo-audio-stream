---
id: audio-analysis
title: Audio Features
sidebar_label: Audio Features
---


# Audio Analysis and Features

This section describes the various audio features that can be extracted from an audio recording, including the `AudioFeatures` interface, `AudioAnalysis`, and the `extractAudioAnalysis` function.

## AudioAnalysis

The `AudioAnalysis` interface represents the detailed analysis of an audio signal, including the extracted audio features.

### Interface

```ts
/**
 * Represents the complete data from the audio analysis.
 */
export interface AudioAnalysis {
    segmentDurationMs: number // Duration of each segment in milliseconds
    durationMs: number // Duration of the audio in milliseconds
    bitDepth: number // Bit depth of the audio
    samples: number // Total number of audio samples
    numberOfChannels: number // Number of audio channels
    sampleRate: number // Sample rate of the audio
    dataPoints: DataPoint[] // Array of data points from the analysis
    amplitudeRange: {
        min: number
        max: number
    }
    rmsRange: {
        min: number
        max: number
    }
    // Optional speech analysis data
    speechAnalysis?: {
        speakerChanges: {
            timestamp: number
            speakerId: number
        }[]
    }
}
```

## AudioFeatures

The `AudioFeatures` interface represents various audio features that can be extracted from an audio signal.

### Interface

```ts
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
```

## AudioFeaturesOptions

The `AudioFeaturesOptions` interface specifies which audio features to extract during analysis.

### Interface

```ts
/**
 * Options for specifying which audio features to extract.
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
```

## DataPoint

The `DataPoint` interface represents individual data points extracted from an audio signal during analysis.

### Interface

```ts
/**
 * Represents a single data point in the audio analysis.
 */
export interface DataPoint {
    id: number
    amplitude: number // Peak amplitude for the segment
    rms: number // Root mean square value
    dB: number // dBFS (decibels relative to full scale) computed from RMS value
    silent: boolean // Whether the segment is silent
    features?: AudioFeatures // Optional extracted audio features
    speech?: SpeechFeatures // Optional speech-related features
    startTime?: number // Start time in milliseconds
    endTime?: number // End time in milliseconds
    startPosition?: number // Start position in bytes
    endPosition?: number // End position in bytes
    samples?: number // Number of audio samples in this segment
}
```

## SpeechFeatures

The `SpeechFeatures` interface represents speech-related features extracted from audio.

### Interface

```ts
/**
 * Represents speech-related features extracted from audio.
 */
export interface SpeechFeatures {
    isActive: boolean // Whether speech is detected in this segment
    speakerId?: number // Optional speaker identification
}
```

## Feature Descriptions

### Basic Features

- **RMS (Root Mean Square)**: Measures the average power of the audio signal, correlating with perceived loudness.
- **Energy**: Represents the overall energy content of the audio segment.
- **Zero-Crossing Rate (ZCR)**: Counts how often the signal crosses the zero axis, useful for detecting voiced/unvoiced segments.

### Spectral Features

- **Spectral Centroid**: Indicates the "center of mass" of the spectrum, correlating with the brightness of a sound.
- **Spectral Flatness**: Measures how noise-like (versus tone-like) a sound is.
- **Spectral Rolloff**: The frequency below which a specified percentage of the total spectral energy lies.
- **Spectral Bandwidth**: Measures the width of the spectrum, indicating frequency range.

### Advanced Features

- **MFCC (Mel-Frequency Cepstral Coefficients)**: Compact representation of the spectral envelope, widely used in speech recognition.
- **Chromagram**: Represents the distribution of energy across the 12 pitch classes in music.
- **Tonnetz**: Tonal space features representing harmonic relationships.
- **Pitch**: Estimated fundamental frequency of the audio signal.

## Common Applications

1. **Speech Recognition**: Using MFCC, ZCR, and energy features.
2. **Music Information Retrieval**: Using chromagram, tonnetz, and spectral features.
3. **Audio Classification**: Using combinations of features to identify audio types.
4. **Speaker Identification**: Using MFCC and other spectral features.
5. **Emotion Detection**: Using pitch, energy, and spectral features to detect emotional content.

For practical examples of using these features, see the [Audio Analysis Example](./audio-analysis-example.md) documentation.

