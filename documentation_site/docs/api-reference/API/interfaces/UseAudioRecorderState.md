[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:228](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L228)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:226](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L226)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:225](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L225)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:224](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L224)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:222](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L222)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:223](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L223)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:227](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L227)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:220](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L220)

***

### stopRecording()

> **stopRecording**: () => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:221](https://github.com/deeeed/expo-audio-stream/blob/816fff0ed70c4d058d880e20bf324c8aa58050a3/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L221)
