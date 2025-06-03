[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

Defined in: [src/ExpoAudioStream.types.ts:517](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L517)

## Properties

### base64Data?

> `optional` **base64Data**: `string`

Defined in: [src/ExpoAudioStream.types.ts:523](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L523)

Base64 encoded string representation of the audio data (when includeBase64Data is true)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:529](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L529)

Bits per sample (8, 16, or 32)

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:527](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L527)

Number of audio channels (1 for mono, 2 for stereo)

***

### checksum?

> `optional` **checksum**: `number`

Defined in: [src/ExpoAudioStream.types.ts:539](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L539)

CRC32 Checksum of PCM data

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:531](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L531)

Duration of the audio in milliseconds

***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/ExpoAudioStream.types.ts:533](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L533)

PCM format identifier (e.g., "pcm_16bit")

***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:537](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L537)

Whether the pcmData includes a WAV header

***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`\<`ArrayBufferLike`\>

Defined in: [src/ExpoAudioStream.types.ts:521](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L521)

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

***

### pcmData

> **pcmData**: `Uint8Array`

Defined in: [src/ExpoAudioStream.types.ts:519](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L519)

Raw PCM audio data

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:525](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L525)

Sample rate in Hz (e.g., 44100, 48000)

***

### samples

> **samples**: `number`

Defined in: [src/ExpoAudioStream.types.ts:535](https://github.com/deeeed/expo-audio-stream/blob/32f8c9ee1d65f52370798654be389de1569e851f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L535)

Total number of audio samples per channel
