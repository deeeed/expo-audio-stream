[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / extractAudioAnalysis

# Function: extractAudioAnalysis()

> **extractAudioAnalysis**(`props`): `Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

Defined in: [src/AudioAnalysis/extractAudioAnalysis.ts:97](https://github.com/deeeed/expo-audio-stream/blob/9ccce858174254387aac44d30853c908707d8254/packages/expo-audio-studio/src/AudioAnalysis/extractAudioAnalysis.ts#L97)

Extracts detailed audio analysis from the specified audio file or buffer.
Supports either time-based or byte-based ranges for flexibility in analysis.

## Parameters

### props

`ExtractAudioAnalysisProps`

The options for extraction, including file URI, ranges, and decoding settings.

## Returns

`Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

A promise that resolves to the audio analysis data.

## Throws

If both time and byte ranges are provided or if required parameters are missing.
