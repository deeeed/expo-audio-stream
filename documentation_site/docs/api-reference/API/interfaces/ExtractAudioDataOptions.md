[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

Defined in: [src/ExpoAudioStream.types.ts:492](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L492)

## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:512](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L512)

Compute the checksum of the PCM data

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:514](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L514)

Target config for the normalized audio (Android and Web)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:498](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L498)

End time in milliseconds (for time-based range)

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:494](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L494)

URI of the audio file to extract data from

***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:506](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L506)

Include base64 encoded string representation of the audio data

***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:504](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L504)

Include normalized audio data in [-1, 1] range

***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:508](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L508)

Include WAV header in the PCM data (makes it a valid WAV file)

***

### length?

> `optional` **length**: `number`

Defined in: [src/ExpoAudioStream.types.ts:502](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L502)

Length in bytes to extract (for byte-based range)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/ExpoAudioStream.types.ts:510](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L510)

Logger for debugging - can pass console directly.

***

### position?

> `optional` **position**: `number`

Defined in: [src/ExpoAudioStream.types.ts:500](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L500)

Start position in bytes (for byte-based range)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:496](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L496)

Start time in milliseconds (for time-based range)
