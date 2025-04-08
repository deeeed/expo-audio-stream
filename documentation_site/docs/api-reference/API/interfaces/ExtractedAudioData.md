[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

Defined in: [src/ExpoAudioStream.types.ts:397](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L397)

## Properties

### base64Data?

> `optional` **base64Data**: `string`

Defined in: [src/ExpoAudioStream.types.ts:403](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L403)

Base64 encoded string representation of the audio data (when includeBase64Data is true)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:409](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L409)

Bits per sample (8, 16, or 32)

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:407](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L407)

Number of audio channels (1 for mono, 2 for stereo)

***

### checksum?

> `optional` **checksum**: `number`

Defined in: [src/ExpoAudioStream.types.ts:419](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L419)

CRC32 Checksum of PCM data

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:411](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L411)

Duration of the audio in milliseconds

***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/ExpoAudioStream.types.ts:413](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L413)

PCM format identifier (e.g., "pcm_16bit")

***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:417](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L417)

Whether the pcmData includes a WAV header

***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`

Defined in: [src/ExpoAudioStream.types.ts:401](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L401)

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

***

### pcmData

> **pcmData**: `Uint8Array`

Defined in: [src/ExpoAudioStream.types.ts:399](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L399)

Raw PCM audio data

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:405](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L405)

Sample rate in Hz (e.g., 44100, 48000)

***

### samples

> **samples**: `number`

Defined in: [src/ExpoAudioStream.types.ts:415](https://github.com/deeeed/expo-audio-stream/blob/7c2adffc5ff59391315cb8edaeaae2ab676dd2ba/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L415)

Total number of audio samples per channel
