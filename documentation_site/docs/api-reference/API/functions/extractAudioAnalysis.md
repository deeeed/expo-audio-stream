[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / extractAudioAnalysis

# Function: extractAudioAnalysis()

> **extractAudioAnalysis**(`props`): `Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

Extracts detailed audio analysis from the specified audio file or buffer.
Supports either time-based or byte-based ranges for flexibility in analysis.

## Parameters

### props

[`ExtractAudioAnalysisProps`](../type-aliases/ExtractAudioAnalysisProps.md)

The options for extraction, including file URI, ranges, and decoding settings.

## Returns

`Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

A promise that resolves to the audio analysis data.

## Throws

If both time and byte ranges are provided or if required parameters are missing.

## Defined in

[src/AudioAnalysis/extractAudioAnalysis.ts:99](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts#L99)
