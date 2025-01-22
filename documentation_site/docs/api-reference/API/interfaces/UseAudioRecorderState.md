[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:270](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L270)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

#### Defined in

[src/ExpoAudioStream.types.ts:269](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L269)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:267](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L267)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:266](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L266)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:265](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L265)

***

### onRecordingInterrupted()?

> `optional` **onRecordingInterrupted**: (`_`) => `void`

#### Parameters

##### \_

[`RecordingInterruptionEvent`](RecordingInterruptionEvent.md)

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:271](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L271)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:263](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L263)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:264](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L264)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:268](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L268)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:261](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L261)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:262](https://github.com/deeeed/expo-audio-stream/blob/835d9e911edef71820c197532ad33e3c0a97d131/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L262)
