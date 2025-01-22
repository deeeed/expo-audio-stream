[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / WavHeaderOptions

# Interface: WavHeaderOptions

Options for creating a WAV header.

## Properties

### bitDepth

> **bitDepth**: `number`

The bit depth of the audio (e.g., 16, 24, or 32).

#### Defined in

[src/utils/writeWavHeader.ts:14](https://github.com/deeeed/expo-audio-stream/blob/f2e75c7e592b97e8421396014c638f22c616cded/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L14)

***

### buffer?

> `optional` **buffer**: `ArrayBuffer`

Optional buffer containing audio data. If provided, it will be combined with the header.

#### Defined in

[src/utils/writeWavHeader.ts:8](https://github.com/deeeed/expo-audio-stream/blob/f2e75c7e592b97e8421396014c638f22c616cded/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L8)

***

### numChannels

> **numChannels**: `number`

The number of audio channels (e.g., 1 for mono, 2 for stereo).

#### Defined in

[src/utils/writeWavHeader.ts:12](https://github.com/deeeed/expo-audio-stream/blob/f2e75c7e592b97e8421396014c638f22c616cded/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L12)

***

### sampleRate

> **sampleRate**: `number`

The sample rate of the audio in Hz (e.g., 44100).

#### Defined in

[src/utils/writeWavHeader.ts:10](https://github.com/deeeed/expo-audio-stream/blob/f2e75c7e592b97e8421396014c638f22c616cded/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L10)
