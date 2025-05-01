[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / trimAudio

# Function: trimAudio()

> **trimAudio**(`options`, `progressCallback`?): `Promise`\<[`TrimAudioResult`](../interfaces/TrimAudioResult.md)\>

Defined in: [src/trimAudio.ts:24](https://github.com/deeeed/expo-audio-stream/blob/acf23f6c5feaf05159a3376898117bd6525f08bd/packages/expo-audio-studio/src/trimAudio.ts#L24)

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
