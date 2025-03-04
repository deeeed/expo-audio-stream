[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

## Properties

### base64Data?

> `optional` **base64Data**: `string`

Base64 encoded string representation of the audio data (when includeBase64Data is true)

#### Defined in

[src/ExpoAudioStream.types.ts:403](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L403)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Bits per sample (8, 16, or 32)

#### Defined in

[src/ExpoAudioStream.types.ts:409](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L409)

***

### channels

> **channels**: `number`

Number of audio channels (1 for mono, 2 for stereo)

#### Defined in

[src/ExpoAudioStream.types.ts:407](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L407)

***

### checksum?

> `optional` **checksum**: `number`

CRC32 Checksum of PCM data

#### Defined in

[src/ExpoAudioStream.types.ts:419](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L419)

***

### durationMs

> **durationMs**: `number`

Duration of the audio in milliseconds

#### Defined in

[src/ExpoAudioStream.types.ts:411](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L411)

***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

PCM format identifier (e.g., "pcm_16bit")

#### Defined in

[src/ExpoAudioStream.types.ts:413](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L413)

***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

Whether the pcmData includes a WAV header

#### Defined in

[src/ExpoAudioStream.types.ts:417](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L417)

***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

#### Defined in

[src/ExpoAudioStream.types.ts:401](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L401)

***

### pcmData

> **pcmData**: `Uint8Array`

Raw PCM audio data

#### Defined in

[src/ExpoAudioStream.types.ts:399](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L399)

***

### sampleRate

> **sampleRate**: `number`

Sample rate in Hz (e.g., 44100, 48000)

#### Defined in

[src/ExpoAudioStream.types.ts:405](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L405)

***

### samples

> **samples**: `number`

Total number of audio samples per channel

#### Defined in

[src/ExpoAudioStream.types.ts:415](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L415)
