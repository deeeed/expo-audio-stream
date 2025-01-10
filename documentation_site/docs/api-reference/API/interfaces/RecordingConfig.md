[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:157](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L157)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:127](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L127)

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

[src/ExpoAudioStream.types.ts:168](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L168)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:148](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L148)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:130](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L130)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:160](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L160)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:133](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L133)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:151](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L151)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:136](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L136)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:145](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L145)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:166](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L166)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:163](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L163)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:154](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L154)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:124](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L124)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:139](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L139)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:142](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L142)
