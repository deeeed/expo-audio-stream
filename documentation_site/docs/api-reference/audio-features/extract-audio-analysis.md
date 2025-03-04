---
id: extract-audio-analysis
title: extractAudioAnalysis
sidebar_label: extractAudioAnalysis
---


# Extract Audio Analysis

The `extractAudioAnalysis` function is used to extract audio analysis data from a recording file. This function processes the audio data and returns an `AudioAnalysis` object. This information can be used to visualize audio, as demonstrated in the playground app.

## Interface

```ts
// You can provide either time-based options or byte-range options
export type ExtractAudioAnalysisProps = TimeRangeOptions | ByteRangeOptions

// Base options for all extractions
interface BaseExtractOptions {
    fileUri?: string // Path to audio file
    arrayBuffer?: ArrayBuffer // Raw audio buffer
    segmentDurationMs?: number // Duration of each analysis segment in milliseconds (default: 100ms)
    features?: AudioFeaturesOptions // Which audio features to extract
    decodingOptions?: DecodingConfig // Options for decoding the audio
    logger?: ConsoleLike // Optional logger for debugging
}

// Time-based extraction (using millisecond timestamps)
interface TimeRangeOptions extends BaseExtractOptions {
    startTimeMs?: number // Start time in milliseconds
    endTimeMs?: number // End time in milliseconds
    position?: never // Cannot use with time-based options
    length?: never // Cannot use with time-based options
}

// Byte-based extraction (using byte positions)
interface ByteRangeOptions extends BaseExtractOptions {
    position?: number // Number of bytes to skip from the start
    length?: number // Number of bytes to read
    startTimeMs?: never // Cannot use with byte-based options
    endTimeMs?: never // Cannot use with byte-based options
}

// Audio decoding configuration
interface DecodingConfig {
    targetSampleRate?: number // Target sample rate for decoded audio
    targetChannels?: number // Target number of channels
    targetBitDepth?: BitDepth // Target bit depth (8, 16, or 32)
    normalizeAudio?: boolean // Whether to normalize audio levels
}

// Audio features options (all are optional booleans)
interface AudioFeaturesOptions {
    energy?: boolean // Extract energy feature
    mfcc?: boolean // Extract MFCC coefficients
    rms?: boolean // Extract RMS (loudness)
    zcr?: boolean // Extract zero-crossing rate
    spectralCentroid?: boolean // Extract spectral centroid
    spectralFlatness?: boolean // Extract spectral flatness
    spectralRolloff?: boolean // Extract spectral rolloff
    spectralBandwidth?: boolean // Extract spectral bandwidth
    chromagram?: boolean // Extract chromagram
    tempo?: boolean // Extract tempo estimation
    hnr?: boolean // Extract harmonics-to-noise ratio
    melSpectrogram?: boolean // Extract mel spectrogram
    spectralContrast?: boolean // Extract spectral contrast
    tonnetz?: boolean // Extract tonnetz features
    pitch?: boolean // Extract pitch
    crc32?: boolean // Calculate CRC32 checksum
}
```

## Example Usage

Here's an example of how to use the `extractAudioAnalysis` function to extract audio analysis data from a file:

```tsx
import { extractAudioAnalysis } from '@siteed/expo-audio-studio';

// Time-based extraction with specific features
const analysisResult = await extractAudioAnalysis({
    fileUri: 'path/to/audio/file.wav',
    segmentDurationMs: 100, // 100ms segments
    startTimeMs: 1000, // Start at 1 second
    endTimeMs: 5000, // End at 5 seconds
    features: {
        energy: true,
        rms: true,
        zcr: true,
        spectralCentroid: true,
        mfcc: true,
    },
    decodingOptions: {
        targetSampleRate: 44100,
        targetChannels: 1,
        targetBitDepth: 16,
        normalizeAudio: true,
    },
    logger: console,
});

console.log('Audio Analysis:', analysisResult);

// The result contains detailed information about the audio:
console.log(`Duration: ${analysisResult.durationMs / 1000} seconds`);
console.log(`Sample rate: ${analysisResult.sampleRate} Hz`);
console.log(`Number of data points: ${analysisResult.dataPoints.length}`);

// You can access individual data points and their features
analysisResult.dataPoints.forEach((point, index) => {
    if (point.features) {
        console.log(`Point ${index} at ${point.startTime}ms:`, {
            rms: point.features.rms,
            energy: point.features.energy,
            zcr: point.features.zcr,
        });
    }
});
```

## Return Value: AudioAnalysis

The function returns an `AudioAnalysis` object with the following structure:

```ts
interface AudioAnalysis {
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
    speechAnalysis?: {
        speakerChanges: {
            timestamp: number
            speakerId: number
        }[]
    }
}

interface DataPoint {
    id: number
    amplitude: number // Peak amplitude for the segment
    rms: number // Root mean square value
    dB: number // dBFS (decibels relative to full scale)
    silent: boolean // Whether the segment is silent
    features?: AudioFeatures // Extracted audio features
    speech?: SpeechFeatures // Speech-related features
    startTime?: number // Start time in milliseconds
    endTime?: number // End time in milliseconds
    startPosition?: number // Start position in bytes
    endPosition?: number // End position in bytes
    samples?: number // Number of audio samples in this segment
}
```

## Common Use Cases

1. **Audio Visualization**: Extract amplitude and RMS values to create waveform displays.

2. **Audio Feature Analysis**: Extract spectral features for audio classification or analysis.

3. **Speech Processing**: Use features like MFCC for speech recognition tasks.

4. **Music Analysis**: Use chromagram and tempo features for music information retrieval.

5. **Audio Fingerprinting**: Use a combination of features to create unique audio fingerprints.

For a complete example of how to use audio analysis in a real application, see the [Audio Analysis Example](./audio-analysis-example.md) documentation.

