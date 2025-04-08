[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

Compute the checksum of the PCM data

#### Defined in

[src/ExpoAudioStream.types.ts:392](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L392)

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Target config for the normalized audio (Android and Web)

#### Defined in

[src/ExpoAudioStream.types.ts:394](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L394)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

End time in milliseconds (for time-based range)

#### Defined in

[src/ExpoAudioStream.types.ts:378](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L378)

***

### fileUri

> **fileUri**: `string`

URI of the audio file to extract data from

#### Defined in

[src/ExpoAudioStream.types.ts:374](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L374)

***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

Include base64 encoded string representation of the audio data

#### Defined in

[src/ExpoAudioStream.types.ts:386](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L386)

***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

Include normalized audio data in [-1, 1] range

#### Defined in

[src/ExpoAudioStream.types.ts:384](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L384)

***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

Include WAV header in the PCM data (makes it a valid WAV file)

#### Defined in

[src/ExpoAudioStream.types.ts:388](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L388)

***

### length?

> `optional` **length**: `number`

Length in bytes to extract (for byte-based range)

#### Defined in

[src/ExpoAudioStream.types.ts:382](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L382)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Logger for debugging - can pass console directly.

#### Defined in

[src/ExpoAudioStream.types.ts:390](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L390)

***

### position?

> `optional` **position**: `number`

Start position in bytes (for byte-based range)

#### Defined in

[src/ExpoAudioStream.types.ts:380](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L380)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Start time in milliseconds (for time-based range)

#### Defined in

[src/ExpoAudioStream.types.ts:376](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L376)
