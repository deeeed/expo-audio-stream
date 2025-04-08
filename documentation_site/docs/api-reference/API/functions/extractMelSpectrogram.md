[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / extractMelSpectrogram

# Function: extractMelSpectrogram()

> **extractMelSpectrogram**(`options`): `Promise`\<[`MelSpectrogram`](../interfaces/MelSpectrogram.md)\>

**`Experimental`**

Extracts a mel spectrogram from audio data

 This feature is experimental and currently only available on Android.
The iOS implementation will throw an "UNSUPPORTED_PLATFORM" error.
The web implementation is a placeholder that returns dummy data.

## Parameters

### options

[`ExtractMelSpectrogramOptions`](../interfaces/ExtractMelSpectrogramOptions.md)

## Returns

`Promise`\<[`MelSpectrogram`](../interfaces/MelSpectrogram.md)\>

## Defined in

[src/AudioAnalysis/extractMelSpectrogram.ts:24](https://github.com/deeeed/expo-audio-stream/blob/c74460f5bb3fc818511d2b5ebc6a28b5aeb407fe/packages/expo-audio-studio/src/AudioAnalysis/extractMelSpectrogram.ts#L24)
