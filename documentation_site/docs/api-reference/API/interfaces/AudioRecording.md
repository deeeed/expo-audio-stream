[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioRecording

# Interface: AudioRecording

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:99](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L99)

=======
>>>>>>> origin/main
## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:121](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L121)

Analysis data for the recording if processing was enabled

=======
Analysis data for the recording if processing was enabled

#### Defined in

[src/ExpoAudioStream.types.ts:121](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L121)

>>>>>>> origin/main
***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:113](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L113)

Bit depth of the audio (8, 16, or 32 bits)

=======
Bit depth of the audio (8, 16, or 32 bits)

#### Defined in

[src/ExpoAudioStream.types.ts:113](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L113)

>>>>>>> origin/main
***

### channels

> **channels**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:111](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L111)

Number of audio channels (1 for mono, 2 for stereo)

=======
Number of audio channels (1 for mono, 2 for stereo)

#### Defined in

[src/ExpoAudioStream.types.ts:111](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L111)

>>>>>>> origin/main
***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:123](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L123)

=======
>>>>>>> origin/main
Information about compression if enabled, including the URI to the compressed file

#### Type declaration

##### compressedFileUri

> **compressedFileUri**: `string`

URI to the compressed audio file

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:123](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L123)

>>>>>>> origin/main
***

### createdAt?

> `optional` **createdAt**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:117](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L117)

Timestamp when the recording was created

=======
Timestamp when the recording was created

#### Defined in

[src/ExpoAudioStream.types.ts:117](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L117)

>>>>>>> origin/main
***

### durationMs

> **durationMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:105](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L105)

Duration of the recording in milliseconds

=======
Duration of the recording in milliseconds

#### Defined in

[src/ExpoAudioStream.types.ts:105](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L105)

>>>>>>> origin/main
***

### filename

> **filename**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:103](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L103)

Filename of the recorded audio

=======
Filename of the recorded audio

#### Defined in

[src/ExpoAudioStream.types.ts:103](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L103)

>>>>>>> origin/main
***

### fileUri

> **fileUri**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:101](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L101)

URI to the recorded audio file

=======
URI to the recorded audio file

#### Defined in

[src/ExpoAudioStream.types.ts:101](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L101)

>>>>>>> origin/main
***

### mimeType

> **mimeType**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:109](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L109)

MIME type of the recorded audio

=======
MIME type of the recorded audio

#### Defined in

[src/ExpoAudioStream.types.ts:109](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L109)

>>>>>>> origin/main
***

### sampleRate

> **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:115](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L115)

Sample rate of the audio in Hz

=======
Sample rate of the audio in Hz

#### Defined in

[src/ExpoAudioStream.types.ts:115](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L115)

>>>>>>> origin/main
***

### size

> **size**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:107](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L107)

Size of the recording in bytes

=======
Size of the recording in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:107](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L107)

>>>>>>> origin/main
***

### transcripts?

> `optional` **transcripts**: [`TranscriberData`](TranscriberData.md)[]

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:119](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L119)

Array of transcription data if available
=======
Array of transcription data if available

#### Defined in

[src/ExpoAudioStream.types.ts:119](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L119)
>>>>>>> origin/main
