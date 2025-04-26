[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / PreviewOptions

# Interface: PreviewOptions

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:144](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L144)

Options for generating a quick preview of audio waveform.
This is optimized for UI rendering with a specified number of points.

## Extends

- [`AudioRangeOptions`](AudioRangeOptions.md)

## Properties

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:164](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L164)

Optional configuration for decoding the audio file.
Defaults to:
- targetSampleRate: undefined (keep original)
- targetChannels: undefined (keep original)
- targetBitDepth: 16
- normalizeAudio: false

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:137](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L137)

End time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`endTimeMs`](AudioRangeOptions.md#endtimems)

***

### fileUri

> **fileUri**: `string`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:146](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L146)

URI of the audio file to analyze

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:155](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L155)

Optional logger for debugging.

***

### numberOfPoints?

> `optional` **numberOfPoints**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:151](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L151)

Total number of points to generate for the preview.

#### Default

```ts
100
```

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:135](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L135)

Start time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`startTimeMs`](AudioRangeOptions.md#starttimems)
