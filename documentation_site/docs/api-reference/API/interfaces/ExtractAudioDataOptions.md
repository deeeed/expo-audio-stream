[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

Defined in: [src/ExpoAudioStream.types.ts:517](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L517)

## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:537](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L537)

Compute the checksum of the PCM data

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:539](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L539)

Target config for the normalized audio (Android and Web)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:523](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L523)

End time in milliseconds (for time-based range)

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:519](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L519)

URI of the audio file to extract data from

***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:531](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L531)

Include base64 encoded string representation of the audio data

***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:529](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L529)

Include normalized audio data in [-1, 1] range

***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:533](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L533)

Include WAV header in the PCM data (makes it a valid WAV file)

***

### length?

> `optional` **length**: `number`

Defined in: [src/ExpoAudioStream.types.ts:527](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L527)

Length in bytes to extract (for byte-based range)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/ExpoAudioStream.types.ts:535](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L535)

Logger for debugging - can pass console directly.

***

### position?

> `optional` **position**: `number`

Defined in: [src/ExpoAudioStream.types.ts:525](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L525)

Start position in bytes (for byte-based range)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:521](https://github.com/deeeed/expo-audio-stream/blob/cbd4a23f12073e71995f65e1ad122e720eefa920/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L521)

Start time in milliseconds (for time-based range)
