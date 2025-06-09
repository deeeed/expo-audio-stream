[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimProgressEvent

# Interface: TrimProgressEvent

Defined in: [src/ExpoAudioStream.types.ts:635](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L635)

Represents an event emitted during the trimming process to report progress.

## Properties

### bytesProcessed?

> `optional` **bytesProcessed**: `number`

Defined in: [src/ExpoAudioStream.types.ts:644](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L644)

The number of bytes that have been processed so far. This is optional and may not be provided in all implementations.

***

### progress

> **progress**: `number`

Defined in: [src/ExpoAudioStream.types.ts:639](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L639)

The percentage of the trimming process that has been completed, ranging from 0 to 100.

***

### totalBytes?

> `optional` **totalBytes**: `number`

Defined in: [src/ExpoAudioStream.types.ts:649](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L649)

The total number of bytes to process. This is optional and may not be provided in all implementations.
