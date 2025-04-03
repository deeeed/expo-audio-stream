[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

Analysis data for the recording if processing was enabled

#### Defined in

[src/ExpoAudioStream.types.ts:442](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L442)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

Information about compression if enabled

#### Defined in

[src/ExpoAudioStream.types.ts:440](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L440)

***

### durationMs

> **durationMs**: `number`

Duration of the current recording in milliseconds

#### Defined in

[src/ExpoAudioStream.types.ts:436](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L436)

***

### isPaused

> **isPaused**: `boolean`

Indicates whether recording is in a paused state

#### Defined in

[src/ExpoAudioStream.types.ts:434](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L434)

***

### isRecording

> **isRecording**: `boolean`

Indicates whether recording is currently active

#### Defined in

[src/ExpoAudioStream.types.ts:432](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L432)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:444](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L444)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

Pauses the current recording

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:428](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L428)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

Resumes a paused recording

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:430](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L430)

***

### size

> **size**: `number`

Size of the recorded audio in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:438](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L438)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

Starts recording with the specified configuration

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:424](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L424)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

Stops the current recording and returns the recording data

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:426](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L426)
