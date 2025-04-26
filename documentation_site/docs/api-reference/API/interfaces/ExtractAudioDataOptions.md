[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:372](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L372)

=======
>>>>>>> origin/main
## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:392](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L392)

Compute the checksum of the PCM data

=======
Compute the checksum of the PCM data

#### Defined in

[src/ExpoAudioStream.types.ts:392](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L392)

>>>>>>> origin/main
***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:394](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L394)

Target config for the normalized audio (Android and Web)

=======
Target config for the normalized audio (Android and Web)

#### Defined in

[src/ExpoAudioStream.types.ts:394](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L394)

>>>>>>> origin/main
***

### endTimeMs?

> `optional` **endTimeMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:378](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L378)

End time in milliseconds (for time-based range)

=======
End time in milliseconds (for time-based range)

#### Defined in

[src/ExpoAudioStream.types.ts:378](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L378)

>>>>>>> origin/main
***

### fileUri

> **fileUri**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:374](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L374)

URI of the audio file to extract data from

=======
URI of the audio file to extract data from

#### Defined in

[src/ExpoAudioStream.types.ts:374](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L374)

>>>>>>> origin/main
***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:386](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L386)

Include base64 encoded string representation of the audio data

=======
Include base64 encoded string representation of the audio data

#### Defined in

[src/ExpoAudioStream.types.ts:386](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L386)

>>>>>>> origin/main
***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:384](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L384)

Include normalized audio data in [-1, 1] range

=======
Include normalized audio data in [-1, 1] range

#### Defined in

[src/ExpoAudioStream.types.ts:384](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L384)

>>>>>>> origin/main
***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:388](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L388)

Include WAV header in the PCM data (makes it a valid WAV file)

=======
Include WAV header in the PCM data (makes it a valid WAV file)

#### Defined in

[src/ExpoAudioStream.types.ts:388](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L388)

>>>>>>> origin/main
***

### length?

> `optional` **length**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:382](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L382)

Length in bytes to extract (for byte-based range)

=======
Length in bytes to extract (for byte-based range)

#### Defined in

[src/ExpoAudioStream.types.ts:382](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L382)

>>>>>>> origin/main
***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:390](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L390)

Logger for debugging - can pass console directly.

=======
Logger for debugging - can pass console directly.

#### Defined in

[src/ExpoAudioStream.types.ts:390](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L390)

>>>>>>> origin/main
***

### position?

> `optional` **position**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:380](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L380)

Start position in bytes (for byte-based range)

=======
Start position in bytes (for byte-based range)

#### Defined in

[src/ExpoAudioStream.types.ts:380](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L380)

>>>>>>> origin/main
***

### startTimeMs?

> `optional` **startTimeMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:376](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L376)

Start time in milliseconds (for time-based range)
=======
Start time in milliseconds (for time-based range)

#### Defined in

[src/ExpoAudioStream.types.ts:376](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L376)
>>>>>>> origin/main
