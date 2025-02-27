[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / ExtractAudioAnalysisProps

# Type Alias: ExtractAudioAnalysisProps

> **ExtractAudioAnalysisProps**: `TimeRangeOptions` \| `ByteRangeOptions`

Options for extracting audio analysis.
- For time-based analysis, provide `startTimeMs` and `endTimeMs`.
- For byte-based analysis, provide `position` and `length`.
- Do not mix time and byte ranges.

## Defined in

[src/AudioAnalysis/extractAudioAnalysis.ts:89](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/AudioAnalysis/extractAudioAnalysis.ts#L89)
