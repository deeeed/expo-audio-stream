[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioRecording

# Interface: AudioRecording

Defined in: [src/ExpoAudioStream.types.ts:99](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L99)

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

Defined in: [src/ExpoAudioStream.types.ts:121](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L121)

Analysis data for the recording if processing was enabled

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:113](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L113)

Bit depth of the audio (8, 16, or 32 bits)

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:111](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L111)

Number of audio channels (1 for mono, 2 for stereo)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

Defined in: [src/ExpoAudioStream.types.ts:123](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L123)

Information about compression if enabled, including the URI to the compressed file

#### Type declaration

##### compressedFileUri

> **compressedFileUri**: `string`

URI to the compressed audio file

***

### createdAt?

> `optional` **createdAt**: `number`

Defined in: [src/ExpoAudioStream.types.ts:117](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L117)

Timestamp when the recording was created

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:105](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L105)

Duration of the recording in milliseconds

***

### filename

> **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:103](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L103)

Filename of the recorded audio

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:101](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L101)

URI to the recorded audio file

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:109](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L109)

MIME type of the recorded audio

***

### sampleRate

> **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Defined in: [src/ExpoAudioStream.types.ts:115](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L115)

Sample rate of the audio in Hz

***

### size

> **size**: `number`

Defined in: [src/ExpoAudioStream.types.ts:107](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L107)

Size of the recording in bytes

***

### transcripts?

> `optional` **transcripts**: [`TranscriberData`](TranscriberData.md)[]

Defined in: [src/ExpoAudioStream.types.ts:119](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L119)

Array of transcription data if available
