[**@siteed/expo-audio-stream**](../README.md) • **Docs**

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:186](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L186)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:184](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L184)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:183](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L183)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:182](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L182)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:180](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L180)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:181](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L181)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:185](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L185)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

• **\_**: [`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:178](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L178)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:179](https://github.com/deeeed/expo-audio-stream/blob/7c9c800d83b7cea3516643371484d5e1f3b99e4c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L179)
