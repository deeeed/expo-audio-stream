[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimAudioResult

# Interface: TrimAudioResult

Defined in: [src/ExpoAudioStream.types.ts:667](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L667)

Result of the audio trimming operation.

## Properties

### bitDepth

> **bitDepth**: `number`

Defined in: [src/ExpoAudioStream.types.ts:701](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L701)

The bit depth of the trimmed audio, applicable to PCM formats like `'wav'`.

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:696](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L696)

The number of channels in the trimmed audio (e.g., 1 for mono, 2 for stereo).

***

### compression?

> `optional` **compression**: `object`

Defined in: [src/ExpoAudioStream.types.ts:711](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L711)

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

Defined in: [src/ExpoAudioStream.types.ts:681](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L681)

The duration of the trimmed audio in milliseconds.

***

### filename

> **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:676](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L676)

The filename of the trimmed audio file.

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:706](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L706)

The MIME type of the trimmed audio file (e.g., `'audio/wav'`, `'audio/mpeg'`).

***

### processingInfo?

> `optional` **processingInfo**: `object`

Defined in: [src/ExpoAudioStream.types.ts:731](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L731)

Information about the processing time.

#### durationMs

> **durationMs**: `number`

The time it took to process the audio in milliseconds.

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:691](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L691)

The sample rate of the trimmed audio in Hertz (Hz).

***

### size

> **size**: `number`

Defined in: [src/ExpoAudioStream.types.ts:686](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L686)

The size of the trimmed audio file in bytes.

***

### uri

> **uri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:671](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L671)

The URI of the trimmed audio file.
