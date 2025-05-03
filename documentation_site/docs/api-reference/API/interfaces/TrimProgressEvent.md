[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimProgressEvent

# Interface: TrimProgressEvent

Defined in: [src/ExpoAudioStream.types.ts:566](https://github.com/deeeed/expo-audio-stream/blob/801aa6585cbafa9b58a81bf4356176436fc03ce1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L566)

Represents an event emitted during the trimming process to report progress.

## Properties

### bytesProcessed?

> `optional` **bytesProcessed**: `number`

Defined in: [src/ExpoAudioStream.types.ts:575](https://github.com/deeeed/expo-audio-stream/blob/801aa6585cbafa9b58a81bf4356176436fc03ce1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L575)

The number of bytes that have been processed so far. This is optional and may not be provided in all implementations.

***

### progress

> **progress**: `number`

Defined in: [src/ExpoAudioStream.types.ts:570](https://github.com/deeeed/expo-audio-stream/blob/801aa6585cbafa9b58a81bf4356176436fc03ce1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L570)

The percentage of the trimming process that has been completed, ranging from 0 to 100.

***

### totalBytes?

> `optional` **totalBytes**: `number`

Defined in: [src/ExpoAudioStream.types.ts:580](https://github.com/deeeed/expo-audio-stream/blob/801aa6585cbafa9b58a81bf4356176436fc03ce1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L580)

The total number of bytes to process. This is optional and may not be provided in all implementations.
