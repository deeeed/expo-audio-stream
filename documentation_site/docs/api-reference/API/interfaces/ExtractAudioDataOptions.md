[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / ExtractAudioDataOptions

# Interface: ExtractAudioDataOptions

## Properties

### computeChecksum?

> `optional` **computeChecksum**: `boolean`

Compute the checksum of the pcm data

#### Defined in

[src/ExpoAudioStream.types.ts:287](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L287)

***

### decodingOptions?

> `optional` **decodingOptions**: [`DecodingConfig`](DecodingConfig.md)

Target config for the normalized audio (Android and Web)

#### Defined in

[src/ExpoAudioStream.types.ts:289](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L289)

***

### endTimeMs?

> `optional` **endTimeMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:274](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L274)

***

### fileUri

> **fileUri**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:271](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L271)

***

### includeBase64Data?

> `optional` **includeBase64Data**: `boolean`

Include base64 encoded string representation of the audio data

#### Defined in

[src/ExpoAudioStream.types.ts:281](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L281)

***

### includeNormalizedData?

> `optional` **includeNormalizedData**: `boolean`

Include normalized audio data in [-1, 1] range

#### Defined in

[src/ExpoAudioStream.types.ts:279](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L279)

***

### includeWavHeader?

> `optional` **includeWavHeader**: `boolean`

Include WAV header in the PCM data (makes it a valid WAV file)

#### Defined in

[src/ExpoAudioStream.types.ts:283](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L283)

***

### length?

> `optional` **length**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:277](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L277)

***

### logger?

> `optional` **logger**: [`ConsoleLike`](../type-aliases/ConsoleLike.md)

Logger for debugging - can pass console directly.

#### Defined in

[src/ExpoAudioStream.types.ts:285](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L285)

***

### position?

> `optional` **position**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:276](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L276)

***

### startTimeMs?

> `optional` **startTimeMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:273](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L273)
