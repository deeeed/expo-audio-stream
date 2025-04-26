[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimAudioOptions

# Interface: TrimAudioOptions

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:485](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L485)

=======
>>>>>>> origin/main
Options for configuring the audio trimming operation.

## Properties

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:565](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L565)

Options for decoding the input audio file.
- See `DecodingConfig` for details.

=======
Options for decoding the input audio file.
- See `DecodingConfig` for details.

#### Defined in

[src/ExpoAudioStream.types.ts:565](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L565)

>>>>>>> origin/main
***

### endTimeMs?

> `optional` **endTimeMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:517](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L517)

The end time in milliseconds for the `'single'` mode.
- If not provided, trimming extends to the end of the audio.

=======
The end time in milliseconds for the `'single'` mode.
- If not provided, trimming extends to the end of the audio.

#### Defined in

[src/ExpoAudioStream.types.ts:517](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L517)

>>>>>>> origin/main
***

### fileUri

> **fileUri**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:489](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L489)

The URI of the audio file to trim.

=======
The URI of the audio file to trim.

#### Defined in

[src/ExpoAudioStream.types.ts:489](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L489)

>>>>>>> origin/main
***

### mode?

> `optional` **mode**: `"single"` \| `"keep"` \| `"remove"`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:498](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L498)

=======
>>>>>>> origin/main
The mode of trimming to apply.
- `'single'`: Trims the audio to a single range defined by `startTimeMs` and `endTimeMs`.
- `'keep'`: Keeps the specified `ranges` and removes all other portions of the audio.
- `'remove'`: Removes the specified `ranges` and keeps the remaining portions of the audio.

#### Default

```ts
'single'
```

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:498](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L498)

>>>>>>> origin/main
***

### outputFileName?

> `optional` **outputFileName**: `string`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:522](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L522)

The name of the output file. If not provided, a default name will be generated.

=======
The name of the output file. If not provided, a default name will be generated.

#### Defined in

[src/ExpoAudioStream.types.ts:522](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L522)

>>>>>>> origin/main
***

### outputFormat?

> `optional` **outputFormat**: `object`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:527](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L527)

=======
>>>>>>> origin/main
Configuration for the output audio format.

#### bitDepth?

> `optional` **bitDepth**: `number`

The bit depth of the output audio, applicable to PCM formats like `'wav'`.
- If not provided, the input audio's bit depth is used.

#### bitrate?

> `optional` **bitrate**: `number`

The bitrate of the output audio in bits per second, applicable to compressed formats like `'aac'`.
- If not provided, a default bitrate is used based on the format.

#### channels?

> `optional` **channels**: `number`

The number of channels in the output audio (e.g., 1 for mono, 2 for stereo).
- If not provided, the input audio's channel count is used.

#### format

> **format**: `"opus"` \| `"wav"` \| `"aac"`

The format of the output audio file.
- `'wav'`: Waveform Audio File Format (uncompressed).
- `'aac'`: Advanced Audio Coding (compressed). Not supported on web platforms.
- `'opus'`: Opus Interactive Audio Codec (compressed).

#### sampleRate?

> `optional` **sampleRate**: `number`

The sample rate of the output audio in Hertz (Hz).
- If not provided, the input audio's sample rate is used.

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:527](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L527)

>>>>>>> origin/main
***

### ranges?

> `optional` **ranges**: [`TimeRange`](TimeRange.md)[]

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:505](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L505)

=======
>>>>>>> origin/main
An array of time ranges to keep or remove, depending on the `mode`.
- Required for `'keep'` and `'remove'` modes.
- Ignored when `mode` is `'single'`.

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:505](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L505)

>>>>>>> origin/main
***

### startTimeMs?

> `optional` **startTimeMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:511](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L511)

The start time in milliseconds for the `'single'` mode.
- If not provided, trimming starts from the beginning of the audio (0 ms).
=======
The start time in milliseconds for the `'single'` mode.
- If not provided, trimming starts from the beginning of the audio (0 ms).

#### Defined in

[src/ExpoAudioStream.types.ts:511](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L511)
>>>>>>> origin/main
