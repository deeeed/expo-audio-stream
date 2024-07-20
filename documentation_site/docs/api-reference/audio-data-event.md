---
id: audio-data-event
title: AudioDataEvent
sidebar_label: AudioDataEvent
---

# AudioDataEvent

The `AudioDataEvent` interface represents the audio data being streamed at the specified interval. The size of the buffer will depend on the `sampleRate` and `encoding` configuration. This buffer can be used for further processing.

## Interface

```ts
export interface AudioDataEvent {
    data: string | ArrayBuffer // The audio data in the specified format
    position: number // The position in the stream
    fileUri: string // The URI of the audio file
    eventDataSize: number // The size of the event data
    totalSize: number // The total size of the recorded data
}
```

## Data Field

The `data` field can be either a `string` or an `ArrayBuffer`:

- **Native (Android/iOS)**: The `data` is a `string` representing the base64-encoded version of the audio binary. We use base64 encoding because we cannot directly access the raw audio data from Android or iOS.
- **Web**: The `data` is an `ArrayBuffer` containing the raw audio data.

## Example Usage

```tsx
import { useAudioRecorder } from '@siteed/expo-audio-stream';

const config = {
    onAudioStream: async (event: AudioDataEvent) => {
        console.log('Audio data:', event);
        // Process the audio data here
    },
};

const {
    startRecording,
} = useAudioRecorder({ debug: true });

const handleStart = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (granted) {
        await startRecording(config);
    }
};

```
