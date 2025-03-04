[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / AudioStreamStatus

# Interface: AudioStreamStatus

## Properties

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

Information about audio compression if enabled

#### Defined in

[src/ExpoAudioStream.types.ts:38](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L38)

***

### durationMs

> **durationMs**: `number`

Duration of the current recording in milliseconds

#### Defined in

[src/ExpoAudioStream.types.ts:28](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L28)

***

### interval

> **interval**: `number`

Interval in milliseconds at which recording data is emitted

#### Defined in

[src/ExpoAudioStream.types.ts:32](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L32)

***

### intervalAnalysis

> **intervalAnalysis**: `number`

Interval in milliseconds at which analysis data is emitted

#### Defined in

[src/ExpoAudioStream.types.ts:34](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L34)

***

### isPaused

> **isPaused**: `boolean`

Indicates whether recording is in a paused state

#### Defined in

[src/ExpoAudioStream.types.ts:26](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L26)

***

### isRecording

> **isRecording**: `boolean`

Indicates whether audio recording is currently active

#### Defined in

[src/ExpoAudioStream.types.ts:24](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L24)

***

### mimeType

> **mimeType**: `string`

MIME type of the recorded audio (e.g., 'audio/wav')

#### Defined in

[src/ExpoAudioStream.types.ts:36](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L36)

***

### size

> **size**: `number`

Size of the recorded audio data in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:30](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L30)
