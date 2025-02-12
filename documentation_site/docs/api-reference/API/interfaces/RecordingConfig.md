[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:171](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L171)

***

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:189](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L189)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:141](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L141)

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

[src/ExpoAudioStream.types.ts:182](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L182)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:162](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L162)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:144](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L144)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:174](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L174)

***

### filename?

> `optional` **filename**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:196](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L196)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:147](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L147)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:165](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L165)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:150](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L150)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:159](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L159)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:180](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L180)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:177](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L177)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:192](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L192)

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:195](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L195)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:168](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L168)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:138](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L138)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:153](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L153)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:156](https://github.com/deeeed/expo-audio-stream/blob/67c0151498a79fdb4d385168c502a8eaeb33efe1/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L156)
