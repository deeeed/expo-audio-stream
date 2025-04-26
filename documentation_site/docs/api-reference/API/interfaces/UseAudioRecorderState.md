[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

Defined in: [src/ExpoAudioStream.types.ts:422](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L422)

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

Defined in: [src/ExpoAudioStream.types.ts:442](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L442)

Analysis data for the recording if processing was enabled

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

Defined in: [src/ExpoAudioStream.types.ts:440](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L440)

Information about compression if enabled

***

### durationMs

> **durationMs**: `number`

Defined in: [src/ExpoAudioStream.types.ts:436](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L436)

Duration of the current recording in milliseconds

***

### isPaused

> **isPaused**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:434](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L434)

Indicates whether recording is in a paused state

***

### isRecording

> **isRecording**: `boolean`

Defined in: [src/ExpoAudioStream.types.ts:432](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L432)

Indicates whether recording is currently active

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

Defined in: [src/ExpoAudioStream.types.ts:444](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L444)

Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:428](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L428)

Pauses the current recording

#### Returns

`Promise`\<`void`\>

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

Defined in: [src/ExpoAudioStream.types.ts:430](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L430)

Resumes a paused recording

#### Returns

`Promise`\<`void`\>

***

### size

> **size**: `number`

Defined in: [src/ExpoAudioStream.types.ts:438](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L438)

Size of the recorded audio in bytes

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

Defined in: [src/ExpoAudioStream.types.ts:424](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L424)

Starts recording with the specified configuration

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

Defined in: [src/ExpoAudioStream.types.ts:426](https://github.com/deeeed/expo-audio-stream/blob/b15daef29a631eb696d5a28422f9cf32b080027e/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L426)

Stops the current recording and returns the recording data

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>
