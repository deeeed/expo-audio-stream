[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:327](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L327)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

#### Defined in

[src/ExpoAudioStream.types.ts:326](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L326)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:324](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L324)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:323](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L323)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:322](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L322)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:328](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L328)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:320](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L320)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:321](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L321)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:325](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L325)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:318](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L318)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:319](https://github.com/deeeed/expo-audio-stream/blob/356d3f40ffb66806eeecb86d12bcbe5d60b7eea6/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L319)
