[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / extractRawWavAnalysis

# Function: extractRawWavAnalysis()

> **extractRawWavAnalysis**(`props`): `Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

Defined in: [src/AudioAnalysis/extractAudioAnalysis.ts:223](https://github.com/deeeed/expo-audio-stream/blob/e496f5dd1024dfffefc22b133ee7e25a9e09a3b7/packages/expo-audio-studio/src/AudioAnalysis/extractAudioAnalysis.ts#L223)

Analyzes WAV files without decoding, preserving original PCM values.
Use this function when you need to ensure the analysis matches other software by avoiding any transformations.

## Parameters

### props

`ExtractWavAudioAnalysisProps`

The options for WAV analysis, including file URI and range.

## Returns

`Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

A promise that resolves to the audio analysis data.
