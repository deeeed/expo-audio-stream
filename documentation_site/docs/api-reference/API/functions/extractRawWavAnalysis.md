[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / extractRawWavAnalysis

# Function: extractRawWavAnalysis()

> **extractRawWavAnalysis**(`props`): `Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

Defined in: [src/AudioAnalysis/extractAudioAnalysis.ts:234](https://github.com/deeeed/expo-audio-stream/blob/02ffb8ddbf4c4c6d08b7c13479558a436c0e02e4/packages/expo-audio-studio/src/AudioAnalysis/extractAudioAnalysis.ts#L234)

Analyzes WAV files without decoding, preserving original PCM values.
Use this function when you need to ensure the analysis matches other software by avoiding any transformations.

## Parameters

### props

`ExtractWavAudioAnalysisProps`

The options for WAV analysis, including file URI and range.

## Returns

`Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

A promise that resolves to the audio analysis data.
