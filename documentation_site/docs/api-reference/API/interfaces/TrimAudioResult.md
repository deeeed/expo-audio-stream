[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimAudioResult

# Interface: TrimAudioResult

Defined in: [src/ExpoAudioStream.types.ts:804](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L804)

Result of the audio trimming operation.

## Properties

### bitDepth

> **bitDepth**: `number`

Defined in: [src/ExpoAudioStream.types.ts:838](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L838)

The bit depth of the trimmed audio, applicable to PCM formats like `'wav'`.

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:833](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L833)

The number of channels in the trimmed audio (e.g., 1 for mono, 2 for stereo).

***

### compression?

> `optional` **compression**: `object`

Defined in: [src/ExpoAudioStream.types.ts:848](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L848)

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

Defined in: [src/ExpoAudioStream.types.ts:818](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L818)

The duration of the trimmed audio in milliseconds.

***

### filename

> **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:813](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L813)

The filename of the trimmed audio file.

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:843](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L843)

The MIME type of the trimmed audio file (e.g., `'audio/wav'`, `'audio/mpeg'`).

***

### processingInfo?

> `optional` **processingInfo**: `object`

Defined in: [src/ExpoAudioStream.types.ts:868](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L868)

Information about the processing time.

#### durationMs

> **durationMs**: `number`

The time it took to process the audio in milliseconds.

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:828](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L828)

The sample rate of the trimmed audio in Hertz (Hz).

***

### size

> **size**: `number`

Defined in: [src/ExpoAudioStream.types.ts:823](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L823)

The size of the trimmed audio file in bytes.

***

### uri

> **uri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:808](https://github.com/deeeed/expo-audio-stream/blob/8a303b4d96988b97604123d74daaa406d9ec517c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L808)

The URI of the trimmed audio file.
