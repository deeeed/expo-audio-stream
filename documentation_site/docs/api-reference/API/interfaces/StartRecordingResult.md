[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / StartRecordingResult

# Interface: StartRecordingResult

Defined in: [src/ExpoAudioStream.types.ts:129](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L129)

## Properties

### bitDepth?

> `optional` **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:137](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L137)

Bit depth of the audio (8, 16, or 32 bits)

***

### channels?

> `optional` **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:135](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L135)

Number of audio channels (1 for mono, 2 for stereo)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

Defined in: [src/ExpoAudioStream.types.ts:141](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L141)

Information about compression if enabled, including the URI to the compressed file

#### Type declaration

##### compressedFileUri

> **compressedFileUri**: `string`

URI to the compressed audio file

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:131](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L131)

URI to the file being recorded

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:133](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L133)

MIME type of the recording

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Defined in: [src/ExpoAudioStream.types.ts:139](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L139)

Sample rate of the audio in Hz
