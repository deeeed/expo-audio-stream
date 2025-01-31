[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:170](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L170)

***

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:188](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L188)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:140](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L140)

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

[src/ExpoAudioStream.types.ts:181](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L181)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:161](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L161)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:143](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L143)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:173](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L173)

***

### filename?

> `optional` **filename**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:195](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L195)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:146](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L146)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:164](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L164)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:149](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L149)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:158](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L158)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:179](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L179)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:176](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L176)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:191](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L191)

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:194](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L194)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:167](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L167)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:137](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L137)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:152](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L152)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:155](https://github.com/deeeed/expo-audio-stream/blob/64f579e2de98e4f4de0db407bcc9f613ba4e2505/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L155)
