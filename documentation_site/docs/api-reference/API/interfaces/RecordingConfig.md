[**@siteed/expo-audio-stream**](../README.md) • **Docs**

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:98](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L98)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:71](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L71)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:92](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L92)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:74](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L74)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:101](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L101)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:77](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L77)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:80](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L80)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:89](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L89)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

• **\_**: `AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:107](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L107)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

• **\_**: [`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:104](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L104)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:95](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L95)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:68](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L68)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:83](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L83)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:86](https://github.com/deeeed/expo-audio-stream/blob/36de79449351c4f2d09febaf547f0a33d7afafd9/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L86)
