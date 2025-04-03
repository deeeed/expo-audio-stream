---
id: recording-config
title: Recording Configuration
sidebar_label: Recording Configuration
---

The recording configuration specifies the settings used for audio recording on different platforms. Below are the default settings for Android, iOS, and web platforms:

- On Android: 16kHz sample rate, 16-bit depth, 1 channel.
- On IOS: 48kHz sample rate, 16-bit depth, 1 channel.
- On the web, default configuration is 44.1kHz sample rate, 32-bit depth, 1 channel.

> **Note on iOS Recording**: The library now automatically detects and adapts to the hardware's actual sample rate on both iOS devices and simulators. This means you can specify any supported sample rate (e.g., 16kHz, 44.1kHz, 48kHz) in your configuration, and the library will:
> 
> 1. Capture audio at the hardware's native sample rate (typically 44.1kHz on simulators)
> 2. Perform high-quality resampling to match your requested sample rate
> 3. Deliver the final recording at your specified configuration
> 
> This automatic adaptation prevents crashes that previously occurred when the requested sample rate didn't match the hardware capabilities, especially in simulators.

```tsx
export interface RecordingConfig {
    sampleRate?: SampleRate // Sample rate for recording (16000, 44100, or 48000 Hz)
    channels?: 1 | 2 // Number of audio channels (1 for mono, 2 for stereo)
    encoding?: EncodingType // Encoding type for the recording (pcm_32bit, pcm_16bit, pcm_8bit)
    interval?: number // Interval in milliseconds at which to emit recording data

    // Device and notification settings
    keepAwake?: boolean // Continue recording when app is in background (default is true)
    showNotification?: boolean // Show a notification during recording (default is false)
    showWaveformInNotification?: boolean // Show waveform in the notification (Android only)
    notification?: NotificationConfig // Configuration for the notification

    // Audio processing settings
    enableProcessing?: boolean // Enable audio processing (default is false)
    pointsPerSecond?: number // Number of data points to extract per second of audio (default is 10)
    algorithm?: AmplitudeAlgorithm // Algorithm to use for amplitude computation (default is "rms")
    features?: AudioFeaturesOptions // Feature options to extract (default is empty)

    // Platform specific configuration
    ios?: IOSConfig // iOS-specific configuration

    // Compression settings
    compression?: {
        enabled: boolean
        format: 'aac' | 'opus'  // Available compression formats
        bitrate?: number
    }

    // Output configuration
    outputDirectory?: string // Custom directory for saving recordings (uses app default if not specified)
    filename?: string // Custom filename for the recording (uses UUID if not specified)

    // Interruption handling
    autoResumeAfterInterruption?: boolean // Whether to automatically resume after interruption
    onRecordingInterrupted?: (_: RecordingInterruptionEvent) => void // Callback for interruption events

    // Callback functions
    onAudioStream?: (_: AudioDataEvent) => Promise<void> // Callback function to handle audio stream
    onAudioAnalysis?: (_: AudioAnalysisEvent) => Promise<void> // Callback function to handle audio features
}

```

## Platform-Specific Architecture

### Web

On the web, the recording utilizes the `AudioWorkletProcessor` for handling audio data. The `AudioWorkletProcessor` allows for real-time audio processing directly in the browser, making it a powerful tool for web-based audio applications.

### Android

On Android, the recording is managed using Android's native `AudioRecord` API along with `AudioFormat` and `MediaRecorder`. These classes are part of the Android framework and provide low-level access to audio hardware, allowing for high-quality audio recording.

### iOS

On iOS, the recording is managed using `AVAudioEngine` and related classes from the `AVFoundation` framework. The implementation uses a sophisticated audio handling approach that:
- Automatically detects and adapts to the hardware's native sample rate
- Handles sample rate mismatches between iOS audio session and actual hardware capabilities
- Performs high-quality resampling to match the requested configuration
- Works reliably on both physical devices and simulators regardless of the requested sample rate
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
    compression?: {
        compressedFileUri: string
        size: number
        mimeType: string
        bitrate: number
        format: string
    }
}
```

## Example Usage

```tsx
import { useAudioRecorder } from '@siteed/expo-audio-studio';

const config = {
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_16bit',
    interval: 500,
    enableProcessing: true,
    keepAwake: true,
    showNotification: true,
    compression: {
        enabled: true,
        format: 'aac',
        bitrate: 128000
    },
    pointsPerSecond: 1000,
    algorithm: 'rms',
    features: { energy: true, rms: true },
    autoResumeAfterInterruption: true,
    onAudioStream: async (event) => {
        console.log('Audio data:', event);
    },
    onAudioAnalysis: async (data) => {
        console.log('Processing:', data);
    },
    onRecordingInterrupted: (event) => {
        console.log('Recording interrupted:', event);
    }
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

## Recording Interruption Handling

The library provides robust handling of recording interruptions that may occur during audio capture. These interruptions can happen for various reasons such as incoming phone calls or audio focus changes.

### Interruption Types

The `RecordingInterruptionEvent` includes the following possible reasons for interruption:

```tsx
type RecordingInterruptionReason =
    | 'audioFocusLoss'    // Another app has taken audio focus
    | 'audioFocusGain'    // Audio focus has been regained
    | 'phoneCall'         // An incoming phone call has interrupted recording
    | 'phoneCallEnded'    // The interrupting phone call has ended
```

### Handling Interruptions

You can handle interruptions in two ways:

1. **Automatic Resume**: Set `autoResumeAfterInterruption: true` in your config to automatically resume recording after an interruption ends.

2. **Manual Handling**: Use the `onRecordingInterrupted` callback to implement custom interruption handling:

```tsx
const config = {
    // ... other config options ...
    autoResumeAfterInterruption: false,
    onRecordingInterrupted: (event) => {
        const { reason, isPaused } = event;
        
        switch (reason) {
            case 'phoneCall':
                console.log('Recording paused due to phone call');
                break;
            case 'phoneCallEnded':
                console.log('Phone call ended, can resume recording');
                break;
            case 'audioFocusLoss':
                console.log('Audio focus lost to another app');
                break;
            case 'audioFocusGain':
                console.log('Audio focus regained');
                break;
        }
        
        console.log('Recording is currently paused:', isPaused);
    }
};
```

### Platform Behavior

- **iOS**: 
  - Interruptions are handled through the AVAudioSession system
  - Phone call handling is enabled by default (can be disabled via `enablePhoneStateHandling: false`)
- **Android**: 
  - Interruptions are managed via AudioManager focus changes
  - Phone call handling is enabled by default (can be disabled via `enablePhoneStateHandling: false`)
- **Web**: 
  - Interruptions are handled through the Web Audio API's state changes
  - Phone call handling is not supported
