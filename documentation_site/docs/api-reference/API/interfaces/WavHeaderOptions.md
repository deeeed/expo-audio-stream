[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / WavHeaderOptions

# Interface: WavHeaderOptions

Options for creating a WAV header.

## Properties

### bitDepth

> **bitDepth**: `number`

The bit depth of the audio (e.g., 16, 24, or 32).

#### Defined in

[src/utils/writeWavHeader.ts:14](https://github.com/deeeed/expo-audio-stream/blob/1b17ac6e103f2ca50f29668b3ddaaf57a4b4b7d3/packages/expo-audio-studio/src/utils/writeWavHeader.ts#L14)

***

### buffer?

> `optional` **buffer**: `ArrayBuffer`

Optional buffer containing audio data. If provided, it will be combined with the header.

#### Defined in

[src/utils/writeWavHeader.ts:8](https://github.com/deeeed/expo-audio-stream/blob/1b17ac6e103f2ca50f29668b3ddaaf57a4b4b7d3/packages/expo-audio-studio/src/utils/writeWavHeader.ts#L8)

***

### numChannels

> **numChannels**: `number`

The number of audio channels (e.g., 1 for mono, 2 for stereo).

#### Defined in

[src/utils/writeWavHeader.ts:12](https://github.com/deeeed/expo-audio-stream/blob/1b17ac6e103f2ca50f29668b3ddaaf57a4b4b7d3/packages/expo-audio-studio/src/utils/writeWavHeader.ts#L12)

***

### sampleRate

> **sampleRate**: `number`

The sample rate of the audio in Hz (e.g., 44100).

#### Defined in

[src/utils/writeWavHeader.ts:10](https://github.com/deeeed/expo-audio-stream/blob/1b17ac6e103f2ca50f29668b3ddaaf57a4b4b7d3/packages/expo-audio-studio/src/utils/writeWavHeader.ts#L10)
