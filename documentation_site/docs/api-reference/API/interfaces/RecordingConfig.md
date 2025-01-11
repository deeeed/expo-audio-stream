[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:156](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L156)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:126](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L126)

***

### compression?

> `optional` **compression**: `object`

#### bitrate?

> `optional` **bitrate**: `number`

#### enabled

> **enabled**: `boolean`

#### format

> **format**: `"opus"` \| `"aac"` \| `"mp3"`

#### Defined in

[src/ExpoAudioStream.types.ts:167](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L167)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:147](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L147)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:129](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L129)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:159](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L159)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:132](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L132)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:150](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L150)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:135](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L135)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:144](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L144)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:165](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L165)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:162](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L162)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:153](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L153)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:123](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L123)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:138](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L138)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:141](https://github.com/deeeed/expo-audio-stream/blob/28953461fc4da5b476e6df897abb4dac5b33f115/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L141)
