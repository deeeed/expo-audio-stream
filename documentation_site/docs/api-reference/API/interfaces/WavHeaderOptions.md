[**@siteed/expo-audio-stream**](../README.md) • **Docs**

***

[@siteed/expo-audio-stream](../README.md) / WavHeaderOptions

# Interface: WavHeaderOptions

Options for creating a WAV header.

## Properties

### bitDepth

> **bitDepth**: `number`

The bit depth of the audio (e.g., 16, 24, or 32).

#### Defined in

[src/utils/writeWavHeader.ts:14](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L14)

***

### buffer?

> `optional` **buffer**: `ArrayBuffer`

Optional buffer containing audio data. If provided, it will be combined with the header.

#### Defined in

[src/utils/writeWavHeader.ts:8](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L8)

***

### numChannels

> **numChannels**: `number`

The number of audio channels (e.g., 1 for mono, 2 for stereo).

#### Defined in

[src/utils/writeWavHeader.ts:12](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L12)

***

### sampleRate

> **sampleRate**: `number`

The sample rate of the audio in Hz (e.g., 44100).

#### Defined in

[src/utils/writeWavHeader.ts:10](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L10)
