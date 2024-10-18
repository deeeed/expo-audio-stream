[**@siteed/expo-audio-stream**](../README.md) • **Docs**

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:75](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L75)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:68](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L68)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:73](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L73)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:69](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L69)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:76](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L76)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:70](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L70)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

• **\_**: `AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:79](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L79)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

• **\_**: [`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:78](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L78)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:74](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L74)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:67](https://github.com/deeeed/expo-audio-stream/blob/ea561c3da49d0e0d23475310f6fe4f2e17ab01f7/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L67)
