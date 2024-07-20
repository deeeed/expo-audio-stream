---
id: use-audio-recorder
title: useAudioRecorder
sidebar_label: useAudioRecorder
---

# useAudioRecorder

The `useAudioRecorder` hook provides methods and state for managing audio recording. It handles starting, stopping, pausing, and resuming recordings, and it provides analysis data for the recorded audio.


## Parameters

### `debug` (optional)

- **Type**: `boolean`
- **Description**: Enables or disables debug logging.
- **Default**: `false`

### `audioWorkletUrl` (optional)

- **Type**: `string`
- **Description**: URL for the audio worklet (only for web). This parameter is primarily used during development or when you need to overwrite the default audio worklets. It allows you to specify a custom URL for the audio worklet script.
- **Default**: `undefined`

### `featuresExtratorUrl` (optional)

- **Type**: `string`
- **Description**: URL for the features extractor (only for web). Similar to `audioWorkletUrl`, this parameter is used during development or when you need to overwrite the default features extractor. It allows you to specify a custom URL for the features extractor script.
- **Default**

## Usage

```tsx
import { useAudioRecorder } from '@siteed/expo-audio-stream'

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
    } = useAudioRecorder({
        debug: true,
    })

    const handleStart = async () => {
        const { granted } = await Audio.requestPermissionsAsync()
        if (granted) {
            await startRecording({ interval: 500 })
        }
    }

    const handleStop = async () => {
        await stopRecording()
    }

    return (
        <View>
            <Button title="Request Permission" onPress={() => Audio.requestPermissionsAsync()} />
            {isRecording ? (
                <View>
                    <Text>Duration: {durationMs} ms</Text>
                    <Text>Size: {size} bytes</Text>
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
    stopRecording: () => Promise<AudioRecordingResult | null>
    ```

- **pauseRecording**: Function to pause the current recording.
    ```ts
    pauseRecording: () => void
    ```

- **resumeRecording**: Function to resume a paused recording.
    ```ts
    resumeRecording: () => void
    ```

- **isRecording**: `boolean` - Indicates if recording is in progress.
- **isPaused**: `boolean` - Indicates if the recording is paused.
- **durationMs**: `number` - Duration of the recording in milliseconds.
- **size**: `number` - Size of the recorded audio in bytes.
- **analysisData**: `AudioAnalysis` - Analysis data for the recording. Only available if `enableProcessing` is set to `true` in the `startRecording` configuration.

For detailed information about the types used in the result, see the [API Reference](../api-reference).
