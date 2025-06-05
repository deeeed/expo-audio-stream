[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

Defined in: [src/ExpoAudioStream.types.ts:524](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L524)

## Properties

### base64Data?

> `optional` **base64Data**: `string`

Defined in: [src/ExpoAudioStream.types.ts:530](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L530)

Base64 encoded string representation of the audio data (when includeBase64Data is true)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:536](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L536)

Bits per sample (8, 16, or 32)

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:534](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L534)

Number of audio channels (1 for mono, 2 for stereo)

***

### checksum?

> `optional` **checksum**: `number`

Defined in: [src/ExpoAudioStream.types.ts:546](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L546)

CRC32 Checksum of PCM data

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:538](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L538)

Duration of the audio in milliseconds

***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/ExpoAudioStream.types.ts:540](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L540)

PCM format identifier (e.g., "pcm_16bit")

***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:544](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L544)

Whether the pcmData includes a WAV header

***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`\<`ArrayBufferLike`\>

Defined in: [src/ExpoAudioStream.types.ts:528](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L528)

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

***

### pcmData

> **pcmData**: `Uint8Array`

Defined in: [src/ExpoAudioStream.types.ts:526](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L526)

Raw PCM audio data

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:532](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L532)

Sample rate in Hz (e.g., 44100, 48000)

***

### samples

> **samples**: `number`

Defined in: [src/ExpoAudioStream.types.ts:542](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L542)

Total number of audio samples per channel
