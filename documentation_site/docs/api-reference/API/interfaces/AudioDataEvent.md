[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioDataEvent

# Interface: AudioDataEvent

## Properties

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

Information about compression if enabled, including the compressed data chunk

#### Type declaration

##### data?

> `optional` **data**: `string` \| `Blob`

Base64 (native) or Blob (web) encoded compressed data chunk

#### Defined in

[src/ExpoAudioStream.types.ts:53](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L53)

***

### data

> **data**: `string` \| `Float32Array`

Audio data as base64 string (native) or Float32Array (web)

#### Defined in

[src/ExpoAudioStream.types.ts:43](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L43)

***

### eventDataSize

> **eventDataSize**: `number`

Size of the current data chunk in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:49](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L49)

***

### fileUri

> **fileUri**: `string`

URI to the file being recorded

#### Defined in

[src/ExpoAudioStream.types.ts:47](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L47)

***

### position

> **position**: `number`

Current position in the audio stream in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:45](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L45)

***

### totalSize

> **totalSize**: `number`

Total size of the recording so far in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:51](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L51)
