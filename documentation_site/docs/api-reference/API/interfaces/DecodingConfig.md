[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / DecodingConfig

# Interface: DecodingConfig

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:8](https://github.com/deeeed/expo-audio-stream/blob/e9d4ade779a423b3aff172ba9ca49eec6c8962d9/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L8)

Represents the configuration for decoding audio data.

## Properties

### normalizeAudio?

> `optional` **normalizeAudio**: `boolean`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:16](https://github.com/deeeed/expo-audio-stream/blob/e9d4ade779a423b3aff172ba9ca49eec6c8962d9/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L16)

Whether to normalize audio levels (Android and Web)

***

### targetBitDepth?

> `optional` **targetBitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:14](https://github.com/deeeed/expo-audio-stream/blob/e9d4ade779a423b3aff172ba9ca49eec6c8962d9/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L14)

Target bit depth (Android and Web)

***

### targetChannels?

> `optional` **targetChannels**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:12](https://github.com/deeeed/expo-audio-stream/blob/e9d4ade779a423b3aff172ba9ca49eec6c8962d9/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L12)

Target number of channels (Android and Web)

***

### targetSampleRate?

> `optional` **targetSampleRate**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:10](https://github.com/deeeed/expo-audio-stream/blob/e9d4ade779a423b3aff172ba9ca49eec6c8962d9/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L10)

Target sample rate for decoded audio (Android and Web)
