[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / OutputConfig

# Interface: OutputConfig

Defined in: [src/ExpoAudioStream.types.ts:289](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L289)

Configuration for audio output files during recording

## Properties

### compressed?

> `optional` **compressed**: `object`

Defined in: [src/ExpoAudioStream.types.ts:303](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L303)

Configuration for the compressed output file

#### bitrate?

> `optional` **bitrate**: `number`

Bitrate for compression in bits per second (default: 128000)

#### enabled?

> `optional` **enabled**: `boolean`

Whether to create a compressed output file (default: false)

#### format?

> `optional` **format**: `"aac"` \| `"opus"`

Format for compression
- 'aac': Advanced Audio Coding - supported on all platforms
- 'opus': Opus encoding - supported on Android and Web; on iOS will automatically fall back to AAC

#### preferRawStream?

> `optional` **preferRawStream**: `boolean`

Prefer raw stream over container format (Android only)
- true: Use raw AAC stream (.aac files) like in v2.10.6
- false/undefined: Use M4A container (.m4a files) for better seeking support
Note: iOS always produces M4A containers and ignores this flag

***

### primary?

> `optional` **primary**: `object`

Defined in: [src/ExpoAudioStream.types.ts:293](https://github.com/deeeed/expo-audio-stream/blob/ce05d475b5bcbdb69a6269a6725b5e684604d29e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L293)

Configuration for the primary (uncompressed) output file

#### enabled?

> `optional` **enabled**: `boolean`

Whether to create the primary output file (default: true)

#### format?

> `optional` **format**: `"wav"`

Format for the primary output (currently only 'wav' is supported)
