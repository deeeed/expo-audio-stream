[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioRecording

# Interface: AudioRecording

Defined in: [src/ExpoAudioStream.types.ts:130](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L130)

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

Defined in: [src/ExpoAudioStream.types.ts:152](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L152)

Analysis data for the recording if processing was enabled

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:144](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L144)

Bit depth of the audio (8, 16, or 32 bits)

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:142](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L142)

Number of audio channels (1 for mono, 2 for stereo)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

Defined in: [src/ExpoAudioStream.types.ts:154](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L154)

Information about compression if enabled, including the URI to the compressed file

#### Type declaration

##### compressedFileUri

> **compressedFileUri**: `string`

URI to the compressed audio file

***

### createdAt?

> `optional` **createdAt**: `number`

Defined in: [src/ExpoAudioStream.types.ts:148](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L148)

Timestamp when the recording was created

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:136](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L136)

Duration of the recording in milliseconds

***

### filename

> **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:134](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L134)

Filename of the recorded audio

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:132](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L132)

URI to the recorded audio file

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:140](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L140)

MIME type of the recorded audio

***

### sampleRate

> **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Defined in: [src/ExpoAudioStream.types.ts:146](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L146)

Sample rate of the audio in Hz

***

### size

> **size**: `number`

Defined in: [src/ExpoAudioStream.types.ts:138](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L138)

Size of the recording in bytes

***

### transcripts?

> `optional` **transcripts**: [`TranscriberData`](TranscriberData.md)[]

Defined in: [src/ExpoAudioStream.types.ts:150](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L150)

Array of transcription data if available
