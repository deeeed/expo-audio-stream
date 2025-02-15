[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / PreviewOptions

# Interface: PreviewOptions

Options for generating a quick preview of audio waveform.
This is optimized for UI rendering with a specified number of points.

## Extends

- [`AudioRangeOptions`](AudioRangeOptions.md)

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

Algorithm used to calculate amplitude values

#### Default

```ts
"rms"
```

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:121](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/AudioAnalysis/AudioAnalysis.types.ts#L121)

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Optional configuration for decoding the audio file.
Defaults to:
- targetSampleRate: undefined (keep original)
- targetChannels: undefined (keep original)
- targetBitDepth: 16
- normalizeAudio: false

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:130](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/AudioAnalysis/AudioAnalysis.types.ts#L130)

***

### endTime?

> `optional` **endTime**: `number`

End time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`endTime`](AudioRangeOptions.md#endtime)

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:102](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/AudioAnalysis/AudioAnalysis.types.ts#L102)

***

### fileUri

> **fileUri**: `string`

URI of the audio file to analyze

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:111](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/AudioAnalysis/AudioAnalysis.types.ts#L111)

***

### numberOfPoints?

> `optional` **numberOfPoints**: `number`

Total number of points to generate for the preview.

#### Default

```ts
100
```

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:116](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/AudioAnalysis/AudioAnalysis.types.ts#L116)

***

### startTime?

> `optional` **startTime**: `number`

Start time in milliseconds

#### Inherited from

[`AudioRangeOptions`](AudioRangeOptions.md).[`startTime`](AudioRangeOptions.md#starttime)

#### Defined in

[src/AudioAnalysis/AudioAnalysis.types.ts:100](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/AudioAnalysis/AudioAnalysis.types.ts#L100)
