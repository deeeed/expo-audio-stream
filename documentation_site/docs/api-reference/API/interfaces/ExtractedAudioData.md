[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

Defined in: [src/ExpoAudioStream.types.ts:590](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L590)

## Properties

### base64Data?

> `optional` **base64Data**: `string`

Defined in: [src/ExpoAudioStream.types.ts:596](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L596)

Base64 encoded string representation of the audio data (when includeBase64Data is true)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:602](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L602)

Bits per sample (8, 16, or 32)

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:600](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L600)

Number of audio channels (1 for mono, 2 for stereo)

***

### checksum?

> `optional` **checksum**: `number`

Defined in: [src/ExpoAudioStream.types.ts:612](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L612)

CRC32 Checksum of PCM data

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:604](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L604)

Duration of the audio in milliseconds

***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/ExpoAudioStream.types.ts:606](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L606)

PCM format identifier (e.g., "pcm_16bit")

***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:610](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L610)

Whether the pcmData includes a WAV header

***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`\<`ArrayBufferLike`\>

Defined in: [src/ExpoAudioStream.types.ts:594](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L594)

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

***

### pcmData

> **pcmData**: `Uint8Array`

Defined in: [src/ExpoAudioStream.types.ts:592](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L592)

Raw PCM audio data

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:598](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L598)

Sample rate in Hz (e.g., 44100, 48000)

***

### samples

> **samples**: `number`

Defined in: [src/ExpoAudioStream.types.ts:608](https://github.com/deeeed/expo-audio-stream/blob/34c8c0f2f587ecde9adf97c539289b128f0bccc1/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L608)

Total number of audio samples per channel
