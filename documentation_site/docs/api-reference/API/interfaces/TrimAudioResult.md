[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimAudioResult

# Interface: TrimAudioResult

Defined in: [src/ExpoAudioStream.types.ts:756](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L756)

Result of the audio trimming operation.

## Properties

### bitDepth

> **bitDepth**: `number`

Defined in: [src/ExpoAudioStream.types.ts:790](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L790)

The bit depth of the trimmed audio, applicable to PCM formats like `'wav'`.

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:785](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L785)

The number of channels in the trimmed audio (e.g., 1 for mono, 2 for stereo).

***

### compression?

> `optional` **compression**: `object`

Defined in: [src/ExpoAudioStream.types.ts:800](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L800)

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

Defined in: [src/ExpoAudioStream.types.ts:770](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L770)

The duration of the trimmed audio in milliseconds.

***

### filename

> **filename**: `string`

Defined in: [src/ExpoAudioStream.types.ts:765](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L765)

The filename of the trimmed audio file.

***

### mimeType

> **mimeType**: `string`

Defined in: [src/ExpoAudioStream.types.ts:795](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L795)

The MIME type of the trimmed audio file (e.g., `'audio/wav'`, `'audio/mpeg'`).

***

### processingInfo?

> `optional` **processingInfo**: `object`

Defined in: [src/ExpoAudioStream.types.ts:820](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L820)

Information about the processing time.

#### durationMs

> **durationMs**: `number`

The time it took to process the audio in milliseconds.

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:780](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L780)

The sample rate of the trimmed audio in Hertz (Hz).

***

### size

> **size**: `number`

Defined in: [src/ExpoAudioStream.types.ts:775](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L775)

The size of the trimmed audio file in bytes.

***

### uri

> **uri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:760](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L760)

The URI of the trimmed audio file.
