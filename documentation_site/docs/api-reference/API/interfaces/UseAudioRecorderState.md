[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:251](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L251)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

#### Defined in

[src/ExpoAudioStream.types.ts:250](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L250)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:248](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L248)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:247](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L247)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:246](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L246)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:244](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L244)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:245](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L245)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:249](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L249)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:242](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L242)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:243](https://github.com/deeeed/expo-audio-stream/blob/6633fec1624742d4a07d0c1c07e3d5128bbd199f/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L243)
