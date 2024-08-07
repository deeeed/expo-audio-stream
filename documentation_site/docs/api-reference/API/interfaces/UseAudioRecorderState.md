[**@siteed/expo-audio-stream**](../README.md) • **Docs**

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:92](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L92)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:90](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L90)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:89](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L89)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:88](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L88)

***

### pauseRecording()

> **pauseRecording**: () => `void`

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:86](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L86)

***

### resumeRecording()

> **resumeRecording**: () => `void`

#### Returns

`void`

#### Defined in

[src/ExpoAudioStream.types.ts:87](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L87)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:91](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L91)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

• **\_**: [`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:84](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L84)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:85](https://github.com/deeeed/expo-audio-stream/blob/2593b671a9535f7a259b4bdc1ad61b1572a2fec5/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L85)
