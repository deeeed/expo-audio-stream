[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / WebConfig

# Interface: WebConfig

Defined in: [src/ExpoAudioStream.types.ts:211](https://github.com/deeeed/expo-audio-stream/blob/9191a2cec8e21cd03a0d5be59d823583d449d9c9/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L211)

Web platform specific configuration options

## Properties

### storeUncompressedAudio?

> `optional` **storeUncompressedAudio**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:220](https://github.com/deeeed/expo-audio-stream/blob/9191a2cec8e21cd03a0d5be59d823583d449d9c9/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L220)

Whether to store uncompressed audio data for WAV generation

When true, all PCM chunks are stored in memory to create a WAV file when compression is disabled
When false, uncompressed audio won't be available, but memory usage will be lower

Default: true (for backward compatibility)
