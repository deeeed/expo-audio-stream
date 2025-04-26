[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioStreamStatus

# Interface: AudioStreamStatus

Defined in: [src/ExpoAudioStream.types.ts:22](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L22)

## Properties

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

Defined in: [src/ExpoAudioStream.types.ts:38](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L38)

Information about audio compression if enabled

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:28](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L28)

Duration of the current recording in milliseconds

***

### interval

> **interval**: `number`

Defined in: [src/ExpoAudioStream.types.ts:32](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L32)

Interval in milliseconds at which recording data is emitted

***

### intervalAnalysis

> **intervalAnalysis**: `number`

Defined in: [src/ExpoAudioStream.types.ts:34](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L34)

Interval in milliseconds at which analysis data is emitted

***

### isPaused

> **isPaused**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:26](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L26)

Indicates whether recording is in a paused state

***

### isRecording

> **isRecording**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:24](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L24)

Indicates whether audio recording is currently active

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:36](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L36)

MIME type of the recorded audio (e.g., 'audio/wav')

***

### size

> **size**: `number`

Defined in: [src/ExpoAudioStream.types.ts:30](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L30)

Size of the recorded audio data in bytes
