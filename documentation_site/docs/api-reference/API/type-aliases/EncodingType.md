[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / EncodingType

# Type Alias: EncodingType

> **EncodingType**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/ExpoAudioStream.types.ts:69](https://github.com/deeeed/expo-audio-stream/blob/02ffb8ddbf4c4c6d08b7c13479558a436c0e02e4/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L69)

Audio encoding types supported by the library.

Platform support:
- `pcm_8bit`: Android only (iOS/Web will fallback to 16-bit)
- `pcm_16bit`: All platforms
- `pcm_32bit`: All platforms

## See

[Platform Limitations](https://github.com/deeeed/expo-audio-stream/blob/main/packages/expo-audio-studio/docs/PLATFORM_LIMITATIONS.md)
