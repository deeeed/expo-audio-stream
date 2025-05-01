[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

Defined in: [src/ExpoAudioStream.types.ts:469](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L469)

## Properties

### base64Data?

> `optional` **base64Data**: `string`

Defined in: [src/ExpoAudioStream.types.ts:475](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L475)

Base64 encoded string representation of the audio data (when includeBase64Data is true)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/ExpoAudioStream.types.ts:481](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L481)

Bits per sample (8, 16, or 32)

***

### channels

> **channels**: `number`

Defined in: [src/ExpoAudioStream.types.ts:479](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L479)

Number of audio channels (1 for mono, 2 for stereo)

***

### checksum?

> `optional` **checksum**: `number`

Defined in: [src/ExpoAudioStream.types.ts:491](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L491)

CRC32 Checksum of PCM data

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:483](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L483)

Duration of the audio in milliseconds

***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/ExpoAudioStream.types.ts:485](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L485)

PCM format identifier (e.g., "pcm_16bit")

***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:489](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L489)

Whether the pcmData includes a WAV header

***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`

Defined in: [src/ExpoAudioStream.types.ts:473](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L473)

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

***

### pcmData

> **pcmData**: `Uint8Array`

Defined in: [src/ExpoAudioStream.types.ts:471](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L471)

Raw PCM audio data

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/ExpoAudioStream.types.ts:477](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L477)

Sample rate in Hz (e.g., 44100, 48000)

***

### samples

> **samples**: `number`

Defined in: [src/ExpoAudioStream.types.ts:487](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L487)

Total number of audio samples per channel
