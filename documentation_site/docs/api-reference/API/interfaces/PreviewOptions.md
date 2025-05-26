[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / PreviewOptions

# Interface: PreviewOptions

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:151](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L151)

Options for generating a quick preview of audio waveform.
This is optimized for UI rendering with a specified number of points.

## Extends

- [`AudioRangeOptions`](AudioRangeOptions.md)

## Properties

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:171](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L171)

Optional configuration for decoding the audio file.
Defaults to:
- targetSampleRate: undefined (keep original)
- targetChannels: undefined (keep original)
- targetBitDepth: 16
- normalizeAudio: false

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:144](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L144)

End time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`endTimeMs`](AudioRangeOptions.md#endtimems)

***

### fileUri

> **fileUri**: `string`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:153](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L153)

URI of the audio file to analyze

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:162](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L162)

Optional logger for debugging.

***

### numberOfPoints?

> `optional` **numberOfPoints**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:158](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L158)

Total number of points to generate for the preview.

#### Default

```ts
100
```

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:142](https://github.com/deeeed/expo-audio-stream/blob/bb8418f2156d531377247a6d4095112560ff975f/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L142)

Start time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`startTimeMs`](AudioRangeOptions.md#starttimems)
