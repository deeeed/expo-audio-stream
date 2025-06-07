[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioAnalysis

# Interface: AudioAnalysis

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:108](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L108)

Represents the complete data from the audio analysis.

## Properties

### amplitudeRange

> **amplitudeRange**: `object`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:116](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L116)

#### max

> **max**: `number`

#### min

> **min**: `number`

***

### bitDepth

> **bitDepth**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:111](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L111)

***

### dataPoints

> **dataPoints**: [`DataPoint`](DataPoint.md)[]

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:115](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L115)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:110](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L110)

***

### numberOfChannels

> **numberOfChannels**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:113](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L113)

***

### rmsRange

> **rmsRange**: `object`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:120](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L120)

#### max

> **max**: `number`

#### min

> **min**: `number`

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:114](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L114)

***

### samples

> **samples**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:112](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L112)

***

### segmentDurationMs

> **segmentDurationMs**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:109](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L109)

***

### speechAnalysis?

> `optional` **speechAnalysis**: `object`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:125](https://github.com/deeeed/expo-audio-stream/blob/7b07755001ee12fbd6e31851daf59b90f4897232/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L125)

#### speakerChanges

> **speakerChanges**: `object`[]
