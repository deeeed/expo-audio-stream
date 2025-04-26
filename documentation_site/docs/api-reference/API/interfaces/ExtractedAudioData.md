[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / ExtractedAudioData

# Interface: ExtractedAudioData

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:397](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L397)

=======
>>>>>>> origin/main
## Properties

### base64Data?

> `optional` **base64Data**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:403](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L403)

Base64 encoded string representation of the audio data (when includeBase64Data is true)

=======
Base64 encoded string representation of the audio data (when includeBase64Data is true)

#### Defined in

[src/ExpoAudioStream.types.ts:403](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L403)

>>>>>>> origin/main
***

### bitDepth

> **bitDepth**: [`BitDepth`](../type-aliases/BitDepth.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:409](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L409)

Bits per sample (8, 16, or 32)

=======
Bits per sample (8, 16, or 32)

#### Defined in

[src/ExpoAudioStream.types.ts:409](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L409)

>>>>>>> origin/main
***

### channels

> **channels**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:407](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L407)

Number of audio channels (1 for mono, 2 for stereo)

=======
Number of audio channels (1 for mono, 2 for stereo)

#### Defined in

[src/ExpoAudioStream.types.ts:407](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L407)

>>>>>>> origin/main
***

### checksum?

> `optional` **checksum**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:419](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L419)

CRC32 Checksum of PCM data

=======
CRC32 Checksum of PCM data

#### Defined in

[src/ExpoAudioStream.types.ts:419](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L419)

>>>>>>> origin/main
***

### durationMs

> **durationMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:411](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L411)

Duration of the audio in milliseconds

=======
Duration of the audio in milliseconds

#### Defined in

[src/ExpoAudioStream.types.ts:411](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L411)

>>>>>>> origin/main
***

### format

> **format**: `"pcm_32bit"` \| `"pcm_16bit"` \| `"pcm_8bit"`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:413](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L413)

PCM format identifier (e.g., "pcm_16bit")

=======
PCM format identifier (e.g., "pcm_16bit")

#### Defined in

[src/ExpoAudioStream.types.ts:413](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L413)

>>>>>>> origin/main
***

### hasWavHeader?

> `optional` **hasWavHeader**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:417](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L417)

Whether the pcmData includes a WAV header

=======
Whether the pcmData includes a WAV header

#### Defined in

[src/ExpoAudioStream.types.ts:417](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L417)

>>>>>>> origin/main
***

### normalizedData?

> `optional` **normalizedData**: `Float32Array`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:401](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L401)

Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

=======
Normalized audio data in [-1, 1] range (when includeNormalizedData is true)

#### Defined in

[src/ExpoAudioStream.types.ts:401](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L401)

>>>>>>> origin/main
***

### pcmData

> **pcmData**: `Uint8Array`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:399](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L399)

Raw PCM audio data

=======
Raw PCM audio data

#### Defined in

[src/ExpoAudioStream.types.ts:399](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L399)

>>>>>>> origin/main
***

### sampleRate

> **sampleRate**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:405](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L405)

Sample rate in Hz (e.g., 44100, 48000)

=======
Sample rate in Hz (e.g., 44100, 48000)

#### Defined in

[src/ExpoAudioStream.types.ts:405](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L405)

>>>>>>> origin/main
***

### samples

> **samples**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:415](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L415)

Total number of audio samples per channel
=======
Total number of audio samples per channel

#### Defined in

[src/ExpoAudioStream.types.ts:415](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L415)
>>>>>>> origin/main
