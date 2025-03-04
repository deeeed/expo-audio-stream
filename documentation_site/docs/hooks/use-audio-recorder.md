---
id: use-audio-recorder
title: useAudioRecorder
sidebar_label: useAudioRecorder
---

# useAudioRecorder

The `useAudioRecorder` hook provides methods and state for managing audio recording. It handles starting, stopping, pausing, and resuming recordings, and it provides analysis data for the recorded audio.

## Parameters

### `logger` (optional)

- **Type**: `ConsoleLike`
- **Description**: A console-like object for logging debug information. Must implement `log`, `debug`, `warn`, and `error` methods.
- **Default**: `undefined`

## Usage

```tsx
import { useAudioRecorder, RecordingConfig } from '@siteed/expo-audio-stream'
import { Audio } from 'expo-av'
import { Button, Text, View } from 'react-native'

export default function App() {
    const {
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        isRecording,
        isPaused,
        durationMs,
        size,
        analysisData,
        compression,
    } = useAudioRecorder({
        logger: console,
    })

    const handleStart = async () => {
        const { granted } = await Audio.requestPermissionsAsync()
        if (granted) {
            const config: RecordingConfig = {
                interval: 500, // Emit recording data every 500ms
                enableProcessing: true, // Enable audio analysis
                sampleRate: 44100, // Sample rate in Hz (16000, 44100, or 48000)
                channels: 1, // Mono recording
                encoding: 'pcm_16bit', // PCM encoding (pcm_8bit, pcm_16bit, pcm_32bit)
                
                // Optional: Configure audio compression
                compression: {
                    enabled: false, // Set to true to enable compression
                    format: 'aac', // 'aac' or 'opus'
                    bitrate: 128000, // Bitrate in bits per second
                },
                
                // Optional: Handle audio stream data
                onAudioStream: async (audioData) => {
                    console.log(`onAudioStream`, audioData)
                },
                
                // Optional: Handle audio analysis data
                onAudioAnalysis: async (analysisEvent) => {
                    console.log(`onAudioAnalysis`, analysisEvent)
                },
                
                // Optional: Handle recording interruptions
                onRecordingInterrupted: (event) => {
                    console.log(`Recording interrupted: ${event.reason}`)
                },
                
                // Optional: Auto-resume after interruption
                autoResumeAfterInterruption: false,
            }
            
            await startRecording(config)
        }
    }

    const handleStop = async () => {
        const recording = await stopRecording()
        console.log('Recording saved:', recording.fileUri)
    }

    return (
        <View>
            <Button title="Request Permission" onPress={() => Audio.requestPermissionsAsync()} />
            {isRecording ? (
                <View>
                    <Text>Duration: {durationMs / 1000} seconds</Text>
                    <Text>Size: {size} bytes</Text>
                    <Button title="Pause Recording" onPress={pauseRecording} />
                    <Button title="Stop Recording" onPress={handleStop} />
                </View>
            ) : isPaused ? (
                <View>
                    <Text>Duration: {durationMs / 1000} seconds (Paused)</Text>
                    <Text>Size: {size} bytes</Text>
                    <Button title="Resume Recording" onPress={resumeRecording} />
                    <Button title="Stop Recording" onPress={handleStop} />
                </View>
            ) : (
                <View>
                    <Button title="Start Recording" onPress={handleStart} />
                </View>
            )}
        </View>
    )
}
```

## UseAudioRecorderState

The `useAudioRecorder` hook returns an object with the following properties:

- **startRecording**: Function to start recording with the given configuration.
    ```ts
    startRecording: (config: RecordingConfig) => Promise<StartRecordingResult>
    ```

- **stopRecording**: Function to stop recording and get the result.
    ```ts
    stopRecording: () => Promise<AudioRecording>
    ```

- **pauseRecording**: Function to pause the current recording.
    ```ts
    pauseRecording: () => Promise<void>
    ```

- **resumeRecording**: Function to resume a paused recording.
    ```ts
    resumeRecording: () => Promise<void>
    ```

- **isRecording**: `boolean` - Indicates if recording is in progress.
- **isPaused**: `boolean` - Indicates if the recording is paused.
- **durationMs**: `number` - Duration of the recording in milliseconds.
- **size**: `number` - Size of the recorded audio in bytes.
- **compression**: `CompressionInfo | undefined` - Information about compression if enabled.
- **analysisData**: `AudioAnalysis | undefined` - Analysis data for the recording. Only available if `enableProcessing` is set to `true` in the `startRecording` configuration.

## RecordingConfig Options

The `startRecording` function accepts a configuration object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `interval` | `number` | Interval in milliseconds at which to emit recording data |
| `intervalAnalysis` | `number` | Interval in milliseconds at which to emit analysis data |
| `enableProcessing` | `boolean` | Whether to enable audio analysis |
| `sampleRate` | `16000 \| 44100 \| 48000` | Sample rate in Hz |
| `channels` | `1 \| 2` | Number of audio channels (1 for mono, 2 for stereo) |
| `encoding` | `'pcm_8bit' \| 'pcm_16bit' \| 'pcm_32bit'` | PCM encoding format |
| `compression` | `{ enabled: boolean, format: 'aac' \| 'opus', bitrate: number }` | Audio compression settings |
| `onAudioStream` | `(audioData: AudioDataEvent) => Promise<void>` | Callback for audio stream data |
| `onAudioAnalysis` | `(analysisEvent: AudioAnalysisEvent) => Promise<void>` | Callback for audio analysis data |
| `onRecordingInterrupted` | `(event: RecordingInterruptionEvent) => void` | Callback for recording interruptions |
| `autoResumeAfterInterruption` | `boolean` | Whether to automatically resume recording after an interruption |

For more detailed examples, see the [Standalone Recording](../usage/standalone-recording.md) documentation.

