[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / extractPreview

# Function: extractPreview()

> **extractPreview**(`options`): `Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

Generates a simplified preview of the audio waveform for quick visualization.
Ideal for UI rendering with a specified number of points.

## Parameters

### options

[`PreviewOptions`](../interfaces/PreviewOptions.md)

The options for the preview, including file URI and time range.

## Returns

`Promise`\<[`AudioAnalysis`](../interfaces/AudioAnalysis.md)\>

A promise that resolves to the audio preview data.

## Defined in

[src/AudioAnalysis/extractPreview.ts:11](https://github.com/deeeed/expo-audio-stream/blob/e63960be99f20b4ceb77356f18afa41197a63203/packages/expo-audio-studio/src/AudioAnalysis/extractPreview.ts#L11)
