[**@siteed/expo-audio-stream**](../README.md)

***

[@siteed/expo-audio-stream](../README.md) / UseAudioRecorderState

# Interface: UseAudioRecorderState

## Properties

### analysisData?

> `optional` **analysisData**: [`AudioAnalysis`](AudioAnalysis.md)

#### Defined in

[src/ExpoAudioStream.types.ts:265](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L265)

***

### compression?

> `optional` **compression**: [`CompressionInfo`](CompressionInfo.md)

#### Defined in

[src/ExpoAudioStream.types.ts:264](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L264)

***

### durationMs

> **durationMs**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:262](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L262)

***

### isPaused

> **isPaused**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:261](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L261)

***

### isRecording

> **isRecording**: `boolean`

#### Defined in

[src/ExpoAudioStream.types.ts:260](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L260)

***

### pauseRecording()

> **pauseRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:258](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L258)

***

### resumeRecording()

> **resumeRecording**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/ExpoAudioStream.types.ts:259](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L259)

***

### size

> **size**: `number`

#### Defined in

[src/ExpoAudioStream.types.ts:263](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L263)

***

### startRecording()

> **startRecording**: (`_`) => `Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Parameters

##### \_

[`RecordingConfig`](RecordingConfig.md)

#### Returns

`Promise`\<[`StartRecordingResult`](StartRecordingResult.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:256](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L256)

***

### stopRecording()

> **stopRecording**: (`options`?) => `Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Parameters

##### options?

[`WebRecordingOptions`](WebRecordingOptions.md)

#### Returns

`Promise`\<`null` \| [`AudioRecording`](AudioRecording.md)\>

#### Defined in

[src/ExpoAudioStream.types.ts:257](https://github.com/deeeed/expo-audio-stream/blob/28be564864425ab95a6773e2bc19f856eb418d1c/packages/expo-audio-stream/src/ExpoAudioStream.types.ts#L257)
