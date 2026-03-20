---
id: audio-data-event
title: AudioDataEvent
sidebar_label: AudioDataEvent
---

# AudioDataEvent

The `AudioDataEvent` type represents audio data streamed at the configured `interval`. The data format depends on the `streamFormat` setting in your `RecordingConfig`.

## Type Definition

`AudioDataEvent` is a discriminated union of two variants:

```ts
// Common fields shared by both variants
interface AudioDataEventBase {
    position: number        // Position in the recording (seconds)
    fileUri: string         // URI of the audio file being written
    eventDataSize: number   // Size of this chunk in bytes
    totalSize: number       // Total recorded bytes so far
}

// Default mode (streamFormat: 'raw' or unset)
interface AudioDataEventRaw extends AudioDataEventBase {
    data: string | Float32Array | Int16Array
    streamFormat?: undefined | 'raw'
}

// Float32 mode (streamFormat: 'float32')
interface AudioDataEventFloat32 extends AudioDataEventBase {
    data: Float32Array
    streamFormat: 'float32'
}

type AudioDataEvent = AudioDataEventRaw | AudioDataEventFloat32
```

## Data Field

The type of `data` depends on the `streamFormat` setting:

| `streamFormat` | Native (Android/iOS) | Web |
|---|---|---|
| `'raw'` (default) | base64-encoded `string` | `Float32Array` |
| `'float32'` | `Float32Array` | `Float32Array` |

With `streamFormat: 'float32'`, `data` is guaranteed to be `Float32Array` on all platforms — no manual base64 decoding or type checking needed.

## Example Usage

```tsx
import { useAudioRecorder, type AudioDataEvent } from '@siteed/audio-studio';

const { startRecording } = useAudioRecorder({ debug: true });

await startRecording({
    sampleRate: 16000,
    channels: 1,
    streamFormat: 'float32',
    onAudioStream: async (event: AudioDataEvent) => {
        // With streamFormat: 'float32', data is always Float32Array
        const samples = event.data as Float32Array;
        console.log(`Received ${samples.length} samples at position ${event.position}s`);
    },
});
```
