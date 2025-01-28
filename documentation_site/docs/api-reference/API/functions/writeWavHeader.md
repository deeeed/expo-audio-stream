[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / writeWavHeader

# Function: writeWavHeader()

> **writeWavHeader**(`options`): `ArrayBuffer`

Writes or updates a WAV (RIFF) header based on the provided options.

This function can be used in three ways:
1. To create a standalone WAV header (when no buffer is provided).
2. To create a WAV header and combine it with existing audio data (when a buffer without a header is provided).
3. To update an existing WAV header in the provided buffer.

For streaming audio where the final size is unknown, this function sets the size fields
to the maximum 32-bit value (0xFFFFFFFF). These can be updated later using the
`updateWavHeaderSize` function once the final size is known.

## Parameters

### options

[`WavHeaderOptions`](../interfaces/WavHeaderOptions.md)

The options for creating or updating the WAV header.

## Returns

`ArrayBuffer`

An ArrayBuffer containing the WAV header, or the header combined with the provided audio data.

## Throws

Throws an error if the provided options are invalid or if the buffer is too small.

## Examples

```ts
// Create a standalone WAV header
const header = writeWavHeader({
  sampleRate: 44100,
  numChannels: 2,
  bitDepth: 16
});
```

```ts
// Create a WAV header and combine it with audio data
const completeWav = writeWavHeader({
  buffer: audioData,
  sampleRate: 44100,
  numChannels: 2,
  bitDepth: 16
});
```

## Defined in

[src/utils/writeWavHeader.ts:51](https://github.com/deeeed/expo-audio-stream/blob/4373374589d9901f0064efa714398749411f46d7/packages/expo-audio-stream/src/utils/writeWavHeader.ts#L51)
