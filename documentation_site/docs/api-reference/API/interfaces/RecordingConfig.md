[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:176](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L176)

***

### autoResumeAfterInterruption?

> `optional` **autoResumeAfterInterruption**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:194](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L194)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:143](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L143)

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

[src/ExpoAudioStream.types.ts:187](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L187)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:167](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L167)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:146](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L146)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:179](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L179)

***

### filename?

> `optional` **filename**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:201](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L201)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:149](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L149)

***

### intervalAnalysis?

> `optional` **intervalAnalysis**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:152](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L152)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:170](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L170)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:155](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L155)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:164](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L164)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:185](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L185)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:182](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L182)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:197](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L197)

***

### outputDirectory?

> `optional` **outputDirectory**: `string`

#### Defined in

[src/ExpoAudioStream.types.ts:200](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L200)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:173](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L173)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:140](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L140)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:158](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L158)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:161](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L161)
