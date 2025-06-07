[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

Defined in: [src/ExpoAudioStream.types.ts:542](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L542)

## Properties

### base64Data?

> `optional` **base64Data**: `string`

Defined in: [src/ExpoAudioStream.types.ts:548](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L548)

Base64 encoded string representation of the audio data (when includeBase64Data is true)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:554](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L554)

Bits per sample (8, 16, or 32)

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:552](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L552)

Number of audio channels (1 for mono, 2 for stereo)

***

### checksum?

> `optional` **checksum**: `number`

Defined in: [src/ExpoAudioStream.types.ts:564](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L564)

CRC32 Checksum of PCM data

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:556](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L556)

Duration of the audio in milliseconds

***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/ExpoAudioStream.types.ts:558](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L558)

PCM format identifier (e.g., "pcm_16bit")

***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:562](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L562)

Whether the pcmData includes a WAV header

***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`\<`ArrayBufferLike`\>

Defined in: [src/ExpoAudioStream.types.ts:546](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L546)

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

***

### pcmData

> **pcmData**: `Uint8Array`

Defined in: [src/ExpoAudioStream.types.ts:544](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L544)

Raw PCM audio data

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:550](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L550)

Sample rate in Hz (e.g., 44100, 48000)

***

### samples

> **samples**: `number`

Defined in: [src/ExpoAudioStream.types.ts:560](https://github.com/deeeed/expo-audio-stream/blob/bbdd3decaa750fbf29d5ddaf443493cc894c7375/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L560)

Total number of audio samples per channel
