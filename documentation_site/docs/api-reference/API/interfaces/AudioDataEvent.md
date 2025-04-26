[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioDataEvent

# Interface: AudioDataEvent

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:41](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L41)

=======
>>>>>>> origin/main
## Properties

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:53](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L53)

=======
>>>>>>> origin/main
Information about compression if enabled, including the compressed data chunk

#### Type declaration

##### data?

> `optional` **data**: `string` \| `Blob`

Base64 (native) or Blob (web) encoded compressed data chunk

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:53](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L53)

>>>>>>> origin/main
***

### data

> **data**: `string` \| `Float32Array`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:43](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L43)

Audio data as base64 string (native) or Float32Array (web)

=======
Audio data as base64 string (native) or Float32Array (web)

#### Defined in

[src/ExpoAudioStream.types.ts:43](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L43)

>>>>>>> origin/main
***

### eventDataSize

> **eventDataSize**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:49](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L49)

Size of the current data chunk in bytes

=======
Size of the current data chunk in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:49](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L49)

>>>>>>> origin/main
***

### fileUri

> **fileUri**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:47](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L47)

URI to the file being recorded

=======
URI to the file being recorded

#### Defined in

[src/ExpoAudioStream.types.ts:47](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L47)

>>>>>>> origin/main
***

### position

> **position**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:45](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L45)

Current position in the audio stream in bytes

=======
Current position in the audio stream in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:45](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L45)

>>>>>>> origin/main
***

### totalSize

> **totalSize**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:51](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L51)

Total size of the recording so far in bytes
=======
Total size of the recording so far in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:51](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L51)
>>>>>>> origin/main
