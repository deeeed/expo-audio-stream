[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / RecordingConfig

# Interface: RecordingConfig

## Properties

### algorithm?

> `optional` **algorithm**: [`AmplitudeAlgorithm`](../type-aliases/AmplitudeAlgorithm.md)

#### Defined in

[src/ExpoAudioStream.types.ts:140](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L140)

***

### channels?

> `optional` **channels**: `1` \| `2`

#### Defined in

[src/ExpoAudioStream.types.ts:110](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L110)

***

### enableProcessing?

> `optional` **enableProcessing**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:131](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L131)

***

### encoding?

> `optional` **encoding**: [`EncodingType`](../type-aliases/EncodingType.md)

#### Defined in

[src/ExpoAudioStream.types.ts:113](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L113)

***

### features?

> `optional` **features**: [`AudioFeaturesOptions`](AudioFeaturesOptions.md)

#### Defined in

[src/ExpoAudioStream.types.ts:143](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L143)

***

### interval?

> `optional` **interval**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:116](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L116)

***

### ios?

> `optional` **ios**: [`IOSConfig`](IOSConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:134](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L134)

***

### keepAwake?

> `optional` **keepAwake**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:119](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L119)

***

### notification?

> `optional` **notification**: [`NotificationConfig`](NotificationConfig.md)

#### Defined in

[src/ExpoAudioStream.types.ts:128](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L128)

***

### onAudioAnalysis()?

> `optional` **onAudioAnalysis**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

`AudioAnalysisEvent`

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:149](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L149)

***

### onAudioStream()?

> `optional` **onAudioStream**: (`_`) => `Promise`\<`void`\>

#### Parameters

##### \_

[`AudioDataEvent`](AudioDataEvent.md)

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:146](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L146)

***

### pointsPerSecond?

> `optional` **pointsPerSecond**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:137](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L137)

***

### sampleRate?

> `optional` **sampleRate**: [`SampleRate`](../type-aliases/SampleRate.md)

#### Defined in

[src/ExpoAudioStream.types.ts:107](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L107)

***

### showNotification?

> `optional` **showNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:122](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L122)

***

### showWaveformInNotification?

> `optional` **showWaveformInNotification**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:125](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L125)
