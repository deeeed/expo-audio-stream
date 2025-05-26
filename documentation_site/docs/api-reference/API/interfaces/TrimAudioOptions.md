[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / TrimAudioOptions

# Interface: TrimAudioOptions

Defined in: [src/ExpoAudioStream.types.ts:645](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L645)

Options for configuring the audio trimming operation.

## Properties

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/ExpoAudioStream.types.ts:725](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L725)

Options for decoding the input audio file.
- See `DecodingConfig` for details.

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:677](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L677)

The end time in milliseconds for the `'single'` mode.
- If not provided, trimming extends to the end of the audio.

***

### fileUri

> **fileUri**: `string`

Defined in: [src/ExpoAudioStream.types.ts:649](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L649)

The URI of the audio file to trim.

***

### mode?

> `optional` **mode**: `"single"` \| `"keep"` \| `"remove"`

Defined in: [src/ExpoAudioStream.types.ts:658](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L658)

The mode of trimming to apply.
- `'single'`: Trims the audio to a single range defined by `startTimeMs` and `endTimeMs`.
- `'keep'`: Keeps the specified `ranges` and removes all other portions of the audio.
- `'remove'`: Removes the specified `ranges` and keeps the remaining portions of the audio.

#### Default

```ts
'single'
```

***

### outputFileName?

> `optional` **outputFileName**: `string`

Defined in: [src/ExpoAudioStream.types.ts:682](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L682)

The name of the output file. If not provided, a default name will be generated.

***

### outputFormat?

> `optional` **outputFormat**: `object`

Defined in: [src/ExpoAudioStream.types.ts:687](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L687)

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

> **format**: `"aac"` \| `"opus"` \| `"wav"`

The format of the output audio file.
- `'wav'`: Waveform Audio File Format (uncompressed).
- `'aac'`: Advanced Audio Coding (compressed). Not supported on web platforms.
- `'opus'`: Opus Interactive Audio Codec (compressed).

#### sampleRate?

> `optional` **sampleRate**: `number`

The sample rate of the output audio in Hertz (Hz).
- If not provided, the input audio's sample rate is used.

***

### ranges?

> `optional` **ranges**: [`TimeRange`](TimeRange.md)[]

Defined in: [src/ExpoAudioStream.types.ts:665](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L665)

An array of time ranges to keep or remove, depending on the `mode`.
- Required for `'keep'` and `'remove'` modes.
- Ignored when `mode` is `'single'`.

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:671](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L671)

The start time in milliseconds for the `'single'` mode.
- If not provided, trimming starts from the beginning of the audio (0 ms).
