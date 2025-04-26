[**@siteed/expo-audio-studio**](../README.md)

***

[@siteed/expo-audio-studio](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:422](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L422)

=======
>>>>>>> origin/main
## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:442](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L442)

Analysis data for the recording if processing was enabled

=======
Analysis data for the recording if processing was enabled

#### Defined in

[src/ExpoAudioStream.types.ts:442](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L442)

>>>>>>> origin/main
***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:440](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L440)

Information about compression if enabled

=======
Information about compression if enabled

#### Defined in

[src/ExpoAudioStream.types.ts:440](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L440)

>>>>>>> origin/main
***

### durationMs

> **durationMs**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:436](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L436)

Duration of the current recording in milliseconds

=======
Duration of the current recording in milliseconds

#### Defined in

[src/ExpoAudioStream.types.ts:436](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L436)

>>>>>>> origin/main
***

### isPaused

> **isPaused**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:434](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L434)

Indicates whether recording is in a paused state

=======
Indicates whether recording is in a paused state

#### Defined in

[src/ExpoAudioStream.types.ts:434](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L434)

>>>>>>> origin/main
***

### isRecording

> **isRecording**: `boolean`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:432](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L432)

Indicates whether recording is currently active

=======
Indicates whether recording is currently active

#### Defined in

[src/ExpoAudioStream.types.ts:432](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L432)

>>>>>>> origin/main
***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:444](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L444)

=======
>>>>>>> origin/main
Optional callback to handle recording interruptions

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:444](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L444)

>>>>>>> origin/main
***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:428](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L428)

=======
>>>>>>> origin/main
Pauses the current recording

#### Returns

`Promise`\<`void`\>

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:428](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L428)

>>>>>>> origin/main
***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:430](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L430)

=======
>>>>>>> origin/main
Resumes a paused recording

#### Returns

`Promise`\<`void`\>

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:430](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L430)

>>>>>>> origin/main
***

### size

> **size**: `number`

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:438](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L438)

Size of the recorded audio in bytes

=======
Size of the recorded audio in bytes

#### Defined in

[src/ExpoAudioStream.types.ts:438](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L438)

>>>>>>> origin/main
***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:424](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L424)

=======
>>>>>>> origin/main
Starts recording with the specified configuration

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

<<<<<<< HEAD
=======
#### Defined in

[src/ExpoAudioStream.types.ts:424](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L424)

>>>>>>> origin/main
***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

<<<<<<< HEAD
Defined in: [src/ExpoAudioStream.types.ts:426](https://github.com/deeeed/expo-audio-stream/blob/e90b868a404df260dd0a517e22d7898d08118617/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L426)

=======
>>>>>>> origin/main
Stops the current recording and returns the recording data

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>
<<<<<<< HEAD
=======

#### Defined in

[src/ExpoAudioStream.types.ts:426](https://github.com/deeeed/expo-audio-stream/blob/391ce6bcc63b985ab716f16d8cf5ddac64968b09/packages/expo-audio-studio/src/ExpoAudioStream.types.ts#L426)
>>>>>>> origin/main
