[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

Defined in: [src/ExpoAudioStream.types.ts:562](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L562)

## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:582](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L582)

Compute the checksum of the PCM data

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:584](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L584)

Target config for the normalized audio (Android and Web)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:568](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L568)

End time in milliseconds (for time-based range)

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:564](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L564)

URI of the audio file to extract data from

***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:576](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L576)

Include base64 encoded string representation of the audio data

***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:574](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L574)

Include normalized audio data in [-1, 1] range

***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:578](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L578)

Include WAV header in the PCM data (makes it a valid WAV file)

***

### length?

> `optional` **length**: `number`

Defined in: [src/ExpoAudioStream.types.ts:572](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L572)

Length in bytes to extract (for byte-based range)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/ExpoAudioStream.types.ts:580](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L580)

Logger for debugging - can pass console directly.

***

### position?

> `optional` **position**: `number`

Defined in: [src/ExpoAudioStream.types.ts:570](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L570)

Start position in bytes (for byte-based range)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:566](https://github.com/deeeed/expo-audio-stream/blob/34ea5104fe661743627b2234f95382ba6980a44c/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L566)

Start time in milliseconds (for time-based range)
