[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / StartRecordingResult

# Interface: StartRecordingResult

## Properties

### bitDepth?

> `optional` **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Bit depth of the audio (8, 16, or 32 bits)

#### Defined in

[src/ExpoAudioStream.types.ts:137](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L137)

***

### channels?

> `optional` **channels**: `number`

Number of audio channels (1 for mono, 2 for stereo)

#### Defined in

[src/ExpoAudioStream.types.ts:135](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L135)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md) & `object`

Information about compression if enabled, including the URI to the compressed file

#### Type declaration

##### compressedFileUri

> **compressedFileUri**: `string`

URI to the compressed audio file

#### Defined in

[src/ExpoAudioStream.types.ts:141](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L141)

***

### fileUri

> **fileUri**: `string`

URI to the file being recorded

#### Defined in

[src/ExpoAudioStream.types.ts:131](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L131)

***

### mimeType

> **mimeType**: `string`

MIME type of the recording

#### Defined in

[src/ExpoAudioStream.types.ts:133](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L133)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

Sample rate of the audio in Hz

#### Defined in

[src/ExpoAudioStream.types.ts:139](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L139)
