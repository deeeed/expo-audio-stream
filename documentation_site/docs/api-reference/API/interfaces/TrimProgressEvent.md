[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimProgressEvent

# Interface: TrimProgressEvent

Represents an event emitted during the trimming process to report progress.

## Properties

### bytesProcessed?

> `optional` **bytesProcessed**: `number`

The number of bytes that have been processed so far. This is optional and may not be provided in all implementations.

#### Defined in

[src/ExpoAudioStream.types.ts:459](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L459)

***

### progress

> **progress**: `number`

The percentage of the trimming process that has been completed, ranging from 0 to 100.

#### Defined in

[src/ExpoAudioStream.types.ts:454](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L454)

***

### totalBytes?

> `optional` **totalBytes**: `number`

The total number of bytes to process. This is optional and may not be provided in all implementations.

#### Defined in

[src/ExpoAudioStream.types.ts:464](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L464)
