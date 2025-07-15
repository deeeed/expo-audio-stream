[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / StartRecordingResult

# Interface: StartRecordingResult

Defined in: [src/ExpoAudioStream.types.ts:160](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L160)

## Properties

### bitDepth?

> `optional` **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:168](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L168)

Bit depth of the audio (8, 16, or 32 bits)

***

### channels?

> `optional` **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:166](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L166)

Number of audio channels (1 for mono, 2 for stereo)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

Defined in: [src/ExpoAudioStream.types.ts:172](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L172)

Information about compression if enabled, including the URI to the compressed file

#### Type declaration

##### compressedFileUri

> **compressedFileUri**: `string`

URI to the compressed audio file

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:162](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L162)

URI to the file being recorded

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:164](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L164)

MIME type of the recording

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Defined in: [src/ExpoAudioStream.types.ts:170](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L170)

Sample rate of the audio in Hz
