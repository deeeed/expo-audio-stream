[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:276](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L276)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

#### Defined in

[src/ExpoAudioStream.types.ts:275](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L275)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:273](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L273)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:272](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L272)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:271](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L271)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:277](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L277)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:269](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L269)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:270](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L270)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:274](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L274)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:267](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L267)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:268](https://github.com/deeeed/expo-audio-stream/blob/f7588a63aac89ce144d460194b73ce4440e19520/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L268)
