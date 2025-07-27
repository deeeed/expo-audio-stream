[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimProgressEvent

# Interface: TrimProgressEvent

Defined in: [src/ExpoAudioStream.types.ts:683](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L683)

Represents an event emitted during the trimming process to report progress.

## Properties

### bytesProcessed?

> `optional` **bytesProcessed**: `number`

Defined in: [src/ExpoAudioStream.types.ts:692](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L692)

The number of bytes that have been processed so far. This is optional and may not be provided in all implementations.

***

### progress

> **progress**: `number`

Defined in: [src/ExpoAudioStream.types.ts:687](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L687)

The percentage of the trimming process that has been completed, ranging from 0 to 100.

***

### totalBytes?

> `optional` **totalBytes**: `number`

Defined in: [src/ExpoAudioStream.types.ts:697](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L697)

The total number of bytes to process. This is optional and may not be provided in all implementations.
