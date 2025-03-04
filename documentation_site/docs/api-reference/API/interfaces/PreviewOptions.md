[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / PreviewOptions

# Interface: PreviewOptions

Options for generating a quick preview of audio waveform.
This is optimized for UI rendering with a specified number of points.

## Extends

- [`AudioRangeOptions`](AudioRangeOptions.md)

## Properties

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Optional configuration for decoding the audio file.
Defaults to:
- targetSampleRate: undefined (keep original)
- targetChannels: undefined (keep original)
- targetBitDepth: 16
- normalizeAudio: false

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:164](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L164)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

End time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`endTimeMs`](AudioRangeOptions.md#endtimems)

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:137](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L137)

***

### fileUri

> **fileUri**: `string`

URI of the audio file to analyze

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:146](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L146)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Optional logger for debugging.

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:155](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L155)

***

### numberOfPoints?

> `optional` **numberOfPoints**: `number`

Total number of points to generate for the preview.

#### Default

```ts
100
```

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:151](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L151)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

Start time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`startTimeMs`](AudioRangeOptions.md#starttimems)

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:135](https://github.com/deeeed/expo-audio-stream/blob/8819363e2f6518db8ec233a7ea17b579527a3ab5/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L135)
