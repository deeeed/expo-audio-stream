---
id: recording-config
title: Recording Configuration
sidebar_label: Recording Configuration
---

The recording configuration specifies the settings used for audio recording on different platforms. Below are the default settings for Android, iOS, and web platforms:

- On Android: 16kHz sample rate, 16-bit depth, 1 channel.
- On IOS: 48kHz sample rate, 16-bit depth, 1 channel.
- On the web, default configuration is 44.1kHz sample rate, 32-bit depth, 1 channel.


```tsx
export interface RecordingConfig {
    sampleRate?: SampleRate // Sample rate for recording
    channels?: 1 | 2 // 1 or 2 (MONO or STEREO)
    encoding?: EncodingType // Encoding type for the recording
    interval?: number // Interval in milliseconds at which to emit recording data

    // Optional parameters for audio processing
    enableProcessing?: boolean // Boolean to enable/disable audio processing (default is false)
    pointsPerSecond?: number // Number of data points to extract per second of audio (default is 1000)
    algorithm?: string // Algorithm to use for amplitude computation (default is "rms")
    features?: AudioFeaturesOptions // Feature options to extract (default is empty)

    onAudioStream?: (_: AudioDataEvent) => Promise<void> // Callback function to handle audio stream
    onAudioAnalysis?: (_: AudioAnalysisEventPayload) => Promise<void> // Callback function to handle audio features extraction results
}

```

## Platform-Specific Architecture

### Web

On the web, the recording utilizes the `AudioWorkletProcessor` for handling audio data. The `AudioWorkletProcessor` allows for real-time audio processing directly in the browser, making it a powerful tool for web-based audio applications.

### Android

On Android, the recording is managed using Android's native `AudioRecord` API along with `AudioFormat` and `MediaRecorder`. These classes are part of the Android framework and provide low-level access to audio hardware, allowing for high-quality audio recording.

### iOS

On iOS, the recording is managed using `AVAudioEngine` and related classes from the `AVFoundation` framework. The implementation uses a sophisticated resampling approach that:
- Captures audio at the hardware's native sample rate
- Performs high-quality resampling to match the requested configuration
- Supports both 16-bit and 32-bit PCM formats
- Maintains audio quality through intermediate Float32 format when necessary

## Platform Differences

### Android and iOS

On Android and iOS, the library attempts to record audio in the specified format. On iOS, the audio is automatically resampled to match the requested configuration using AVAudioConverter, ensuring high-quality output even when the hardware sample rate differs from the target rate.

### Web

On the web, the default configuration is typically higher, with a 44.1kHz sample rate and 32-bit depth. This ensures better sound quality, but it can lead to issues when resampling is required to lower settings.

## Recording Process 

To start recording, you use the `startRecording` function which accepts a `RecordingConfig` object. The output of this function is a `StartRecordingResult`.

```tsx
export interface StartRecordingResult {
    fileUri: string
    mimeType: string
    channels?: number
    bitDepth?: BitDepth
    sampleRate?: SampleRate
}
```

The `StartRecordingResult` provides the actual values used for recording, which can be useful if some properties of `RecordingConfig` are not accepted natively by the platform (e.g., the web only accepts 32-bit PCM).


## Example Usage

```tsx
import { useAudioRecorder } from '@siteed/expo-audio-stream';

const config = {
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_16bit',
    interval: 500,
    enableProcessing: true,
    pointsPerSecond: 1000,
    algorithm: 'rms',
    features: { energy: true, rms: true },
    onAudioStream: async (event) => {
        console.log('Audio data:', event);
    },
    onAudioAnalysis: async (data) => {
        console.log('Processing:', data);
    },
};

const {
    startRecording,
    stopRecording,
    isRecording,
    durationMs,
    size,
} = useAudioRecorder({ debug: true });

const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (granted) {
        const result = await startRecording(config);
        console.log('Recording started with config:', result);
    }
};

const handleStop = async () => {
    const result = await stopRecording();
    console.log('Recording stopped with result:', result);
};
```
