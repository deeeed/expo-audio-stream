[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

Defined in: [src/ExpoAudioStream.types.ts:372](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L372)

## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:392](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L392)

Compute the checksum of the PCM data

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:394](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L394)

Target config for the normalized audio (Android and Web)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:378](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L378)

End time in milliseconds (for time-based range)

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:374](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L374)

URI of the audio file to extract data from

***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:386](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L386)

Include base64 encoded string representation of the audio data

***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:384](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L384)

Include normalized audio data in [-1, 1] range

***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:388](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L388)

Include WAV header in the PCM data (makes it a valid WAV file)

***

### length?

> `optional` **length**: `number`

Defined in: [src/ExpoAudioStream.types.ts:382](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L382)

Length in bytes to extract (for byte-based range)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/ExpoAudioStream.types.ts:390](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L390)

Logger for debugging - can pass console directly.

***

### position?

> `optional` **position**: `number`

Defined in: [src/ExpoAudioStream.types.ts:380](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L380)

Start position in bytes (for byte-based range)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:376](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L376)

Start time in milliseconds (for time-based range)
