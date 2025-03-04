[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / trimAudio

# Function: trimAudio()

> **trimAudio**(`options`, `progressCallback`?): `Promise`\<[`TrimAudioResult`](../interfaces/TrimAudioResult.md)\>

**`Experimental`**

Trims an audio file based on the provided options.

 This API is experimental and not fully optimized for production use.
Performance may vary based on file size and device capabilities.
Future versions may include breaking changes.

## Parameters

### options

[`TrimAudioOptions`](../interfaces/TrimAudioOptions.md)

Configuration options for the trimming operation

### progressCallback?

(`event`) => `void`

Optional callback to receive progress updates

## Returns

`Promise`\<[`TrimAudioResult`](../interfaces/TrimAudioResult.md)\>

Promise resolving to the trimmed audio file information, including processing time

## Defined in

[src/trimAudio.ts:24](https://github.com/deeeed/expo-audio-stream/blob/01587473d138d2044082592da4994edb9b0d9107/packages/expo-audio-stream/src/trimAudio.ts#L24)
