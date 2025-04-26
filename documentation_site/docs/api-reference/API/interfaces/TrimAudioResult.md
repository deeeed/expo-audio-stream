[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimAudioResult

# Interface: TrimAudioResult

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:571](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L571)

=======
>>>>>>> origin/main
Result of the audio trimming operation.

## Properties

### bitDepth

> **bitDepth**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:605](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L605)

The bit depth of the trimmed audio, applicable to PCM formats like `'wav'`.

=======
The bit depth of the trimmed audio, applicable to PCM formats like `'wav'`.

#### Defined in

[src/ExpoAudioStream.types.ts:605](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L605)

>>>>>>> origin/main
***

### channels

> **channels**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:600](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L600)

The number of channels in the trimmed audio (e.g., 1 for mono, 2 for stereo).

=======
The number of channels in the trimmed audio (e.g., 1 for mono, 2 for stereo).

#### Defined in

[src/ExpoAudioStream.types.ts:600](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L600)

>>>>>>> origin/main
***

### compression?

> `optional` **compression**: `object`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:615](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L615)

=======
>>>>>>> origin/main
Information about compression if the output format is compressed.

#### bitrate

> **bitrate**: `number`

The bitrate of the compressed audio in bits per second.

#### format

> **format**: `string`

The format of the compression (e.g., `'aac'`, `'mp3'`, `'opus'`).

#### size

> **size**: `number`

The size of the compressed audio file in bytes.

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:615](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L615)

>>>>>>> origin/main
***

### durationMs

> **durationMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:585](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L585)

The duration of the trimmed audio in milliseconds.

=======
The duration of the trimmed audio in milliseconds.

#### Defined in

[src/ExpoAudioStream.types.ts:585](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L585)

>>>>>>> origin/main
***

### filename

> **filename**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:580](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L580)

The filename of the trimmed audio file.

=======
The filename of the trimmed audio file.

#### Defined in

[src/ExpoAudioStream.types.ts:580](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L580)

>>>>>>> origin/main
***

### mimeType

> **mimeType**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:610](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L610)

The MIME type of the trimmed audio file (e.g., `'audio/wav'`, `'audio/mpeg'`).

=======
The MIME type of the trimmed audio file (e.g., `'audio/wav'`, `'audio/mpeg'`).

#### Defined in

[src/ExpoAudioStream.types.ts:610](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L610)

>>>>>>> origin/main
***

### processingInfo?

> `optional` **processingInfo**: `object`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:635](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L635)

=======
>>>>>>> origin/main
Information about the processing time.

#### durationMs

> **durationMs**: `number`

The time it took to process the audio in milliseconds.

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:635](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L635)

>>>>>>> origin/main
***

### sampleRate

> **sampleRate**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:595](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L595)

The sample rate of the trimmed audio in Hertz (Hz).

=======
The sample rate of the trimmed audio in Hertz (Hz).

#### Defined in

[src/ExpoAudioStream.types.ts:595](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L595)

>>>>>>> origin/main
***

### size

> **size**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:590](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L590)

The size of the trimmed audio file in bytes.

=======
The size of the trimmed audio file in bytes.

#### Defined in

[src/ExpoAudioStream.types.ts:590](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L590)

>>>>>>> origin/main
***

### uri

> **uri**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:575](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L575)

The URI of the trimmed audio file.
=======
The URI of the trimmed audio file.

#### Defined in

[src/ExpoAudioStream.types.ts:575](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L575)
>>>>>>> origin/main
