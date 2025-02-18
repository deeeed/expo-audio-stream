[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:281](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L281)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

#### Defined in

[src/ExpoAudioStream.types.ts:280](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L280)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:278](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L278)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:277](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L277)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:276](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L276)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:282](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L282)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:274](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L274)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:275](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L275)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:279](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L279)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:272](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L272)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:273](https://github.com/deeeed/expo-audio-stream/blob/689aeadedaa58050cd18e8ec1fa5ff1fcd93f0db/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L273)
