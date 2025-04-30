[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / AudioAnalysis

# Interface: AudioAnalysis

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:101](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L101)

Represents the complete data from the audio analysis.

## Properties

### amplitudeRange

> **amplitudeRange**: `object`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:109](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L109)

#### max

> **max**: `number`

#### min

> **min**: `number`

***

### bitDepth

> **bitDepth**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:104](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L104)

***

### dataPoints

> **dataPoints**: [`DataPoint`](DataPoint.md)[]

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:108](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L108)

***

### durationMs

> **durationMs**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:103](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L103)

***

### numberOfChannels

> **numberOfChannels**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:106](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L106)

***

### rmsRange

> **rmsRange**: `object`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:113](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L113)

#### max

> **max**: `number`

#### min

> **min**: `number`

***

### sampleRate

> **sampleRate**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:107](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L107)

***

### samples

> **samples**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:105](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L105)

***

### segmentDurationMs

> **segmentDurationMs**: `number`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:102](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L102)

***

### speechAnalysis?

> `optional` **speechAnalysis**: `object`

Defined in: [src/AudioAnalysis/AudioAnalysis.types.ts:118](https://github.com/deeeed/expo-audio-stream/blob/bb59302490ef4669af79e1b7d51bc0dcaf10e087/packages/expo-audio-studio/src/AudioAnalysis/AudioAnalysis.types.ts#L118)

#### speakerChanges

> **speakerChanges**: `object`[]
