---
id: extract-audio-analysis
title: extractAudioAnalysis
sidebar_label: extractAudioAnalysis
---


# Extract Audio Analysis

The `extractAudioAnalysis` function is used to extract audio analysis data from a recording file. This function processes the audio data and returns an `AudioAnalysis` object. This information can be used to visualize audio, as demonstrated in the playground app.

## Interface

```ts
export interface ExtractAudioAnalysisProps {
    fileUri?: string // should provide either fileUri or arrayBuffer
    wavMetadata?: WavFileInfo
    arrayBuffer?: ArrayBuffer
    bitDepth?: number
    skipWavHeader?: boolean
    durationMs?: number
    sampleRate?: number
    numberOfChannels?: number
    algorithm?: 'peak' | 'rms'
    position?: number // Optional number of bytes to skip. Default is 0
    length?: number // Optional number of bytes to read.
    pointsPerSecond?: number // Optional number of points per second. Use to reduce the number of points and compute the number of datapoints to return.
    features?: AudioFeaturesOptions
    featuresExtratorUrl?: string
}

export const extractAudioAnalysis: (props: ExtractAudioAnalysisProps) => Promise<AudioAnalysis>
```

## Example Usage


Here’s an example of how to use the extractAudioAnalysis function to extract audio analysis data from a file:


```tsx
import { extractAudioAnalysis } from '@siteed/expo-audio-stream';

const analysisProps = {
    fileUri: 'path/to/audio/file.wav',
    pointsPerSecond: 20,
    sampleRate: 44100,
    numberOfChannels: 1,
    algorithm: 'rms',
    features: {
        energy: true,
        rms: true,
        zcr: true,
    },
};

const analysis = await extractAudioAnalysis(analysisProps);
console.log('Audio Analysis:', analysis);

```

The `extractAudioAnalysis` function can be used to get detailed information from any audio file. This information can be useful for visualizing audio data, as demonstrated in the playground app.

