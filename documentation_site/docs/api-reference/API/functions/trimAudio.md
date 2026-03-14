[**@siteed/audio-studio**](../README.md)

***

[@siteed/audio-studio](../README.md) / trimAudio

# Function: trimAudio()

> **trimAudio**(`options`, `progressCallback`?): `Promise`\<[`TrimAudioResult`](../interfaces/TrimAudioResult.md)\>

Defined in: [src/trimAudio.ts:25](https://github.com/deeeed/audiolab/blob/17565b5e1440d46feb6c48f8ce60978ce1465c2d/packages/audio-studio/src/trimAudio.ts#L25)

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
