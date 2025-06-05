[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimProgressEvent

# Interface: TrimProgressEvent

Defined in: [src/ExpoAudioStream.types.ts:617](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L617)

Represents an event emitted during the trimming process to report progress.

## Properties

### bytesProcessed?

> `optional` **bytesProcessed**: `number`

Defined in: [src/ExpoAudioStream.types.ts:626](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L626)

The number of bytes that have been processed so far. This is optional and may not be provided in all implementations.

***

### progress

> **progress**: `number`

Defined in: [src/ExpoAudioStream.types.ts:621](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L621)

The percentage of the trimming process that has been completed, ranging from 0 to 100.

***

### totalBytes?

> `optional` **totalBytes**: `number`

Defined in: [src/ExpoAudioStream.types.ts:631](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L631)

The total number of bytes to process. This is optional and may not be provided in all implementations.
