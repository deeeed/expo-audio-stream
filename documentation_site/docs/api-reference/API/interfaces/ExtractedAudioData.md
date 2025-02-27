[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

## Properties

### base64Data?

> `optional` **base64Data**: `string`

Base64 encoded string representation of the audio data (when includeBase64Data is true)

#### Defined in

[src/ExpoAudioStream.types.ts:298](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L298)

***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Bits per sample (8, 16, or 32)

#### Defined in

[src/ExpoAudioStream.types.ts:304](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L304)

***

### channels

> **channels**: `number`

Number of audio channels (1 for mono, 2 for stereo)

#### Defined in

[src/ExpoAudioStream.types.ts:302](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L302)

***

### checksum?

> `optional` **checksum**: `number`

CRC32 Checksum of pcm data

#### Defined in

[src/ExpoAudioStream.types.ts:314](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L314)

***

### durationMs

> **durationMs**: `number`

Duration of the audio in milliseconds

#### Defined in

[src/ExpoAudioStream.types.ts:306](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L306)

***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

PCM format identifier (e.g., "pcm_16bit")

#### Defined in

[src/ExpoAudioStream.types.ts:308](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L308)

***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

Whether the pcmData includes a WAV header

#### Defined in

[src/ExpoAudioStream.types.ts:312](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L312)

***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

#### Defined in

[src/ExpoAudioStream.types.ts:296](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L296)

***

### pcmData

> **pcmData**: `Uint8Array`

Raw PCM audio data

#### Defined in

[src/ExpoAudioStream.types.ts:294](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L294)

***

### sampleRate

> **sampleRate**: `number`

Sample rate in Hz (e.g., 44100, 48000)

#### Defined in

[src/ExpoAudioStream.types.ts:300](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L300)

***

### samples

> **samples**: `number`

Total number of audio samples per channel

#### Defined in

[src/ExpoAudioStream.types.ts:310](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L310)
