[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimAudioResult

# Interface: TrimAudioResult

Result of the audio trimming operation.

## Properties

### bitDepth

> **bitDepth**: `number`

The bit depth of the trimmed audio, applicable to PCM formats like `'wav'`.

#### Defined in

[src/ExpoAudioStream.types.ts:605](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L605)

***

### channels

> **channels**: `number`

The number of channels in the trimmed audio (e.g., 1 for mono, 2 for stereo).

#### Defined in

[src/ExpoAudioStream.types.ts:600](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L600)

***

### compression?

> `optional` **compression**: `object`

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

#### Defined in

[src/ExpoAudioStream.types.ts:615](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L615)

***

### durationMs

> **durationMs**: `number`

The duration of the trimmed audio in milliseconds.

#### Defined in

[src/ExpoAudioStream.types.ts:585](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L585)

***

### filename

> **filename**: `string`

The filename of the trimmed audio file.

#### Defined in

[src/ExpoAudioStream.types.ts:580](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L580)

***

### mimeType

> **mimeType**: `string`

The MIME type of the trimmed audio file (e.g., `'audio/wav'`, `'audio/mpeg'`).

#### Defined in

[src/ExpoAudioStream.types.ts:610](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L610)

***

### processingInfo?

> `optional` **processingInfo**: `object`

Information about the processing time.

#### durationMs

> **durationMs**: `number`

The time it took to process the audio in milliseconds.

#### Defined in

[src/ExpoAudioStream.types.ts:635](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L635)

***

### sampleRate

> **sampleRate**: `number`

The sample rate of the trimmed audio in Hertz (Hz).

#### Defined in

[src/ExpoAudioStream.types.ts:595](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L595)

***

### size

> **size**: `number`

The size of the trimmed audio file in bytes.

#### Defined in

[src/ExpoAudioStream.types.ts:590](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L590)

***

### uri

> **uri**: `string`

The URI of the trimmed audio file.

#### Defined in

[src/ExpoAudioStream.types.ts:575](https://github.com/deeeed/expo-audio-stream/blob/848d80f7012b7408a6d37c824016aa00b78322ac/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L575)
