[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / EncodingType

# Type Alias: EncodingType

> **EncodingType**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/ExpoAudioStream.types.ts:69](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L69)

Audio encoding types supported by the library.

Platform support:
- `pcm_8bit`: Android only (iOS/Web will fallback to 16-bit)
- `pcm_16bit`: All platforms
- `pcm_32bit`: All platforms

## See

[Platform Limitations](https://github.com/deeeed/expo-audio-stream/blob/main/packages/expo-audio-studio/docs/PLATFORM_LIMITATIONS.md)
