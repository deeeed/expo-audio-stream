[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:169](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L169)

***

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:187](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L187)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:139](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L139)

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

[src/ExpoAudioStream.types.ts:180](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L180)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:160](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L160)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:142](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L142)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:172](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L172)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:145](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L145)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:163](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L163)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:148](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L148)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:157](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L157)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:178](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L178)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:175](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L175)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:190](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L190)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:166](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L166)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:136](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L136)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:151](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L151)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:154](https://github.com/deeeed/expo-audio-stream/blob/ef77da1abb65e9e4bd17e0ef69fab0a3f6843e73/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L154)
