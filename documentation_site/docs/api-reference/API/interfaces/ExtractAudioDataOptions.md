[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

Defined in: [src/ExpoAudioStream.types.ts:448](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L448)

## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:468](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L468)

Compute the checksum of the PCM data

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:470](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L470)

Target config for the normalized audio (Android and Web)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:454](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L454)

End time in milliseconds (for time-based range)

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:450](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L450)

URI of the audio file to extract data from

***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:462](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L462)

Include base64 encoded string representation of the audio data

***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:460](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L460)

Include normalized audio data in [-1, 1] range

***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:464](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L464)

Include WAV header in the PCM data (makes it a valid WAV file)

***

### length?

> `optional` **length**: `number`

Defined in: [src/ExpoAudioStream.types.ts:458](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L458)

Length in bytes to extract (for byte-based range)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/ExpoAudioStream.types.ts:466](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L466)

Logger for debugging - can pass console directly.

***

### position?

> `optional` **position**: `number`

Defined in: [src/ExpoAudioStream.types.ts:456](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L456)

Start position in bytes (for byte-based range)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:452](https://github.com/deeeed/expo-audio-stream/blob/5d8518e2259372c13fd38b3adc7b767434cbd154/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L452)

Start time in milliseconds (for time-based range)
