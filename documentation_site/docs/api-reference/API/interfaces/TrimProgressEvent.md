[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimProgressEvent

# Interface: TrimProgressEvent

Defined in: [src/ExpoAudioStream.types.ts:546](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L546)

Represents an event emitted during the trimming process to report progress.

## Properties

### bytesProcessed?

> `optional` **bytesProcessed**: `number`

Defined in: [src/ExpoAudioStream.types.ts:555](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L555)

The number of bytes that have been processed so far. This is optional and may not be provided in all implementations.

***

### progress

> **progress**: `number`

Defined in: [src/ExpoAudioStream.types.ts:550](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L550)

The percentage of the trimming process that has been completed, ranging from 0 to 100.

***

### totalBytes?

> `optional` **totalBytes**: `number`

Defined in: [src/ExpoAudioStream.types.ts:560](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L560)

The total number of bytes to process. This is optional and may not be provided in all implementations.
