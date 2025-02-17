[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:172](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L172)

***

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:190](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L190)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:142](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L142)

***

### compression?

> `optional` **compression**: `object`

#### bitrate?

> `optional` **bitrate**: `number`

#### enabled

> **enabled**: `boolean`

#### format

> **format**: `"opus"` \| `"aac"`

#### Defined in

[src/ExpoAudioStream.types.ts:183](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L183)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:163](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L163)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:145](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L145)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:175](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L175)

***

### filename?

> `optional` **filename**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:197](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L197)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:148](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L148)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:166](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L166)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:151](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L151)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:160](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L160)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:181](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L181)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:178](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L178)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:193](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L193)

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:196](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L196)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:169](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L169)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:139](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L139)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:154](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L154)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:157](https://github.com/deeeed/expo-audio-stream/blob/f94c6016ba4ce968cafbf68644199405f5991d7f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L157)
