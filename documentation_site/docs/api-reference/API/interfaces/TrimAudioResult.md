[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimAudioResult

# Interface: TrimAudioResult

Defined in: [src/ExpoAudioStream.types.ts:683](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L683)

Result of the audio trimming operation.

## Properties

### bitDepth

> **bitDepth**: `number`

Defined in: [src/ExpoAudioStream.types.ts:717](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L717)

The bit depth of the trimmed audio, applicable to PCM formats like `'wav'`.

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:712](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L712)

The number of channels in the trimmed audio (e.g., 1 for mono, 2 for stereo).

***

### compression?

> `optional` **compression**: `object`

Defined in: [src/ExpoAudioStream.types.ts:727](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L727)

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

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:697](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L697)

The duration of the trimmed audio in milliseconds.

***

### filename

> **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:692](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L692)

The filename of the trimmed audio file.

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:722](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L722)

The MIME type of the trimmed audio file (e.g., `'audio/wav'`, `'audio/mpeg'`).

***

### processingInfo?

> `optional` **processingInfo**: `object`

Defined in: [src/ExpoAudioStream.types.ts:747](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L747)

Information about the processing time.

#### durationMs

> **durationMs**: `number`

The time it took to process the audio in milliseconds.

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:707](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L707)

The sample rate of the trimmed audio in Hertz (Hz).

***

### size

> **size**: `number`

Defined in: [src/ExpoAudioStream.types.ts:702](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L702)

The size of the trimmed audio file in bytes.

***

### uri

> **uri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:687](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L687)

The URI of the trimmed audio file.
