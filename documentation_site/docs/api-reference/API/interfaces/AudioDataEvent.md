[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioDataEvent

# Interface: AudioDataEvent

Defined in: [src/ExpoAudioStream.types.ts:41](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L41)

## Properties

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

Defined in: [src/ExpoAudioStream.types.ts:53](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L53)

Information about compression if enabled, including the compressed data chunk

#### Type declaration

##### data?

> `optional` **data**: `string` \| `Blob`

Base64 (native) or Blob (web) encoded compressed data chunk

***

### data

> **data**: `string` \| `Float32Array`\<`ArrayBufferLike`\>

Defined in: [src/ExpoAudioStream.types.ts:43](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L43)

Audio data as base64 string (native) or Float32Array (web)

***

### eventDataSize

> **eventDataSize**: `number`

Defined in: [src/ExpoAudioStream.types.ts:49](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L49)

Size of the current data chunk in bytes

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:47](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L47)

URI to the file being recorded

***

### position

> **position**: `number`

Defined in: [src/ExpoAudioStream.types.ts:45](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L45)

Current position in the audio stream in bytes

***

### totalSize

> **totalSize**: `number`

Defined in: [src/ExpoAudioStream.types.ts:51](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L51)

Total size of the recording so far in bytes
