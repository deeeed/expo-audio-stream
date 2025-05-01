[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / WebConfig

# Interface: WebConfig

Defined in: [src/ExpoAudioStream.types.ts:211](https://github.com/deeeed/expo-audio-stream/blob/e9d4ade779a423b3aff172ba9ca49eec6c8962d9/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L211)

Web platform specific configuration options

## Properties

### storeUncompressedAudio?

> `optional` **storeUncompressedAudio**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:220](https://github.com/deeeed/expo-audio-stream/blob/e9d4ade779a423b3aff172ba9ca49eec6c8962d9/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L220)

Whether to store uncompressed audio data for WAV generation

When true, all PCM chunks are stored in memory to create a WAV file when compression is disabled
When false, uncompressed audio won't be available, but memory usage will be lower

Default: true (for backward compatibility)
