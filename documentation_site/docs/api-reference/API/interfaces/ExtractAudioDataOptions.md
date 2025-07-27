[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

Defined in: [src/ExpoAudioStream.types.ts:565](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L565)

## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:585](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L585)

Compute the checksum of the PCM data

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:587](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L587)

Target config for the normalized audio (Android and Web)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:571](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L571)

End time in milliseconds (for time-based range)

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:567](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L567)

URI of the audio file to extract data from

***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:579](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L579)

Include base64 encoded string representation of the audio data

***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:577](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L577)

Include normalized audio data in [-1, 1] range

***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:581](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L581)

Include WAV header in the PCM data (makes it a valid WAV file)

***

### length?

> `optional` **length**: `number`

Defined in: [src/ExpoAudioStream.types.ts:575](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L575)

Length in bytes to extract (for byte-based range)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/ExpoAudioStream.types.ts:583](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L583)

Logger for debugging - can pass console directly.

***

### position?

> `optional` **position**: `number`

Defined in: [src/ExpoAudioStream.types.ts:573](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L573)

Start position in bytes (for byte-based range)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:569](https://github.com/deeeed/expo-audio-stream/blob/c4291a82cc740b4d4790c69ae7e7cc07f1e8fb1a/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L569)

Start time in milliseconds (for time-based range)
