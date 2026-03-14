[**@siteed/audio-studio**](../README.md)

***

[@siteed/audio-studio](../README.md) / EncodingType

# Type Alias: EncodingType

> **EncodingType**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

Defined in: [src/AudioStudio.types.ts:81](https://github.com/deeeed/audiolab/blob/17565b5e1440d46feb6c48f8ce60978ce1465c2d/packages/audio-studio/src/AudioStudio.types.ts#L81)

Audio encoding types supported by the library.

Platform support:
- `pcm_8bit`: Android only (iOS/Web will fallback to 16-bit)
- `pcm_16bit`: All platforms
- `pcm_32bit`: All platforms

## See

[Platform Limitations](https://github.com/deeeed/audiolab/blob/main/packages/audio-studio/docs/PLATFORM_LIMITATIONS.md)
