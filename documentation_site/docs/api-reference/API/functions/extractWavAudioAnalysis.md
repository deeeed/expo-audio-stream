[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / extractWavAudioAnalysis

# Function: extractWavAudioAnalysis()

> **extractWavAudioAnalysis**(`props`): `Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

Analyzes WAV files without decoding, preserving original PCM values.
Use this function when you need to ensure the analysis matches other software by avoiding any transformations.

## Parameters

### props

[`ExtractWavAudioAnalysisProps`](../interfaces/ExtractWavAudioAnalysisProps.md)

The options for WAV analysis, including file URI and range.

## Returns

`Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

A promise that resolves to the audio analysis data.

## Defined in

[src/AudioAnalysis/extractAudioAnalysis.ts:224](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts#L224)
