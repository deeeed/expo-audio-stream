[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioRecording

# Interface: AudioRecording

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

Analysis data for the recording if processing was enabled

#### Defined in

[src/ExpoAudioStream.types.ts:121](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L121)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Bit depth of the audio (8, 16, or 32 bits)

#### Defined in

[src/ExpoAudioStream.types.ts:113](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L113)

***

### channels

> **channels**: `number`

Number of audio channels (1 for mono, 2 for stereo)

#### Defined in

[src/ExpoAudioStream.types.ts:111](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L111)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

Information about compression if enabled, including the URI to the compressed file

#### Type declaration

##### compressedFileUri

> **compressedFileUri**: `string`

URI to the compressed audio file

#### Defined in

[src/ExpoAudioStream.types.ts:123](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L123)

***

### createdAt?

> `optional` **createdAt**: `number`

Timestamp when the recording was created

#### Defined in

[src/ExpoAudioStream.types.ts:117](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L117)

***

### durationMs

> **durationMs**: `number`

Duration of the recording in milliseconds

#### Defined in

[src/ExpoAudioStream.types.ts:105](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L105)

***

### filename

> **filename**: `string`

Filename of the recorded audio

#### Defined in

[src/ExpoAudioStream.types.ts:103](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L103)

***

### fileUri

> **fileUri**: `string`

URI to the recorded audio file

#### Defined in

[src/ExpoAudioStream.types.ts:101](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L101)

***

### mimeType

> **mimeType**: `string`

MIME type of the recorded audio

#### Defined in

[src/ExpoAudioStream.types.ts:109](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L109)

***

### sampleRate

> **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Sample rate of the audio in Hz

#### Defined in

[src/ExpoAudioStream.types.ts:115](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L115)

***

### size

> **size**: `number`

Size of the recording in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:107](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L107)

***

### transcripts?

> `optional` **transcripts**: [`TranscriberData`](TranscriberData.md)[]

Array of transcription data if available

#### Defined in

[src/ExpoAudioStream.types.ts:119](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L119)
