[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimProgressEvent

# Interface: TrimProgressEvent

Defined in: [src/ExpoAudioStream.types.ts:680](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L680)

Represents an event emitted during the trimming process to report progress.

## Properties

### bytesProcessed?

> `optional` **bytesProcessed**: `number`

Defined in: [src/ExpoAudioStream.types.ts:689](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L689)

The number of bytes that have been processed so far. This is optional and may not be provided in all implementations.

***

### progress

> **progress**: `number`

Defined in: [src/ExpoAudioStream.types.ts:684](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L684)

The percentage of the trimming process that has been completed, ranging from 0 to 100.

***

### totalBytes?

> `optional` **totalBytes**: `number`

Defined in: [src/ExpoAudioStream.types.ts:694](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L694)

The total number of bytes to process. This is optional and may not be provided in all implementations.
