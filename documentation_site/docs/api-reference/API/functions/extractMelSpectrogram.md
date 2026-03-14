[**@siteed/audio-studio**](../README.md)

***

[@siteed/audio-studio](../README.md) / extractMelSpectrogram

# Function: extractMelSpectrogram()

> **extractMelSpectrogram**(`options`): `Promise`\<[`MelSpectrogram`](../interfaces/MelSpectrogram.md)\>

Defined in: [src/AudioAnalysis/extractMelSpectrogram.ts:25](https://github.com/deeeed/audiolab/blob/17565b5e1440d46feb6c48f8ce60978ce1465c2d/packages/audio-studio/src/AudioAnalysis/extractMelSpectrogram.ts#L25)

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
